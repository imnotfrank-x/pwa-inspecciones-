import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { InspectionCapture } from "../../src/components/inspection-capture";
import { SYNC_STORAGE_KEY, parseSyncSnapshot } from "../../src/lib/storage/schema";

// Renderizador de React en memoria: no abre navegador, no usa red ni permisos reales.
// No sustituye al E2E: no hay DOM, validación HTML nativa, caché ni Service Worker.
describe("Componente de captura con entorno sintético", () => {
  let renderer: ReactTestRenderer | undefined;
  let persisted: Map<string, string>;
  let failWrite: boolean;
  let originalWindow: PropertyDescriptor | undefined;
  let originalNavigator: PropertyDescriptor | undefined;
  let originalCrypto: PropertyDescriptor | undefined;

  beforeEach(() => {
    persisted = new Map();
    failWrite = false;
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      addEventListener() {}, removeEventListener() {},
      localStorage: {
        getItem: (key: string) => persisted.get(key) ?? null,
        setItem: (key: string, value: string) => {
          if (failWrite) throw new Error("Cuota sintética agotada");
          persisted.set(key, value);
        },
        removeItem: (key: string) => persisted.delete(key)
      }
    } });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: false } });
    let counter = 0;
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: { randomUUID: () => `synthetic-uuid-${++counter}` } });
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    for (const [key, descriptor] of [["window", originalWindow], ["navigator", originalNavigator], ["crypto", originalCrypto]] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    renderer = undefined;
  });

  async function mount() {
    await act(async () => { renderer = create(createElement(InspectionCapture)); });
  }
  async function fillValidForm() {
    await act(async () => {
      renderer!.root.findByProps({ type: "date" }).props.onChange({ target: { value: "2026-10-24" } });
      renderer!.root.findByType("textarea").props.onChange({ target: { value: "Descripción de prueba sintética." } });
    });
  }
  async function submit() {
    await act(async () => {
      await renderer!.root.findByType("form").props.onSubmit({ preventDefault() {} });
    });
  }
  const snapshot = () => parseSyncSnapshot(persisted.get(SYNC_STORAGE_KEY) ?? null);

  it("un envío guarda el registro y un segundo envío no lo duplica", async () => {
    await mount();
    await fillValidForm();
    await submit();
    await submit();
    assert.equal(snapshot().inspections.length, 1);
    assert.equal(snapshot().operations.length, 1);
    assert.equal(snapshot().inspections[0].syncState, "pending");
    assert.equal(renderer!.root.findByType("fieldset").props.disabled, true);
    assert.equal(renderer!.root.findAll(node => node.type === "li" && node.props["data-inspection-id"] === snapshot().inspections[0].id).length, 1);
  });
  it("remontar el componente recupera un registro previamente guardado", async () => {
    await mount();
    await fillValidForm();
    await submit();
    const id = snapshot().inspections[0].id;
    await act(async () => renderer!.unmount());
    await mount();
    assert.equal(renderer!.root.findAll(node => node.type === "li" && node.props["data-inspection-id"] === id).length, 1);
    assert.equal(snapshot().operations.length, 1);
  });
  it("si falla la escritura conserva la captura y permite reintentar", async () => {
    await mount();
    await fillValidForm();
    failWrite = true;
    await submit();
    assert.equal(snapshot().inspections.length, 0);
    assert.equal(renderer!.root.findByType("textarea").props.value, "Descripción de prueba sintética.");
    assert.equal(renderer!.root.findByType("fieldset").props.disabled, false);
    assert.ok(renderer!.root.findAllByProps({ role: "alert" }).length > 0);
    failWrite = false;
    await submit();
    assert.equal(snapshot().inspections.length, 1);
  });
  it("un almacenamiento corrupto se conserva y bloquea el guardado", async () => {
    persisted.set(SYNC_STORAGE_KEY, "json-sintético-inválido");
    await mount();
    assert.equal(persisted.get(SYNC_STORAGE_KEY), "json-sintético-inválido");
    assert.equal(renderer!.root.findByType("fieldset").props.disabled, true);
    assert.ok(renderer!.root.findAllByProps({ role: "alert" }).length > 0);
  });
  it("un formulario inválido no escribe aunque se invoque su handler", async () => {
    await mount();
    await submit();
    assert.equal(snapshot().inspections.length, 0);
    assert.ok(renderer!.root.findAllByProps({ role: "alert" }).length > 0);
  });
});
