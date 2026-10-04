import {
  assertStoredInspection,
  type SyncOperation,
  type SyncSnapshot
} from "../storage/schema";
import { resolveInspectionConflict } from "./conflict-policy";

export type ApplyConflictOptions = {
  operationId: string;
  resolvedIdempotencyKey?: string;
  resolvedAt: string;
};

function assertIdempotencyKey(value: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value)) {
    throw new TypeError(
      "idempotencyKey debe tener entre 8 y 128 caracteres seguros."
    );
  }
}

function assertValidDate(value: string, field: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new TypeError(`${field} debe ser una fecha válida.`);
  }

  return date.toISOString();
}

function cloneOperation(operation: SyncOperation): SyncOperation {
  return JSON.parse(JSON.stringify(operation)) as SyncOperation;
}

function cloneSnapshot(snapshot: SyncSnapshot): SyncSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as SyncSnapshot;
}

export function applyConflictResolution(
  snapshot: SyncSnapshot,
  options: ApplyConflictOptions
): SyncSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);

  const operation = nextSnapshot.operations.find(
    (item) => item.id === options.operationId
  );

  if (!operation) {
    throw new TypeError(
      `No existe la operación ${options.operationId}.`
    );
  }

  if (operation.state !== "conflict" || !operation.conflict) {
    throw new TypeError(
      "La operación no tiene un conflicto pendiente de resolver."
    );
  }

  const resolvedAt = assertValidDate(options.resolvedAt, "resolvedAt");
  const remoteInspection = operation.conflict.remoteInspection;

  assertStoredInspection(remoteInspection);

  const originalIdempotencyKey = operation.idempotencyKey;
  const newIdempotencyKey = options.resolvedIdempotencyKey;

  if (newIdempotencyKey !== undefined) {
    assertIdempotencyKey(newIdempotencyKey);

    if (newIdempotencyKey === originalIdempotencyKey) {
      throw new TypeError(
        "La resolución de conflicto no puede reutilizar la clave idempotente original."
      );
    }
  }

  const localInspection = nextSnapshot.inspections.find(
    (item) => item.id === operation.entityId
  );

  if (!localInspection) {
    throw new TypeError(
      `No existe la inspección local ${operation.entityId}.`
    );
  }

  assertStoredInspection(localInspection);

  /*
   * Si existe una edición local posterior a la operación
   * que generó el conflicto, esa edición tiene prioridad.
   *
   * En ese caso solamente retiramos la operación antigua.
   * La operación nueva se conserva exactamente como está.
   */
  const hasNewerLocalEdit =
    localInspection.updatedAt !== operation.payload.updatedAt;

  if (hasNewerLocalEdit) {
    const newerOperations = nextSnapshot.operations.filter(
      (item) =>
        item.id !== operation.id &&
        item.entityId === operation.entityId &&
        (item.state === "pending" ||
          item.state === "retry" ||
          item.state === "syncing")
    );

    if (newerOperations.length > 0) {
      nextSnapshot.operations = nextSnapshot.operations.filter(
        (item) => item.id !== operation.id
      );

      return nextSnapshot;
    }
  }

  const decision = resolveInspectionConflict(
    localInspection,
    remoteInspection
  );

  /*
   * Gana el remoto.
   * Se elimina la operación en conflicto y se conserva
   * la versión remota como sincronizada.
   */
  if (decision.winner === "remote") {
    const resolvedRemote = decision.resolvedInspection;

    nextSnapshot.inspections = [
      ...nextSnapshot.inspections.filter(
        (item) => item.id !== resolvedRemote.id
      ),
      resolvedRemote
    ];

    nextSnapshot.operations = nextSnapshot.operations.filter(
      (item) => item.id !== operation.id
    );

    return nextSnapshot;
  }

  /*
   * Gana el local.
   * Se necesita una nueva clave de idempotencia para
   * volver a enviar la versión local contra la versión remota.
   */
  if (!newIdempotencyKey) {
    throw new TypeError(
      "Se requiere una nueva idempotencyKey cuando gana la versión local."
    );
  }

  const rebasedPayload = {
    ...decision.resolvedInspection,
    version: remoteInspection.version,
    syncState: "pending" as const
  };

  const rebasedOperation: SyncOperation = {
    ...cloneOperation(operation),
    id: `operation:${newIdempotencyKey}`,
    idempotencyKey: newIdempotencyKey,
    payload: rebasedPayload,
    baseVersion: remoteInspection.version,
    attemptCount: 0,
    nextAttemptAt: resolvedAt,
    state: "pending",
    createdAt: resolvedAt,
    updatedAt: resolvedAt
  };

  delete rebasedOperation.lastError;
  delete rebasedOperation.conflict;

  nextSnapshot.inspections = [
    ...nextSnapshot.inspections.filter(
      (item) => item.id !== localInspection.id
    ),
    rebasedPayload
  ];

  nextSnapshot.operations = [
    ...nextSnapshot.operations.filter(
      (item) => item.id !== operation.id
    ),
    rebasedOperation
  ];

  return nextSnapshot;
}