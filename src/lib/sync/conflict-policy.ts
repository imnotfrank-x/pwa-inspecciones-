import {
  assertStoredInspection,
  type StoredInspection
} from "../storage/schema";

export type ConflictWinner = "local" | "remote";

export type ConflictReason =
  | "higher-version"
  | "newer-updated-at"
  | "server-tie-break";

export type ConflictDecision = {
  winner: ConflictWinner;
  reason: ConflictReason;
  resolvedInspection: StoredInspection;
};

function cloneInspection(inspection: StoredInspection): StoredInspection {
  return JSON.parse(JSON.stringify(inspection)) as StoredInspection;
}

export function resolveInspectionConflict(
  localInspection: StoredInspection,
  remoteInspection: StoredInspection
): ConflictDecision {
  assertStoredInspection(localInspection);
  assertStoredInspection(remoteInspection);

  if (localInspection.id !== remoteInspection.id) {
    throw new TypeError(
      "No se puede resolver un conflicto entre inspecciones con IDs diferentes."
    );
  }

  if (localInspection.version > remoteInspection.version) {
    return {
      winner: "local",
      reason: "higher-version",
      resolvedInspection: {
        ...cloneInspection(localInspection),
        syncState: "pending"
      }
    };
  }

  if (remoteInspection.version > localInspection.version) {
    return {
      winner: "remote",
      reason: "higher-version",
      resolvedInspection: {
        ...cloneInspection(remoteInspection),
        syncState: "synced",
        serverVersion: remoteInspection.version,
        serverUpdatedAt: remoteInspection.updatedAt
      }
    };
  }

  const localUpdatedAt = Date.parse(localInspection.updatedAt);
  const remoteUpdatedAt = Date.parse(remoteInspection.updatedAt);

  if (localUpdatedAt > remoteUpdatedAt) {
    return {
      winner: "local",
      reason: "newer-updated-at",
      resolvedInspection: {
        ...cloneInspection(localInspection),
        syncState: "pending"
      }
    };
  }

  if (remoteUpdatedAt > localUpdatedAt) {
    return {
      winner: "remote",
      reason: "newer-updated-at",
      resolvedInspection: {
        ...cloneInspection(remoteInspection),
        syncState: "synced",
        serverVersion: remoteInspection.version,
        serverUpdatedAt: remoteInspection.updatedAt
      }
    };
  }

  return {
    winner: "remote",
    reason: "server-tie-break",
    resolvedInspection: {
      ...cloneInspection(remoteInspection),
      syncState: "synced",
      serverVersion: remoteInspection.version,
      serverUpdatedAt: remoteInspection.updatedAt
    }
  };
}
