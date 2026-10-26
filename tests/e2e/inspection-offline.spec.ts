import { expect, test } from "@playwright/test";

const STORAGE_KEY = "utt-lab-inspections:sync:v1";

type StoredSnapshot = {
  inspections: Array<{
    id: string;
    location: string;
    inspectorAlias: string;
    inspectedAt: string;
    findings: number;
    summary: string;
    syncState: string;
  }>;
  operations: Array<{ entityId: string }>;
};

async function readStoredSnapshot(page: import("@playwright/test").Page) {
  return page.evaluate((key) => {
    const serialized = window.localStorage.getItem(key);
    if (!serialized) throw new Error(`No existe el snapshot ${key}.`);
    return JSON.parse(serialized) as StoredSnapshot;
  }, STORAGE_KEY);
}

test("captura offline, recarga, reconecta y no duplica la inspección", async ({ context }) => {
  const page = await context.newPage();

  try {
    await page.goto("/inspecciones");
    await expect(page.getByRole("heading", { name: "Registrar inspección" })).toBeVisible();
    await expect(page.getByLabel("Laboratorio sintético")).toBeEnabled();

    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await page.reload();
    await expect(page.getByLabel("Laboratorio sintético")).toBeEnabled();

    await context.setOffline(true);
    await expect(page.locator('[role="status"]').filter({ hasText: /^Sin conexión$/ })).toBeVisible();

    await page.getByLabel("Laboratorio sintético").fill("Laboratorio E2E Alfa");
    await page.getByLabel("Alias sintético del inspector").fill("Inspector E2E");
    await page.getByLabel("Fecha de inspección").fill("2026-10-25");
    await page.getByLabel("Condición").selectOption("attention");
    await page.getByLabel("Número de hallazgos").fill("1");
    await page.getByLabel("Descripción sintética").fill("Hallazgo sintético para prueba offline");
    await page.getByRole("button", { name: "Guardar en este dispositivo" }).click();

    const record = page.locator(".local-inspection-list li", { hasText: "Laboratorio E2E Alfa" });
    await expect(record).toHaveCount(1);
    await expect(record).toContainText("Inspector E2E");
    await expect(record).toContainText("2026-10-25");
    await expect(record).toContainText("1 hallazgos");
    await expect(record).toContainText("Hallazgo sintético para prueba offline");
    await expect(record).toContainText("Pendiente de sincronización");
    await expect(page.getByRole("button", { name: "Sincronizar pendientes" })).toBeDisabled();

    const beforeReload = await readStoredSnapshot(page);
    expect(beforeReload.inspections).toHaveLength(1);
    expect(beforeReload.operations).toHaveLength(1);
    const inspectionId = beforeReload.inspections[0].id;
    expect(beforeReload.operations[0].entityId).toBe(inspectionId);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Registrar inspección" })).toBeVisible();
    const recoveredRecord = page.locator(`[data-inspection-id="${inspectionId}"]`);
    await expect(recoveredRecord).toHaveCount(1);
    await expect(recoveredRecord).toContainText("Laboratorio E2E Alfa");
    await expect(recoveredRecord).toContainText("Inspector E2E");
    await expect(recoveredRecord).toContainText("Hallazgo sintético para prueba offline");

    const afterReload = await readStoredSnapshot(page);
    expect(afterReload.inspections.map(({ id }) => id)).toEqual([inspectionId]);
    expect(afterReload.operations).toHaveLength(1);

    await context.setOffline(false);
    await expect(recoveredRecord).toContainText("Sincronizada");
    await page.getByRole("button", { name: "Sincronizar pendientes" }).click();
    await expect(recoveredRecord).toHaveCount(1);

    const afterReconnect = await readStoredSnapshot(page);
    expect(afterReconnect.inspections).toHaveLength(1);
    expect(afterReconnect.inspections[0]).toMatchObject({
      id: inspectionId,
      location: "Laboratorio E2E Alfa",
      syncState: "synced",
    });
    expect(afterReconnect.operations).toHaveLength(0);
  } finally {
    await context.setOffline(false).catch(() => undefined);
  }
});
