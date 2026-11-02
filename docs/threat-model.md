# Modelo de amenazas — Semana 9

## Estado y alcance

Incremento 3/3 y cierre: Francisco implementó validación, detector de credenciales y
modelo inicial; Javier incorporó CSP, cabeceras HTTP y permisos mínimos; Carlos completó
privacidad, inventario de datos, `robots.txt`, workflow oficial y cierre sobre
`2e3ed02ddab79e1230906078c215171ae53f8005`; el cierre técnico de Carlos quedó
fijado en `db1975851784fe0ef25b7208e639f3c3a4acccb4`.
Aplicación académica con inspecciones sintéticas; no es un servicio institucional
de producción ni una certificación de cumplimiento legal.

## Arquitectura, activos y límites de confianza

1. Usuario → formulario React → conversión de captura → cola → JsonSyncStorage.
   La UI no es una frontera de seguridad: se valida también en las funciones de dominio.
2. Almacenamiento local → parser/esquema → cola/controlador → receptor sintético.
   Se trata el JSON leído como entrada no confiable. El receptor solo vive en memoria;
   no hay backend autenticado, cuentas ni sincronización remota durable.
3. Next.js → HTML/JavaScript → navegador → Service Worker y cachés.
   Las respuestas cacheadas también necesitan una política coherente con las cabeceras.
4. Acción del usuario → cámara, ubicación o notificación → API del navegador.
   Las capacidades son opcionales y tienen alternativas; el navegador controla sus permisos.
5. Código/configuración → Git → Actions → reportes/artefactos.
   Los valores sensibles nunca deben incorporarse al bundle ni a los reportes.

Activos: inspecciones, claves idempotentes y cola pendiente; disponibilidad del formulario
offline; integridad de recursos cacheados; contenido temporal de capacidades; código,
dependencias y evidencia académica. La clave idempotente identifica una operación y no
es una credencial. Los datos de los integrantes en la evidencia no son fixtures de la app;
la minimización y retención se detallan en el inventario final.

## Riesgos y controles verificables

| ID | Amenaza / impacto | Control y consumidor | Prueba o evidencia | Estado y riesgo residual |
|---|---|---|---|---|
| T01 | Entrada inválida o JSON manipulado altera registros o impide sincronizar | `security/validation.ts` usado por `storage/schema.ts`, a su vez por captura/cola/almacenamiento | `tests/security.spec.ts`: fechas, enteros seguros, controles invisibles, campos extra y operaciones huérfanas | Implementado. No autentica quién escribió localStorage |
| T02 | Campos inesperados se conservan como datos sensibles | Listas de campos permitidos para borrador, entidad, operación, conflicto e instantánea | Caso de campos extra rechaza antes de escribir | Implementado. Texto libre todavía puede contener información real: usar solo datos sintéticos |
| T03 | Instantánea excesiva bloquea el parser o agota almacenamiento | Límite de 4 × 1024 × 1024 caracteres antes de parsear/escribir | Lectura grande y escritura grande sin sobrescribir el valor anterior | Implementado. El navegador puede imponer una cuota menor; no garantiza memoria ilimitada |
| T04 | Script inyectado mediante texto libre | Datos se mantienen como texto; React los renderiza mediante interpolación sin HTML directo y CSP restringe orígenes externos, objetos y base (`default-src 'self'`, `script-src`, `object-src 'none'`, `base-uri 'self'`) | `tests/security.spec.ts` (round-trip no destructivo) y `tests/e2e/security-headers.spec.ts` (captura de `<script>`/`<img onerror>` en navegador sin ejecución y bloqueo CSP de script externo) | Implementado. En producción `script-src` conserva `'unsafe-inline'` para los scripts de hidratación estática/offline de Next.js; la barrera primaria frente a texto capturado sigue siendo el escape de React |
| T05 | Filtración de credenciales en Git o configuración pública | Detector consumido por `security:secrets` y `verify`; reportes solo con archivo/línea/regla | Pruebas negativas, documentación inocua y CLI en repositorio temporal | Implementado para patrones conocidos. No revisa historial, binarios ni ignorados; no garantiza ausencia de secretos |
| T06 | Clickjacking, ejecución externa o permisos innecesarios | `next.config.mjs` y `src/lib/security/headers.ts`: CSP (`frame-ancestors 'none'`, `script-src`, `style-src`, `img-src`, `connect-src`, `worker-src`, `manifest-src`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(self), geolocation=(self), microphone=(), payment=(), usb=()` en `/:path*` | `tests/security.spec.ts` (contrato de directivas y `next.config.mjs`) y `tests/e2e/security-headers.spec.ts` (cabeceras HTTP en `/`, `/inspecciones`, detalle SSR, `/sw.js`, `/manifest.webmanifest` y `/offline.html`, operación de capacidades/SW sin violaciones CSP y bloqueo activo de script externo) | Implementado. Las notificaciones siguen gobernadas por la API de permisos del navegador y no por una directiva inexistente en `Permissions-Policy` |
| T07 | Persistencia o transmisión excesiva de imágenes/ubicación | [Inventario de privacidad](privacy-data-inventory.md), separación del esquema persistente y minimización | Pruebas de privacidad en `tests/security.spec.ts`; cámara y ubicación permanecen temporales y no se sincronizan | Implementado para el prototipo. Riesgo residual: una versión futura podría comenzar a persistir o transmitir estos datos sin actualizar finalidad, retención y controles |
| T08 | Robo o modificación de localStorage por otro script del mismo origen | Reducir superficie externa con CSP (`default-src 'self'`, `script-src`, `connect-src 'self'`) y minimizar datos | Controles de validación (T01-T03) y CSP verificada en `tests/e2e/security-headers.spec.ts` | Riesgo residual: no hay cifrado local ni aislamiento frente a un script del mismo origen comprometido |
| T09 | Duplicación o pérdida de una operación al reconectar | Cola idempotente y receptor sintético; exclusión de envíos concurrentes | Integración de Semana 8 y regresiones de conectividad | Conservado. Sin coordinación entre pestañas ni servidor durable |
| T10 | Dependencia vulnerable o transporte sin cifrar | Lockfile, instalación reproducible, auditoría y HTTPS en despliegue | Auditoría online del 31/10/2026: 17 paquetes afectados (14 moderados, 2 altos, 1 crítico) | Riesgo abierto: Next.js requiere evaluar una actualización mayor. URL HTTPS pendiente de confirmar; localhost no acredita HTTPS de despliegue |

## Decisiones de validación

- Se conserva la versión 1 del esquema y los datos válidos existentes. Fechas deben
  ser timestamps ISO con zona y calendario real; no se aceptan normalizaciones como
  30 de febrero. Se aceptan fracciones de hasta tres dígitos y desplazamientos de zona.
- Se rechazan enteros fuera del rango seguro de JavaScript y caracteres de control
  invisibles; se conservan saltos de línea/tabulaciones útiles para el textarea.
- Se rechazan propiedades no contempladas en el contrato (incluidas claves de
  prototipo). No se eliminan silenciosamente datos de una instantánea inválida.
- Si un registro previo no cumple el contrato endurecido, la lectura falla y conserva
  el JSON original para diagnóstico. No hay migración automática destructiva.
- El texto no se convierte en HTML ni se "sanea" borrando caracteres arbitrariamente.
  Validación de entrada y escape de salida son controles distintos.

## CSP, cabeceras HTTP y permisos mínimos (Incremento 2/3 — Javier)

- `next.config.mjs` aplica en `/:path*` las cinco cabeceras construidas en `src/lib/security/headers.ts`:
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` (en `NODE_ENV === "development"` se añade `'unsafe-eval'` únicamente para Fast Refresh de Next.js; en producción no se incluye `'unsafe-eval'`).
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `X-Frame-Options: DENY` (defensa en profundidad junto con `frame-ancestors 'none'`).
  - `Permissions-Policy: camera=(self), geolocation=(self), microphone=(), payment=(), usb=()`.
- Por qué `script-src` y `style-src` incluyen `'unsafe-inline'`: Next.js 14 App Router inyecta scripts inline de hidratación (`self.__next_f.push(...)`) en páginas prerenderizadas como `/inspecciones`, y el Service Worker (`/sw.js`) almacena esos documentos en caché para responder navegaciones offline donde no existe un servidor que regenere nonces por solicitud. Asimismo, `public/offline.html` y los paneles React utilizan estilos inline. Este compromiso mantiene operativo el modo offline real mientras bloquea scripts, conexiones, frames, workers y objetos de orígenes externos.
- Por qué `Permissions-Policy` no incluye `notifications`: las notificaciones web se controlan mediante la Notification API / Permissions API del navegador tras gesto explícito del usuario y no forman parte de las características estándar de `Permissions-Policy`; agregar un identificador inexistente solo generaría advertencias de característica no reconocida sin aportar control real.

## Privacidad, minimización y retención — Incremento 3/3, Carlos

El [inventario de datos y privacidad](privacy-data-inventory.md) separa datos persistidos,
temporales y administrados por el navegador. La inspección, sus versiones y la cola se
guardan bajo `utt-lab-inspections:sync:v1` en `localStorage`; el marcador offline vive
temporalmente en `sessionStorage`; y el Service Worker conserva shell, estáticos y
navegaciones GET elegibles en Cache Storage. El receptor sintético vive únicamente en
memoria y no representa un backend durable.

Fotografías y coordenadas aproximadas permanecen en memoria del componente, no forman
parte de la inspección y no se sincronizan. La geolocalización se obtiene puntualmente,
se reduce a tres decimales y no usa `watchPosition`. El permiso de notificaciones lo
administra el navegador, sin suscripción remota. No existen analíticas, rastreadores ni
transferencias a terceros; GitHub Actions procesa código, fixtures sintéticos y reportes,
no capturas del navegador de una persona usuaria.

La retención real de inspecciones no tiene expiración automática: continúa hasta borrar
los datos del sitio o invocar el método de limpieza, y no hay una interfaz visible de
supresión. Una versión institucional necesitaría responsable, aviso de privacidad,
periodos aprobados, procedimientos ARCO, acceso autorizado, backend real y HTTPS
verificado. `public/robots.txt` solicita no indexar el prototipo, pero es una petición
voluntaria y no sustituye autenticación, autorización ni configuración privada.

Esta separación controla T07 en el alcance académico. Permanece el riesgo de que un
cambio futuro incorpore imágenes, ubicación o identificadores de permisos al esquema
sin reevaluar necesidad, finalidad, retención y derechos.

## Secretos, resultados y check público

`npm run security:secrets` enumera con Git archivos versionados y nuevos no ignorados.
Detecta claves privadas, determinados formatos de credenciales, asignaciones literales
largas y nombres sensibles expuestos como configuración pública. Devuelve 1 si encuentra
coincidencias y 2 si no puede completar el análisis. `test-results/secrets.json` no incluye
el contenido encontrado. Un positivo debe revisarse: no se borra documentación ni se
excluyen archivos para obtener verde. Los fixtures de credenciales se construyen en memoria
y se escriben únicamente en un repositorio temporal que la prueba elimina.

Limitaciones: no es un escáner exhaustivo, no consulta proveedores ni comprueba revocación;
una contraseña corta, una credencial desconocida o un dato personal pueden no detectarse.
Si aparece una credencial real, se debe revocar/rotar y revisar su exposición, no solo borrar
la línea. Esta aplicación no necesita credenciales reales para sus pruebas.

El check original del ZIP busca palabras genéricas y utiliza `! rg` con `set -e`.
Se reprodujo con una cadena sintética que después de una coincidencia todavía imprime
`PUBLIC_OK` y devuelve 0. Se conserva el material oficial para el cierre; este resultado
no demuestra ausencia de secretos y no reemplaza las comprobaciones propias.

## Reproducción y límites del cierre

`npm run test:security` ejecuta casos de comportamiento y genera `test-results/security.xml`.
`npm test` conserva suites anteriores y añade seguridad; acepta `--run`.
`make verify` equivale a `npm run verify`: estructura, lint, tipos, secretos, pruebas,
cobertura y build. `npm run verify:all` añade los E2E existentes tras compilar.
La cobertura incorpora seguridad y mantiene archivos no ejecutados en el denominador.
La recarga offline conserva además la última señal `offline` en `sessionStorage` para
que una lectura transitoria de `navigator.onLine` no vacíe la cola. El marcador solo
vive en la sesión del tab y un evento online lo elimina. Si la red cambia mientras
la app no está abierta, puede requerir un evento nuevo o iniciar otra sesión del tab.
Un evento online debe permanecer estable 750 ms; offline cancela la confirmación.
El gate anterior elimina sus listeners en `pagehide` antes de abandonar el documento.
El CLI se prueba como caja negra sin instrumentación V8 del subproceso: el cargador
tsx genera sourcemaps `data:` que c8 no puede normalizar. La lógica del detector se
ejecuta y mide en el proceso principal; no se excluyen sus módulos del denominador.

La auditoría online (`npm audit --json --fetch-retries=0 --fetch-timeout=20000`)
terminó con código 1 por hallazgos, no por un error de conexión. Reportó 17 paquetes
afectados: 14 moderados, 2 altos y 1 crítico. El informe recomienda Next.js 16.4.3
como cambio mayor frente a 14.2.35. No se aplicó `npm audit fix --force`: la migración
requiere revisar compatibilidad de React, renderizado, CSP y funcionamiento offline.
Estos hallazgos no prueban explotación de esta app, pero siguen abiertos; pruebas
funcionales aprobadas no equivalen a dependencias sin vulnerabilidades. La revisión
de actualización debe realizarse antes del cierre de seguridad o un despliegue real.

El workflow propio acumulativo ejecuta `verify`, el check público oficial y cada E2E
tres veces (3 suites × 3 repeticiones = 9 ejecuciones), sin reintentos. `verify:all`
sigue disponible para una ejecución local de los tres casos (`inspection-offline.spec.ts`,
`capabilities-fallback.spec.ts` y `security-headers.spec.ts`). El workflow oficial de
Semana 9 se conserva sin modificaciones. Ni un reporte aprobado ni la existencia de
rutas constituyen una calificación. Evidencia, incidentes de entorno y validación se
registran por separado en README y en las secciones individuales del equipo.
