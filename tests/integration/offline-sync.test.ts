import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inspectionDraftFromForm, type InspectionFormValues } from "../../src/lib/inspections/capture";
import {
  JsonSyncStorage,
  SYNC_STORAGE_KEY,
  parseSyncSnapshot,
  type StorageLike,
  type StoredInspection
} from "../../src/lib/storage/schema";
import { createSyncQueue } from "../../src/lib/sync/queue";
import { createSyntheticSyncReceiver } from "../../src/lib/sync/synthetic-transport";

class MapStorage implements StorageLike {
  private readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}

function createIntegrationContext(initialIso = "2026-10-25T12:00:00.000Z") {
  let currentMs = Date.parse(initialIso);
  const now = () => new Date(currentMs);
  const advance = (ms: number) => {
    currentMs += ms;
  };
  const rawStorage = new MapStorage();
  const storage = new JsonSyncStorage(rawStorage);
  const queue = createSyncQueue({ storage, now });
  const receiver = createSyntheticSyncReceiver({ now });

  return {
    now,
    advance,
    rawStorage,
    storage,
    queue,
    receiver
  };
}

const VALID_FORM: InspectionFormValues = {
  location: "Laboratorio Sintético de Integración",
  date: "2026-10-25",
  inspectorAlias: "Inspector Sintético J",
  status: "attention",
  findings: "2",
  summary: "Revisión sintética de integración offline y deduplicación."
};

describe("Integración de captura offline, persistencia JSON y transporte sintético", () => {
  it("guardado offline persiste una inspección y una operación pendiente en JSON con cero envíos", async () => {
    const { rawStorage, queue, receiver } = createIntegrationContext();
    const draft = inspectionDraftFromForm(VALID_FORM, "inspection-int-offline-001");

    await queue.enqueueInspection(draft, {
      idempotencyKey: "capture:inspection-int-offline-001"
    });

    const rawJson = rawStorage.getItem(SYNC_STORAGE_KEY);
    assert.ok(rawJson !== null, "debe serializar el snapshot en la clave de almacenamiento real");

    const persistedSnapshot = parseSyncSnapshot(rawJson);
    assert.equal(persistedSnapshot.inspections.length, 1);
    assert.equal(persistedSnapshot.inspections[0].id, "inspection-int-offline-001");
    assert.equal(persistedSnapshot.inspections[0].syncState, "pending");
    assert.equal(persistedSnapshot.operations.length, 1);
    assert.equal(persistedSnapshot.operations[0].state, "pending");
    assert.equal(
      persistedSnapshot.operations[0].idempotencyKey,
      "capture:inspection-int-offline-001"
    );
    assert.equal(receiver.attemptsReceived, 0);
    assert.equal(receiver.effectsApplied, 0);
  });

  it("otra instancia de JsonSyncStorage y cola recupera exactamente el mismo registro y clave idempotente", async () => {
    const { rawStorage, queue, now } = createIntegrationContext();
    const draft = inspectionDraftFromForm(VALID_FORM, "inspection-int-recovery-001");

    const createdOperation = await queue.enqueueInspection(draft, {
      idempotencyKey: "capture:inspection-int-recovery-001"
    });

    const reopenedStorage = new JsonSyncStorage(rawStorage);
    const reopenedQueue = createSyncQueue({ storage: reopenedStorage, now });
    const recoveredSnapshot = await reopenedQueue.getSnapshot();

    assert.equal(recoveredSnapshot.inspections.length, 1);
    assert.deepEqual(recoveredSnapshot.inspections[0], createdOperation.payload);
    assert.equal(recoveredSnapshot.operations.length, 1);
    assert.deepEqual(recoveredSnapshot.operations[0], createdOperation);
    assert.equal(
      recoveredSnapshot.operations[0].idempotencyKey,
      "capture:inspection-int-recovery-001"
    );
  });

  it("al sincronizar al reconectar aplica una sola vez y marca la inspección como synced sin operaciones pendientes", async () => {
    const { queue, receiver } = createIntegrationContext();
    const draft = inspectionDraftFromForm(VALID_FORM, "inspection-int-reconnect-001");

    await queue.enqueueInspection(draft, {
      idempotencyKey: "capture:inspection-int-reconnect-001"
    });

    const summary = await queue.syncPending(receiver.transport);
    const snapshot = await queue.getSnapshot();

    assert.equal(summary.succeeded, 1);
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 1);
    assert.equal(snapshot.inspections.length, 1);
    assert.equal(snapshot.inspections[0].syncState, "synced");
    assert.equal(snapshot.inspections[0].serverVersion, 1);
    assert.equal(snapshot.operations.length, 0);
    assert.equal(receiver.getAppliedInspections().length, 1);
  });

  it("ante un fallo recuperable conserva la operación, omite reintento prematuro y reenvía al vencer conservando identidad y contenido", async () => {
    const { queue, receiver, advance } = createIntegrationContext();
    const draft = inspectionDraftFromForm(VALID_FORM, "inspection-int-retry-001");

    const originalOperation = await queue.enqueueInspection(draft, {
      idempotencyKey: "capture:inspection-int-retry-001"
    });

    receiver.failNextRetryable("Caída temporal del enlace sintético.");
    const firstSummary = await queue.syncPending(receiver.transport);
    const afterFailure = await queue.getSnapshot();

    assert.equal(firstSummary.retried, 1);
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 0);
    assert.equal(afterFailure.inspections[0].syncState, "pending");
    assert.equal(afterFailure.operations.length, 1);
    assert.equal(afterFailure.operations[0].id, originalOperation.id);
    assert.equal(afterFailure.operations[0].idempotencyKey, originalOperation.idempotencyKey);
    assert.equal(afterFailure.operations[0].state, "retry");
    assert.equal(afterFailure.operations[0].attemptCount, 1);
    assert.equal(afterFailure.operations[0].nextAttemptAt, "2026-10-25T12:00:01.000Z");

    advance(999);
    const prematureSummary = await queue.syncPending(receiver.transport);
    assert.equal(prematureSummary.skipped, 1);
    assert.equal(prematureSummary.processed, 0);
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 0);

    advance(1);
    const dueSummary = await queue.syncPending(receiver.transport);
    const afterSuccess = await queue.getSnapshot();
    const processedRecord = receiver.getProcessedRecord(originalOperation.idempotencyKey);

    assert.equal(dueSummary.succeeded, 1);
    assert.equal(receiver.attemptsReceived, 2);
    assert.equal(receiver.effectsApplied, 1);
    assert.ok(processedRecord);
    assert.equal(processedRecord.operationId, originalOperation.id);
    assert.equal(processedRecord.fingerprint.entityId, originalOperation.entityId);
    assert.equal(processedRecord.fingerprint.payload.summary, originalOperation.payload.summary);
    assert.equal(afterSuccess.inspections.length, 1);
    assert.equal(afterSuccess.inspections[0].syncState, "synced");
    assert.equal(afterSuccess.operations.length, 0);
  });

  it("respuesta perdida: dos intentos recibidos producen un solo efecto remoto y dejan la inspección en synced", async () => {
    const { queue, receiver, advance } = createIntegrationContext();
    const draft = inspectionDraftFromForm(VALID_FORM, "inspection-int-lost-response-001");
    const idempotencyKey = "capture:inspection-int-lost-response-001";

    // 1. Guardar una inspección.
    await queue.enqueueInspection(draft, { idempotencyKey });

    // 2, 3 y 4. Enviar la operación; el receptor la aplica y se simula que se pierde la respuesta.
    receiver.loseNextResponse(" Se perdió la confirmación HTTP sintética.");
    const firstAttemptSummary = await queue.syncPending(receiver.transport);

    // 5. La cola conserva el trabajo para reintentar.
    const midSnapshot = await queue.getSnapshot();
    assert.equal(firstAttemptSummary.retried, 1);
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 1);
    assert.equal(midSnapshot.inspections.length, 1);
    assert.equal(midSnapshot.inspections[0].syncState, "pending");
    assert.equal(midSnapshot.operations.length, 1);
    assert.equal(midSnapshot.operations[0].state, "retry");
    assert.equal(midSnapshot.operations[0].attemptCount, 1);
    assert.equal(midSnapshot.operations[0].idempotencyKey, idempotencyKey);

    // 6. Avanzar el reloj hasta el siguiente intento.
    advance(1000);

    // 7 y 8. Reenviar la misma operación; el receptor reconoce la clave y devuelve el resultado original.
    const secondAttemptSummary = await queue.syncPending(receiver.transport);
    const finalSnapshot = await queue.getSnapshot();

    assert.equal(secondAttemptSummary.succeeded, 1);
    assert.equal(receiver.attemptsReceived, 2);
    assert.equal(receiver.effectsApplied, 1);
    assert.equal(finalSnapshot.inspections.length, 1);
    assert.equal(finalSnapshot.inspections[0].syncState, "synced");
    assert.equal(finalSnapshot.operations.length, 0);
    assert.equal(receiver.getAppliedInspections().length, 1);
  });

  it("reutilizar una clave idempotente ya aceptada con contenido diferente se rechaza sin alterar el resultado ni los datos originales", async () => {
    const { queue, receiver, now } = createIntegrationContext();
    const sharedKey = "capture:inspection-int-collision-001";
    const originalDraft = inspectionDraftFromForm(VALID_FORM, "inspection-int-collision-001");

    await queue.enqueueInspection(originalDraft, { idempotencyKey: sharedKey });
    await queue.syncPending(receiver.transport);

    const originalRecord = receiver.getProcessedRecord(sharedKey);
    const originalApplied = receiver.getAppliedInspection("inspection-int-collision-001");
    assert.ok(originalRecord);
    assert.ok(originalApplied);
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 1);

    // Otra cola intenta enviar contenido distinto reutilizando la misma clave idempotente.
    const secondQueue = createSyncQueue({
      storage: new JsonSyncStorage(new MapStorage()),
      now
    });
    const alteredDraft = inspectionDraftFromForm(
      { ...VALID_FORM, summary: "Contenido alterado con la misma clave." },
      "inspection-int-collision-001"
    );
    await secondQueue.enqueueInspection(alteredDraft, { idempotencyKey: sharedKey });

    const collisionSummary = await secondQueue.syncPending(receiver.transport);
    const secondSnapshot = await secondQueue.getSnapshot();

    assert.equal(collisionSummary.failed, 1);
    assert.equal(receiver.attemptsReceived, 2);
    assert.equal(receiver.effectsApplied, 1);
    assert.deepEqual(receiver.getProcessedRecord(sharedKey), originalRecord);
    assert.deepEqual(
      receiver.getAppliedInspection("inspection-int-collision-001"),
      originalApplied
    );
    assert.equal(secondSnapshot.operations.length, 1);
    assert.equal(secondSnapshot.operations[0].state, "failed");
    assert.match(secondSnapshot.operations[0].lastError ?? "", /contenido diferente/);
  });

  it("conserva un conflicto remoto sin informar éxito falso ni aplicar efectos adicionales", async () => {
    const { queue, receiver } = createIntegrationContext();
    const draft = inspectionDraftFromForm(VALID_FORM, "inspection-int-conflict-001");
    const remoteConflict: StoredInspection = {
      ...draft,
      summary: "Versión remota previa incompatible.",
      version: 3,
      updatedAt: "2026-10-25T11:59:00.000Z",
      syncState: "synced",
      serverVersion: 3,
      serverUpdatedAt: "2026-10-25T11:59:00.000Z"
    };

    receiver.seedRemoteInspection(remoteConflict);
    await queue.enqueueInspection(draft, {
      idempotencyKey: "capture:inspection-int-conflict-001"
    });

    const summary = await queue.syncPending(receiver.transport);
    const snapshot = await queue.getSnapshot();

    assert.equal(summary.conflicts, 1);
    assert.equal(summary.succeeded, 0);
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 0);
    assert.equal(snapshot.inspections[0].syncState, "pending");
    assert.equal(snapshot.operations.length, 1);
    assert.equal(snapshot.operations[0].state, "conflict");
    assert.deepEqual(snapshot.operations[0].conflict?.remoteInspection, remoteConflict);
  });
});
