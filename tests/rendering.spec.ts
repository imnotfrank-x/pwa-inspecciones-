// @ts-nocheck
{
  const assert = require("node:assert/strict");
  const { readFileSync } = require("node:fs");
  const { resolve } = require("node:path");

  const root = resolve(__dirname, "..");

  function readProjectFile(relativePath) {
    return readFileSync(resolve(root, relativePath), "utf8");
  }

  const packageJson = JSON.parse(readProjectFile("package.json"));
  const csrPage = readProjectFile("src/app/inspecciones/page.tsx");
  const loadingState = readProjectFile(
    "src/components/loading-state.tsx"
  );
  const inspectionList = readProjectFile(
    "src/components/inspection-list.tsx"
  );

  assert.match(
    packageJson.scripts.test,
    /rendering\.spec\.ts/,
    "npm test debe ejecutar la prueba de renderizado"
  );

  assert.match(
    csrPage,
    /^"use client";/,
    "El listado CSR debe declarar su límite de cliente"
  );

  assert.match(
    csrPage,
    /useEffect\(\(\) =>/,
    "El listado debe iniciar la consulta después de la hidratación"
  );

  assert.match(
    csrPage,
    /window\.setTimeout/,
    "La consulta sintética debe exponer un estado de carga reproducible"
  );

  for (const state of ["carga", "error", "vacio"]) {
    assert.match(
      csrPage,
      new RegExp(`estado=${state}`),
      `Debe existir una URL verificable para el estado ${state}`
    );
  }

  assert.match(
    csrPage,
    /<LoadingState/,
    "La ruta CSR debe reutilizar LoadingState"
  );

  assert.match(
    csrPage,
    /role="alert"/,
    "El error de la ruta CSR debe anunciarse como alerta"
  );

  assert.match(
    csrPage,
    /onClick=\{retryLoading\}/,
    "El error CSR debe ofrecer recuperación sin recargar toda la aplicación"
  );

  assert.match(
    loadingState,
    /role="status"/,
    "El estado de carga reutilizable debe anunciar su estado"
  );

  assert.match(
    loadingState,
    /aria-busy="true"/,
    "El estado de carga debe indicar que la operación sigue ocupada"
  );

  assert.match(
    loadingState,
    /aria-live="polite"/,
    "El mensaje de carga debe comunicarse sin interrumpir al usuario"
  );

  assert.match(
    inspectionList,
    /href=\{`\/inspecciones\/\$\{inspection\.id\}`\}/,
    "Cada inspección debe enlazar su futura ruta de detalle"
  );

  console.log("rendering.spec.ts: CSR PASS");
}
