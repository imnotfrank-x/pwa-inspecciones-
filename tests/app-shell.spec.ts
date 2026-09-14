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
  const appShell = readProjectFile("src/components/app-shell.tsx");
  const layout = readProjectFile("src/app/layout.tsx");
  const page = readProjectFile("src/app/page.tsx");
  const loading = readProjectFile("src/app/loading.tsx");
  const errorBoundary = readProjectFile("src/app/error.tsx");

  assert.match(
    packageJson.scripts.test,
    /app-shell\.spec\.ts/,
    "npm test debe ejecutar la prueba del App Shell"
  );

  assert.match(
    appShell,
    /<header\b/,
    "El App Shell debe incluir un header"
  );

  assert.match(
    appShell,
    /<nav\b/,
    "El App Shell debe incluir navegación"
  );

  assert.match(
    appShell,
    /aria-label="Navegación principal"/,
    "La navegación principal debe tener un nombre accesible"
  );

  assert.match(
    appShell,
    /<main\b/,
    "El App Shell debe incluir el contenido principal"
  );

  assert.match(
    appShell,
    /<footer\b/,
    "El App Shell debe incluir un footer"
  );

  assert.match(
    appShell,
    /href="#contenido-principal"/,
    "Debe existir un enlace para saltar al contenido"
  );

  assert.match(
    appShell,
    /id="contenido-principal"/,
    "El enlace de salto debe apuntar al main"
  );

  assert.match(
    appShell,
    /tabIndex=\{-1\}/,
    "El contenido principal debe poder recibir el foco programático"
  );

  assert.match(
    layout,
    /import \{ AppShell \} from "\.\.\/components\/app-shell"/,
    "El layout debe importar AppShell"
  );

  assert.match(
    layout,
    /<AppShell>\{children\}<\/AppShell>/,
    "El layout debe envolver las páginas con AppShell"
  );

  assert.doesNotMatch(
    page,
    /<main\b/,
    "page.tsx no debe duplicar el main del shell"
  );

  assert.doesNotMatch(
    loading,
    /<main\b/,
    "loading.tsx no debe duplicar el main del shell"
  );

  assert.doesNotMatch(
    errorBoundary,
    /<main\b/,
    "error.tsx no debe duplicar el main del shell"
  );

  const combinedFiles = [
    appShell,
    page,
    loading,
    errorBoundary
  ].join("\n");

  const mainElements = combinedFiles.match(/<main\b/g) ?? [];

  assert.equal(
    mainElements.length,
    1,
    "Debe existir exactamente un elemento main entre el shell y las vistas"
  );

  assert.match(
    page,
    /id="state-verification"/,
    "La navegación debe tener un destino para la sección de estados"
  );

  assert.match(
    page,
    /id="page-title"/,
    "La pantalla inicial debe conservar un título identificable"
  );

  console.log("app-shell.spec.ts: PASS");
}
