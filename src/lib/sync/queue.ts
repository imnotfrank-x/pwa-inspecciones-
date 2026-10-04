import {
  assertOfflineInspectionDraft,
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
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
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
}

export function createSyncQueue(options: SyncQueueOptions): InspectionSyncQueue {
  return new InspectionSyncQueue(options);
}
