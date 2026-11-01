# Modelo de amenazas — Semana 9

## Estado y alcance

Incremento 1/3 de Francisco sobre Semana 8 (`91f3fc4da626ad150311c44e7c22a1186f5d221c`).
Aplicación académica con inspecciones sintéticas; no es un servicio institucional
de producción ni una certificación de cumplimiento legal. Javier implementará CSP,
cabeceras y permisos mínimos; Carlos completará inventario, privacidad y cierre.

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
la revisión de acceso y minimización documental corresponde al cierre del equipo.

## Riesgos y controles verificables

| ID | Amenaza / impacto | Control y consumidor | Prueba o evidencia | Estado y riesgo residual |
|---|---|---|---|---|
| T01 | Entrada inválida o JSON manipulado altera registros o impide sincronizar | `security/validation.ts` usado por `storage/schema.ts`, a su vez por captura/cola/almacenamiento | `tests/security.spec.ts`: fechas, enteros seguros, controles invisibles, campos extra y operaciones huérfanas | Implementado. No autentica quién escribió localStorage |
| T02 | Campos inesperados se conservan como datos sensibles | Listas de campos permitidos para borrador, entidad, operación, conflicto e instantánea | Caso de campos extra rechaza antes de escribir | Implementado. Texto libre todavía puede contener información real: usar solo datos sintéticos |
| T03 | Instantánea excesiva bloquea el parser o agota almacenamiento | Límite de 4 × 1024 × 1024 caracteres antes de parsear/escribir | Lectura grande y escritura grande sin sobrescribir el valor anterior | Implementado. El navegador puede imponer una cuota menor; no garantiza memoria ilimitada |
| T04 | Script inyectado mediante texto libre | Datos se mantienen como texto; React los renderiza mediante interpolación, sin HTML directo en captura | Inspección de `inspection-capture.tsx`; prueba de round-trip no destructivo de texto HTML | Escape de React existente; prueba de bloqueo en navegador y CSP pendientes de Javier |
| T05 | Filtración de credenciales en Git o configuración pública | Detector consumido por `security:secrets` y `verify`; reportes solo con archivo/línea/regla | Pruebas negativas, documentación inocua y CLI en repositorio temporal | Implementado para patrones conocidos. No revisa historial, binarios ni ignorados; no garantiza ausencia de secretos |
| T06 | Clickjacking, ejecución externa o permisos innecesarios | CSP, cabeceras y Permissions-Policy | Pruebas HTTP y navegador a incorporar | Pendiente Javier; no se declara mitigado por este incremento |
| T07 | Persistencia o transmisión excesiva de imágenes/ubicación | Inventario, minimización, retención y eliminación de datos | Inventario y pruebas de privacidad a incorporar | Pendiente Carlos; capacidades actuales usan valores temporales y fallback |
| T08 | Robo o modificación de localStorage por otro script del mismo origen | Reducir superficie con CSP y minimizar datos | Controles presentes y pendientes anteriores | No hay cifrado local ni aislamiento frente a un script del mismo origen comprometido |
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

## Reproducción y límites de este incremento

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

El workflow propio acumulativo ejecuta verify y cada E2E tres veces, sin reintentos;
verify:all sigue disponible para una ejecución local de los dos casos. El workflow oficial de Semana 9,
inventario y robots se incorporarán durante el cierre, sin crear archivos vacíos para
simular cumplimiento. Ni un reporte aprobado ni la existencia de rutas constituyen
una calificación. Evidencia, incidentes de entorno y validación humana se registran
por separado en README y en la sección de Francisco.
