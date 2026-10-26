import { expect, test } from "@playwright/test";

test("la geolocalización ausente conserva el fallback y permite guardar", async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
  });
  const page = await context.newPage();

  await page.goto("/inspecciones");
  await expect(page.getByLabel("Laboratorio sintético")).toBeEnabled();

  await page.getByText("Capacidades opcionales", { exact: true }).click();
  await page.getByRole("button", { name: "Usar ubicación actual" }).click();
  await expect(page.locator('[role="alert"][data-reason="unsupported"]')).toContainText(
    "Este navegador no ofrece geolocalización. Puedes escribir una referencia manual.",
  );

  const manualReference = page.getByLabel("Referencia manual (opcional)");
  await expect(manualReference).toBeVisible();
  await manualReference.fill("Ala norte sintética");
  await expect(manualReference).toHaveValue("Ala norte sintética");

  await page.getByLabel("Laboratorio sintético").fill("Laboratorio E2E Fallback");
  await page.getByLabel("Alias sintético del inspector").fill("Inspector E2E");
  await page.getByLabel("Fecha de inspección").fill("2026-10-25");
  await page.getByLabel("Condición").selectOption("attention");
  await page.getByLabel("Número de hallazgos").fill("1");
  await page.getByLabel("Descripción sintética").fill("Captura sin geolocalización disponible");
  await page.getByRole("button", { name: "Guardar en este dispositivo" }).click();

  const record = page.locator(".local-inspection-list li", { hasText: "Laboratorio E2E Fallback" });
  await expect(record).toHaveCount(1);
  await expect(record).toContainText("Captura sin geolocalización disponible");
  await expect(page.getByRole("button", { name: "Nueva inspección" })).toBeVisible();
  await expect(manualReference).toHaveValue("Ala norte sintética");
  const persisted = await page.evaluate(() =>
    window.localStorage.getItem("utt-lab-inspections:sync:v1"),
  );
  expect(persisted).not.toContain("Ala norte sintética");
});
