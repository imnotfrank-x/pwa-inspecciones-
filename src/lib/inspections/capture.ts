import { assertOfflineInspectionDraft, SyncSchemaError, type OfflineInspectionDraft } from "../storage/schema";

export type InspectionFormValues = {
  location: string;
  date: string;
  inspectorAlias: string;
  status: string;
  findings: string;
  summary: string;
};

export function inspectionDraftFromForm(values: InspectionFormValues, id: string): OfflineInspectionDraft {
  // No convertir "" a cero ni aceptar fechas normalizadas como 30 de febrero.
  if (!/^\d+$/.test(values.findings) || !Number.isSafeInteger(Number(values.findings))) {
    throw new SyncSchemaError("Hallazgos debe ser un entero mayor o igual a cero.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    throw new SyncSchemaError("Selecciona una fecha válida.");
  }
  const inspectedAt = `${values.date}T00:00:00.000Z`;
  const date = new Date(inspectedAt);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== values.date) {
    throw new SyncSchemaError("Selecciona una fecha válida.");
  }
  const draft = {
    id,
    location: values.location.trim(),
    inspectedAt,
    inspectorAlias: values.inspectorAlias.trim(),
    status: values.status,
    findings: Number(values.findings),
    summary: values.summary.trim()
  };
  assertOfflineInspectionDraft(draft);
  return draft;
}
