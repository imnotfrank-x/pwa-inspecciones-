const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const manifestPath = resolve(root, "public/manifest.webmanifest");
const layoutPath = resolve(root, "src/app/layout.tsx");

assert.ok(existsSync(manifestPath), "Debe existir public/manifest.webmanifest");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const layout = readFileSync(layoutPath, "utf8");

assert.equal(manifest.lang, "es-MX");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.match(manifest.name, /inspecciones/i);
assert.match(manifest.description, /sintétic/i);
assert.ok(manifest.short_name.length > 0 && manifest.short_name.length <= 12);
assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
assert.match(layout, /manifest:\s*["']\/manifest\.webmanifest["']/);

assert.ok(Array.isArray(manifest.icons), "El manifest debe declarar iconos");

function readPngDimensions(filePath) {
  const buffer = readFileSync(filePath);

  assert.ok(buffer.length >= 24, `${filePath} no contiene un PNG válido`);
  assert.equal(
    buffer.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    `${filePath} debe ser un archivo PNG real`
  );

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

for (const size of [192, 512]) {
  const expectedSize = `${size}x${size}`;
  const icon = manifest.icons.find((candidate) =>
    typeof candidate.sizes === "string" &&
    candidate.sizes.split(/\s+/).includes(expectedSize) &&
    candidate.type === "image/png"
  );

  assert.ok(icon, `Debe declararse un icono PNG ${expectedSize}`);
  assert.ok(icon.purpose.split(/\s+/).includes("any"));
  assert.match(icon.src, /^\/icons\/[^/]+\.png$/i);
  assert.ok(!icon.src.includes(".."), "La ruta del icono debe permanecer en public");

  const iconPath = resolve(root, "public", icon.src.replace(/^\/+/, ""));
  assert.ok(existsSync(iconPath), `No existe el recurso ${icon.src}`);

  assert.deepEqual(
    readPngDimensions(iconPath),
    { width: size, height: size },
    `El icono ${expectedSize} debe tener dimensiones físicas correctas`
  );
}

assert.ok(
  manifest.icons.some(
    (icon) =>
      typeof icon.purpose === "string" &&
      icon.purpose.split(/\s+/).includes("maskable")
  ),
  "Al menos un icono debe declarar purpose maskable"
);

console.log("manifest.spec.ts: PASS");
