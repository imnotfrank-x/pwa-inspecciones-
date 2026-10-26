import { mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Enumeración explícita: el mismo comando funciona en Windows y Linux sin glob del shell.
const layers = process.argv.slice(2).filter(arg => arg !== "--run");
if (layers.length === 0 || layers.some(layer => layer !== "unit" && layer !== "integration")) {
  throw new Error("Indica una o más capas: unit, integration.");
}
const root = resolve(import.meta.dirname, "..");
mkdirSync(resolve(root, "test-results"), { recursive: true });

for (const layer of layers) {
  const directory = resolve(root, "tests", layer);
  const files = readdirSync(directory, { recursive: true })
    .filter(name => name.endsWith(".test.ts"))
    .sort()
    .map(name => resolve(directory, name));
  if (files.length === 0) throw new Error(`No existen pruebas ejecutables en tests/${layer}.`);
  const result = spawnSync(process.execPath, [
    "--import", "tsx", "--test",
    "--test-reporter=spec", "--test-reporter-destination=stdout",
    "--test-reporter=junit", `--test-reporter-destination=test-results/${layer}.xml`,
    ...files
  ], { cwd: root, stdio: "inherit", env: { ...process.env, TSX_TSCONFIG_PATH: resolve(root, "tsconfig.tests.json") } });
  if (result.error) console.error(result.error);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
