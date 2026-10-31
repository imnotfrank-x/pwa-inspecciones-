import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { inspectSecretText } from "../src/lib/security/secrets";
import { MAX_SNAPSHOT_CHARACTERS } from "../src/lib/security/validation";
import { assertOfflineInspectionDraft, createEmptySyncSnapshot, JsonSyncStorage, parseSyncSnapshot, SyncSchemaError } from "../src/lib/storage/schema";
import { createSyncQueue } from "../src/lib/sync/queue";
import { inspectionDraft, fixedClock } from "./fixtures/inspections";

describe("Seguridad W09: validación en límites reales", () => {
  for (const inspectedAt of ["2026-02-30T12:00:00Z", "2025-02-29T12:00:00Z", "2026-10-31", "October 31, 2026", "2026-10-31T24:00:00Z", "2026-10-31T12:00:00+24:00"]) {
    it(`rechaza fecha no canónica ${inspectedAt}`, () => assert.throws(() => assertOfflineInspectionDraft(inspectionDraft({ inspectedAt })), SyncSchemaError));
  }
  for (const inspectedAt of ["2024-02-29T12:00:00.000Z", "2026-10-31T12:00:00-06:00"]) {
    it(`acepta fecha de calendario con zona ${inspectedAt}`, () => assert.doesNotThrow(() => assertOfflineInspectionDraft(inspectionDraft({ inspectedAt }))));
  }
  it("rechaza enteros no representables exactamente y controles invisibles", () => {
    assert.throws(() => assertOfflineInspectionDraft(inspectionDraft({ findings: Number.MAX_SAFE_INTEGER + 1 })), SyncSchemaError);
    assert.throws(() => assertOfflineInspectionDraft(inspectionDraft({ summary: "Dato\u0000oculto" })), SyncSchemaError);
    assert.doesNotThrow(() => assertOfflineInspectionDraft(inspectionDraft({ summary: "Línea uno\nLínea dos" })));
  });
  it("rechaza campos adicionales y claves peligrosas antes de persistir", async () => {
    let writes = 0;
    const queue = createSyncQueue({ now: fixedClock, storage: new JsonSyncStorage({ getItem: () => null, setItem: () => { writes++; }, removeItem: () => undefined }) });
    for (const key of ["extra", "__proto__", "constructor"]) {
      const draft = JSON.parse(JSON.stringify({ ...inspectionDraft(), [key]: "no admitido" }));
      await assert.rejects(queue.enqueueInspection(draft, { idempotencyKey: "security-test-key" }), SyncSchemaError);
    }
    assert.equal(writes, 0);
  });
  it("leer un snapshot manipulado no lo borra ni lo sobrescribe", async () => {
    const serialized = JSON.stringify({ ...createEmptySyncSnapshot(), extra: "dato ajeno" });
    let writes = 0;
    const storage = new JsonSyncStorage({ getItem: () => serialized, setItem: () => { writes++; }, removeItem: () => { writes++; } });
    await assert.rejects(storage.load(), SyncSchemaError);
    assert.equal(writes, 0);
  });
  it("limita el tamaño antes de parsear JSON", () => {
    assert.throws(() => parseSyncSnapshot(" ".repeat(MAX_SNAPSHOT_CHARACTERS + 1)), /límite de lectura/);
  });
  it("rechaza operaciones huérfanas e intenta guardar sin sobrescribir al superar el límite", async () => {
    let raw: string | null = null;
    const storage = new JsonSyncStorage({ getItem: () => raw, setItem: (_key, value) => { raw = value; }, removeItem: () => { raw = null; } });
    const queue = createSyncQueue({ storage, now: fixedClock });
    await queue.enqueueInspection(inspectionDraft(), { idempotencyKey: "security-limit-key" });
    const before = raw;
    const snapshot = await storage.load();
    assert.throws(() => parseSyncSnapshot(JSON.stringify({ ...snapshot, inspections: [] })), /sin inspección/);
    const large = createEmptySyncSnapshot();
    large.inspections = Array.from({ length: 4000 }, (_, index) => ({ ...snapshot.inspections[0], id: `large-${index}`, summary: "x".repeat(1000) }));
    await assert.rejects(storage.save(large), /límite de escritura/);
    assert.equal(raw, before);
  });
  it("conserva texto parecido a HTML como dato, sin mutilarlo", async () => {
    let raw: string | null = null;
    const storage = new JsonSyncStorage({ getItem: () => raw, setItem: (_key, value) => { raw = value; }, removeItem: () => { raw = null; } });
    const queue = createSyncQueue({ storage, now: fixedClock });
    const summary = '<script>alert("sintético")</script>';
    await queue.enqueueInspection(inspectionDraft({ summary }), { idempotencyKey: "security-text-key" });
    assert.equal((await storage.load()).inspections[0].summary, summary);
    // El escape de salida lo realiza React; esta prueba no afirma ejecutar un navegador.
  });
});

describe("Seguridad W09: detector de secretos sin revelar valores", () => {
  it("no trata nombres de campos ni documentación como credenciales", () => {
    assert.deepEqual(inspectSecretText('Evitar secretos. token: string; password = process.env.PASSWORD; api_key = ""'), []);
  });
  it("detecta credencial sintética y no devuelve su contenido", () => {
    const credential = ["ghp", "A".repeat(36)].join("_");
    const result = inspectSecretText(`texto\n${credential}`);
    assert.deepEqual(result, [{ rule: "github-credential", line: 2 }]);
    assert.equal(JSON.stringify(result).includes(credential), false);
  });
  it("detecta clave privada, asignación literal y configuración pública sensible", () => {
    assert.equal(inspectSecretText(["-----BEGIN", "PRIVATE KEY-----"].join(" "))[0].rule, "private-key");
    assert.equal(inspectSecretText(`password = "${"b".repeat(20)}"`)[0].rule, "literal-credential");
    assert.equal(inspectSecretText(["NEXT_PUBLIC", "API_KEY"].join("_"))[0].rule, "public-credential-config");
  });
  it("el CLI falla ante una credencial sintética y genera un reporte redactado", () => {
    const root = mkdtempSync(resolve(tmpdir(), "w09-secret-test-"));
    try {
      execFileSync("git", ["init", "--quiet", root]);
      writeFileSync(resolve(root, ".gitignore"), "test-results/\n");
      writeFileSync(resolve(root, "clean.txt"), "Documentación de secretos sin credenciales.");
      // El CLI se comprueba como caja negra. Su cargador ESM emite sourcemaps data:
      // que c8 no puede normalizar; la lógica del detector se cubre en este proceso.
      const environment = { ...process.env };
      environment.NODE_V8_COVERAGE = "";
      const run = () => spawnSync(process.execPath, ["--import", "tsx", "scripts/check-secrets.mjs", root], { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8", env: environment });
      assert.equal(run().status, 0);
      const credential = ["ghp", "C".repeat(36)].join("_");
      writeFileSync(resolve(root, "fixture.txt"), credential);
      const failed = run();
      assert.equal(failed.status, 1);
      const report = readFileSync(resolve(root, "test-results/secrets.json"), "utf8");
      assert.equal(report.includes(credential), false);
      assert.equal(failed.stdout.includes(credential), false);
      assert.equal(JSON.parse(report).findings[0].file, "fixture.txt");
    } finally {
      assert.ok(root.startsWith(resolve(tmpdir()) + sep) && root.includes("w09-secret-test-"));
      rmSync(root, { recursive: true, force: true });
    }
  });
});
