"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { inspectionDraftFromForm, type InspectionFormValues } from "../lib/inspections/capture";
import { createBrowserSyncStorage, SyncSchemaError, type StoredInspection } from "../lib/storage/schema";
import { createSyncQueue, type InspectionSyncQueue } from "../lib/sync/queue";
import { InspectionCapabilities } from "./inspection-capabilities";

const EMPTY_FORM: InspectionFormValues = {
  location: "Laboratorio Sintético A", date: "", inspectorAlias: "Inspector Sintético A",
  status: "ok", findings: "0", summary: ""
};
const SYNC_LABELS = { pending: "Pendiente de sincronización", synced: "Sincronizada", failed: "Error de sincronización" };

export function InspectionCapture() {
  const queue = useRef<InspectionSyncQueue | null>(null);
  const saving = useRef(false);
  const committed = useRef(false);
  const [values, setValues] = useState(EMPTY_FORM);
  const [draftId, setDraftId] = useState("");
  const [records, setRecords] = useState<StoredInspection[]>([]);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const updateConnection = () => setOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    async function load() {
      try {
        const localQueue = createSyncQueue({ storage: createBrowserSyncStorage() });
        const snapshot = await localQueue.getSnapshot();
        const id = `inspection-local-${crypto.randomUUID()}`;
        if (!active) return;
        queue.current = localQueue;
        setRecords(snapshot.inspections);
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
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, [loadAttempt]);

  async function saveInspection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!queue.current || !ready || saving.current || committed.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const draft = inspectionDraftFromForm(values, draftId);
      // La identidad se conserva durante errores y doble clic; solo "Nueva inspección" la cambia.
      const operation = await queue.current.enqueueInspection(draft, { idempotencyKey: `capture:${draftId}` });
      committed.current = true;
      setSaved(true);
      setRecords(current => [...current.filter(item => item.id !== draftId), operation.payload]);
      setMessage("Inspección guardada en este dispositivo. Pendiente de sincronización.");
    } catch (failure) {
      setError(failure instanceof SyncSchemaError ? failure.message : "No se pudo guardar. Tu captura sigue en pantalla; revisa el almacenamiento y reintenta.");
    } finally {
      saving.current = false;
      setBusy(false);
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
      <p id="capture-help">Usa exclusivamente datos sintéticos. Los registros se conservan en este navegador; en este incremento la sincronización aún no está conectada.</p>
      {error ? <p role="alert" className="capability-feedback capability-feedback-error">{error}</p> : null}
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
      {ready ? <details className="capture-capabilities"><summary>Capacidades opcionales</summary><InspectionCapabilities key={draftId} inspectionId={draftId} /></details> : null}
      <section aria-labelledby="local-records-title" className="local-records">
        <h3 id="local-records-title">Inspecciones guardadas en este dispositivo</h3>
        <p role="status">{records.length} registros locales</p>
        <ul className="local-inspection-list">
          {records.map(record => <li key={record.id} data-inspection-id={record.id}>
            <h4>{record.location}</h4><p>{record.summary}</p>
            <p>{record.inspectorAlias} · {record.inspectedAt.slice(0, 10)} · {record.findings} hallazgos</p>
            <p><strong>{SYNC_LABELS[record.syncState]}</strong></p>
          </li>)}
        </ul>
      </section>
    </section>
  );
}
