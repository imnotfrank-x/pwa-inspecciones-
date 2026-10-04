import {
  assertOfflineInspectionDraft,
  assertStoredInspection,
  cloneSyncSnapshot,
  type OfflineInspectionDraft,
  type StoredInspection,
  type SyncOperation,
  type SyncSnapshot,
  type SyncStorage
} from "../storage/schema";

export type EnqueueInspectionOptions = {
  idempotencyKey: string;
  baseVersion?: number;
  updatedAt?: string;
};

export type SyncQueueOptions = {
  storage: SyncStorage;
  now?: () => Date;
};

export type SyncTransportResult =
  | { kind: "success"; serverVersion: number; serverUpdatedAt: string }
  | { kind: "conflict"; remoteInspection: StoredInspection }
  | { kind: "retryable-error"; message: string }
  | { kind: "fatal-error"; message: string };

export type SyncTransport = (operation: SyncOperation) => Promise<SyncTransportResult>;

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

export type SyncSummary = {
  processed: number;
  succeeded: number;
  retried: number;
  failed: number;
  conflicts: number;
  skipped: number;
};

export type OnlineEventTarget = {
  addEventListener(type: "online", listener: () => void): void;
  removeEventListener(type: "online", listener: () => void): void;
};

function operationOrder(left: SyncOperation, right: SyncOperation): number {
  const dateDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return dateDifference || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

function retryConfiguration(options: RetryOptions): Required<RetryOptions> {
  const config = {
    maxAttempts: options.maxAttempts ?? 5,
    baseDelayMs: options.baseDelayMs ?? 1000,
    maxDelayMs: options.maxDelayMs ?? 60000
  };
  for (const [name, value] of Object.entries(config)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError(`${name} debe ser un entero positivo seguro.`);
    }
  }
  return config;
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.trim().slice(0, 500) || "Fallo de transporte sin diagnóstico.";
}

export class IdempotencyConflictError extends Error {
  constructor(idempotencyKey: string) {
    super(
      `La clave idempotente ${idempotencyKey} ya pertenece a otra operación.`
    );
    this.name = "IdempotencyConflictError";
  }
}

function assertIdempotencyKey(value: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value)) {
    throw new TypeError(
      "idempotencyKey debe tener entre 8 y 128 caracteres seguros."
    );
  }
}

function assertBaseVersion(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError("baseVersion debe ser un entero mayor o igual a cero.");
  }
}

function assertValidDate(value: Date | string, field: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new TypeError(`${field} debe ser una fecha válida.`);
  }

  return date.toISOString();
}

function sameDraft(
  stored: StoredInspection,
  draft: OfflineInspectionDraft
): boolean {
  return (
    stored.id === draft.id &&
    stored.location === draft.location &&
    stored.inspectedAt === draft.inspectedAt &&
    stored.inspectorAlias === draft.inspectorAlias &&
    stored.status === draft.status &&
    stored.findings === draft.findings &&
    stored.summary === draft.summary
  );
}

function cloneOperation(operation: SyncOperation): SyncOperation {
  return JSON.parse(JSON.stringify(operation)) as SyncOperation;
}

export class InspectionSyncQueue {
  private readonly storage: SyncStorage;
  private readonly now: () => Date;
  private writeTail: Promise<void> = Promise.resolve();
  private activeSync: Promise<SyncSummary> | null = null;

  constructor({ storage, now = () => new Date() }: SyncQueueOptions) {
    this.storage = storage;
    this.now = now;
  }

  private serializeWrite<T>(action: () => Promise<T>): Promise<T> {
    const result = this.writeTail.then(action, action);
    this.writeTail = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  async enqueueInspection(
    draft: OfflineInspectionDraft,
    options: EnqueueInspectionOptions
  ): Promise<SyncOperation> {
    assertOfflineInspectionDraft(draft);
    assertIdempotencyKey(options.idempotencyKey);

    return this.serializeWrite(async () => {
      const snapshot = await this.storage.load();
      const duplicate = snapshot.operations.find(
        ({ idempotencyKey }) => idempotencyKey === options.idempotencyKey
      );
      const currentInspection = snapshot.inspections.find(
        ({ id }) => id === draft.id
      );
      const baseVersion =
        options.baseVersion ??
        duplicate?.baseVersion ??
        currentInspection?.version ??
        0;

      assertBaseVersion(baseVersion);

      if (duplicate) {
        if (
          duplicate.entityId !== draft.id ||
          duplicate.baseVersion !== baseVersion ||
          !sameDraft(duplicate.payload, draft)
        ) {
          throw new IdempotencyConflictError(options.idempotencyKey);
        }

        return cloneOperation(duplicate);
      }

      const updatedAt = assertValidDate(
        options.updatedAt ?? this.now(),
        "updatedAt"
      );
      const inspection: StoredInspection = {
        ...draft,
        version: Math.max(currentInspection?.version ?? 0, baseVersion),
        updatedAt,
        syncState: "pending"
      };
      const operation: SyncOperation = {
        id: `operation:${options.idempotencyKey}`,
        idempotencyKey: options.idempotencyKey,
        entityId: draft.id,
        type: "inspection.upsert",
        payload: inspection,
        baseVersion,
        attemptCount: 0,
        nextAttemptAt: updatedAt,
        state: "pending",
        createdAt: updatedAt,
        updatedAt
      };

      const nextSnapshot: SyncSnapshot = {
        ...snapshot,
        inspections: [
          ...snapshot.inspections.filter(({ id }) => id !== inspection.id),
          inspection
        ],
        operations: [...snapshot.operations, operation]
      };

      await this.storage.save(nextSnapshot);
      return cloneOperation(operation);
    });
  }

  async listPending(): Promise<SyncOperation[]> {
    const snapshot = await this.storage.load();
    return snapshot.operations
      .filter(({ state }) => state === "pending" || state === "retry")
      .sort(operationOrder)
      .map(cloneOperation);
  }

  async getInspection(id: string): Promise<StoredInspection | undefined> {
    const snapshot = await this.storage.load();
    const inspection = snapshot.inspections.find((item) => item.id === id);
    return inspection
      ? (JSON.parse(JSON.stringify(inspection)) as StoredInspection)
      : undefined;
  }

  async getSnapshot(): Promise<SyncSnapshot> {
    return cloneSyncSnapshot(await this.storage.load());
  }

  syncPending(transport: SyncTransport, retryOptions: RetryOptions = {}): Promise<SyncSummary> {
    if (this.activeSync) {
      return this.activeSync;
    }
    const execution = Promise.resolve().then(() =>
      this.processPending(transport, retryConfiguration(retryOptions))
    );
    this.activeSync = execution.finally(() => {
      this.activeSync = null;
    });
    return this.activeSync;
  }

  private async processPending(
    transport: SyncTransport,
    config: Required<RetryOptions>
  ): Promise<SyncSummary> {
    const summary: SyncSummary = {
      processed: 0, succeeded: 0, retried: 0, failed: 0, conflicts: 0, skipped: 0
    };
    // Recovery and all state changes share the enqueue write lock. Network I/O
    // stays outside it so local editing can continue while a request is pending.
    const candidates = await this.serializeWrite(async () => {
      const snapshot = await this.storage.load();
      const recoveredAt = assertValidDate(this.now(), "now");
      let recovered = false;
      for (const operation of snapshot.operations) {
        if (operation.state === "syncing") {
          operation.state = "retry";
          operation.nextAttemptAt = recoveredAt;
          operation.updatedAt = recoveredAt;
          operation.lastError = "Sincronización interrumpida; se reintentará con la misma clave.";
          recovered = true;
        }
      }
      if (recovered) await this.storage.save(snapshot);
      return snapshot.operations.sort(operationOrder).map(({ id }) => id);
    });

    for (const id of candidates) {
      const outgoing = await this.serializeWrite(async () => {
        const snapshot = await this.storage.load();
        const operation = snapshot.operations.find((item) => item.id === id);
        const timestamp = assertValidDate(this.now(), "now");
        if (!operation || (operation.state !== "pending" && operation.state !== "retry") ||
            (operation.nextAttemptAt !== null && Date.parse(operation.nextAttemptAt) > Date.parse(timestamp))) {
          summary.skipped++;
          return undefined;
        }
        if (operation.attemptCount >= config.maxAttempts) {
          operation.state = "failed";
          operation.nextAttemptAt = null;
          operation.updatedAt = timestamp;
          operation.lastError = "Se alcanzó el límite máximo de intentos.";
          await this.storage.save(snapshot);
          summary.failed++;
          return undefined;
        }
        operation.state = "syncing";
        operation.updatedAt = timestamp;
        await this.storage.save(snapshot);
        return cloneOperation(operation);
      });
      if (!outgoing) continue;
      summary.processed++;

      let result: SyncTransportResult;
      try {
        result = await transport(cloneOperation(outgoing));
        if (result.kind === "success") {
          assertBaseVersion(result.serverVersion);
          assertValidDate(result.serverUpdatedAt, "serverUpdatedAt");
        } else if (result.kind === "conflict") {
          assertStoredInspection(result.remoteInspection);
          if (result.remoteInspection.id !== outgoing.entityId) {
            throw new TypeError("El conflicto remoto pertenece a otra inspección.");
          }
        } else if (result.kind !== "retryable-error" && result.kind !== "fatal-error") {
          throw new TypeError("Resultado de transporte no soportado.");
        }
      } catch (error) {
        result = { kind: "retryable-error", message: errorMessage(error) };
      }

      await this.serializeWrite(async () => {
        const snapshot = await this.storage.load();
        const operation = snapshot.operations.find((item) => item.id === id);
        if (!operation) { summary.skipped++; return; }
        const timestamp = assertValidDate(this.now(), "now");
        operation.updatedAt = timestamp;
        if (result.kind === "success") {
          snapshot.operations = snapshot.operations.filter((item) => item.id !== id);
          const current = snapshot.inspections.find((item) => item.id === operation.entityId);
          if (current && current.updatedAt === operation.payload.updatedAt &&
              sameDraft(current, operation.payload) &&
              !snapshot.operations.some((item) => item.entityId === current.id)) {
            current.version = result.serverVersion;
            current.serverVersion = result.serverVersion;
            current.serverUpdatedAt = result.serverUpdatedAt;
            current.syncState = "synced";
          }
          summary.succeeded++;
        } else if (result.kind === "conflict") {
          operation.state = "conflict";
          operation.nextAttemptAt = null;
          operation.conflict = {
            remoteInspection: JSON.parse(JSON.stringify(result.remoteInspection)) as StoredInspection,
            detectedAt: timestamp
          };
          summary.conflicts++;
        } else {
          operation.attemptCount++;
          operation.lastError = errorMessage(result.message);
          if (result.kind === "fatal-error" || operation.attemptCount >= config.maxAttempts) {
            operation.state = "failed";
            operation.nextAttemptAt = null;
            summary.failed++;
          } else {
            const delay = Math.min(config.baseDelayMs * 2 ** (operation.attemptCount - 1), config.maxDelayMs);
            operation.state = "retry";
            operation.nextAttemptAt = new Date(Date.parse(timestamp) + delay).toISOString();
            summary.retried++;
          }
        }
        await this.storage.save(snapshot);
      });
    }
    return summary;
  }

  registerOnlineSync(
    target: OnlineEventTarget,
    transport: SyncTransport,
    retryOptions: RetryOptions = {}
  ): () => void {
    const listener = () => {
      // Persisted operations remain available when storage or transport fails.
      // Call syncPending directly when the caller needs the observable summary.
      void this.syncPending(transport, retryOptions).catch(() => undefined);
    };
    target.addEventListener("online", listener);
    return () => target.removeEventListener("online", listener);
  }
}

export function createSyncQueue(options: SyncQueueOptions): InspectionSyncQueue {
  return new InspectionSyncQueue(options);
}
