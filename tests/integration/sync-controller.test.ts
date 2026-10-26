import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { InspectionCapture } from "../../src/components/inspection-capture";
import { inspectionDraftFromForm, type InspectionFormValues } from "../../src/lib/inspections/capture";
import {
  JsonSyncStorage,
  SYNC_STORAGE_KEY,
  parseSyncSnapshot,
  type StorageLike,
  type StoredInspection
} from "../../src/lib/storage/schema";
import { createSyncQueue } from "../../src/lib/sync/queue";
import {
  createSyncController,
  type ConnectivityEventTarget,
  type SyncControllerState
} from "../../src/lib/sync/sync-controller";
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

class FakeConnectivityTarget implements ConnectivityEventTarget {
  private readonly listeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, listener: () => void): void {
    const set = this.listeners.get(type) ?? new Set<() => void>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  emit(type: "online" | "offline"): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of Array.from(set)) {
      listener();
    }
  }
}

const SAMPLE_FORM: InspectionFormValues = {
  location: "Laboratorio Sintético B",
  date: "2026-10-25",
  inspectorAlias: "Inspector Sintético B",
  status: "ok",
  findings: "0",
  summary: "Captura sintética coordinada con el controlador."
};

function setupControllerTest(initialOnline = false, initialIso = "2026-10-25T15:00:00.000Z") {
  let currentMs = Date.parse(initialIso);
  let online = initialOnline;
  const now = () => new Date(currentMs);
  const advance = (ms: number) => {
    currentMs += ms;
  };
  const rawStorage = new MapStorage();
  const storage = new JsonSyncStorage(rawStorage);
  const queue = createSyncQueue({ storage, now });
  const receiver = createSyntheticSyncReceiver({ now });
  const target = new FakeConnectivityTarget();
  const controller = createSyncController({
    queue,
    transport: receiver.transport,
    target,
    isOnline: () => online,
    now
  });

  return {
    now,
    advance,
    rawStorage,
    storage,
    queue,
    receiver,
    target,
    controller,
    setOnline(next: boolean) {
      online = next;
      target.emit(next ? "online" : "offline");
    }
  };
}

function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("Integración del controlador de sincronización y la interfaz", () => {
  it("guarda sin conexión sin enviar y sincroniza una sola vez al recibir el evento online", async () => {
    const { controller, receiver, setOnline } = setupControllerTest(false);
    await controller.start();

    const draft = inspectionDraftFromForm(SAMPLE_FORM, "inspection-ctrl-offline-001");
    const saved = await controller.saveInspection(draft, {
      idempotencyKey: "capture:inspection-ctrl-offline-001"
    });

    assert.equal(saved.summary, null);
    assert.equal(receiver.attemptsReceived, 0);
    assert.equal(receiver.effectsApplied, 0);
    assert.equal(saved.state.items.length, 1);
    assert.equal(saved.state.items[0].label, "Pendiente de sincronización");

    setOnline(true);
    await controller.syncPending();

    const finalState = controller.getState();
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 1);
    assert.equal(finalState.items.length, 1);
    assert.equal(finalState.items[0].label, "Sincronizada");
    assert.equal(finalState.snapshot.inspections[0].syncState, "synced");
    assert.equal(finalState.snapshot.operations.length, 0);
    controller.dispose();
  });

  it("procesa automáticamente operaciones pendientes al iniciar el controlador con conexión", async () => {
    const { rawStorage, now, receiver } = setupControllerTest(false);
    const firstQueue = createSyncQueue({ storage: new JsonSyncStorage(rawStorage), now });
    const draft = inspectionDraftFromForm(SAMPLE_FORM, "inspection-ctrl-boot-001");
    await firstQueue.enqueueInspection(draft, {
      idempotencyKey: "capture:inspection-ctrl-boot-001"
    });

    const reopenedQueue = createSyncQueue({ storage: new JsonSyncStorage(rawStorage), now });
    const onlineController = createSyncController({
      queue: reopenedQueue,
      transport: receiver.transport,
      target: new FakeConnectivityTarget(),
      isOnline: () => true,
      now
    });

    const initialState = await onlineController.start();
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 1);
    assert.equal(initialState.items.length, 1);
    assert.equal(initialState.items[0].label, "Sincronizada");
    assert.equal(initialState.snapshot.operations.length, 0);
    onlineController.dispose();
  });

  it("la sincronización manual conserva clave e intentos, respeta nextAttemptAt y recupera el envío cuando vence", async () => {
    const { controller, receiver, advance } = setupControllerTest(true);
    await controller.start();

    receiver.failNextRetryable("Servidor sintético ocupado.");
    const draft = inspectionDraftFromForm(SAMPLE_FORM, "inspection-ctrl-manual-001");
    await controller.saveInspection(draft, {
      idempotencyKey: "capture:inspection-ctrl-manual-001"
    });

    const retryState = controller.getState();
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 0);
    assert.equal(retryState.items[0].label, "Pendiente de reintento");
    assert.equal(retryState.snapshot.operations.length, 1);
    assert.equal(retryState.snapshot.operations[0].attemptCount, 1);
    assert.equal(
      retryState.snapshot.operations[0].idempotencyKey,
      "capture:inspection-ctrl-manual-001"
    );

    // Intento manual antes de nextAttemptAt: no reenvía ni reinicia attemptCount.
    advance(500);
    const earlySummary = await controller.syncPending();
    const afterEarly = controller.getState();
    assert.equal(earlySummary.skipped, 1);
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(afterEarly.snapshot.operations.length, 1);
    assert.equal(afterEarly.snapshot.operations[0].attemptCount, 1);
    assert.equal(
      afterEarly.snapshot.operations[0].idempotencyKey,
      "capture:inspection-ctrl-manual-001"
    );

    // Intento manual una vez vencido nextAttemptAt: recupera el procesamiento sin recargar.
    advance(500);
    const manualSummary = await controller.syncPending();
    const finalState = controller.getState();
    assert.equal(manualSummary.succeeded, 1);
    assert.equal(receiver.attemptsReceived, 2);
    assert.equal(receiver.effectsApplied, 1);
    assert.equal(finalState.items[0].label, "Sincronizada");
    assert.equal(finalState.snapshot.operations.length, 0);
    controller.dispose();
  });

  it("expone los seis estados visibles consultando las operaciones del snapshot y no solo syncState de la inspección", async () => {
    const { controller, receiver, setOnline } = setupControllerTest(false);
    await controller.start();

    const observedLabels: string[] = [];
    controller.subscribe((next) => {
      if (next.items[0]) {
        observedLabels.push(next.items[0].label);
      }
    });

    const draft1 = inspectionDraftFromForm(SAMPLE_FORM, "inspection-ctrl-states-001");
    await controller.saveInspection(draft1, {
      idempotencyKey: "capture:inspection-ctrl-states-001"
    });
    assert.equal(controller.getState().items[0].label, "Pendiente de sincronización");

    // 1. Fallo recuperable -> "Pendiente de reintento" (mientras pasa por "Sincronizando…").
    receiver.failNextRetryable("Fallo temporal.");
    setOnline(true);
    await controller.syncPending();
    assert.ok(observedLabels.includes("Sincronizando…"));
    assert.equal(controller.getState().items[0].label, "Pendiente de reintento");
    assert.equal(controller.getState().snapshot.inspections[0].syncState, "pending");

    // 2. Fallo fatal en segunda inspección -> "Error de sincronización".
    const draft2 = inspectionDraftFromForm(SAMPLE_FORM, "inspection-ctrl-states-002");
    await controller.enqueueDraft(draft2, {
      idempotencyKey: "capture:inspection-ctrl-states-002"
    });
    receiver.failNextFatal("Error definitivo sintético.");
    await controller.syncPending();
    const item2 = controller
      .getState()
      .items.find((item) => item.inspection.id === "inspection-ctrl-states-002");
    assert.equal(item2?.label, "Error de sincronización");
    assert.match(controller.getState().errorMessage, /Error de sincronización/);

    // 3. Conflicto en tercera inspección -> "Conflicto pendiente".
    const draft3 = inspectionDraftFromForm(SAMPLE_FORM, "inspection-ctrl-states-003");
    const remoteConflict: StoredInspection = {
      ...draft3,
      summary: "Remota previa en conflicto.",
      version: 5,
      updatedAt: "2026-10-25T14:00:00.000Z",
      syncState: "synced",
      serverVersion: 5,
      serverUpdatedAt: "2026-10-25T14:00:00.000Z"
    };
    receiver.seedRemoteInspection(remoteConflict);
    await controller.enqueueDraft(draft3, {
      idempotencyKey: "capture:inspection-ctrl-states-003"
    });
    await controller.syncPending();
    const item3 = controller
      .getState()
      .items.find((item) => item.inspection.id === "inspection-ctrl-states-003");
    assert.equal(item3?.label, "Conflicto pendiente");

    // 4. Éxito en cuarta inspección -> "Sincronizada".
    const draft4 = inspectionDraftFromForm(SAMPLE_FORM, "inspection-ctrl-states-004");
    await controller.enqueueDraft(draft4, {
      idempotencyKey: "capture:inspection-ctrl-states-004"
    });
    await controller.syncPending();
    const item4 = controller
      .getState()
      .items.find((item) => item.inspection.id === "inspection-ctrl-states-004");
    assert.equal(item4?.label, "Sincronizada");
    controller.dispose();
  });

  it("eventos concurrentes online y llamadas manuales simultáneas no producen envíos duplicados del mismo trabajo", async () => {
    const { controller, receiver, target, setOnline } = setupControllerTest(false);
    await controller.start();
    assert.equal(target.listenerCount("online"), 1, "solo debe registrarse un listener online");

    const draft = inspectionDraftFromForm(SAMPLE_FORM, "inspection-ctrl-concurrent-001");
    await controller.saveInspection(draft, {
      idempotencyKey: "capture:inspection-ctrl-concurrent-001"
    });

    const enteredFlight = createDeferred();
    const releaseFlight = createDeferred();
    receiver.setBeforeReceive(async () => {
      enteredFlight.resolve();
      await releaseFlight.promise;
    });

    setOnline(true);
    const manual1 = controller.syncPending();
    const manual2 = controller.syncPending();
    target.emit("online");

    await enteredFlight.promise;
    assert.equal(receiver.attemptsReceived, 1);

    releaseFlight.resolve();
    const [summary1, summary2] = await Promise.all([manual1, manual2]);

    assert.deepEqual(summary1, summary2);
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 1);
    assert.equal(controller.getState().items[0].label, "Sincronizada");
    controller.dispose();
  });

  it("una nueva captura guardada mientras hay un envío activo no queda olvidada y también se sincroniza", async () => {
    const { controller, receiver } = setupControllerTest(true);
    await controller.start();

    const firstEntered = createDeferred();
    const releaseFirst = createDeferred();
    let hookCalls = 0;
    receiver.setBeforeReceive(async () => {
      hookCalls += 1;
      if (hookCalls === 1) {
        firstEntered.resolve();
        await releaseFirst.promise;
      }
    });

    const draft1 = inspectionDraftFromForm(SAMPLE_FORM, "inspection-ctrl-inflight-001");
    const firstSavePromise = controller.saveInspection(draft1, {
      idempotencyKey: "capture:inspection-ctrl-inflight-001"
    });

    await firstEntered.promise;
    assert.equal(controller.getState().syncing, true);

    const draft2 = inspectionDraftFromForm(
      { ...SAMPLE_FORM, summary: "Segunda captura durante envío activo." },
      "inspection-ctrl-inflight-002"
    );
    const secondSavePromise = controller.saveInspection(draft2, {
      idempotencyKey: "capture:inspection-ctrl-inflight-002"
    });

    releaseFirst.resolve();
    await Promise.all([firstSavePromise, secondSavePromise]);

    const finalState = controller.getState();
    assert.equal(receiver.attemptsReceived, 2);
    assert.equal(receiver.effectsApplied, 2);
    assert.equal(finalState.snapshot.operations.length, 0);
    assert.equal(finalState.items.length, 2);
    assert.ok(finalState.items.every((item) => item.label === "Sincronizada"));
    controller.dispose();
  });

  it("al desmontar limpia listeners, evita actualizar la instancia destruida y conserva el trabajo pendiente", async () => {
    const { controller, receiver, target, rawStorage, now } = setupControllerTest(false);
    await controller.start();

    const draft = inspectionDraftFromForm(SAMPLE_FORM, "inspection-ctrl-dispose-001");
    await controller.saveInspection(draft, {
      idempotencyKey: "capture:inspection-ctrl-dispose-001"
    });

    const updatesAfterDispose: SyncControllerState[] = [];
    controller.subscribe((next) => updatesAfterDispose.push(next));

    assert.equal(target.listenerCount("online"), 1);
    assert.equal(target.listenerCount("offline"), 1);

    controller.dispose();

    assert.equal(target.listenerCount("online"), 0);
    assert.equal(target.listenerCount("offline"), 0);

    target.emit("online");
    assert.equal(receiver.attemptsReceived, 0);
    assert.equal(updatesAfterDispose.length, 0);

    // Otra instancia montada posteriormente recupera y sincroniza el trabajo pendiente conservado en JSON.
    const nextController = createSyncController({
      queue: createSyncQueue({ storage: new JsonSyncStorage(rawStorage), now }),
      transport: receiver.transport,
      target: new FakeConnectivityTarget(),
      isOnline: () => true,
      now
    });
    const recoveredState = await nextController.start();
    assert.equal(receiver.attemptsReceived, 1);
    assert.equal(receiver.effectsApplied, 1);
    assert.equal(recoveredState.items[0].label, "Sincronizada");
    nextController.dispose();
  });

  it("integra el componente InspectionCapture con guardado offline, botón Sincronizar pendientes y conservación ante fallo de envío", async () => {
    const persisted = new Map<string, string>();
    const target = new FakeConnectivityTarget();
    let online = false;
    let uuidCounter = 0;
    let currentTime = Date.parse("2026-10-25T16:00:00.000Z");
    let failNextWrite = false;
    const now = () => new Date(currentTime);
    const receiver = createSyntheticSyncReceiver({
      now
    });

    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        addEventListener: (type: string, listener: () => void) => target.addEventListener(type, listener),
        removeEventListener: (type: string, listener: () => void) => target.removeEventListener(type, listener),
        localStorage: {
          getItem: (key: string) => persisted.get(key) ?? null,
          setItem: (key: string, value: string) => {
            if (failNextWrite) {
              failNextWrite = false;
              throw new Error("Cuota sintética agotada al confirmar");
            }
            persisted.set(key, value);
          },
          removeItem: (key: string) => persisted.delete(key)
        }
      }
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        get onLine() {
          return online;
        }
      }
    });
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        randomUUID: () => `int-uuid-${++uuidCounter}`
      }
    });

    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => {
        renderer = create(
          createElement(InspectionCapture, {
            transport: receiver.transport,
            now
          })
        );
      });

      // Llenar y guardar primera inspección sin conexión.
      await act(async () => {
        renderer!.root.findByProps({ type: "date" }).props.onChange({ target: { value: "2026-10-25" } });
        renderer!.root.findByType("textarea").props.onChange({ target: { value: "Primera captura offline en componente." } });
      });
      await act(async () => {
        await renderer!.root.findByType("form").props.onSubmit({ preventDefault() {} });
      });

      assert.equal(receiver.attemptsReceived, 0);
      const firstRow = renderer!.root.findAll(
        (node) => node.type === "li" && node.props["data-inspection-id"] === "inspection-local-int-uuid-1"
      )[0];
      assert.ok(firstRow);
      assert.equal(firstRow.findByType("strong").children.join(""), "Pendiente de sincronización");

      // Offline: el botón queda deshabilitado y ni invocar su handler puede enviar.
      const syncButton = renderer!.root.findAll(
        (node) => node.type === "button" && node.children.join("") === "Sincronizar pendientes"
      )[0];
      assert.ok(syncButton, "debe existir el botón Sincronizar pendientes");
      assert.equal(syncButton.props.disabled, true);

      await act(async () => {
        await syncButton.props.onClick();
      });

      assert.equal(receiver.attemptsReceived, 0);
      assert.equal(firstRow.findByType("strong").children.join(""), "Pendiente de sincronización");
      online = true;
      await act(async () => { target.emit("online"); });
      assert.equal(receiver.attemptsReceived, 1);
      assert.equal(receiver.effectsApplied, 1);
      assert.equal(firstRow.findByType("strong").children.join(""), "Sincronizada");

      // Preparar segunda captura con "Nueva inspección" estando online, simulando fallo de envío.
      const newButton = renderer!.root.findAll(
        (node) => node.type === "button" && node.children.join("") === "Nueva inspección"
      )[0];
      await act(async () => {
        newButton.props.onClick();
      });

      receiver.failNextRetryable("Enlace inestable al guardar segunda inspección.");
      await act(async () => {
        renderer!.root.findByProps({ type: "date" }).props.onChange({ target: { value: "2026-10-25" } });
        renderer!.root.findByType("textarea").props.onChange({ target: { value: "Segunda captura con fallo de red." } });
      });
      await act(async () => {
        await renderer!.root.findByType("form").props.onSubmit({ preventDefault() {} });
      });

      // El fallo de envío no borra el guardado local.
      const storedSnapshot = parseSyncSnapshot(persisted.get(SYNC_STORAGE_KEY) ?? null);
      assert.equal(storedSnapshot.inspections.length, 2);
      assert.equal(storedSnapshot.operations.length, 1);
      const secondRow = renderer!.root.findAll(
        (node) => node.type === "li" && node.props["data-inspection-id"] === "inspection-local-int-uuid-2"
      )[0];
      assert.equal(secondRow.findByType("strong").children.join(""), "Pendiente de reintento");

      // Al vencer el backoff el botón sí recupera sin recargar. Esta vez falla la
      // persistencia de la confirmación: el handler no deja un rechazo sin manejar.
      currentTime += 1000;
      receiver.setBeforeReceive(() => { failNextWrite = true; });
      await act(async () => { await syncButton.props.onClick(); });
      assert.equal(syncButton.props.disabled, false);
      assert.ok(renderer!.root.findAll(node => node.props.role === "alert" && node.children.join("").includes("almacenamiento")).length > 0);
      assert.equal(parseSyncSnapshot(persisted.get(SYNC_STORAGE_KEY) ?? null).operations.length, 1);
      assert.notEqual(secondRow.findByType("strong").children.join(""), "Sincronizando…");
      receiver.setBeforeReceive(undefined);
      await act(async () => { await syncButton.props.onClick(); });
      assert.equal(secondRow.findByType("strong").children.join(""), "Sincronizada");
      assert.equal(receiver.effectsApplied, 2, "recuperar la confirmación no aplica otra vez la segunda captura");

      // El fallo de confirmación al guardar online tampoco revierte el guardado
      // ni rechaza el onSubmit; se comunica con una alerta y permite recuperación.
      await act(async () => {
        renderer!.root.findAll(node => node.type === "button" && node.children.join("") === "Nueva inspección")[0].props.onClick();
      });
      receiver.setBeforeReceive(() => { failNextWrite = true; });
      await act(async () => {
        renderer!.root.findByProps({ type: "date" }).props.onChange({ target: { value: "2026-10-25" } });
        renderer!.root.findByType("textarea").props.onChange({ target: { value: "Tercera captura con fallo al confirmar." } });
      });
      await act(async () => { await renderer!.root.findByType("form").props.onSubmit({ preventDefault() {} }); });
      assert.equal(syncButton.props.disabled, false);
      assert.equal(parseSyncSnapshot(persisted.get(SYNC_STORAGE_KEY) ?? null).inspections.length, 3);
      receiver.setBeforeReceive(undefined);
      await act(async () => { await syncButton.props.onClick(); });
      assert.equal(receiver.effectsApplied, 3);
      assert.equal(parseSyncSnapshot(persisted.get(SYNC_STORAGE_KEY) ?? null).operations.length, 0);
    } finally {
      await act(async () => renderer?.unmount());
      for (const [key, descriptor] of [
        ["window", originalWindow],
        ["navigator", originalNavigator],
        ["crypto", originalCrypto]
      ] as const) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    }
  });
});
