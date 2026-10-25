import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSyncQueue, IdempotencyConflictError } from "../../src/lib/sync/queue";
import { fixedClock, inspectionDraft, MemorySyncStorage } from "../fixtures/inspections";

function setup() {
  const storage = new MemorySyncStorage();
  return { storage, queue: createSyncQueue({ storage, now: fixedClock }) };
}
const key = "unit-w08-synthetic-001";

describe("Regla de idempotencia de la cola", () => {
  it("la misma operación repetida conserva una inspección, una operación y una sola escritura", async () => {
    const { queue, storage } = setup();
    const first = await queue.enqueueInspection(inspectionDraft(), { idempotencyKey: key });
    const repeated = await queue.enqueueInspection(inspectionDraft(), { idempotencyKey: key });
    const snapshot = await storage.load();
    assert.deepEqual(repeated, first);
    assert.equal(snapshot.inspections.length, 1);
    assert.equal(snapshot.operations.length, 1);
    assert.equal(snapshot.operations[0].idempotencyKey, key);
    assert.equal(snapshot.inspections[0].syncState, "pending");
    assert.equal(storage.saves, 1);
  });
  it("reutilizar la clave con otro contenido falla y conserva la primera captura", async () => {
    const { queue, storage } = setup();
    await queue.enqueueInspection(inspectionDraft(), { idempotencyKey: key });
    const original = await storage.load();
    await assert.rejects(queue.enqueueInspection(inspectionDraft({ summary: "Otro dato sintético" }), { idempotencyKey: key }), IdempotencyConflictError);
    assert.deepEqual(await storage.load(), original);
  });
  it("rechaza reutilizar la clave para otra entidad", async () => {
    const { queue } = setup();
    await queue.enqueueInspection(inspectionDraft(), { idempotencyKey: key });
    await assert.rejects(queue.enqueueInspection(inspectionDraft({ id: "another-synthetic-id" }), { idempotencyKey: key }), IdempotencyConflictError);
  });
  it("dos envíos simultáneos de una captura tampoco duplican la operación", async () => {
    const { queue, storage } = setup();
    await Promise.all([
      queue.enqueueInspection(inspectionDraft(), { idempotencyKey: key }),
      queue.enqueueInspection(inspectionDraft(), { idempotencyKey: key })
    ]);
    assert.equal((await storage.load()).operations.length, 1);
    assert.equal(storage.saves, 1);
  });
  it("rechaza una clave inválida antes de escribir", async () => {
    const { queue, storage } = setup();
    await assert.rejects(queue.enqueueInspection(inspectionDraft(), { idempotencyKey: "bad" }), /idempotencyKey/);
    assert.equal(storage.saves, 0);
  });
  it("rechaza un borrador inválido antes de escribir", async () => {
    const { queue, storage } = setup();
    await assert.rejects(queue.enqueueInspection(inspectionDraft({ findings: -1 }), { idempotencyKey: key }), /findings/);
    assert.equal(storage.saves, 0);
  });
  it("rechaza una versión base negativa antes de escribir", async () => {
    const { queue, storage } = setup();
    await assert.rejects(queue.enqueueInspection(inspectionDraft(), { idempotencyKey: key, baseVersion: -1 }), /baseVersion/);
    assert.equal(storage.saves, 0);
  });
  it("un fallo al guardar se propaga y permite reintentar con la misma clave", async () => {
    const { queue, storage } = setup();
    storage.failNextSave = true;
    await assert.rejects(queue.enqueueInspection(inspectionDraft(), { idempotencyKey: key }), /Cuota sintética/);
    assert.equal((await storage.load()).inspections.length, 0);
    await queue.enqueueInspection(inspectionDraft(), { idempotencyKey: key });
    assert.equal((await storage.load()).operations.length, 1);
  });
  it("modificar la respuesta no altera el almacenamiento", async () => {
    const { queue, storage } = setup();
    const result = await queue.enqueueInspection(inspectionDraft(), { idempotencyKey: key });
    result.payload.summary = "Cambio externo sintético";
    assert.equal((await storage.load()).inspections[0].summary, inspectionDraft().summary);
  });
});
