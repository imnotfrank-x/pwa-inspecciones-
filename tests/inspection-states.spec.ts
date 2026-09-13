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
  const page = readProjectFile("src/app/page.tsx");
  const inspectionList = readProjectFile(
    "src/components/inspection-list.tsx"
  );
  const loading = readProjectFile("src/app/loading.tsx");
  const errorBoundary = readProjectFile("src/app/error.tsx");

  assert.match(
    packageJson.scripts.test,
    /inspection-states\.spec\.ts/,
    "npm test debe ejecutar la prueba de estados"
  );

  assert.match(
    inspectionList,
    /state === "loading"/,
    "El componente debe distinguir el estado loading"
  );

  assert.match(
    inspectionList,
    /state === "error"/,
    "El componente debe distinguir el estado error"
  );

  assert.match(
    inspectionList,
    /state === "empty"/,
    "El componente debe distinguir el estado empty"
  );

  assert.match(
    inspectionList,
    /inspections\.length === 0/,
    "Un arreglo sin inspecciones debe activar el estado vacío"
  );

  assert.match(
    inspectionList,
    /role="status"/,
    "Carga o vacío deben anunciarse mediante role status"
  );

  assert.match(
    inspectionList,
    /role="alert"/,
    "El error debe anunciarse mediante role alert"
  );

  assert.match(
    inspectionList,
    /aria-busy=\{state === "loading"\}/,
    "La sección debe comunicar cuándo se encuentra ocupada"
  );

  assert.match(page, /case "carga":/);
  assert.match(page, /case "error":/);
  assert.match(page, /case "vacio":/);
  assert.match(page, /<InspectionList/);

  assert.match(
    loading,
    /state="loading"/,
    "loading.tsx debe reutilizar el estado de carga"
  );

  assert.match(
    errorBoundary,
    /^"use client";/,
    "error.tsx debe ser un componente cliente"
  );

  assert.match(
    errorBoundary,
    /role="alert"/,
    "El límite de error debe anunciar el fallo"
  );

  assert.match(
    errorBoundary,
    /onClick=\{reset\}/,
    "El límite de error debe permitir reintentar"
  );

  console.log("inspection-states.spec.ts: PASS");
}
