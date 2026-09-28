// @ts-nocheck
{
  const assert = require("node:assert/strict");
  const { existsSync, readFileSync } = require("node:fs");
  const { createHash } = require("node:crypto");
  const { resolve } = require("node:path");
  const ts = require("typescript");

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
  const detailPagePath = "src/app/inspecciones/[id]/page.tsx";
  const detailLoadingPath = "src/app/inspecciones/[id]/loading.tsx";
  const detailErrorPath = "src/app/inspecciones/[id]/error.tsx";
  const detailNotFoundPath = "src/app/inspecciones/[id]/not-found.tsx";
  const detailDataPath = "src/lib/data/inspection-detail.ts";
  const renderingDecisionPath = "docs/rendering-decision.md";
  const workflowPath =
    ".github/workflows/week-04-w04-csr-ssr.yml";

  for (const path of [renderingDecisionPath, workflowPath]) {
    assert.ok(
      existsSync(resolve(root, path)),
      `Debe existir ${path}`
    );
  }

  const renderingDecision = readProjectFile(renderingDecisionPath);
  const workflow = readProjectFile(workflowPath);

  for (const path of [
    detailPagePath,
    detailLoadingPath,
    detailErrorPath,
    detailNotFoundPath,
    detailDataPath
  ]) {
    assert.ok(existsSync(resolve(root, path)), `Debe existir ${path}`);
  }

  const detailPage = readProjectFile(detailPagePath);
  const detailLoading = readProjectFile(detailLoadingPath);
  const detailError = readProjectFile(detailErrorPath);
  const detailNotFound = readProjectFile(detailNotFoundPath);
  const detailData = readProjectFile(detailDataPath);

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

  assert.doesNotMatch(
    detailPage,
    /["']use client["']\s*;/,
    "La página de detalle debe permanecer como componente de servidor"
  );

  assert.match(
    detailPage,
    /export default async function/,
    "La página SSR debe declararse como función async"
  );

  assert.match(
    detailPage,
    /params\.id/,
    "La página SSR debe leer params.id"
  );

  assert.match(
    detailPage,
    /getInspectionById\(params\.id\)/,
    "La página SSR debe consultar el detalle sintético por ID"
  );

  assert.match(
    detailPage,
    /notFound\(\)/,
    "La página SSR debe activar el estado not-found"
  );

  assert.match(
    detailPage,
    /export const dynamic\s*=\s*["']force-dynamic["']/,
    "El detalle debe declarar la estrategia dinámica de servidor"
  );

  assert.doesNotMatch(
    detailPage,
    /generateStaticParams/,
    "El detalle no debe generar estáticamente los IDs conocidos"
  );

  assert.match(
    detailLoading,
    /import \{ LoadingState \} from ["']\.\.\/\.\.\/\.\.\/components\/loading-state["']/,
    "El estado de carga SSR debe reutilizar LoadingState"
  );

  assert.match(
    detailLoading,
    /Cargando detalle de inspección/,
    "La carga SSR debe mostrar un mensaje específico"
  );

  assert.match(
    detailError,
    /^"use client";/,
    "El límite de error del detalle debe ser un componente cliente"
  );

  assert.match(
    detailError,
    /role="alert"/,
    "El error SSR debe anunciarse como alerta"
  );

  assert.match(
    detailError,
    /onClick=\{\(\) => reset\(\)\}/,
    "El botón del error SSR debe ejecutar reset"
  );

  assert.doesNotMatch(
    detailError,
    /error\.(message|stack)/,
    "El límite de error no debe revelar detalles internos"
  );

  assert.match(
    detailNotFound,
    /La inspección sintética no existe/,
    "Debe existir un mensaje específico para el registro inexistente"
  );

  assert.match(
    detailNotFound,
    /href="\/inspecciones"/,
    "El estado not-found debe permitir volver al listado"
  );

  for (const routeState of [detailLoading, detailError, detailNotFound]) {
    assert.doesNotMatch(
      routeState,
      /<main[\s>]/,
      "Los estados del detalle no deben duplicar el main de AppShell"
    );
  }

  assert.match(
    detailData,
    /SYNTHETIC_DETAIL_DELAY_MS\s*=\s*400/,
    "La consulta debe usar una espera sintética determinista"
  );

  assert.match(
    renderingDecision,
    /CSR/,
    "La decisión debe explicar el renderizado CSR"
  );

  assert.match(
    renderingDecision,
    /SSR/,
    "La decisión debe explicar el renderizado SSR"
  );

  assert.match(
    renderingDecision,
    /hydration mismatch/i,
    "La decisión debe documentar el riesgo de hidratación"
  );

  assert.match(
    renderingDecision,
    /First Load JS/,
    "La decisión debe incluir una métrica reproducible del build"
  );

  assert.match(
    renderingDecision,
    /2\.25 kB/,
    "La decisión debe registrar el tamaño observado del listado"
  );

  assert.match(
    renderingDecision,
    /152 B/,
    "La decisión debe registrar el tamaño observado del detalle"
  );

  const normalizedWorkflow = workflow.replace(/\r\n/g, "\n");
  const workflowHash = createHash("sha256")
    .update(normalizedWorkflow, "utf8")
    .digest("hex");

  assert.equal(
    workflowHash,
    "9253a08a0a38d1f26abb6d61d9112dd24da9a99e374ba13b77ea96aeb6ffb4fe",
    "El workflow oficial de Semana 4 no debe modificarse"
  );

  const previousTsExtension = require.extensions[".ts"];
  require.extensions[".ts"] = function transpileTypeScript(module, filename) {
    const source = readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };

  const detailModulePath = resolve(root, detailDataPath);
  const { getInspectionById } = require(detailModulePath);

  (async () => {
    const firstInspection = await getInspectionById("inspection-001");
    const secondInspection = await getInspectionById("inspection-002");
    const missingInspection = await getInspectionById("no-existe");

    assert.equal(firstInspection?.id, "inspection-001");
    assert.equal(secondInspection?.id, "inspection-002");
    assert.equal(missingInspection, undefined);
    await assert.rejects(
      getInspectionById("error-demo"),
      /Synthetic inspection detail error/
    );

    if (previousTsExtension) {
      require.extensions[".ts"] = previousTsExtension;
    } else {
      delete require.extensions[".ts"];
    }

    delete require.cache[detailModulePath];

    console.log("rendering.spec.ts: CSR + SSR PASS");
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
