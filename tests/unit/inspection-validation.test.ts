import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertOfflineInspectionDraft, SyncSchemaError } from "../../src/lib/storage/schema";
import { inspectionDraftFromForm, type InspectionFormValues } from "../../src/lib/inspections/capture";
import { inspectionDraft } from "../fixtures/inspections";

describe("Validación de captura", () => {
  for (const status of ["ok", "attention"] as const) {
    it(`acepta una inspección sintética ${status}`, () => {
      assert.doesNotThrow(() => assertOfflineInspectionDraft(inspectionDraft({ status })));
    });
  }
  const invalidDrafts: [string, unknown][] = [
    ["objeto nulo", null],
    ["laboratorio vacío", inspectionDraft({ location: "   " })],
    ["descripción vacía", inspectionDraft({ summary: "" })],
    ["alias vacío", inspectionDraft({ inspectorAlias: "" })],
    ["ID vacío", inspectionDraft({ id: "" })],
    ["fecha inválida", inspectionDraft({ inspectedAt: "fecha-inválida" })],
    ["hallazgos negativos", inspectionDraft({ findings: -1 })],
    ["hallazgos decimales", inspectionDraft({ findings: 1.5 })],
    ["estado desconocido", { ...inspectionDraft(), status: "invalid" }],
    ["descripción demasiado larga", inspectionDraft({ summary: "x".repeat(1001) })]
  ];
  for (const [label, draft] of invalidDrafts) {
    it(`rechaza ${label}`, () => assert.throws(() => assertOfflineInspectionDraft(draft), SyncSchemaError));
  }
  it("acepta exactamente los límites declarados", () => {
    assert.doesNotThrow(() => assertOfflineInspectionDraft(inspectionDraft({
      summary: "x".repeat(1000), location: "x".repeat(160), inspectorAlias: "x".repeat(120), findings: 0
    })));
  });

  const values: InspectionFormValues = {
    location: " Laboratorio Sintético A ", date: "2026-10-24",
    inspectorAlias: " Inspector Sintético A ", status: "ok", findings: "0", summary: " Prueba sintética. "
  };
  it("transforma la captura del formulario y mantiene la fecha sin desplazamiento horario", () => {
    assert.deepEqual(inspectionDraftFromForm(values, "synthetic-id"), {
      id: "synthetic-id", location: "Laboratorio Sintético A", inspectorAlias: "Inspector Sintético A",
      inspectedAt: "2026-10-24T00:00:00.000Z", status: "ok", findings: 0, summary: "Prueba sintética."
    });
  });
  for (const findings of ["", "-1", "1.5", "NaN", "1e3", "9007199254740992"]) {
    it(`no convierte silenciosamente hallazgos=${JSON.stringify(findings)}`, () => {
      assert.throws(() => inspectionDraftFromForm({ ...values, findings }, "synthetic-id"), /Hallazgos/);
    });
  }
  for (const date of ["", "24/10/2026", "2026-02-30", "2026-13-01"]) {
    it(`rechaza fecha imposible o ambigua ${JSON.stringify(date)}`, () => {
      assert.throws(() => inspectionDraftFromForm({ ...values, date }, "synthetic-id"), /fecha válida/);
    });
  }
  it("acepta el 29 de febrero de un año bisiesto", () => {
    assert.equal(inspectionDraftFromForm({ ...values, date: "2024-02-29" }, "synthetic-id").inspectedAt, "2024-02-29T00:00:00.000Z");
  });
  it("aplica también el contrato de dominio después de normalizar", () => {
    assert.throws(() => inspectionDraftFromForm({ ...values, summary: "  " }, "synthetic-id"), SyncSchemaError);
  });
});
