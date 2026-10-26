"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { inspectionDraftFromForm, type InspectionFormValues } from "../lib/inspections/capture";
import { createBrowserSyncStorage, SyncSchemaError, type SyncStorage } from "../lib/storage/schema";
import { createSyncQueue, type RetryOptions, type SyncTransport } from "../lib/sync/queue";
import {
  createSyncController,
  type InspectionSyncItemView,
  type SyncController
} from "../lib/sync/sync-controller";
import { createSyntheticSyncReceiver } from "../lib/sync/synthetic-transport";
import { InspectionCapabilities } from "./inspection-capabilities";

const EMPTY_FORM: InspectionFormValues = {
  location: "Laboratorio Sintético A", date: "", inspectorAlias: "Inspector Sintético A",
  status: "ok", findings: "0", summary: ""
};

export type InspectionCaptureProps = {
  storage?: SyncStorage;
  transport?: SyncTransport;
  now?: () => Date;
  retryOptions?: RetryOptions;
};

export function InspectionCapture({
  storage,
  transport,
  now,
  retryOptions
}: InspectionCaptureProps) {
  const controller = useRef<SyncController | null>(null);
  const saving = useRef(false);
  const committed = useRef(false);
  const [values, setValues] = useState(EMPTY_FORM);
  const [draftId, setDraftId] = useState("");
  const [items, setItems] = useState<InspectionSyncItemView[]>([]);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    let instance: SyncController | null = null;
    async function load() {
      try {
        const localStorageAdapter = storage ?? createBrowserSyncStorage();
        const localQueue = createSyncQueue({ storage: localStorageAdapter, now });
        const receiver = createSyntheticSyncReceiver({ now });
        instance = createSyncController({
          queue: localQueue,
          transport: transport ?? receiver.transport,
          retryOptions,
          now,
          target: typeof window !== "undefined" ? window : undefined,
          isOnline: () => (typeof navigator !== "undefined" ? navigator.onLine : true)
        });
        unsubscribe = instance.subscribe(next => {
          if (!active) return;
          setOnline(next.online);
          setSyncing(next.syncing);
          setItems(next.items);
          setMessage(next.statusMessage);
          setSyncError(next.errorMessage);
        });
        const id = `inspection-local-${crypto.randomUUID()}`;
        const initial = await instance.start();
        if (!active) return;
        controller.current = instance;
        setOnline(initial.online);
        setSyncing(initial.syncing);
        setItems(initial.items);
        setDraftId(id);
        setReady(true);
        setError("");
      } catch {
        if (active) setError("No se pudo abrir el almacenamiento local. Conservamos los datos existentes; permite almacenamiento y vuelve a intentar.");
      }
    }
    void load();
    return () => {
      active = false;
      unsubscribe();
      instance?.dispose();
    };
  }, [loadAttempt, now, retryOptions, storage, transport]);

  async function saveInspection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!controller.current || !ready || saving.current || committed.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const draft = inspectionDraftFromForm(values, draftId);
      // La identidad se conserva durante errores y doble clic; solo "Nueva inspección" la cambia.
      await controller.current.enqueueDraft(draft, { idempotencyKey: `capture:${draftId}` });
      committed.current = true;
      setSaved(true);
    } catch (failure) {
      setError(failure instanceof SyncSchemaError ? failure.message : "No se pudo guardar. Tu captura sigue en pantalla; revisa el almacenamiento y reintenta.");
      return;
    } finally {
      saving.current = false;
      setBusy(false);
    }
    if (controller.current.isOnline()) {
      await controller.current.syncPending();
    }
  }

  function newInspection() {
    try {
      const id = `inspection-local-${crypto.randomUUID()}`;
      setDraftId(id);
      setValues(EMPTY_FORM);
      committed.current = false;
      setSaved(false);
      setMessage("");
      setError("");
    } catch {
      setError("No se pudo preparar una nueva captura. Recarga la página para volver a intentar.");
    }
  }

  function update(field: keyof InspectionFormValues, value: string) {
    setValues(current => ({ ...current, [field]: value }));
  }

  return (
    <section className="content-section capture-panel" aria-labelledby="capture-title" id="captura-local">
      <div className="section-heading">
        <div><p className="eyebrow">Registro local</p><h2 id="capture-title">Registrar inspección</h2></div>
        <span role="status">{online === null ? "Comprobando conexión" : online ? "Con conexión" : "Sin conexión"}</span>
      </div>
      <p id="capture-help">Usa exclusivamente datos sintéticos. Los registros se guardan primero en este navegador y se sincronizan con el receptor sintético en memoria cuando hay conexión; el indicador de red no implica que la operación ya esté sincronizada.</p>
      {error ? <p role="alert" className="capability-feedback capability-feedback-error">{error}</p> : null}
      {syncError ? <p role="alert" className="capability-feedback capability-feedback-error">{syncError}</p> : null}
      {!ready ? <button type="button" className="state-action" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Reintentar almacenamiento</button> : null}
      <form onSubmit={saveInspection} aria-describedby="capture-help" aria-busy={busy}>
        <fieldset disabled={!ready || busy || saved} className="capture-fields">
          <legend>Datos de la inspección</legend>
          <label>Laboratorio sintético<input required maxLength={160} value={values.location} onChange={event => update("location", event.target.value)} /></label>
          <label>Alias sintético del inspector<input required maxLength={120} value={values.inspectorAlias} onChange={event => update("inspectorAlias", event.target.value)} /></label>
          <label>Fecha de inspección<input type="date" required value={values.date} onChange={event => update("date", event.target.value)} /></label>
          <label>Condición<select value={values.status} onChange={event => update("status", event.target.value)}><option value="ok">Sin incidencias</option><option value="attention">Requiere atención</option></select></label>
          <label>Número de hallazgos<input type="number" min="0" step="1" required value={values.findings} onChange={event => update("findings", event.target.value)} /></label>
          <label className="capture-wide">Descripción sintética<textarea required maxLength={1000} rows={3} value={values.summary} onChange={event => update("summary", event.target.value)} /></label>
          <button type="submit" className="state-action">{busy ? "Guardando…" : saved ? "Inspección guardada" : "Guardar en este dispositivo"}</button>
        </fieldset>
      </form>
      {message ? <p role="status" className="capability-feedback capability-feedback-success">{message}</p> : null}
      {saved ? <button type="button" className="state-action" onClick={newInspection}>Nueva inspección</button> : null}
      {ready ? <button type="button" className="state-action" disabled={syncing} onClick={() => { void controller.current?.syncPending(); }}>Sincronizar pendientes</button> : null}
      {ready ? <details className="capture-capabilities"><summary>Capacidades opcionales</summary><InspectionCapabilities key={draftId} inspectionId={draftId} /></details> : null}
      <section aria-labelledby="local-records-title" className="local-records">
        <h3 id="local-records-title">Inspecciones guardadas en este dispositivo</h3>
        <p role="status">{items.length} registros locales</p>
        <ul className="local-inspection-list">
          {items.map(({ inspection: record, label }) => <li key={record.id} data-inspection-id={record.id}>
            <h4>{record.location}</h4><p>{record.summary}</p>
            <p>{record.inspectorAlias} · {record.inspectedAt.slice(0, 10)} · {record.findings} hallazgos</p>
            <p><strong>{label}</strong></p>
          </li>)}
        </ul>
      </section>
    </section>
  );
}
