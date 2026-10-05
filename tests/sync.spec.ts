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

    function fixture() {
      let time = new Date("2026-10-03T15:01:00.000Z");
      const storage = new JsonSyncStorage(new MemoryStorage());
      const now = () => new Date(time);
      return {
        storage, now,
        queue: createSyncQueue({ storage, now }),
        advance(ms) { time = new Date(time.getTime() + ms); }
      };
    }
    const success = {
      kind: "success", serverVersion: 7,
      serverUpdatedAt: "2026-10-03T15:02:00.000Z"
    };
    const retryError = { kind: "retryable-error", message: "Red sintética no disponible" };
    const add = (queue, key = "sync-test-001", content = draft) =>
      queue.enqueueInspection(content, { idempotencyKey: key });
    const deferred = () => {
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      return { promise, resolve };
    };

    // 1–4: exact delay, not-due skip, identity preservation and confirmation.
    const retry = fixture();
    const original = await add(retry.queue);
    let calls = 0;
    let stateAtSend;
    let savedStateAtSend;
    const firstResult = await retry.queue.syncPending(async (operation) => {
      calls++;
      stateAtSend = operation.state;
      savedStateAtSend = (await retry.storage.load()).operations[0].state;
      return retryError;
    });
    assert.equal(stateAtSend, "syncing");
    assert.equal(savedStateAtSend, "syncing", "syncing debe persistirse antes de enviar");
    assert.deepEqual(firstResult, {
      processed: 1, succeeded: 0, retried: 1, failed: 0, conflicts: 0, skipped: 0
    });
    let stored = (await retry.queue.getSnapshot()).operations[0];
    assert.equal(stored.attemptCount, 1);
    assert.equal(stored.state, "retry");
    assert.equal(stored.nextAttemptAt, "2026-10-03T15:01:01.000Z");
    assert.equal(stored.lastError, retryError.message);
    retry.advance(999);
    const early = await retry.queue.syncPending(async () => { calls++; return success; });
    assert.equal(calls, 1);
    assert.equal(early.skipped, 1);
    retry.advance(1);
    const confirmed = await retry.queue.syncPending(async (operation) => {
      assert.equal(operation.id, original.id);
      assert.equal(operation.idempotencyKey, original.idempotencyKey);
      assert.equal(operation.entityId, original.entityId);
      assert.deepEqual(operation.payload, original.payload);
      return success;
    });
    assert.equal(confirmed.succeeded, 1);
    assert.equal((await retry.queue.getSnapshot()).operations.length, 0);
    const synced = await retry.queue.getInspection(draft.id);
    assert.equal(synced.syncState, "synced");
    assert.equal(synced.version, 7);
    assert.equal(synced.serverVersion, 7);
    assert.equal(synced.serverUpdatedAt, success.serverUpdatedAt);

    // 5: retries stop at the limit, keeping the diagnostic and original key.
    const limited = fixture();
    await add(limited.queue);
    await limited.queue.syncPending(async () => retryError, { maxAttempts: 2 });
    limited.advance(1000);
    const exhausted = await limited.queue.syncPending(async () => retryError, { maxAttempts: 2 });
    stored = (await limited.queue.getSnapshot()).operations[0];
    assert.equal(stored.state, "failed");
    assert.equal(stored.attemptCount, 2);
    assert.equal(stored.nextAttemptAt, null);
    assert.equal(stored.idempotencyKey, "sync-test-001");
    assert.equal(exhausted.failed, 1);
    assert.equal((await limited.queue.syncPending(async () => {
      assert.fail("failed no debe enviarse automáticamente");
    })).skipped, 1);

    // Exponential growth, configurable cap and thrown network exception.
    const exponential = fixture();
    await add(exponential.queue);
    for (const [delay, attempt] of [[1000, 1], [2000, 2], [2500, 3]]) {
      const before = exponential.now().getTime();
      await exponential.queue.syncPending(async () => { throw new Error("Red interrumpida"); },
        { maxDelayMs: 2500 });
      stored = (await exponential.queue.getSnapshot()).operations[0];
      assert.equal(stored.attemptCount, attempt);
      assert.equal(Date.parse(stored.nextAttemptAt) - before, delay);
      assert.equal(stored.lastError, "Red interrumpida");
      exponential.advance(delay);
    }
    const custom = fixture();
    await add(custom.queue);
    await custom.queue.syncPending(async () => retryError, { baseDelayMs: 250 });
    assert.equal((await custom.queue.getSnapshot()).operations[0].nextAttemptAt,
      "2026-10-03T15:01:00.250Z");
    await assert.rejects(custom.queue.syncPending(async () => success, { maxAttempts: 0 }), TypeError);

    // 6: fatal results never schedule automatic retries.
    const fatal = fixture();
    await add(fatal.queue);
    const fatalSummary = await fatal.queue.syncPending(async () => ({ kind: "fatal-error", message: "Solicitud inválida" }));
    stored = (await fatal.queue.getSnapshot()).operations[0];
    assert.equal(fatalSummary.failed, 1);
    assert.equal(stored.state, "failed");
    assert.equal(stored.nextAttemptAt, null);
    assert.equal(stored.lastError, "Solicitud inválida");
    await fatal.queue.syncPending(async () => assert.fail("No reenviar error fatal"));

    // 7: preserve both conflict versions and validate optional metadata.
    const conflict = fixture();
    const local = await add(conflict.queue);
    const remote = { ...local.payload, summary: "Versión remota sintética", version: 9, syncState: "synced" };
    const conflictSummary = await conflict.queue.syncPending(async () => ({ kind: "conflict", remoteInspection: remote }));
    stored = (await conflict.queue.getSnapshot()).operations[0];
    assert.equal(conflictSummary.conflicts, 1);
    assert.equal(stored.state, "conflict");
    assert.deepEqual(stored.payload, local.payload);
    assert.deepEqual(stored.conflict.remoteInspection, remote);
    assert.equal(stored.conflict.detectedAt, fixedClock().toISOString());
    assert.equal(stored.nextAttemptAt, null);
    await conflict.queue.syncPending(async () => assert.fail("No resolver ni reenviar conflicto"));
    const reopenedConflict = createSyncQueue({ storage: conflict.storage, now: conflict.now });
    assert.deepEqual((await reopenedConflict.getSnapshot()).operations[0], stored);
    const validConflict = await conflict.storage.load();
    for (const invalid of [null, { remoteInspection: {}, detectedAt: fixedClock().toISOString() },
      { remoteInspection: remote, detectedAt: "October 3, 2026" }]) {
      const invalidSnapshot = JSON.parse(JSON.stringify(validConflict));
      invalidSnapshot.operations[0].conflict = invalid;
      await assert.rejects(conflict.storage.save(invalidSnapshot), SyncSchemaError);
    }
    assert.equal(validConflict.schemaVersion, 1);

    // 8: callers share one flight; transport cannot send an operation twice.
    const single = fixture();
    await add(single.queue);
    const response = deferred();
    const entered = deferred();
    let sends = 0;
    const transport = async () => { sends++; entered.resolve(); return response.promise; };
    const flight1 = single.queue.syncPending(transport);
    const flight2 = single.queue.syncPending(transport);
    await entered.promise;
    assert.equal(sends, 1);
    response.resolve(success);
    assert.deepEqual(await flight1, await flight2);
    assert.equal(sends, 1);

    // 9: a reopened queue retries an interrupted send with original contents.
    const interrupted = fixture();
    const interruptedOperation = await add(interrupted.queue);
    const interruptedSnapshot = await interrupted.storage.load();
    interruptedSnapshot.operations[0].state = "syncing";
    interruptedSnapshot.operations[0].attemptCount = 2;
    await interrupted.storage.save(interruptedSnapshot);
    const recovered = createSyncQueue({ storage: interrupted.storage, now: interrupted.now });
    const recoveredSummary = await recovered.syncPending(async (operation) => {
      assert.equal(operation.idempotencyKey, interruptedOperation.idempotencyKey);
      assert.equal(operation.attemptCount, 2);
      assert.deepEqual(operation.payload, interruptedOperation.payload);
      assert.match(operation.lastError, /interrumpida/);
      return success;
    });
    assert.equal(recoveredSummary.succeeded, 1);

    // 10: online listener starts a flight, is cleaned up exactly and handles rejection.
    const online = fixture();
    await add(online.queue);
    const listeners = new Set();
    let registeredListener;
    const target = {
      addEventListener(type, listener) { assert.equal(type, "online"); registeredListener = listener; listeners.add(listener); },
      removeEventListener(type, listener) { assert.equal(type, "online"); assert.equal(listener, registeredListener); listeners.delete(listener); },
      emit() { for (const listener of listeners) listener(); }
    };
    let onlineSends = 0;
    const onlineTransport = async () => { onlineSends++; return success; };
    const cleanup = online.queue.registerOnlineSync(target, onlineTransport);
    target.emit();
    await online.queue.syncPending(onlineTransport);
    assert.equal(onlineSends, 1);
    cleanup();
    await add(online.queue, "online-test-002");
    target.emit();
    await Promise.resolve();
    assert.equal(onlineSends, 1);
    assert.equal((await online.queue.listPending()).length, 1);
    const failingOnline = fixture();
    failingOnline.storage.load = async () => { throw new Error("Almacenamiento no disponible"); };
    const stopFailing = failingOnline.queue.registerOnlineSync(target, onlineTransport);
    target.emit();
    await assert.rejects(failingOnline.queue.syncPending(onlineTransport), /Almacenamiento/);
    stopFailing();

    // 11: editing during flight must survive the acknowledgement of older data.
    const newer = fixture();
    await add(newer.queue, "version-old-001");
    const oldResponse = deferred();
    const oldEntered = deferred();
    const oldFlight = newer.queue.syncPending(async () => { oldEntered.resolve(); return oldResponse.promise; });
    await oldEntered.promise;
    newer.advance(1);
    const newDraft = { ...draft, summary: "Modificación local posterior" };
    await add(newer.queue, "version-new-002", newDraft);
    oldResponse.resolve(success);
    await oldFlight;
    assert.equal((await newer.queue.getInspection(draft.id)).syncState, "pending");
    assert.equal((await newer.queue.getInspection(draft.id)).summary, newDraft.summary);
    assert.equal((await newer.queue.listPending())[0].idempotencyKey, "version-new-002");

    const prequeued = fixture();
    const oldOperation = await add(prequeued.queue, "prequeued-old-001");
    prequeued.advance(1);
    const newOperation = await add(prequeued.queue, "prequeued-new-002", newDraft);
    let currentAfterOldResponse;
    let receivedNewId;
    await prequeued.queue.syncPending(async (operation) => {
      if (operation.id === oldOperation.id) return success;
      receivedNewId = operation.id;
      currentAfterOldResponse = await prequeued.queue.getInspection(draft.id);
      return retryError;
    });
    assert.equal(receivedNewId, newOperation.id);
    assert.equal(currentAfterOldResponse.syncState, "pending", "confirmar operación antigua no sincroniza edición posterior");
    assert.equal(currentAfterOldResponse.summary, newDraft.summary);
    assert.equal((await prequeued.queue.getInspection(draft.id)).syncState, "pending");
    assert.equal((await prequeued.queue.getSnapshot()).operations.length, 1);

    // Deterministic creation order and ID tie-breaking.
    const ordered = fixture();
    await add(ordered.queue, "order-zzzz", { ...draft, id: "order-z" });
    await add(ordered.queue, "order-aaaa", { ...draft, id: "order-a" });
    ordered.advance(1);
    await add(ordered.queue, "order-0000", { ...draft, id: "order-last" });
    const order = [];
    const orderedSummary = await ordered.queue.syncPending(async (operation) => { order.push(operation.entityId); return success; });
    assert.deepEqual(order, ["order-a", "order-z", "order-last"]);
    assert.equal(orderedSummary.processed, 3);
    assert.equal(orderedSummary.succeeded, 3);

    console.log("sync.spec.ts: almacenamiento + cola + reintentos PASS");
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
