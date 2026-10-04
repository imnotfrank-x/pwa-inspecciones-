export const SYNC_SCHEMA_VERSION = 1 as const;
export const SYNC_STORAGE_KEY = "utt-lab-inspections:sync:v1";

export type InspectionCondition = "ok" | "attention";
export type InspectionSyncState = "pending" | "synced" | "failed";
export type SyncOperationState =
  | "pending"
  | "syncing"
  | "retry"
  | "failed";

export type OfflineInspectionDraft = {
  id: string;
  location: string;
  inspectedAt: string;
  inspectorAlias: string;
  status: InspectionCondition;
  findings: number;
  summary: string;
};

export type StoredInspection = OfflineInspectionDraft & {
  version: number;
  updatedAt: string;
  syncState: InspectionSyncState;
};

export type SyncOperation = {
  id: string;
  idempotencyKey: string;
  entityId: string;
  type: "inspection.upsert";
  payload: StoredInspection;
  baseVersion: number;
  attemptCount: number;
  nextAttemptAt: string | null;
  state: SyncOperationState;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
};

export type SyncSnapshot = {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  inspections: StoredInspection[];
  operations: SyncOperation[];
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SyncStorage {
  load(): Promise<SyncSnapshot>;
  save(snapshot: SyncSnapshot): Promise<void>;
  clear(): Promise<void>;
}

export class SyncSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncSchemaError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(
  value: unknown,
  field: string,
  maxLength = 500
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maxLength
  ) {
    throw new SyncSchemaError(
      `${field} debe ser texto no vacío de máximo ${maxLength} caracteres.`
    );
  }
}

function assertIsoDate(value: unknown, field: string): asserts value is string {
  assertNonEmptyString(value, field, 40);

  if (!Number.isFinite(Date.parse(value))) {
    throw new SyncSchemaError(`${field} debe ser una fecha ISO válida.`);
  }
}

function assertNonNegativeInteger(
  value: unknown,
  field: string
): asserts value is number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new SyncSchemaError(`${field} debe ser un entero mayor o igual a cero.`);
  }
}

export function assertOfflineInspectionDraft(
  value: unknown
): asserts value is OfflineInspectionDraft {
  if (!isRecord(value)) {
    throw new SyncSchemaError("La inspección debe ser un objeto.");
  }

  assertNonEmptyString(value.id, "inspection.id", 120);
  assertNonEmptyString(value.location, "inspection.location", 160);
  assertIsoDate(value.inspectedAt, "inspection.inspectedAt");
  assertNonEmptyString(
    value.inspectorAlias,
    "inspection.inspectorAlias",
    120
  );

  if (value.status !== "ok" && value.status !== "attention") {
    throw new SyncSchemaError(
      'inspection.status debe ser "ok" o "attention".'
    );
  }

  assertNonNegativeInteger(value.findings, "inspection.findings");
  assertNonEmptyString(value.summary, "inspection.summary", 1000);
}

export function assertStoredInspection(
  value: unknown
): asserts value is StoredInspection {
  assertOfflineInspectionDraft(value);

  const inspection = value as unknown as Record<string, unknown>;
  assertNonNegativeInteger(inspection.version, "inspection.version");
  assertIsoDate(inspection.updatedAt, "inspection.updatedAt");

  if (
    inspection.syncState !== "pending" &&
    inspection.syncState !== "synced" &&
    inspection.syncState !== "failed"
  ) {
    throw new SyncSchemaError(
      'inspection.syncState debe ser "pending", "synced" o "failed".'
    );
  }
}

export function assertSyncOperation(
  value: unknown
): asserts value is SyncOperation {
  if (!isRecord(value)) {
    throw new SyncSchemaError("La operación de sincronización debe ser un objeto.");
  }

  assertNonEmptyString(value.id, "operation.id", 180);
  assertNonEmptyString(value.idempotencyKey, "operation.idempotencyKey", 128);
  assertNonEmptyString(value.entityId, "operation.entityId", 120);

  if (value.type !== "inspection.upsert") {
    throw new SyncSchemaError(
      'operation.type debe ser "inspection.upsert".'
    );
  }

  assertStoredInspection(value.payload);

  if (value.entityId !== value.payload.id) {
    throw new SyncSchemaError(
      "operation.entityId debe coincidir con operation.payload.id."
    );
  }

  assertNonNegativeInteger(value.baseVersion, "operation.baseVersion");
  assertNonNegativeInteger(value.attemptCount, "operation.attemptCount");

  if (value.nextAttemptAt !== null) {
    assertIsoDate(value.nextAttemptAt, "operation.nextAttemptAt");
  }

  if (
    value.state !== "pending" &&
    value.state !== "syncing" &&
    value.state !== "retry" &&
    value.state !== "failed"
  ) {
    throw new SyncSchemaError(
      "operation.state contiene un estado no soportado."
    );
  }

  assertIsoDate(value.createdAt, "operation.createdAt");
  assertIsoDate(value.updatedAt, "operation.updatedAt");

  if (value.lastError !== undefined) {
    assertNonEmptyString(value.lastError, "operation.lastError", 500);
  }
}

export function createEmptySyncSnapshot(): SyncSnapshot {
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    inspections: [],
    operations: []
  };
}

export function assertSyncSnapshot(
  value: unknown
): asserts value is SyncSnapshot {
  if (!isRecord(value)) {
    throw new SyncSchemaError("El estado local debe ser un objeto.");
  }

  if (value.schemaVersion !== SYNC_SCHEMA_VERSION) {
    throw new SyncSchemaError(
      `Versión de esquema no soportada: ${String(value.schemaVersion)}.`
    );
  }

  if (!Array.isArray(value.inspections) || !Array.isArray(value.operations)) {
    throw new SyncSchemaError(
      "El estado local debe contener arreglos de inspecciones y operaciones."
    );
  }

  value.inspections.forEach(assertStoredInspection);
  value.operations.forEach(assertSyncOperation);

  const inspectionIds = new Set(value.inspections.map(({ id }) => id));
  if (inspectionIds.size !== value.inspections.length) {
    throw new SyncSchemaError("El almacenamiento contiene inspecciones duplicadas.");
  }

  const operationIds = new Set(value.operations.map(({ id }) => id));
  if (operationIds.size !== value.operations.length) {
    throw new SyncSchemaError("El almacenamiento contiene operaciones duplicadas.");
  }

  const idempotencyKeys = new Set(
    value.operations.map(({ idempotencyKey }) => idempotencyKey)
  );
  if (idempotencyKeys.size !== value.operations.length) {
    throw new SyncSchemaError(
      "El almacenamiento contiene claves idempotentes duplicadas."
    );
  }
}

export function cloneSyncSnapshot(snapshot: SyncSnapshot): SyncSnapshot {
  assertSyncSnapshot(snapshot);
  return JSON.parse(JSON.stringify(snapshot)) as SyncSnapshot;
}

export function parseSyncSnapshot(serialized: string | null): SyncSnapshot {
  if (serialized === null) {
    return createEmptySyncSnapshot();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new SyncSchemaError("El estado local no contiene JSON válido.");
  }

  assertSyncSnapshot(parsed);
  return cloneSyncSnapshot(parsed);
}

export class JsonSyncStorage implements SyncStorage {
  constructor(
    private readonly storage: StorageLike,
    private readonly key = SYNC_STORAGE_KEY
  ) {}

  async load(): Promise<SyncSnapshot> {
    return parseSyncSnapshot(this.storage.getItem(this.key));
  }

  async save(snapshot: SyncSnapshot): Promise<void> {
    assertSyncSnapshot(snapshot);
    this.storage.setItem(this.key, JSON.stringify(snapshot));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.key);
  }
}

export function createBrowserSyncStorage(
  key = SYNC_STORAGE_KEY
): SyncStorage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new SyncSchemaError(
      "El almacenamiento local solo está disponible en el navegador."
    );
  }

  return new JsonSyncStorage(window.localStorage, key);
}
