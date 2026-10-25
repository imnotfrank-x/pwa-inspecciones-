# Estrategia de pruebas — Semana 8

## Estado y alcance

Incremento 1/3: Francisco. Base: `47a62af152bd9b7d1c87ff6963a8a5991dcd8d70` (Semana 6).
Semana 7 correspondió a exámenes. Continuamos la misma PWA, sin starter nuevo.
Este documento distingue implementado, comprobado y pendiente; un workflow verde
de este incremento NO demuestra el cumplimiento completo de Semana 8.

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

## Incremento de Francisco

Se incorporó `InspectionCapture` en `/inspecciones` (estado normal), sin reemplazar
el listado de ejemplos ni las rutas de error/carga de Semana 4. El formulario valida
sus entradas con `inspectionDraftFromForm` y vuelve a usar la validación de dominio.
Guarda la inspección y su operación juntas mediante `createSyncQueue` y
`createBrowserSyncStorage`; muestra los registros locales y su estado pendiente.
El botón queda bloqueado después de guardar hasta elegir **Nueva inspección**.
La misma captura conserva ID y clave durante reintentos; un fallo no borra sus datos.
El panel de capacidades de Semana 6 es opcional y se reutiliza sin activar permisos
automáticamente. Su contenido sigue siendo local y no se agrega al esquema de sync.

Pendiente de Javier: transporte sintético, reflejar resultados de sincronización en
la UI y conectar reconexión/reintentos. El indicador actual solo informa conectividad;
no equivale a una sincronización. Pendiente de Carlos: E2E y diagnóstico del caché
real al recargar desconectado. La reapertura de un componente en memoria no prueba SW.

## Matriz riesgo–prueba

| Riesgo | Capa y archivo | Aserción útil | Estado / responsable |
|---|---|---|---|
| Captura inválida o conversión silenciosa | Unitaria: `tests/unit/inspection-validation.test.ts` | Rechaza vacío, fechas imposibles, negativos, decimales y valores fuera del contrato; acepta límites | Francisco |
| Duplicar la operación local | Unitaria: `tests/unit/queue-idempotency.test.ts` | Una entidad, una operación y una escritura al repetir clave/contenido; error ante contenido distinto | Francisco |
| Doble envío, pérdida de captura ante cuota agotada | Componente en memoria: `tests/unit/capture-component.test.ts` | No duplica; conserva campos tras fallo; recupera guardado al remontar; no sobrescribe JSON corrupto | Francisco |
| Persistencia offline y reintento remoto | Integración: `tests/integration/` | Adaptador JSON real + cola real + fixture remoto: una inspección persistente y un solo efecto remoto tras respuesta perdida | Pendiente, Javier |
| Recarga realmente sin red | E2E: `tests/e2e/` | Captura mediante UI, offline real del navegador, recarga, reconexión y una fila sincronizada | Pendiente, Carlos |
| Capacidad denegada o ausente bloquea captura | E2E: `tests/e2e/` | API simulada en el navegador; fallback visible y recorrido completo exitoso | Pendiente, Carlos |
| Prueba incapaz de detectar regresión | Rama temporal de defecto controlado | Un cambio concreto hace fallar una aserción; restaurarlo la hace pasar | Pendiente, Javier; Carlos verifica trazabilidad final |

Las unitarias aíslan reglas con fixtures nuevos por caso; la integración deberá
componer módulos reales; el E2E verificará el comportamiento visible. No se exige
un porcentaje de cobertura ni un número arbitrario de tests. Se conservan las
pruebas heredadas como regresión adicional, sin contarlas como E2E.

## Herramientas y comandos

- Node 20.19.0 y npm 10.8.2; `.nvmrc` es la fuente de versión en el nuevo workflow.
- Ejecutor `node:test` + `node:assert/strict`, con `tsx` para cargar TypeScript.
  `scripts/run-tests.mjs` enumera archivos sin depender del glob del shell, falla
  si la capa no existe o está vacía y propaga el código de salida de Node.
- `react-test-renderer` 18.3.1 prueba handlers de React 18 en memoria. No hay DOM,
  motor de navegador, red, permisos físicos ni Service Worker en esas pruebas.
- ESLint 10 + typescript-eslint: reglas recomendadas para `src`, nuevas pruebas y
  scripts. La excepción de imports CommonJS solo afecta al módulo de cola heredado.
  Los scripts antiguos de pruebas se ejecutan, pero no se migran ni se añaden al lint.
- `c8` produce cobertura V8 con mapas de TypeScript. Se incluyen **todos los módulos
  de `src/lib` y el nuevo componente**, también los no ejecutados (0%). No es una
  medida de cobertura global de toda la PWA. Se generan HTML, LCOV y resumen JSON.

| Comando | Qué ejecuta / salida |
|---|---|
| `npm ci` | Instalación exacta desde lockfile |
| `npm run dev` | Servidor de desarrollo local |
| `npm run lint` | Lint obligatorio, sin advertencias toleradas |
| `npm run typecheck` | Tipos de app y pruebas nuevas, sin artefactos incrementales |
| `npm run test:unit` | Unitarias y componente en memoria; `test-results/unit.xml` |
| `npm test` | Diez suites heredadas + pruebas nuevas |
| `npm run test -- --run` | Misma comprobación acumulativa compatible con workflows previos |
| `npm run test:coverage` | Pruebas nuevas con cobertura en `coverage/` |
| `npm run build` | Build de producción |
| `make verify` | Alias exacto de `npm run verify` |
| `npm run verify` | Estructura, lint, tipos, regresión, cobertura y build; logs por etapa y `reports/verification.json`; salida no cero ante cualquier fallo |

La instalación se ejecuta antes de verify. Este conserva resultados aunque falle
una comprobación y nunca transforma un fallo obligatorio en éxito. Javier deberá
añadir `test:integration` y Carlos `test:e2e` a comandos, tipos, lint, verify y CI.
No se crean directorios vacíos ni comandos que den PASS para esas capas pendientes.

## CI y reportes

`.github/workflows/academic-evaluation.yml` ejecuta `npm ci` y `make verify` en Linux,
con Node de `.nvmrc`. Publica con `if: always()` el artefacto
`w08-francisco-<SHA>`: `reports/verification.json`, `test-results/` y `coverage/`.
Los reportes son generados, no se escriben resultados ficticios en el repositorio.
El informe contiene SHA, runtime, códigos de salida y alcance parcial.
Los workflows oficiales anteriores se conservan sin cambios.

### Resultado local del incremento

Con Node 20.19.0 / npm 10.8.2: instalación limpia, lint, tipos, diez suites heredadas,
40 casos nuevos (3 suites), variante `--run`, cobertura y build terminaron con código 0.
`npm run verify` y `make verify` reportaron `pass`; el check público de Git Bash mostró `PUBLIC_OK`.
La cobertura observada del alcance declarado fue 45.02% de líneas y 79.81% de ramas;
el formulario alcanzó 91.24% de líneas y su conversión/validación 100% de líneas.
Se conservan como 0% los módulos no ejecutados. No significa cobertura completa de
sincronización, de todas las rutas o de compatibilidad de dispositivos.

Para cada caso, el nombre del test indica preparación/acción/expectativa; el XML
registra el resultado observado. Los logs por etapa permiten diagnosticar fallos.
El enlace específico de CI del SHA publicado se entrega junto con el handoff; en el
cierre se sustituirá por la ejecución correspondiente al SHA común integrado.

## Defecto controlado y cierre pendientes

Javier creará una rama temporal desde su incremento revisado e introducirá un único
defecto en la protección contra duplicados. Guardará SHA, diff, nombre de aserción,
salida y enlace al reporte de fallo. Revertirá ese defecto en la rama temporal,
ejecutará de nuevo exactamente la misma prueba y enlazará la recuperación. Ningún
defecto se integra a la rama entregable. Un fallo por instalación o infraestructura
no demuestra detección de una regresión del producto.

Carlos añadirá Playwright y documentará `webServer` con servidor de producción
(`npm run build` antes de `npm run start`). Se debe esperar a que el SW controle la
página, preparar la ruta y recursos online, desactivar red, capturar, recargar y
reconectar. Cada caso tendrá contexto limpio y fixtures propios. No se escribirá el
registro directamente en localStorage para saltarse el formulario, ni se cambiará
solo `navigator.onLine` para fingir una desconexión. No debe bloquearse el SW del caso
offline. Las APIs de permisos se simularán sin cuentas o hardware real.

## Límites y fallos encontrados

- La revisión visual está pendiente por el rechazo de permiso del navegador integrado.
- Las primeras pruebas de componente fallaron por JSX fuera del alcance del tsconfig
  del runner. Se incluyeron los módulos de `src` en `tsconfig.tests.json`, sin cambiar
  la configuración de Next. Otro fallo identificó un selector ambiguo: el panel de
  capacidades y la fila comparten ID; la aserción cuenta exclusivamente filas `li`.
  Estos fallos de preparación no sustituyen el defecto controlado exigido al cierre.
- La UI del incremento guarda localmente; no hace todavía envíos ni sincroniza al volver la red.
- La cola coordina una instancia, no múltiples pestañas. Se conserva localStorage;
  no se introduce IndexedDB ni un backend real en esta parte.
- El esquema heredado acepta algunas fechas parseables no ISO; el formulario nuevo
  limita estrictamente `YYYY-MM-DD` y rechaza fechas normalizadas por JavaScript.
- El runner inicial ESLint 9 indicó fin de soporte; se fijó ESLint 10 compatible con
  el runtime antes de entregar. No se desactivó lint para conseguir un resultado verde.
- npm informó tres vulnerabilidades heredadas (dos altas y una crítica) antes y
  después de añadir herramientas. Este incremento no es una auditoría de seguridad;
  no se aplicaron actualizaciones mayores de Next sin evaluar su impacto.
- La validación humana de Francisco debe declararse únicamente después de hacerla.

## Entrega académica

Los tres integrantes entregarán el mismo SHA final integrado por revisión, enlace
de Actions de ese SHA, estrategia, reportes y su sección personal. No se requiere
tag. El docente debe tener acceso al repositorio; no se marca acceso confirmado
sin comprobarlo. La fecha válida es la de Classroom, no se infiere del historial.
No se hace un commit adicional para intentar escribir dentro de él su propio SHA.
