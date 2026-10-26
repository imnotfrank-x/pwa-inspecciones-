import {
  assertStoredInspection,
  assertSyncOperation,
  type InspectionCondition,
  type StoredInspection,
  type SyncOperation
} from "../storage/schema";
import type { SyncTransport, SyncTransportResult } from "./queue";

// Límite explícito: el receptor simula un sistema remoto en memoria, separado del
// almacenamiento local, pero no es un servidor durable. Su memoria puede perderse al
// recargar o reiniciar y no representa un backend de producción.

export type OperationContentFingerprint = {
  entityId: string;
  type: SyncOperation["type"];
  baseVersion: number;
  payload: {
    id: string;
    location: string;
    inspectedAt: string;
    inspectorAlias: string;
    status: InspectionCondition;
    findings: number;
    summary: string;
  };
};

export type ProcessedIdempotencyRecord = {
  idempotencyKey: string;
  operationId: string;
  fingerprint: OperationContentFingerprint;
  result: Extract<SyncTransportResult, { kind: "success" }>;
  appliedInspection: StoredInspection;
};

export type SyntheticReceiverSnapshot = {
  attemptsReceived: number;
  effectsApplied: number;
  inspections: StoredInspection[];
  processedKeys: ProcessedIdempotencyRecord[];
};

export type SyntheticReceiverOptions = {
  now?: () => Date;
  beforeReceive?: (operation: SyncOperation) => Promise<void> | void;
};

type PlannedSyntheticOutcome =
  | { kind: "retryable-error"; message: string }
  | { kind: "fatal-error"; message: string }
  | { kind: "conflict"; remoteInspection: StoredInspection }
  | { kind: "lost-response"; message: string };

function cloneInspection(inspection: StoredInspection): StoredInspection {
  return JSON.parse(JSON.stringify(inspection)) as StoredInspection;
}

function cloneRecord(record: ProcessedIdempotencyRecord): ProcessedIdempotencyRecord {
  return JSON.parse(JSON.stringify(record)) as ProcessedIdempotencyRecord;
}

export function extractOperationFingerprint(
  operation: SyncOperation
): OperationContentFingerprint {
  assertSyncOperation(operation);
  return {
    entityId: operation.entityId,
    type: operation.type,
    baseVersion: operation.baseVersion,
    payload: {
      id: operation.payload.id,
      location: operation.payload.location,
      inspectedAt: operation.payload.inspectedAt,
      inspectorAlias: operation.payload.inspectorAlias,
      status: operation.payload.status,
      findings: operation.payload.findings,
      summary: operation.payload.summary
    }
  };
}

export function sameOperationFingerprint(
  left: OperationContentFingerprint,
  right: OperationContentFingerprint
): boolean {
  return (
    left.entityId === right.entityId &&
    left.type === right.type &&
    left.baseVersion === right.baseVersion &&
    left.payload.id === right.payload.id &&
    left.payload.location === right.payload.location &&
    left.payload.inspectedAt === right.payload.inspectedAt &&
    left.payload.inspectorAlias === right.payload.inspectorAlias &&
    left.payload.status === right.payload.status &&
    left.payload.findings === right.payload.findings &&
    left.payload.summary === right.payload.summary
  );
}

export class SyntheticSyncReceiver {
  private readonly now: () => Date;
  private beforeReceiveHook?: (operation: SyncOperation) => Promise<void> | void;
  private readonly processedKeys = new Map<string, ProcessedIdempotencyRecord>();
  private readonly appliedInspections = new Map<string, StoredInspection>();
  private readonly plannedOutcomes: PlannedSyntheticOutcome[] = [];
  private attemptsCount = 0;
  private effectsCount = 0;

  readonly transport: SyncTransport = (operation: SyncOperation) =>
    this.receive(operation);

  constructor(options: SyntheticReceiverOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.beforeReceiveHook = options.beforeReceive;
  }

  get attemptsReceived(): number {
    return this.attemptsCount;
  }

  get effectsApplied(): number {
    return this.effectsCount;
  }

  setBeforeReceive(
    hook: ((operation: SyncOperation) => Promise<void> | void) | undefined
  ): void {
    this.beforeReceiveHook = hook;
  }

  failNextRetryable(message = "Fallo temporal sintético de red."): void {
    this.plannedOutcomes.push({ kind: "retryable-error", message });
  }

  failNextFatal(message = "Rechazo definitivo del receptor sintético."): void {
    this.plannedOutcomes.push({ kind: "fatal-error", message });
  }

  conflictNext(remoteInspection: StoredInspection): void {
    assertStoredInspection(remoteInspection);
    this.plannedOutcomes.push({
      kind: "conflict",
      remoteInspection: cloneInspection(remoteInspection)
    });
  }

  loseNextResponse(
    message = "Respuesta perdida después de aplicar la operación en el receptor sintético."
  ): void {
    this.plannedOutcomes.push({ kind: "lost-response", message });
  }

  seedRemoteInspection(inspection: StoredInspection): void {
    assertStoredInspection(inspection);
    this.appliedInspections.set(inspection.id, cloneInspection(inspection));
  }

  getAppliedInspection(id: string): StoredInspection | undefined {
    const found = this.appliedInspections.get(id);
    return found ? cloneInspection(found) : undefined;
  }

  getAppliedInspections(): StoredInspection[] {
    return Array.from(this.appliedInspections.values(), cloneInspection);
  }

  getProcessedRecord(idempotencyKey: string): ProcessedIdempotencyRecord | undefined {
    const found = this.processedKeys.get(idempotencyKey);
    return found ? cloneRecord(found) : undefined;
  }

  getSnapshot(): SyntheticReceiverSnapshot {
    return {
      attemptsReceived: this.attemptsCount,
      effectsApplied: this.effectsCount,
      inspections: this.getAppliedInspections(),
      processedKeys: Array.from(this.processedKeys.values(), cloneRecord)
    };
  }

  async receive(operation: SyncOperation): Promise<SyncTransportResult> {
    assertSyncOperation(operation);
    this.attemptsCount += 1;

    if (this.beforeReceiveHook) {
      await this.beforeReceiveHook(JSON.parse(JSON.stringify(operation)) as SyncOperation);
    }

    const nextPlanned = this.plannedOutcomes[0];
    if (nextPlanned && nextPlanned.kind !== "lost-response") {
      this.plannedOutcomes.shift();
      if (nextPlanned.kind === "conflict") {
        return {
          kind: "conflict",
          remoteInspection: cloneInspection(nextPlanned.remoteInspection)
        };
      }
      return { ...nextPlanned };
    }

    const fingerprint = extractOperationFingerprint(operation);
    const existing = this.processedKeys.get(operation.idempotencyKey);
    if (existing) {
      if (!sameOperationFingerprint(existing.fingerprint, fingerprint)) {
        return {
          kind: "fatal-error",
          message: `La clave idempotente ${operation.idempotencyKey} ya fue registrada con contenido diferente.`
        };
      }

      return { ...existing.result };
    }

    const currentRemote = this.appliedInspections.get(operation.entityId);
    if (currentRemote && currentRemote.version !== operation.baseVersion) {
      return {
        kind: "conflict",
        remoteInspection: cloneInspection(currentRemote)
      };
    }

    this.effectsCount += 1;
    const serverVersion = Math.max(currentRemote?.version ?? 0, operation.baseVersion) + 1;
    const serverUpdatedAt = this.now().toISOString();
    const appliedInspection: StoredInspection = {
      ...cloneInspection(operation.payload),
      version: serverVersion,
      syncState: "synced",
      serverVersion,
      serverUpdatedAt
    };

    const result: Extract<SyncTransportResult, { kind: "success" }> = {
      kind: "success",
      serverVersion,
      serverUpdatedAt
    };

    this.appliedInspections.set(operation.entityId, appliedInspection);
    this.processedKeys.set(operation.idempotencyKey, {
      idempotencyKey: operation.idempotencyKey,
      operationId: operation.id,
      fingerprint,
      result,
      appliedInspection: cloneInspection(appliedInspection)
    });

    const nextAfterApply = this.plannedOutcomes[0];
    if (nextAfterApply?.kind === "lost-response") {
      this.plannedOutcomes.shift();
      return {
        kind: "retryable-error",
        message: nextAfterApply.message
      };
    }

    return { ...result };
  }
}

export function createSyntheticSyncReceiver(
  options: SyntheticReceiverOptions = {}
): SyntheticSyncReceiver {
  return new SyntheticSyncReceiver(options);
}

export function createSyntheticTransport(
  options: SyntheticReceiverOptions = {}
): SyncTransport {
  return createSyntheticSyncReceiver(options).transport;
}
