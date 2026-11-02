# Inventario de datos y privacidad — Semana 9

## Alcance y advertencia

Este proyecto es un prototipo académico y emplea exclusivamente datos sintéticos.
No constituye una certificación legal ni está autorizado para recibir nombres,
fotografías, ubicaciones, direcciones u otros datos reales. Antes de cualquier uso
institucional se deben definir un responsable formal, un aviso de privacidad,
periodos de retención aprobados, procedimientos para ejercer derechos ARCO y medidas
de seguridad y acceso acordes con el tratamiento previsto.

## Referencia normativa y criterio de minimización

Como referencia de diseño se consultó la [Ley General de Protección de Datos
Personales en Posesión de Sujetos Obligados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf),
texto oficial de la Cámara de Diputados con última reforma publicada en el DOF el
14 de noviembre de 2025. Su artículo 19 establece el criterio de tratar únicamente
datos adecuados, relevantes y estrictamente necesarios para la finalidad. También
se consultaron el [decreto de expedición publicado en el DOF el 20 de marzo de
2025](https://www.dof.gob.mx/nota_detalle.php?codigo=5752569&fecha=20/03/2025) y la
[reforma publicada el 14 de noviembre de 2025](https://www.dof.gob.mx/nota_detalle.php?codigo=5773097&fecha=14/11/2025).

Estas referencias orientan la minimización del prototipo; no determinan por sí solas
su régimen jurídico ni sustituyen el análisis de la institución que eventualmente
fuera responsable.

## Flujo de datos

```text
Usuario
  → formulario React
  → validación de dominio
  → localStorage
  → cola de sincronización
  → receptor sintético en memoria
```

Los canales opcionales permanecen separados del esquema persistente:

```text
Cámara → memoria temporal del componente → no se incorpora a la inspección
Ubicación → coordenadas aproximadas → memoria temporal → no se persiste
Notificaciones → permiso administrado por el navegador → sin suscripción remota
Service Worker → Cache Storage → shell, recursos estáticos y navegaciones GET
```

## Inventario de datos tratados

| Dato o conjunto | Finalidad | Origen | Almacenamiento | Retención / supresión | Transferencia | Riesgo y control |
|---|---|---|---|---|---|---|
| `id` de inspección | Identificar una captura y relacionarla con su operación | Generado en el navegador | `localStorage` | Hasta limpiar datos del sitio o llamar al método de borrado | Receptor sintético en memoria al sincronizar | Es identificador técnico sintético, no una identidad personal |
| `location` | Nombrar el laboratorio inspeccionado | Formulario | `localStorage` | Igual que la inspección | Receptor sintético | Debe ser un nombre sintético, nunca una dirección real |
| `inspectedAt` | Registrar fecha de inspección | Formulario | `localStorage` | Igual que la inspección | Receptor sintético | Validación de fecha ISO canónica con zona |
| `inspectorAlias` | Distinguir al inspector de demostración | Formulario | `localStorage` | Igual que la inspección | Receptor sintético | Es sintético; un alias real podría convertirse en dato personal |
| `status` | Expresar condición del laboratorio | Formulario | `localStorage` | Igual que la inspección | Receptor sintético | Valores cerrados `ok` o `attention` |
| `findings` | Contar hallazgos | Formulario | `localStorage` | Igual que la inspección | Receptor sintético | Entero no negativo y seguro |
| `summary` | Describir hallazgos sintéticos | Texto libre del formulario | `localStorage` | Igual que la inspección | Receptor sintético | Podría contener datos personales si se incumple la regla; longitud y caracteres se validan y React escapa la salida |
| `version` y `updatedAt` | Control de versión local | Cola | `localStorage` | Igual que la inspección | Receptor sintético | Metadatos técnicos; validación estricta |
| `syncState` | Mostrar estado pendiente, sincronizado o fallido | Cola/controlador | `localStorage` | Igual que la inspección | No aplica como dato independiente | Estado técnico visible, no prueba entrega a un backend durable |
| `serverVersion` y `serverUpdatedAt` | Representar confirmación remota sintética | Receptor sintético | `localStorage`, cuando existen | Igual que la inspección | Se originan en el receptor sintético | No corresponden a un servidor institucional |
| Identificador de operación | Relacionar trabajo pendiente | Cola | `localStorage` | Se elimina al concluir la operación | Receptor sintético | Identificador técnico validado |
| Clave idempotente | Evitar efectos duplicados | Captura/cola | `localStorage` y receptor en memoria | Cola: hasta finalizar; receptor: vida de la instancia | Receptor sintético | No es una credencial; no debe reutilizarse con otro contenido |
| `attemptCount` y `nextAttemptAt` | Controlar reintentos y espera exponencial | Cola | `localStorage` | Hasta éxito, fallo final o supresión | No se transfiere como dato de usuario | Puede revelar fallos operativos; se limita a la operación |
| `lastError` | Diagnóstico de sincronización | Cola/transporte | `localStorage` | Hasta recuperación o supresión de la operación | No se envía a terceros | Mensaje técnico limitado; no debe incorporar datos reales |
| Conflicto y copia remota sintética | Resolver versiones incompatibles | Receptor/cola | `localStorage` | Hasta resolución o borrado | Solo componentes locales del prototipo | Duplica temporalmente una inspección sintética; esquema validado |
| Imagen seleccionada o flujo de cámara | Previsualizar evidencia opcional | Selector/cámara del navegador | Memoria temporal del componente | Se descarta al retirar, desmontar o recargar | No se guarda ni sincroniza | Podría contener personas o información sensible; se prohíben imágenes reales |
| Coordenadas aproximadas | Mostrar referencia opcional | Geolocalización puntual | Memoria temporal del componente | Se descarta al retirar, desmontar o recargar | No se guarda ni sincroniza | Se reduce a tres decimales; no existe seguimiento continuo con `watchPosition` |
| Estado o permiso de notificaciones | Mostrar una notificación local opcional | API del navegador | Administrado por el navegador y estado temporal de UI | Según configuración del navegador; UI hasta desmontar | No hay suscripción remota | No se generan identificadores remotos ni suscripciones Web Push |
| Señal offline | Evitar sincronización durante una recarga sin red | Evento de conectividad | `sessionStorage` | Se elimina tras conexión confirmada o al terminar la sesión de la pestaña | No se transmite | Solo guarda el marcador técnico `1`, no inspecciones |
| Shell, estáticos y navegaciones GET | Disponibilidad offline | Respuestas del mismo origen | Cache Storage del Service Worker | Hasta limpieza por nueva versión, navegador o datos del sitio | No se envían a terceros | Caché limitada a solicitudes elegibles; no sustituye control de acceso |
| Receptor sintético | Simular aplicación remota e idempotencia | Operaciones de la cola | Memoria del proceso/página | Se pierde al recargar o reiniciar | Ninguna transferencia real | No es un backend durable ni autorizado |
| Fixtures, reportes y artefactos de CI | Verificación reproducible | Pruebas automatizadas | Archivos locales ignorados y artefactos de GitHub Actions | Según limpieza local y retención configurada en GitHub | GitHub procesa código y fixtures sintéticos | No contienen registros capturados por usuarios ni deben incluir credenciales |

## Almacenamiento, transmisión y destinatarios

El snapshot de inspecciones y operaciones utiliza la clave de `localStorage`
`utt-lab-inspections:sync:v1`. La sincronización termina en un receptor sintético que
vive en memoria; no existe API remota, cuenta, analítica, rastreador ni transferencia
a terceros. GitHub Actions procesa el código, fixtures sintéticos y reportes de prueba,
no los registros que una persona haya capturado en su navegador.

`sessionStorage` recuerda temporalmente el último estado offline de la pestaña. Cache
Storage conserva el shell, recursos estáticos y determinadas navegaciones GET. Ninguno
de esos almacenamientos convierte el prototipo en un sistema institucional ni ofrece
confidencialidad frente a código comprometido del mismo origen.

## Retención y supresión

Los datos de inspección permanecen en `localStorage` hasta que se limpian los datos
del sitio o se llama al método de borrado del adaptador. Actualmente no existe una
política automática de expiración ni una interfaz visible de eliminación. Esta es una
limitación abierta: una versión institucional debe definir plazos, bloqueo cuando
corresponda, eliminación verificable, respaldos y responsabilidades.

Los datos de cámara y geolocalización solo viven en memoria durante la vista. El
marcador offline vive durante la sesión de la pestaña y se elimina tras una conexión
confirmada. Las cachés pueden eliminarse durante la activación de otra versión, por
decisión del navegador o al borrar los datos del sitio.

## Capacidades opcionales

- Cámara: la selección es explícita; el archivo no forma parte del esquema de inspección.
- Geolocalización: una lectura puntual con `getCurrentPosition`, sin `watchPosition`,
  se redondea a tres decimales y no se persiste.
- Notificaciones: el permiso se solicita tras una acción explícita, queda bajo control
  del navegador y no crea suscripciones push ni identificadores remotos.

Estas decisiones reducen datos porque fotografías, coordenadas y permisos no son
necesarios para demostrar el flujo principal de captura y sincronización sintética.
Una modificación futura que los persista debe actualizar el esquema, este inventario,
la evaluación de riesgos, la finalidad y la retención antes de desplegarse.

## Derechos y requisitos para una versión institucional

Antes de tratar información real se requiere, como mínimo, identificar al responsable,
publicar un aviso de privacidad claro, definir base jurídica y finalidades, habilitar
procedimientos de acceso, rectificación, cancelación y oposición (ARCO), aplicar control
de acceso, aprobar conservación y supresión, contratar un backend autorizado y verificar
HTTPS en el despliegue. Este prototipo no implementa esos procesos.

## Riesgos residuales y límites

`inspectorAlias` y `summary` pueden convertirse en datos personales si alguien ignora
las instrucciones. Las imágenes pueden contener personas o información sensible aunque
no se persistan. `localStorage` no está cifrado y cualquier script comprometido del mismo
origen podría acceder a él. El receptor remoto es sintético y no demuestra controles de
un servidor real. Persisten los hallazgos de dependencias y falta comprobar HTTPS en un
despliegue institucional.

`public/robots.txt` solicita `User-agent: *` y `Disallow: /` porque el prototipo académico
no debe indexarse y solo admite datos sintéticos. `robots.txt` es una petición voluntaria
a rastreadores: no es un control de acceso, no protege información y no sustituye
autenticación, autorización ni una configuración privada del despliegue.

## Evidencia de verificación

`tests/security.spec.ts` verifica el contenido de `robots.txt` y que este inventario
cubra almacenamientos y decisiones reales. `npm run security:secrets` es la comprobación
propia de credenciales; el check público oficial conserva su limitación conocida y no
lo reemplaza. La ejecución acumulativa y sus resultados se registran en README y en la
evidencia individual del SHA final.
