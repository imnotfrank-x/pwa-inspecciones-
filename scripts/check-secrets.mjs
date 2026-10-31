import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { inspectSecretText } from "../src/lib/security/secrets.ts";

// La raíz opcional permite probar el CLI con repositorios temporales sintéticos.
const root = resolve(process.argv[2] ?? resolve(import.meta.dirname, ".."));
try {
  const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
    .split("\0").filter(Boolean);
  const findings = [];
  let scanned = 0;
  for (const file of new Set(files)) {
    let buffer;
    try { buffer = readFileSync(resolve(root, file)); } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (buffer.includes(0)) continue;
    scanned++;
    for (const finding of inspectSecretText(buffer.toString("utf8"))) findings.push({ file, ...finding });
  }
  mkdirSync(resolve(root, "test-results"), { recursive: true });
  const result = { status: findings.length ? "fail" : "pass", scanned, findings,
    scope: "Archivos de trabajo versionados y nuevos no ignorados; no historial, archivos ignorados ni credenciales de proveedores desconocidos." };
  writeFileSync(resolve(root, "test-results/secrets.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  process.exitCode = findings.length ? 1 : 0;
} catch {
  console.error("No se pudo completar la comprobación de secretos; no se declara aprobada.");
  process.exitCode = 2;
}
