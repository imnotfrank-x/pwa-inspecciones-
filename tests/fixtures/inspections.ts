import type { OfflineInspectionDraft, SyncSnapshot, SyncStorage } from "../../src/lib/storage/schema";

export const FIXED_TIME = "2026-10-24T12:00:00.000Z";
export const fixedClock = () => new Date(FIXED_TIME);

export function inspectionDraft(overrides: Partial<OfflineInspectionDraft> = {}): OfflineInspectionDraft {
  return {
    id: "inspection-synthetic-w08-001",
    location: "Laboratorio Sintético A",
    inspectedAt: FIXED_TIME,
    inspectorAlias: "Inspector Sintético A",
    status: "attention",
    findings: 1,
    summary: "Cable sintético pendiente de revisión.",
    ...overrides
  };
}

// Doble mínimo para aislar la regla de cola. No valida ni deduplica por cuenta propia.
// Javier debe usar JsonSyncStorage real en las pruebas de integración.
export class MemorySyncStorage implements SyncStorage {
  private snapshot: SyncSnapshot = { schemaVersion: 1, inspections: [], operations: [] };
  saves = 0;
  failNextSave = false;
  async load() { return structuredClone(this.snapshot); }
  async save(snapshot: SyncSnapshot) {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("Cuota sintética agotada");
    }
    this.snapshot = structuredClone(snapshot);
    this.saves += 1;
  }
  async clear() { this.snapshot = { schemaVersion: 1, inspections: [], operations: [] }; }
}
