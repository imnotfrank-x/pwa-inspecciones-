# Estrategia de pruebas — Semana 8

## Estado y alcance

Incremento 3/3: Carlos cierra con E2E sobre la base corregida de Francisco `c0da32f851e90e6f1bda1e52f8fe46024629df51`, conservando el incremento de Javier y la base 1/3 de Francisco.
Semana 7 correspondió a exámenes. Continuamos la misma PWA, sin starter nuevo.
Este documento distingue qué comprueba cada capa. Un workflow verde demuestra la
batería declarada, pero no un backend durable, hardware físico, todos los navegadores
ni una revisión académica automática.

## Diagnóstico inicial

Con Node 20.19.0 y npm 10.8.2 se ejecutaron `npm ci`, `npm test` y `npm run build`
sobre la base. Instalación, las diez suites heredadas y build terminaron con código 0.
`npm run start -- --hostname 127.0.0.1 --port 3108` arrancó y mostró `Ready`.
La herramienta de navegador rechazó el acceso a ese origen por falta de permiso;
no se realizó una revisión visual ni se declara una interacción E2E aprobada.

La inspección de código identificó el bloqueo: `src/lib/storage/schema.ts` y
`src/lib/sync/queue.ts` tenían consumidores en pruebas, pero no un formulario en la
interfaz. El listado CSR solo mostraba datos predefinidos. No existían comandos de
lint, cobertura, pruebas por capas ni un workflow de Semana 8. Las búsquedas de
código en pruebas heredadas no demuestran interacción de usuario.

## Incremento de Francisco (1/3)

Se incorporó `InspectionCapture` en `/inspecciones` (estado normal), sin reemplazar
el listado de ejemplos ni las rutas de error/carga de Semana 4. El formulario valida
sus entradas con `inspectionDraftFromForm` y vuelve a usar la validación de dominio.
Guarda la inspección y su operación juntas mediante `createSyncQueue` y
`createBrowserSyncStorage`; muestra los registros locales y su estado pendiente.
El botón queda bloqueado después de guardar hasta elegir **Nueva inspección**.
La misma captura conserva ID y clave durante reintentos; un fallo no borra sus datos.
El panel de capacidades de Semana 6 es opcional y se reutiliza sin activar permisos
automáticamente. Su contenido sigue siendo local y no se agrega al esquema de sync.

## Incremento de Javier (2/3)

Se conectó la captura local con la sincronización sintética y se verificó mediante
pruebas de integración con persistencia JSON real (`JsonSyncStorage`):

- **Transporte y receptor sintético (`src/lib/sync/synthetic-transport.ts`):**
  implementa `SyntheticSyncReceiver` respetando `SyncTransport`. Registra claves
  idempotentes procesadas, datos aplicados, resultado original aceptado y contadores
  separados de intentos recibidos (`attemptsReceived`) y efectos aplicados (`effectsApplied`).
  La deduplicación compara la identidad y el contenido estable de la operación
  (`entityId`, `type`, `baseVersion` y los campos de la captura en `payload`), ignorando
  metadatos que cambian legítimamente entre reintentos (`attemptCount`, `nextAttemptAt`,
  `state` y `updatedAt` de la operación). Si se repite la misma clave con el mismo
  contenido estable, devuelve el resultado original sin incrementar `effectsApplied`;
  si se reutiliza la clave con contenido distinto, rechaza con `fatal-error` y conserva
  intactos los datos originales.
  **Límite expreso:** el receptor simula un sistema remoto, pero no es un servidor durable.
  Su memoria puede perderse al recargar o reiniciar y no representa un backend de producción.
- **Controlador de sincronización (`src/lib/sync/sync-controller.ts`):**
  comparte la misma instancia de `InspectionSyncQueue` con la vista, ejecuta `syncPending()`,
  espera su resumen (`SyncSummary`), consulta `getSnapshot()` y publica los estados e
  indicadores de error hacia la interfaz. Deriva los seis estados visibles revisando
  tanto `snapshot.inspections` como `snapshot.operations`: `Pendiente de sincronización`,
  `Sincronizando…`, `Pendiente de reintento`, `Sincronizada`, `Error de sincronización`
  y `Conflicto pendiente`. Unifica un único listener `online` (sin duplicar listeners),
  limpia suscripciones y eventos al desmontar (`dispose()`) y verifica tras cada lote si
  se guardó una nueva inspección mientras había un envío activo para no dejarla olvidada.
- **Conexión con la interfaz (`src/components/inspection-capture.tsx`):**
  persiste primero localmente y, si hay conexión, solicita la sincronización sin que un
  fallo de transporte convierta el guardado local en pérdida de datos. Añade el botón
  manual **Sincronizar pendientes** (que recupera el procesamiento sin crear otra
  operación, sin cambiar la clave, sin reiniciar intentos, sin saltarse `nextAttemptAt`
  y sin ejecutar envíos simultáneos) y mantiene separado el indicador de red
  (**Con conexión** / **Sin conexión**) del estado de sincronización de cada registro.

## Incremento de Carlos (3/3)

Se agregó Playwright `1.64.1` con Chromium, un servidor de producción en
`127.0.0.1:3108`, ejecución serial y contextos aislados por prueba. El escenario
offline captura exclusivamente mediante el formulario, espera el control del Service
Worker, prepara los recursos con una recarga conectada, desconecta Chromium, persiste
y recupera el mismo ID tras una recarga sin red, y termina con una inspección
`synced` y una cola vacía al reconectar. El escenario de capacidad ausente elimina
`navigator.geolocation` antes de cargar la ruta, verifica el fallback manual y prueba
que la inspección se guarda sin ubicación. La referencia manual queda en memoria de
la vista y el test confirma que no se incorpora al snapshot persistido.

## Matriz riesgo–prueba

| Riesgo | Capa y archivo | Aserción útil | Estado / responsable |
|---|---|---|---|
| Captura inválida o conversión silenciosa | Unitaria: `tests/unit/inspection-validation.test.ts` | Rechaza vacío, fechas imposibles, negativos, decimales y valores fuera del contrato; acepta límites | Implementado, Francisco |
| Duplicar la operación local | Unitaria: `tests/unit/queue-idempotency.test.ts` | Una entidad, una operación y una escritura al repetir clave/contenido; error ante contenido distinto | Implementado, Francisco |
| Doble envío, pérdida de captura ante cuota agotada | Componente en memoria: `tests/unit/capture-component.test.ts` | No duplica; conserva campos tras fallo; recupera guardado al remontar; no sobrescribe JSON corrupto | Implementado, Francisco |
| Persistencia offline, deduplicación y respuesta perdida | Integración: `tests/integration/offline-sync.test.ts` | `JsonSyncStorage` real + cola real + receptor sintético + reloj controlado: 2 intentos recibidos producen 1 efecto remoto y dejan la inspección en `synced` con 0 operaciones pendientes | Implementado, Javier |
| Reconexión, concurrencia, estados visibles y captura durante envío | Integración: `tests/integration/sync-controller.test.ts` | Controlador real + UI: evento `online`, acción manual respetando `nextAttemptAt`, 6 estados visibles, limpieza al desmontar y captura en vuelo sin pérdida | Implementado, Javier |
| Enviar offline, bloqueo tras fallo local y trabajo después de dispose | Integración: `tests/integration/sync-regressions.test.ts`, ampliación de prueba de componente | Cero envíos offline; liberar UI y conservar clave tras fallos de lectura/escritura; terminar solo el envío iniciado; recuperar sin duplicados | Corregido, Francisco |
| Recarga realmente sin red | E2E: `tests/e2e/inspection-offline.spec.ts` | Captura mediante UI, offline real del navegador, recarga, mismo ID, reconexión, cola vacía y una fila sincronizada | Implementado, Carlos |
| Capacidad denegada o ausente bloquea captura | E2E: `tests/e2e/capabilities-fallback.spec.ts` | Geolocalización ausente, fallback visible, referencia temporal y recorrido completo exitoso | Implementado, Carlos |
| Prueba incapaz de detectar regresión | Rama temporal `w08/javier-defecto-controlado` y [docs/controlled-defect.md](controlled-defect.md) | Desactivar el retorno idempotente hace fallar el caso de respuesta perdida (`actual: 2 !== expected: 1`); `git revert` restablece verde | Implementado, Javier; Carlos verifica trazabilidad final |

Las unitarias aíslan reglas con fixtures nuevos por caso; la integración compone
`JsonSyncStorage` real, cola real, controlador real, receptor sintético y reloj
controlado; el E2E verifica el comportamiento visible y la persistencia en navegador. No se exige
un porcentaje de cobertura ni un número arbitrario de tests. Se conservan las
pruebas heredadas como regresión adicional, sin contarlas como E2E.

## Herramientas y comandos

- Node 20.19.0 y npm 10.8.2; `.nvmrc` es la fuente de versión en el workflow.
- Ejecutor `node:test` + `node:assert/strict`, con `tsx` para cargar TypeScript.
  `scripts/run-tests.mjs` enumera archivos de `unit` e `integration` sin depender
  del glob del shell, genera `test-results/unit.xml` y `test-results/integration.xml`,
  falla si una capa no existe o está vacía y propaga el código de salida de Node.
- `react-test-renderer` 18.3.1 prueba handlers de React 18 en memoria. No hay DOM,
  motor de navegador, red, permisos físicos ni Service Worker en esas pruebas.
- ESLint 10 + typescript-eslint: reglas recomendadas para `src`, pruebas unitarias,
  integración, E2E, fixtures, scripts y la configuración de Playwright.
- `c8` produce cobertura V8 combinada en una sola recopilación sobre `unit` e
  `integration` (`c8 node scripts/run-tests.mjs unit integration`). Se incluyen
  **todos los módulos de `src/lib` y el componente de captura**, también los no
  ejecutados (0%). No es una medida de cobertura global de toda la PWA. Se generan
  HTML, LCOV y resumen JSON.
- Playwright ejecuta dos escenarios sobre Chromium y el servidor de producción.
  Genera resultados en `test-results/e2e/`, JUnit en `test-results/e2e.xml` y
  el reporte HTML en `playwright-report/`. Sus esperas observan control del worker,
  visibilidad y cambios de estado; no utilizan pausas arbitrarias.

| Comando | Qué ejecuta / salida |
|---|---|
| `npm ci` | Instalación exacta desde lockfile |
| `npm run dev` | Servidor de desarrollo local |
| `npm run lint` | Lint obligatorio de aplicación, pruebas —incluidos E2E—, fixtures, scripts y configuración, sin advertencias toleradas |
| `npm run typecheck` | Tipos de app, configuración y pruebas (`unit` + `integration` + E2E), sin artefactos incrementales |
| `npm run test:unit` | Unitarias y componente en memoria (40 casos); `test-results/unit.xml` |
| `npm run test:integration` | Integración de persistencia JSON, receptor sintético, controlador y UI (25 casos tras correcciones); `test-results/integration.xml` |
| `npm test` | Diez suites heredadas + `test:unit` + `test:integration` |
| `npm run test -- --run` | Misma comprobación acumulativa compatible con workflows previos |
| `npm run test:coverage` | Cobertura unificada de `unit` + `integration` en `coverage/` |
| `npm run build` | Build de producción |
| `npm run test:e2e` | Dos escenarios Playwright; requiere un build previo y levanta `next start` en el puerto 3108 |
| `make verify` | Alias exacto de `npm run verify` |
| `npm run verify` | Estructura, lint, tipos, regresión (`unit` + `integration`), cobertura y build; no ejecuta Playwright |
| `npm run verify:all` | Ejecuta `npm run verify` y, después del build, los E2E; comprobación completa propuesta para el cierre |

## CI y reportes

`.github/workflows/academic-evaluation.yml` ejecuta `npm ci`, instala Chromium y sus
dependencias con el comando oficial de Playwright y ejecuta `npm run verify:all` en
Linux con Node de `.nvmrc`. Publica con `if: always()` el artefacto
`w08-final-<SHA>`: `reports/verification.json`, `test-results/`, `coverage/` y
`playwright-report/`. Los workflows oficiales anteriores se conservan sin cambios.

### Resultado local del incremento 2/3 (Javier)

Con Node 20.19.0 / npm 10.8.2: instalación limpia, lint, tipos, diez suites heredadas,
40 casos unitarios (3 suites), 15 casos de integración (2 suites), variante `--run`,
cobertura combinada y build terminaron con código 0. `npm run verify` y `make verify`
reportaron `pass`; el check público con Bash de Git mostró `PUBLIC_OK`.

La cobertura observada del alcance declarado (`src/lib/**/*.ts` y
`src/components/inspection-capture.tsx`, manteniendo en el denominador los módulos no
ejecutados en 0%) fue:

- **Líneas / sentencias:** 62.51% (1853/2964)
- **Ramas:** 84.01% (389/463)
- **Funciones:** 63.63% (140/220)
- Destacados del incremento: `inspection-capture.tsx` 98.87% de líneas, `capture.ts` 100%,
  `schema.ts` 98.17%, `sync-controller.ts` 96.94%, `synthetic-transport.ts` 91.91% y
  `queue.ts` 75.83%.

## Correcciones de Francisco posteriores a la revisión

El SHA de Javier se conserva como antecedente. Se introdujeron tres reproducciones
en una copia aislada: envío manual con `online=false` (observado: 1 envío y `synced`,
esperado: 0 y pendiente); fallo de escritura de confirmación (observado: `syncing=true`
y error vacío, esperado: liberar la UI y avisar); y `dispose()` durante un envío con
otra captura pendiente (observado: 2 envíos, esperado: finalizar solo 1 y conservar el otro).

Se convirtieron en pruebas permanentes; los ocho primeros escenarios de regresión
fallaron sobre el código anterior, incluyendo un rechazo sin manejar del evento
`online`. Después se añadieron dos casos de pausa justo antes de transmitir y error
de sincronización al montar. El test de React se amplió para comprobar alerta y botón
habilitado tras un fallo al confirmar, y la recuperación idempotente. Un selector
del test retenía un botón de nueva inspección ya desmontado: se corrigió consultando
el nodo vigente, no cambiando la expectativa de comportamiento.

La cola acepta opcionalmente `shouldContinue` y `onSending` en un tercer argumento;
las llamadas existentes conservan su contrato. Comprueba continuidad antes de cada
envío, incluso después de persistir `syncing` y notificar progreso. Una pausa sin
transporte restaura estado/fecha anteriores sin consumir intentos. El resultado de
un envío ya iniciado sí se persiste, aunque se haya desmontado la vista o perdido red.

El controlador libera `syncing` y comunica errores de almacenamiento, conservando
la última copia visible si tampoco puede leer. No inventa un éxito: las llamadas
directas rechazan ante errores reales. Los consumidores de UI/eventos capturan ese
rechazo ya comunicado. Un registro persistido como `syncing` tras fallo de confirmación
se presenta como pendiente de reintento cuando no hay envío activo; la cola lo recupera
con la misma clave. No se modificó el receptor ni el experimento de Javier.

Se conservan 40 unitarias; ahora hay 25 pruebas de integración en tres suites. Los
resultados originales de 15 y sus porcentajes anteriores se mantienen como históricos.
La cobertura actual se obtiene de `coverage/coverage-summary.json` y del artefacto del
SHA corregido, sin umbral arbitrario. En ese punto histórico, E2E y revisión humana
seguían pendientes; el cierre de Carlos posterior se documenta a continuación.

La ejecución local de las correcciones (Node `v20.19.0`, npm `10.8.2`) aprobó
`npm ci`, `make verify`, `npm run test -- --run`, check público y `git diff --check`.
Cobertura combinada: líneas/sentencias 63.80% (1939/3039), ramas 84.32% (452/536)
y funciones 64.25% (142/221), incluyendo los módulos no ejecutados en el denominador.

## Resultado local del cierre 3/3 (Carlos)

Con Node.js `v20.19.0`, npm `10.8.2`, Playwright `1.64.1` y Chromium administrado
por Playwright, `npm run verify:all` terminó con código 0. Aprobaron las diez suites
heredadas, 40/40 casos unitarios, 25/25 de integración y 2/2 E2E. La cobertura de
unitarias + integración permaneció en 63.80% de líneas/sentencias, 84.32% de ramas
y 64.25% de funciones. El build de Next.js 14.2.35 compiló correctamente;
`/inspecciones` reportó 11 kB propios y 103 kB de First Load JS, y el detalle se
mantuvo dinámico.

El E2E offline confirmó que la aplicación, no `offline.html`, reaparece funcional
durante la recarga sin red; recuperó el mismo ID y contenido, mantuvo la operación
pendiente, sincronizó al volver la conexión y conservó un único registro tras una
acción manual adicional. El E2E de capacidad confirmó el aviso `unsupported`, el
fallback manual, el guardado exitoso y la ausencia de la referencia manual en
`localStorage`.

El primer intento del fallback falló porque `getByRole("alert")` también encontraba
el anunciador de rutas vacío de Next.js. Se hizo específico el selector funcional
mediante `data-reason="unsupported"`; el producto no requirió cambios. El primer
arranque dentro del entorno aislado no alcanzó el puerto local aunque el proceso
estaba escuchando; al ejecutar Playwright con acceso al servidor local, ambos casos
pasaron. No se usaron esperas de tiempo arbitrarias.

## Experimento de defecto controlado y cierre pendiente

El experimento completo se documenta en [docs/controlled-defect.md](controlled-defect.md):

- En la rama temporal `w08/javier-defecto-controlado`, el commit
  [`2d3a24ac2d22c7341b4287f8b84d23dd2d12ecf3`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/2d3a24ac2d22c7341b4287f8b84d23dd2d12ecf3)
  desactivó el retorno temprano de deduplicación en `SyntheticSyncReceiver.receive()`.
- `npm run test:integration` y GitHub Actions ([Run 40250330208](https://github.com/imnotfrank-x/pwa-inspecciones-/actions/runs/40250330208))
  fallaron en el caso `respuesta perdida: dos intentos recibidos producen un solo efecto remoto y dejan la inspección en synced`
  con `AssertionError: Expected values to be strictly equal: 2 !== 1` (`effectsApplied`).
- La reversión mediante `git revert` en
  [`f9c908987a0b7bfa3d3aa0f2f34188d2ef605267`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/f9c908987a0b7bfa3d3aa0f2f34188d2ef605267)
  restauró los 15 casos de integración a verde local y en GitHub Actions ([Run 40250381443](https://github.com/imnotfrank-x/pwa-inspecciones-/actions/runs/40250381443)).

Carlos completó Playwright en el incremento 3/3 con servidor de producción,
recarga offline real controlada por Service Worker y fallback de geolocalización.
El experimento controlado anterior se conserva como evidencia de integración y no
se reemplaza por el E2E.

## Límites y fallos encontrados

- El receptor sintético (`SyntheticSyncReceiver`) opera en memoria separado de
  `localStorage`: simula un sistema remoto para verificar idempotencia, reintentos y
  conflictos, pero no es un servidor durable y su memoria se pierde al recargar o reiniciar.
- Las pruebas de integración y de componente en memoria no ejecutan un navegador real;
  esa brecha se cubre para Chromium mediante los dos E2E, pero no para otros motores,
  hardware físico o permisos reales.
- La cola y el controlador coordinan una instancia en memoria y `localStorage`; no
  garantizan sincronización en segundo plano del sistema operativo ni bloqueo entre
  múltiples pestañas abiertas simultáneamente.
- npm continúa informando tres vulnerabilidades heredadas (dos altas y una crítica);
  no se ejecutó `npm audit fix --force` para no alterar versiones mayores de Next.js.

## Entrega académica

Los tres integrantes entregarán el mismo SHA final integrado por revisión, enlace
de Actions de ese SHA, estrategia, reportes y su sección personal. No se requiere
tag. El docente debe tener acceso al repositorio; no se marca acceso confirmado
sin comprobarlo. La fecha válida es la de Classroom, no se infiere del historial.
No se hace un commit adicional para intentar escribir dentro de él su propio SHA.
