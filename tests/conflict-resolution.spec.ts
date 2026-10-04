const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadTs(relativePath) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = fs.readFileSync(filename, "utf8");

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filename
  }).outputText;

  const module = { exports: {} };

  const localRequire = (request) => {
    if (request.startsWith(".")) {
      const requested = path.resolve(path.dirname(filename), request);

      return loadTs(
        path.relative(
          path.resolve(__dirname, ".."),
          `${requested}.ts`
        )
      );
    }

    return require(request);
  };

  const factory = new Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    transpiled
  );

  factory(
    localRequire,
    module,
    module.exports,
    filename,
    path.dirname(filename)
  );

  return module.exports;
}

const schema = loadTs("src/lib/storage/schema.ts");
const policy = loadTs("src/lib/sync/conflict-policy.ts");
const resolution = loadTs("src/lib/sync/conflict-resolution.ts");

const { SYNC_SCHEMA_VERSION } = schema;
const { resolveInspectionConflict } = policy;
const { applyConflictResolution } = resolution;

function inspection(overrides = {}) {
  return {
    id: "inspection-1",
    location: "Laboratorio",
    inspectedAt: "2026-10-04T10:00:00.000Z",
    inspectorAlias: "carlos",
    status: "ok",
    findings: 0,
    summary: "Sin hallazgos",
    version: 3,
    updatedAt: "2026-10-04T10:00:00.000Z",
    syncState: "pending",
    ...overrides
  };
}

function conflictSnapshot(localOverrides = {}, remoteOverrides = {}) {
  const local = inspection(localOverrides);

  const remote = inspection({
    version: 4,
    updatedAt: "2026-10-04T10:01:00.000Z",
    syncState: "synced",
    serverVersion: 4,
    serverUpdatedAt: "2026-10-04T10:01:00.000Z",
    ...remoteOverrides
  });

  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    inspections: [local],
    operations: [
      {
        id: "operation:original-key",
        idempotencyKey: "original-key",
        entityId: local.id,
        type: "inspection.upsert",
        payload: inspection(),
        baseVersion: 3,
        attemptCount: 2,
        nextAttemptAt: null,
        state: "conflict",
        createdAt: "2026-10-04T10:00:00.000Z",
        updatedAt: "2026-10-04T10:02:00.000Z",
        lastError: "conflicto",
        conflict: {
          remoteInspection: remote,
          detectedAt: "2026-10-04T10:02:00.000Z"
        }
      }
    ]
  };
}

/*
 * CASO 1
 * Versión remota mayor.
 * Local 2, remoto 3 -> gana remoto.
 */
{
  const local = inspection({
    version: 2,
    updatedAt: "2026-10-04T10:02:00.000Z"
  });

  const remote = inspection({
    version: 3,
    updatedAt: "2026-10-04T10:01:00.000Z",
    syncState: "synced"
  });

  const decision = resolveInspectionConflict(local, remote);

  if (decision.winner !== "remote") {
    throw new Error("Caso 1: debe ganar remoto.");
  }

  if (decision.reason !== "higher-version") {
    throw new Error("Caso 1: la razón debe ser higher-version.");
  }
}

/*
 * CASO 2
 * Versión local mayor.
 * Local 4, remoto 3 -> gana local.
 */
{
  const local = inspection({
    version: 4,
    updatedAt: "2026-10-04T10:01:00.000Z"
  });

  const remote = inspection({
    version: 3,
    updatedAt: "2026-10-04T10:02:00.000Z",
    syncState: "synced"
  });

  const decision = resolveInspectionConflict(local, remote);

  if (decision.winner !== "local") {
    throw new Error("Caso 2: debe ganar local.");
  }

  if (decision.reason !== "higher-version") {
    throw new Error("Caso 2: la razón debe ser higher-version.");
  }
}

/*
 * CASO 3
 * Misma versión y local más reciente.
 */
{
  const local = inspection({
    version: 3,
    updatedAt: "2026-10-04T10:03:00.000Z"
  });

  const remote = inspection({
    version: 3,
    updatedAt: "2026-10-04T10:02:00.000Z",
    syncState: "synced"
  });

  const decision = resolveInspectionConflict(local, remote);

  if (decision.winner !== "local") {
    throw new Error("Caso 3: debe ganar local.");
  }

  if (decision.reason !== "newer-updated-at") {
    throw new Error("Caso 3: la razón debe ser newer-updated-at.");
  }
}

/*
 * CASO 4
 * Misma versión y remoto más reciente.
 */
{
  const local = inspection({
    version: 3,
    updatedAt: "2026-10-04T10:02:00.000Z"
  });

  const remote = inspection({
    version: 3,
    updatedAt: "2026-10-04T10:03:00.000Z",
    syncState: "synced"
  });

  const decision = resolveInspectionConflict(local, remote);

  if (decision.winner !== "remote") {
    throw new Error("Caso 4: debe ganar remoto.");
  }

  if (decision.reason !== "newer-updated-at") {
    throw new Error("Caso 4: la razón debe ser newer-updated-at.");
  }
}

/*
 * CASO 5
 * Empate completo -> gana remoto como desempate determinista.
 */
{
  const local = inspection({
    version: 3,
    updatedAt: "2026-10-04T10:03:00.000Z"
  });

  const remote = inspection({
    version: 3,
    updatedAt: "2026-10-04T10:03:00.000Z",
    syncState: "synced"
  });

  const decision = resolveInspectionConflict(local, remote);

  if (decision.winner !== "remote") {
    throw new Error("Caso 5: en empate debe ganar remoto.");
  }

  if (decision.reason !== "server-tie-break") {
    throw new Error("Caso 5: debe utilizar server-tie-break.");
  }
}

/*
 * CASO 6
 * IDs diferentes -> error y sin modificar objetos.
 */
{
  const local = inspection({
    id: "inspection-local"
  });

  const remote = inspection({
    id: "inspection-remota",
    version: 4,
    syncState: "synced"
  });

  const localBefore = JSON.stringify(local);
  const remoteBefore = JSON.stringify(remote);

  let threw = false;

  try {
    resolveInspectionConflict(local, remote);
  } catch {
    threw = true;
  }

  if (!threw) {
    throw new Error("Caso 6: debe lanzar error con IDs diferentes.");
  }

  if (JSON.stringify(local) !== localBefore) {
    throw new Error(
      "Caso 6: no debe modificar la inspección local."
    );
  }

  if (JSON.stringify(remote) !== remoteBefore) {
    throw new Error(
      "Caso 6: no debe modificar la inspección remota."
    );
  }
}

/*
 * CASO 7
 * Ganador remoto aplicado.
 */
{
  const snapshot = conflictSnapshot();

  const resolved = applyConflictResolution(snapshot, {
    operationId: "operation:original-key",
    resolvedAt: "2026-10-04T10:05:00.000Z"
  });

  if (resolved.operations.length !== 0) {
    throw new Error(
      "Caso 7: la operación conflictiva debe desaparecer."
    );
  }

  const resolvedInspection = resolved.inspections[0];

  if (resolvedInspection.syncState !== "synced") {
    throw new Error(
      "Caso 7: la inspección debe quedar synced."
    );
  }

  if (resolvedInspection.version !== 4) {
    throw new Error(
      "Caso 7: debe conservarse la versión remota."
    );
  }

  if (resolvedInspection.serverVersion !== 4) {
    throw new Error(
      "Caso 7: debe conservarse serverVersion remoto."
    );
  }
}

/*
 * CASO 8
 * Ganador local aplicado.
 */
{
  const snapshot = conflictSnapshot({
    version: 5,
    updatedAt: "2026-10-04T10:03:00.000Z"
  });

  const resolved = applyConflictResolution(snapshot, {
    operationId: "operation:original-key",
    resolvedIdempotencyKey: "rebased-key-01",
    resolvedAt: "2026-10-04T10:05:00.000Z"
  });

  if (resolved.operations.length !== 1) {
    throw new Error(
      "Caso 8: debe existir una sola operación nueva."
    );
  }

  const operation = resolved.operations[0];

  if (operation.idempotencyKey === "original-key") {
    throw new Error(
      "Caso 8: debe utilizar otra clave idempotente."
    );
  }

  if (operation.idempotencyKey !== "rebased-key-01") {
    throw new Error(
      "Caso 8: debe utilizar la nueva clave indicada."
    );
  }

  if (operation.attemptCount !== 0) {
    throw new Error(
      "Caso 8: attemptCount debe quedar en 0."
    );
  }

  if (operation.state !== "pending") {
    throw new Error(
      "Caso 8: la nueva operación debe quedar pending."
    );
  }

  if (operation.baseVersion !== 4) {
    throw new Error(
      "Caso 8: baseVersion debe corresponder a la versión remota."
    );
  }

  if (operation.payload.version !== 4) {
    throw new Error(
      "Caso 8: el payload debe quedar rebasado a la versión remota."
    );
  }

  if ("lastError" in operation) {
    throw new Error(
      "Caso 8: debe eliminarse lastError."
    );
  }

  if ("conflict" in operation) {
    throw new Error(
      "Caso 8: debe eliminarse conflict."
    );
  }
}

/*
 * CASO 9
 * No se puede reutilizar la clave anterior.
 */
{
  const snapshot = conflictSnapshot({
    version: 5,
    updatedAt: "2026-10-04T10:03:00.000Z"
  });

  let threw = false;

  try {
    applyConflictResolution(snapshot, {
      operationId: "operation:original-key",
      resolvedIdempotencyKey: "original-key",
      resolvedAt: "2026-10-04T10:04:00.000Z"
    });
  } catch {
    threw = true;
  }

  if (!threw) {
    throw new Error(
      "Caso 9: debe rechazarse la reutilización de la clave anterior."
    );
  }
}

/*
 * CASO 10
 * Una edición local posterior no debe ser sobrescrita.
 */
{
  const snapshot = conflictSnapshot({
    version: 6,
    updatedAt: "2026-10-04T10:03:00.000Z",
    summary: "Edición local posterior"
  });

  snapshot.operations.push({
    id: "operation:newer-key",
    idempotencyKey: "newer-key-02",
    entityId: "inspection-1",
    type: "inspection.upsert",
    payload: inspection({
      version: 6,
      updatedAt: "2026-10-04T10:03:00.000Z",
      summary: "Edición local posterior"
    }),
    baseVersion: 6,
    attemptCount: 0,
    nextAttemptAt: "2026-10-04T10:03:00.000Z",
    state: "pending",
    createdAt: "2026-10-04T10:03:00.000Z",
    updatedAt: "2026-10-04T10:03:00.000Z"
  });

  const resolved = applyConflictResolution(snapshot, {
    operationId: "operation:original-key",
    resolvedIdempotencyKey: "resolution-key-03",
    resolvedAt: "2026-10-04T10:04:00.000Z"
  });

  const inspectionAfterResolution = resolved.inspections.find(
    (item) => item.id === "inspection-1"
  );

  if (!inspectionAfterResolution) {
    throw new Error(
      "Caso 10: debe conservarse la inspección local posterior."
    );
  }

  if (inspectionAfterResolution.summary !== "Edición local posterior") {
    throw new Error(
      "Caso 10: no debe sobrescribirse la edición local posterior."
    );
  }

  if (inspectionAfterResolution.syncState !== "pending") {
    throw new Error(
      "Caso 10: la edición posterior debe permanecer pending."
    );
  }

  if (
    !resolved.operations.some(
      (item) => item.id === "operation:newer-key"
    )
  ) {
    throw new Error(
      "Caso 10: debe conservarse la operación posterior."
    );
  }

  if (
    resolved.operations.some(
      (item) => item.id === "operation:original-key"
    )
  ) {
    throw new Error(
      "Caso 10: debe eliminarse la operación antigua."
    );
  }

  if (resolved.operations.length !== 1) {
    throw new Error(
      "Caso 10: no debe crearse una operación duplicada."
    );
  }
}

/*
 * CASO 11
 * Inmutabilidad de la política.
 */
{
  const local = inspection({
    version: 5,
    updatedAt: "2026-10-04T10:03:00.000Z"
  });

  const remote = inspection({
    version: 4,
    updatedAt: "2026-10-04T10:02:00.000Z",
    syncState: "synced"
  });

  const localBefore = JSON.stringify(local);
  const remoteBefore = JSON.stringify(remote);

  const decision = resolveInspectionConflict(local, remote);

  if (decision.winner !== "local") {
    throw new Error(
      "Caso 11: debe ganar local para comprobar la copia defensiva."
    );
  }

  if (JSON.stringify(local) !== localBefore) {
    throw new Error(
      "Caso 11: la política no debe modificar el objeto local."
    );
  }

  if (JSON.stringify(remote) !== remoteBefore) {
    throw new Error(
      "Caso 11: la política no debe modificar el objeto remoto."
    );
  }

  decision.resolvedInspection.summary = "Cambio externo";

  if (local.summary === "Cambio externo") {
    throw new Error(
      "Caso 11: resolvedInspection no debe compartir referencia con local."
    );
  }

  if (remote.summary === "Cambio externo") {
    throw new Error(
      "Caso 11: resolvedInspection no debe compartir referencia con remote."
    );
  }
}

/*
 * CASO 12
 * El workflow oficial se comprueba fuera de esta prueba
 * mediante el script de verificación del proyecto.
 */

console.log("conflict-resolution.spec.ts: PASS");