import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JsonSyncStorage, type StorageLike } from "../../src/lib/storage/schema";
import { createSyncQueue } from "../../src/lib/sync/queue";
import { createSyncController } from "../../src/lib/sync/sync-controller";
import { createSyntheticSyncReceiver } from "../../src/lib/sync/synthetic-transport";
import { inspectionDraft, fixedClock } from "../fixtures/inspections";

class ControlledStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failNextWrite = false;
  failReads = false;
  getItem(key: string) {
    if (this.failReads) throw new Error("Lectura sintética no disponible");
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("QuotaExceededError sintético");
    }
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

function setup(initialOnline = true) {
  let online = initialOnline;
  const raw = new ControlledStorage();
  const queue = createSyncQueue({ storage: new JsonSyncStorage(raw), now: fixedClock });
  const receiver = createSyntheticSyncReceiver({ now: fixedClock });
  const target = new EventTarget();
  const controller = createSyncController({ queue, transport: receiver.transport, isOnline: () => online, target, now: fixedClock });
  return {
    raw, queue, receiver, controller, target,
    enqueue: (id: string) => controller.enqueueDraft(inspectionDraft({ id }), { idempotencyKey: `regression:${id}` }),
    setOnline(value: boolean) {
      online = value;
      target.dispatchEvent(new Event(value ? "online" : "offline"));
    }
  };
}

describe("Regresiones de conectividad, almacenamiento y ciclo de vida", () => {
  it("la cola restaura el estado sin gastar intentos si se pausa justo antes de llamar al transporte", async () => {
    const f = setup();
    try {
      await f.controller.start();
      await f.enqueue("pause-before-send");
      const before = await f.queue.getSnapshot();
      let canSend = true;
      const summary = await f.queue.syncPending(f.receiver.transport, {}, {
        shouldContinue: () => canSend,
        onSending: () => { canSend = false; }
      });
      assert.equal(summary.processed, 0);
      assert.equal(f.receiver.attemptsReceived, 0);
      assert.deepEqual(await f.queue.getSnapshot(), before);
      await f.controller.syncPending();
      assert.equal(f.receiver.effectsApplied, 1);
    } finally { f.controller.dispose(); }
  });

  it("la acción manual offline conserva la operación exacta sin enviar ni consumir intentos", async () => {
    const f = setup(false);
    try {
      await f.controller.start();
      await f.enqueue("offline");
      const before = await f.queue.getSnapshot();
      const summary = await f.controller.syncPending();
      assert.equal(f.receiver.attemptsReceived, 0);
      assert.equal(summary.processed, 0);
      assert.deepEqual(await f.queue.getSnapshot(), before);
      assert.equal(f.controller.getState().items[0].visualState, "pending");
      f.setOnline(true);
      await f.controller.syncPending();
      assert.equal(f.receiver.effectsApplied, 1);
      assert.equal(f.controller.getState().items[0].visualState, "synced");
    } finally { f.controller.dispose(); }
  });

  for (const stop of ["offline", "dispose"] as const) {
    for (const timing of ["mismo lote", "captura durante envío"] as const) {
      it(`${stop}: termina solo el envío iniciado y conserva el siguiente (${timing})`, async () => {
        const f = setup();
        const entered = deferred();
        const release = deferred();
        try {
          await f.controller.start();
          await f.enqueue("first");
          if (timing === "mismo lote") await f.enqueue("second");
          f.receiver.setBeforeReceive(async () => { entered.resolve(); await release.promise; });
          const running = f.controller.syncPending();
          await entered.promise;
          if (timing === "captura durante envío") await f.enqueue("second");
          const secondBefore = (await f.queue.getSnapshot()).operations.find(op => op.entityId === "second");
          if (stop === "offline") f.setOnline(false);
          else f.controller.dispose();
          release.resolve();
          await running;
          assert.equal(f.receiver.attemptsReceived, 1);
          assert.equal(f.receiver.effectsApplied, 1);
          const snapshot = await f.queue.getSnapshot();
          assert.equal(snapshot.inspections.find(i => i.id === "first")?.syncState, "synced");
          assert.equal(snapshot.operations.length, 1);
          assert.deepEqual(snapshot.operations[0], secondBefore);
          await f.controller.syncPending();
          assert.equal(f.receiver.attemptsReceived, 1);
          if (stop === "offline") {
            f.setOnline(true);
            await f.controller.syncPending();
          } else {
            const next = createSyncController({ queue: f.queue, transport: f.receiver.transport, isOnline: () => true, now: fixedClock });
            try { await next.start(); } finally { next.dispose(); }
          }
          assert.equal(f.receiver.effectsApplied, 2);
          assert.equal((await f.queue.getSnapshot()).operations.length, 0);
        } finally { release.resolve(); f.controller.dispose(); }
      });
    }
  }

  it("un fallo al persistir la confirmación libera la UI y reintenta con la misma clave sin duplicar", async () => {
    const f = setup();
    try {
      await f.controller.start();
      await f.enqueue("confirmation");
      const original = (await f.queue.getSnapshot()).operations[0];
      f.receiver.setBeforeReceive(() => { f.raw.failNextWrite = true; });
      await assert.rejects(f.controller.syncPending(), /QuotaExceededError/);
      const state = f.controller.getState();
      assert.equal(state.syncing, false);
      assert.notEqual(state.errorMessage, "");
      assert.notEqual(state.items[0].label, "Sincronizando…");
      const persisted = await f.queue.getSnapshot();
      assert.equal(persisted.inspections[0].syncState, "pending");
      assert.equal(persisted.operations[0].idempotencyKey, original.idempotencyKey);
      assert.equal(f.receiver.effectsApplied, 1);
      f.receiver.setBeforeReceive(undefined);
      await f.controller.syncPending();
      assert.equal(f.receiver.attemptsReceived, 2);
      assert.equal(f.receiver.effectsApplied, 1);
      assert.equal((await f.queue.getSnapshot()).operations.length, 0);
      assert.equal(f.controller.getState().errorMessage, "");
    } finally { f.controller.dispose(); }
  });

  it("un fallo antes del envío o una lectura inaccesible no bloquea la recuperación", async () => {
    const f = setup();
    try {
      await f.controller.start();
      await f.enqueue("before-send");
      const before = await f.queue.getSnapshot();
      f.raw.failNextWrite = true;
      await assert.rejects(f.controller.syncPending(), /QuotaExceededError/);
      assert.equal(f.controller.getState().syncing, false);
      assert.notEqual(f.controller.getState().errorMessage, "");
      assert.deepEqual(await f.queue.getSnapshot(), before);
      f.raw.failReads = true;
      await assert.rejects(f.controller.syncPending(), /Lectura sintética/);
      assert.equal(f.controller.getState().syncing, false);
      assert.equal(f.controller.getState().snapshot.inspections.length, 1);
      assert.equal(f.receiver.attemptsReceived, 0);
      f.raw.failReads = false;
      await f.controller.syncPending();
      assert.equal(f.receiver.effectsApplied, 1);
    } finally { f.controller.dispose(); }
  });

  it("el listener online comunica el fallo sin producir una promesa rechazada sin manejar", async () => {
    const f = setup(false);
    try {
      await f.controller.start();
      await f.enqueue("online-error");
      f.raw.failNextWrite = true;
      const reported = deferred();
      f.controller.subscribe(state => { if (state.errorMessage && !state.syncing) reported.resolve(); });
      f.setOnline(true);
      await reported.promise;
      // Node detectaría un unhandledRejection al finalizar este turno del event loop.
      await new Promise<void>(resolve => setImmediate(resolve));
      assert.equal(f.controller.getState().syncing, false);
      assert.equal(f.receiver.attemptsReceived, 0);
      await f.controller.syncPending();
      assert.equal(f.receiver.effectsApplied, 1);
    } finally { f.controller.dispose(); }
  });

  it("el inicio con pendientes mantiene la captura disponible si falla la sincronización inicial", async () => {
    const f = setup();
    try {
      await f.queue.enqueueInspection(inspectionDraft({ id: "boot-error" }), { idempotencyKey: "regression:boot-error" });
      f.raw.failNextWrite = true;
      const state = await f.controller.start();
      assert.equal(state.ready, true);
      assert.equal(state.syncing, false);
      assert.notEqual(state.errorMessage, "");
      assert.equal(f.receiver.attemptsReceived, 0);
      await f.controller.syncPending();
      assert.equal(f.receiver.effectsApplied, 1);
    } finally { f.controller.dispose(); }
  });
});
