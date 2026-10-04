// @ts-nocheck
{
  const assert = require("node:assert/strict");
  const { readFileSync } = require("node:fs");
  const { resolve } = require("node:path");
  const ts = require("typescript");

  const root = resolve(__dirname, "..");
  const previousTsExtension = require.extensions[".ts"];

  require.extensions[".ts"] = function transpileTypeScript(module, filename) {
    const source = readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };

  const schemaPath = resolve(root, "src/lib/storage/schema.ts");
  const queuePath = resolve(root, "src/lib/sync/queue.ts");
  const {
    JsonSyncStorage,
    SYNC_STORAGE_KEY,
    SyncSchemaError
  } = require(schemaPath);
  const {
    createSyncQueue,
    IdempotencyConflictError
  } = require(queuePath);

  class MemoryStorage {
    constructor() {
      this.values = new Map();
    }

    getItem(key) {
      return this.values.has(key) ? this.values.get(key) : null;
    }

    setItem(key, value) {
      this.values.set(key, value);
    }

    removeItem(key) {
      this.values.delete(key);
    }
  }

  const draft = {
    id: "inspection-offline-001",
    location: "Laboratorio Sintético de Redes",
    inspectedAt: "2026-10-03T15:00:00.000Z",
    inspectorAlias: "Técnica Sintética A",
    status: "attention",
    findings: 1,
    summary: "Observación sintética almacenada sin conexión."
  };

  const fixedClock = () => new Date("2026-10-03T15:01:00.000Z");

  (async () => {
    const browserStorage = new MemoryStorage();
    const storage = new JsonSyncStorage(browserStorage);
    const queue = createSyncQueue({ storage, now: fixedClock });

    const firstOperation = await queue.enqueueInspection(draft, {
      idempotencyKey: "mutation-001"
    });
    const repeatedOperation = await queue.enqueueInspection(draft, {
      idempotencyKey: "mutation-001"
    });

    assert.deepEqual(
      repeatedOperation,
      firstOperation,
      "repetir la misma mutación debe devolver la operación existente"
    );

    const firstSnapshot = await queue.getSnapshot();
    assert.equal(firstSnapshot.inspections.length, 1);
    assert.equal(firstSnapshot.operations.length, 1);
    assert.equal(firstSnapshot.operations[0].attemptCount, 0);
    assert.equal(firstSnapshot.operations[0].state, "pending");
    assert.equal(firstSnapshot.inspections[0].syncState, "pending");

    const reopenedQueue = createSyncQueue({ storage, now: fixedClock });
    const recoveredOperations = await reopenedQueue.listPending();
    assert.equal(
      recoveredOperations.length,
      1,
      "una nueva instancia debe recuperar la cola persistida"
    );
    assert.equal(recoveredOperations[0].idempotencyKey, "mutation-001");

    await assert.rejects(
      queue.enqueueInspection(
        { ...draft, summary: "Otra mutación sintética." },
        { idempotencyKey: "mutation-001" }
      ),
      IdempotencyConflictError,
      "una clave idempotente no puede reutilizarse con otro contenido"
    );

    const concurrentStorage = new JsonSyncStorage(new MemoryStorage());
    const concurrentQueue = createSyncQueue({
      storage: concurrentStorage,
      now: fixedClock
    });

    await Promise.all([
      concurrentQueue.enqueueInspection(draft, {
        idempotencyKey: "mutation-concurrent-001"
      }),
      concurrentQueue.enqueueInspection(draft, {
        idempotencyKey: "mutation-concurrent-001"
      })
    ]);

    assert.equal(
      (await concurrentQueue.listPending()).length,
      1,
      "dos solicitudes concurrentes con la misma clave deben crear una operación"
    );

    await assert.rejects(
      queue.enqueueInspection(
        { ...draft, findings: -1 },
        { idempotencyKey: "mutation-invalid-001" }
      ),
      SyncSchemaError,
      "los datos inválidos no deben escribirse en almacenamiento"
    );

    const corruptedBrowserStorage = new MemoryStorage();
    corruptedBrowserStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 999, inspections: [], operations: [] })
    );
    const corruptedStorage = new JsonSyncStorage(corruptedBrowserStorage);

    await assert.rejects(
      corruptedStorage.load(),
      /Versión de esquema no soportada/,
      "una versión desconocida no debe interpretarse silenciosamente"
    );

    console.log(
      "sync.spec.ts: almacenamiento + cola idempotente inicial PASS"
    );
  })()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => {
      if (previousTsExtension) {
        require.extensions[".ts"] = previousTsExtension;
      } else {
        delete require.extensions[".ts"];
      }

      delete require.cache[schemaPath];
      delete require.cache[queuePath];
    });
}
