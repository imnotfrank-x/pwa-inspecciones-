# Guía de Javier — Semana 8, integración y reconexión

## 1. Objetivo y límites de tu parte

Tu incremento es el segundo de tres. Debe conectar el formulario local de Francisco
con la sincronización sintética existente y demostrar el recorrido con pruebas de
integración. Carlos hará después las pruebas E2E y el cierre. No comiences desde
`main`: ahí aún no está este incremento. No hagas merge a `main` ni crees tags.

Entregarás implementación, pruebas reproducibles, un experimento de defecto
controlado y evidencia propia. Un mensaje de “ya terminó” sin SHA, comandos y CI
no permite revisar la parte.

## 2. Preparar la rama y validar la base

Desde la raíz del mismo repositorio, con los cambios personales guardados:

```bash
git status --short
git fetch origin
git switch -c w08/javier-integracion origin/w08/francisco-unitarias
node --version
npm --version
npm ci
make verify
```

Si ya existe tu rama, no fuerces su reemplazo: revisa dónde apunta y continúa la
correcta. No uses `reset --hard`, no borres cambios locales ni crees un repositorio
nuevo. Usar Node 20.19.0 y npm 10.8.2. Si Make no está instalado, el equivalente
exacto es `npm run verify`; registrar cuál se ejecutó, no afirmar que Make pasó.

La base debe aprobar diez suites heredadas y 40 casos nuevos. Detente y reporta si
no puedes reproducirla; no ocultes un fallo con `--if-present` o `continue-on-error`.

Lee antes de editar:

- `docs/test-strategy.md`, `docs/sync-policy.md` y la sección Semana 8 del README.
- `src/components/inspection-capture.tsx` y `src/lib/inspections/capture.ts`.
- `src/lib/storage/schema.ts`, `src/lib/sync/queue.ts`, `src/lib/sync/conflict-policy.ts`.
- `tests/unit/`, `tests/fixtures/inspections.ts`, `scripts/run-tests.mjs` y `scripts/verify.mjs`.
- `.github/workflows/academic-evaluation.yml` y las instrucciones originales del kit.

## 3. Qué recibes y qué debes conservar

El formulario ya guarda con `createBrowserSyncStorage()` y `createSyncQueue()`.
La clave local es `utt-lab-inspections:sync:v1`; no cambies el esquema ni borres datos
para que los tests pasen. El ID de una captura y su clave `capture:<ID>` se conservan
al reintentar. **Nueva inspección** comienza otra identidad.

El estado actual informa conexión, pero no envía nada. Los registros muestran
`pending`, `synced` o `failed`. El listado sintético CSR y el detalle SSR siguen
siendo independientes del registro local; no conviertas esta actividad en un CRUD
nuevo, autenticación o backend de producción.

La cola ya implementa `syncPending(transport, retryOptions)`, protección contra
envíos concurrentes, `registerOnlineSync(...)`, backoff, recuperación y conflictos.
Lee las firmas reales: no reimplementes una segunda cola ni dedupliques solo en React.

No modifiques los workflows oficiales `week-*.yml`, las evidencias de Francisco o
Carlos ni elimines pruebas anteriores. Puedes corregir módulos compartidos si hay
un defecto demostrado, con una prueba y una explicación del cambio.

## 4. Conectar sincronización y UI

### Transporte sintético

Crear `src/lib/sync/synthetic-transport.ts` o un módulo equivalente claramente
documentado. Debe respetar el tipo `SyncTransport` de la cola. La operación conserva
`id`, `entityId`, `idempotencyKey`, `payload` y versión base en todos los reintentos.
No inventes otro tipo de operación incompatible.

Para esta demostración se permite un receptor sintético inyectable, con un registro
de claves aplicadas y un almacenamiento remoto separado del local. Documenta si
vive solo en memoria y se pierde al recargar/reiniciar; no lo presentes como servidor
durable. No basta con devolver siempre `success`: debe procesar y deduplicar la
operación. Si eliges HTTP local, conserva el mismo contrato y prueba también su
adaptador; no uses servicios externos ni credenciales.

Requisitos del receptor:

1. Primera clave/contenido: aplicar una vez y devolver versión y fecha de servidor.
2. Misma clave/contenido repetidos: devolver el resultado original, sin otro efecto.
3. Misma clave/contenido distinto: rechazar de forma explícita y preservar el original.
4. Poder inspeccionar en el fixture de prueba **intentos recibidos** y **efectos
   aplicados** por separado. Un `Map.set(entityId, payload)` por sí solo oculta
   duplicaciones; registra también cuántas veces se aplicó realmente la mutación.
5. Aislamiento: cada prueba crea un receptor, reloj y almacenamiento nuevos.

El fallo “respuesta perdida” se simula en tests: el receptor aplica la primera
operación pero el transporte pierde su confirmación; al reenviar la misma clave,
se devuelve el resultado ya aplicado. No dejes fallos aleatorios en la demo normal.

### Conexión al componente

Trabaja sobre `src/components/inspection-capture.tsx`; puedes extraer un controlador
en `src/lib/sync/` para poder probarlo sin React. Debe usar la misma instancia de cola
para guardar, sincronizar y leer el estado; no crear una por cada clic.

- Guardar primero de forma local, incluso sin conexión. Un envío fallido nunca borra
  una captura ni la señala como sincronizada.
- Cuando haya conexión, procesar pendientes al guardar, al montar/reabrir la vista
  y al recibir `online`. Al desmontar, retirar listeners y cancelar temporizadores.
- Consultar el snapshot después del procesamiento y reflejarlo en la lista local.
- Mostrar un estado accesible de sincronizando, pendiente/reintento, sincronizada,
  fallo definitivo o conflicto. `navigator.onLine` no prueba que un servidor responda.
- Ofrecer un botón **Sincronizar pendientes** para recuperar sin recargar. No debe
  permitir envíos simultáneos ni reiniciar intentos o generar nuevas claves.
- Si conectas reintentos automáticos con temporizador, respetar `nextAttemptAt`,
  limpiar el temporizador y detenerlo offline. Si solo reintentas mediante eventos
  o botón, declararlo con claridad; no prometer procesamiento en segundo plano.
- No crear prompts de permisos ni hacer obligatorias las capacidades de Semana 6.
- No perder los campos tras fallo de guardado ni eliminar la protección de doble clic.
- No cambiar los tests unitarios de Francisco para ocultar regresiones. Al conectar
  transporte, sus cinco tests de componente deben seguir pasando offline.

## 5. Pruebas de integración obligatorias

Crear archivos `*.test.ts` dentro de `tests/integration/`, por ejemplo
`offline-sync.test.ts` y `sync-controller.test.ts`. Usar `node:test` y
`node:assert/strict`, igual que el runner existente.

**Diferencia con las unitarias:** aquí usar `JsonSyncStorage` real + cola real +
transporte/receptor sintéticos. Solo el objeto `StorageLike` subyacente puede ser un
Map que implemente `getItem`, `setItem` y `removeItem`. No uses `MemorySyncStorage`
en lugar del adaptador JSON para afirmar que comprobaste serialización/persistencia.

| Caso | Preparación y acción | Aserciones mínimas |
|---|---|---|
| Guardar offline | Controlador sin conexión, formulario convertido a draft válido y cola real | Una inspección persistida, una operación pendiente, cero llamadas al transporte |
| Recuperar tras reapertura | Crear otra instancia de adaptador y cola sobre las mismas cadenas guardadas | Mismo ID, contenido, clave y operación; no se genera una nueva |
| Reconectar | Disparar el evento online del controlador con receptor disponible | Una aplicación remota, estado local `synced`, operación terminada según contrato real |
| Fallo y espera | Primera llamada recuperable, reloj fijo; procesar antes de `nextAttemptAt` | Conserva pendiente, incrementa contador; no reenvía antes de tiempo |
| Reintento vencido | Avanzar reloj inyectado, repetir procesamiento | Misma identidad y contenido, éxito y persistencia actualizada |
| Confirmación perdida | Aplicar remoto, perder respuesta, vencer backoff y reenviar | Dos intentos, una aplicación remota, una inspección local, una confirmación efectiva |
| Clave reutilizada indebidamente | Mismo idempotencyKey con contenido distinto ante el receptor | Rechazo y datos originales intactos |
| Online repetido/concurrencia | Eventos y botón mientras un envío permanece pendiente | No hay solicitudes concurrentes del mismo trabajo ni doble efecto |
| Limpieza | Desmontar/disponer controlador y volver a emitir online | Ningún nuevo envío ni timer activo de la instancia destruida |

No duermas varios segundos para simular backoff: inyecta un reloj y controla la
resolución de promesas. Las aserciones deben ejecutar comportamiento real, no
buscar nombres con expresiones regulares en el código. Los datos deben ser sintéticos.

## 6. Integrar comandos, tipos, lint, cobertura y CI

En `package.json`, añadir:

```json
"test:integration": "node scripts/run-tests.mjs integration"
```

Añadir `&& node scripts/run-tests.mjs integration` al final de `test`, conservando
todas las pruebas anteriores. Ampliar `lint` y los patrones de `eslint.config.mjs`
para incluir `tests/integration`; ampliar `tsconfig.tests.json` también. El runner
ya acepta la capa y produce `test-results/integration.xml`.

Para cobertura conjunta, añadir un script coordinador que ejecute unitarias e
integración bajo **una misma ejecución de c8**, propagando ambos resultados, o
configurar su acumulación documentada. No sobreescribir cobertura unitaria con
integración ni restringir artificialmente el denominador para inflar el porcentaje.

En `scripts/verify.mjs`, exigir los archivos reales de integración, ejecutar las
capas obligatorias y conservar resultados/logs si una falla. Evitar ejecutar la
integración dos veces sin necesidad salvo la repetición deliberada con cobertura.
La salida global debe ser no cero si cualquier etapa obligatoria falla.

En `.github/workflows/academic-evaluation.yml`, actualizar nombre/resumen a
**incremento 2 de 3**, conservar instalación y `make verify`, los permisos mínimos y
`if: always()` para artefactos. Cambiar el nombre del artefacto si conviene; documentar
el nombre exacto. E2E sigue pendiente de Carlos: no añadir un comando vacío que pase.

## 7. Demostrar un defecto controlado

Primero terminar, verificar, hacer commit y publicar tu implementación correcta.
Después, con el working tree limpio y estando en `w08/javier-integracion`:

```bash
git switch -c w08/javier-defecto-controlado
```

Introducir **un solo defecto**, por ejemplo hacer que el receptor aplique dos veces
una clave ya procesada. Debe cambiar código ejecutado por la prueba de confirmación
perdida; no cambiar expectativas del test ni romper imports deliberadamente.

1. Ejecutar `npm run test:integration` y guardar nombre del caso, aserción y salida
   no cero. Debe fallar por “efectos aplicados = 2, esperado = 1” o una regresión
   equivalente, no por dependencias, syntax o falta de permisos.
2. Revisar diff, hacer commit del defecto y subir **solo la rama temporal**. Conservar
   SHA y enlace a Actions rojo y su artefacto. Es un fallo intencional identificado.
3. Restaurar mediante `git revert <SHA_DEL_DEFECTO>` en esa rama temporal (sustituir
   por el SHA real). Repetir el mismo comando, confirmar verde, publicar y guardar
   el enlace a Actions verde de esa restauración.
4. Volver con `git switch w08/javier-integracion`. No hacer merge ni cherry-pick de
   la rama del defecto. Documentar el experimento desde la rama correcta.

Crear `docs/controlled-defect.md` con: regla rota, rama temporal, SHA correcto, SHA
defectuoso, diff concreto, test/aserción, comando y salida roja, SHA restaurado,
comando y salida verde, enlaces Actions/artefactos y explicación de por qué detecta
un error real. No fabricar logs. Conservar esos commits para trazabilidad, fuera
de la historia de la rama entregable. Un fallo inicial de configuración no sustituye
este experimento.

## 8. Documentación y evidencia personal

Actualizar solamente tu incremento en README y estrategia: arquitectura del
transporte, pasos de uso, límites reales, casos ejecutados, resultados y cobertura
observada con denominador. No marcar E2E ni Semana 8 completa como aprobados.

Dentro de tu sección de `evidence/individual.md`, añadir **Incremento personal —
Semana 8** con este contenido, reemplazando los corchetes tras ejecutar:

```text
SHA de implementación: [SHA completo del commit de código ya creado]
Contribución: [archivos y comportamiento realmente implementado]
Decisión técnica: [persistir antes del envío, conservar clave y deduplicar remoto]
Pruebas ejecutadas: [comandos, Node/npm y códigos de salida reales]
Resultados: [casos aprobados, logs/reportes y enlace de CI de implementación]
Defecto controlado: [enlace a docs/controlled-defect.md y SHAs rojo/verde]
Limitación: [durabilidad del remoto sintético, pestañas, reintentos o segundo plano]
Qué no demuestra: [E2E real, dispositivos físicos y servidor de producción]
Uso de IA: [herramienta, propósito, archivos asistidos y validación humana real]
Cambio que puedo explicar/modificar: [uno concreto y su prueba]
```

Si los comandos los ejecutó una IA, decirlo. Solo escribir “ejecuté personalmente”
si tú lo hiciste. No escribir dentro de un commit su propio SHA; crear primero el
commit de implementación y después el de evidencia que referencia al anterior.

## 9. Validar y publicar para revisión

Detener servidores de desarrollo antes de compilar. Ejecutar y comprobar salidas:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm test
npm run test -- --run
npm run test:coverage
npm run build
make verify
bash public-tests/check.sh
git diff --check
git status --short
```

Realizar además una prueba personal del formulario, guardado sin red y reconexión,
sin capturar datos reales. Declarar cualquier comprobación que no puedas completar.
La recarga offline y la variante de capacidades serán formalizadas por Carlos.

Revisar el diff y agregar **solo tus archivos** con `git add <rutas revisadas>`.
No incluir `.env`, tokens, `node_modules`, `.next`, reportes generados ni archivos de
entrega antiguos. Crear commit de implementación, luego el de evidencia, y publicar:

```bash
git push -u origin w08/javier-integracion
git rev-parse HEAD
git status --short
```

Abrir GitHub Actions y esperar a que termine el workflow de Semana 8 del **SHA final
de la rama**, no solo del anterior. Revisar también los workflows heredados. Si un
fallo no pertenece al experimento temporal, corregirlo antes de avisar.

## 10. Mensaje exacto de handoff

```text
Hola, Francisco. Terminé mi incremento de integración de Semana 8.
Rama: w08/javier-integracion
SHA de implementación: [SHA completo]
SHA final de evidencia: [SHA completo]
Actions del SHA final: [URL de ejecución]
Node/npm: [versiones observadas]
Validaciones: [comandos y resultados reales, sin afirmar lo no ejecutado]
Integración: [número de casos y qué demuestran]
Confirmación perdida: [intentos observados / efectos remotos aplicados]
Defecto controlado: [documento, SHA rojo, SHA restaurado y enlaces]
Cobertura: [cifra, alcance y archivo del reporte]
Limitaciones: [las reales]
Validación humana e IA: [quién ejecutó qué y qué revisé personalmente]
No hice merge a main ni modifiqué workflows oficiales o evidencias ajenas.
La rama está lista para revisión antes de que empiece Carlos.
```

No entregues todavía a Classroom ni autorices a Carlos a partir de una rama sin
revisar. Francisco revisará comportamiento, evidencias, CI y ausencia del defecto
antes de dar la guía del último incremento.
