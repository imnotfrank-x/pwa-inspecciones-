# Estrategia de pruebas — Semana 8

## Estado y alcance

Incremento 2/3: Javier (sobre la base 1/3 de Francisco `942cf9759b0c1b8e962fd39560e5fdb88d0dc841` y Semana 6 `47a62af152bd9b7d1c87ff6963a8a5991dcd8d70`).
Semana 7 correspondió a exámenes. Continuamos la misma PWA, sin starter nuevo.
Este documento distingue implementado, comprobado y pendiente; un workflow verde
de este incremento NO demuestra el cumplimiento completo de Semana 8: las pruebas
E2E en navegador real con Service Worker y el cierre final siguen pendientes de Carlos.

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
- **Pendiente de Carlos (3/3):** pruebas E2E con Playwright sobre servidor de producción,
  diagnóstico de recarga realmente offline con Service Worker y cierre documental común.

## Matriz riesgo–prueba

| Riesgo | Capa y archivo | Aserción útil | Estado / responsable |
|---|---|---|---|
| Captura inválida o conversión silenciosa | Unitaria: `tests/unit/inspection-validation.test.ts` | Rechaza vacío, fechas imposibles, negativos, decimales y valores fuera del contrato; acepta límites | Implementado, Francisco |
| Duplicar la operación local | Unitaria: `tests/unit/queue-idempotency.test.ts` | Una entidad, una operación y una escritura al repetir clave/contenido; error ante contenido distinto | Implementado, Francisco |
| Doble envío, pérdida de captura ante cuota agotada | Componente en memoria: `tests/unit/capture-component.test.ts` | No duplica; conserva campos tras fallo; recupera guardado al remontar; no sobrescribe JSON corrupto | Implementado, Francisco |
| Persistencia offline, deduplicación y respuesta perdida | Integración: `tests/integration/offline-sync.test.ts` | `JsonSyncStorage` real + cola real + receptor sintético + reloj controlado: 2 intentos recibidos producen 1 efecto remoto y dejan la inspección en `synced` con 0 operaciones pendientes | Implementado, Javier |
| Reconexión, concurrencia, estados visibles y captura durante envío | Integración: `tests/integration/sync-controller.test.ts` | Controlador real + UI: evento `online`, acción manual respetando `nextAttemptAt`, 6 estados visibles, limpieza al desmontar y captura en vuelo sin pérdida | Implementado, Javier |
| Recarga realmente sin red | E2E: `tests/e2e/` | Captura mediante UI, offline real del navegador, recarga, reconexión y una fila sincronizada | Pendiente, Carlos |
| Capacidad denegada o ausente bloquea captura | E2E: `tests/e2e/` | API simulada en el navegador; fallback visible y recorrido completo exitoso | Pendiente, Carlos |
| Prueba incapaz de detectar regresión | Rama temporal `w08/javier-defecto-controlado` y [docs/controlled-defect.md](controlled-defect.md) | Desactivar el retorno idempotente hace fallar el caso de respuesta perdida (`actual: 2 !== expected: 1`); `git revert` restablece verde | Implementado, Javier; Carlos verifica trazabilidad final |

Las unitarias aíslan reglas con fixtures nuevos por caso; la integración compone
`JsonSyncStorage` real, cola real, controlador real, receptor sintético y reloj
controlado; el E2E verificará el comportamiento visible en navegador. No se exige
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
- ESLint 10 + typescript-eslint: reglas recomendadas para `src`, `tests/unit`,
  `tests/integration`, `tests/fixtures` y `scripts`.
- `c8` produce cobertura V8 combinada en una sola recopilación sobre `unit` e
  `integration` (`c8 node scripts/run-tests.mjs unit integration`). Se incluyen
  **todos los módulos de `src/lib` y el componente de captura**, también los no
  ejecutados (0%). No es una medida de cobertura global de toda la PWA. Se generan
  HTML, LCOV y resumen JSON.

| Comando | Qué ejecuta / salida |
|---|---|
| `npm ci` | Instalación exacta desde lockfile |
| `npm run dev` | Servidor de desarrollo local |
| `npm run lint` | Lint obligatorio (`src`, `tests/unit`, `tests/integration`, `tests/fixtures`, `scripts`), sin advertencias toleradas |
| `npm run typecheck` | Tipos de app y pruebas (`unit` + `integration`), sin artefactos incrementales |
| `npm run test:unit` | Unitarias y componente en memoria (40 casos); `test-results/unit.xml` |
| `npm run test:integration` | Integración de persistencia JSON, receptor sintético, controlador y UI (15 casos); `test-results/integration.xml` |
| `npm test` | Diez suites heredadas + `test:unit` + `test:integration` |
| `npm run test -- --run` | Misma comprobación acumulativa compatible con workflows previos |
| `npm run test:coverage` | Cobertura unificada de `unit` + `integration` en `coverage/` |
| `npm run build` | Build de producción |
| `make verify` | Alias exacto de `npm run verify` |
| `npm run verify` | Estructura, lint, tipos, regresión (`unit` + `integration`), cobertura y build; logs por etapa y `reports/verification.json`; salida no cero ante cualquier fallo |

## CI y reportes

`.github/workflows/academic-evaluation.yml` (incremento 2 de 3) ejecuta `npm ci` y
`make verify` en Linux con Node de `.nvmrc`. Publica con `if: always()` el artefacto
`w08-javier-<SHA>`: `reports/verification.json`, `test-results/` (`unit.xml`,
`integration.xml` y logs) y `coverage/`. Los workflows oficiales anteriores se
conservan sin cambios.

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

Carlos añadirá Playwright en el incremento 3/3 con servidor de producción
(`npm run build` antes de `npm run start`), comprobará la recarga offline real con
Service Worker y el fallback de capacidades opcionales, y realizará el cierre común.

## Límites y fallos encontrados

- El receptor sintético (`SyntheticSyncReceiver`) opera en memoria separado de
  `localStorage`: simula un sistema remoto para verificar idempotencia, reintentos y
  conflictos, pero no es un servidor durable y su memoria se pierde al recargar o reiniciar.
- Las pruebas de integración y de componente en memoria no ejecutan un navegador real,
  Service Worker ni hardware físico; por tanto no demuestran recarga offline E2E.
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
