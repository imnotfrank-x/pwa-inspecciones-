import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { inspectSecretText } from "../src/lib/security/secrets";
import {
  PERMISSIONS_POLICY_DIRECTIVES,
  PERMISSIONS_POLICY_VALUE,
  REQUIRED_CSP_DIRECTIVES,
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  parseCspDirectives,
  parsePermissionsPolicy
} from "../src/lib/security/headers";
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

describe("Seguridad W09: CSP, cabeceras HTTP y permisos mínimos", () => {
  it("incluye todas las directivas CSP requeridas y separa modo producción de desarrollo", () => {
    const productionCsp = buildContentSecurityPolicy({ isDevelopment: false });
    const developmentCsp = buildContentSecurityPolicy({ isDevelopment: true });
    const prodDirectives = parseCspDirectives(productionCsp);
    const devDirectives = parseCspDirectives(developmentCsp);

    for (const directive of REQUIRED_CSP_DIRECTIVES) {
      assert.ok(directive in prodDirectives, `Falta directiva CSP: ${directive}`);
    }

    assert.deepEqual(prodDirectives["default-src"], ["'self'"]);
    assert.deepEqual(prodDirectives["script-src"], ["'self'", "'unsafe-inline'"]);
    assert.equal(prodDirectives["script-src"].includes("'unsafe-eval'"), false);
    assert.equal(devDirectives["script-src"].includes("'unsafe-eval'"), true);
    assert.deepEqual(prodDirectives["style-src"], ["'self'", "'unsafe-inline'"]);
    assert.deepEqual(prodDirectives["img-src"], ["'self'", "data:", "blob:"]);
    assert.deepEqual(prodDirectives["connect-src"], ["'self'"]);
    assert.deepEqual(prodDirectives["worker-src"], ["'self'"]);
    assert.deepEqual(prodDirectives["manifest-src"], ["'self'"]);
    assert.deepEqual(prodDirectives["object-src"], ["'none'"]);
    assert.deepEqual(prodDirectives["base-uri"], ["'self'"]);
    assert.deepEqual(prodDirectives["form-action"], ["'self'"]);
    assert.deepEqual(prodDirectives["frame-ancestors"], ["'none'"]);
  });

  it("restringe Permissions-Policy a mismo origen en cámara/geolocalización y deshabilita micrófono, pago y USB sin directivas inventadas de notificaciones", () => {
    const parsed = parsePermissionsPolicy(`${PERMISSIONS_POLICY_VALUE}, , sin_valor`);
    assert.deepEqual(parsed, PERMISSIONS_POLICY_DIRECTIVES);
    assert.equal(parsed.camera, "(self)");
    assert.equal(parsed.geolocation, "(self)");
    assert.equal(parsed.microphone, "()");
    assert.equal(parsed.payment, "()");
    assert.equal(parsed.usb, "()");
    assert.equal("notifications" in parsed, false);
    assert.equal("push" in parsed, false);
    assert.deepEqual(parseCspDirectives("default-src 'self'; ;"), { "default-src": ["'self'"] });
    assert.equal(buildSecurityHeaders().length, 5);
  });

  it("configura en next.config.mjs las cinco cabeceras de seguridad aplicables a todas las rutas", async () => {
    const configUrl = pathToFileURL(resolve(import.meta.dirname, "../next.config.mjs")).href;
    const loaded = (await import(configUrl)) as {
      default: {
        headers?: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>;
      };
    };

    assert.equal(typeof loaded.default.headers, "function");
    const routeRules = await loaded.default.headers!();
    assert.equal(routeRules.length, 1);
    assert.equal(routeRules[0].source, "/:path*");

    const expected = buildSecurityHeaders({ isDevelopment: process.env.NODE_ENV === "development" });
    assert.deepEqual(routeRules[0].headers, expected);

    const byKey = Object.fromEntries(routeRules[0].headers.map(({ key, value }) => [key, value]));
    assert.equal(byKey["X-Content-Type-Options"], "nosniff");
    assert.equal(byKey["Referrer-Policy"], "strict-origin-when-cross-origin");
    assert.equal(byKey["X-Frame-Options"], "DENY");
    assert.equal(byKey["Permissions-Policy"], PERMISSIONS_POLICY_VALUE);
    assert.ok(byKey["Content-Security-Policy"].includes("frame-ancestors 'none'"));
  });
});
