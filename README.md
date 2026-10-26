# PWA de inspecciones de laboratorio — proyecto del equipo

> Estado actual: [Semana 8, cierre E2E de Carlos](#semana-8--cierre-e2e-de-carlos).
> Las secciones anteriores a Semana 8 conservan resultados históricos; no describen todas las comprobaciones actuales.

Comiencen por `START_HERE.md` y lean `ACTIVIDAD-01.md`. Este es un proyecto acumulativo: un repositorio privado por equipo durante el curso. La Semana 1 consiste en arrancar, documentar y explicar la verificación; no en implementar toda la PWA.

## Entorno

La ejecución local se realizó en Windows mediante PowerShell, desde la carpeta que contiene `package.json`, con las siguientes versiones:

- Node.js `v20.20.2`
- npm `10.8.2`
- Git `2.54.0.windows.1`

`npm ci` terminó correctamente e instaló 28 paquetes a partir de `package-lock.json`. npm informó dos vulnerabilidades de severidad alta en las dependencias. No se ejecutó `npm audit fix --force`, porque podría modificar las dependencias proporcionadas y requiere una evaluación separada del alcance de esta actividad.

## Ejecución

```bash
npm ci
npm run dev
```

Abran `http://localhost:3000` y comprueben las tres inspecciones sintéticas. Detengan el servidor con Ctrl+C.

En la ejecución local, Next.js 14.2.35 inició correctamente, compiló la ruta principal y respondió `GET / 200`. El servidor se detuvo antes de ejecutar la verificación final.

## Verificación

```bash
npm run verify
```

Ejecuta comprobación de archivos, prueba proporcionada y build; genera `reports/verification.json`. El reporte contiene resultados técnicos y documentos para revisión, no una calificación automática. `make verify` es equivalente. `bash public-tests/check.sh` es un check opcional de estructura.

GitHub Actions ejecuta la misma verificación y permite descargar el artefacto `starter-week-01-evidence`. El reporte local se excluye de Git: adjúntenlo en Classroom o descarguen el del SHA entregado desde Actions.

La primera ejecución local de `npm run verify` produjo `starter.spec.mjs: PASS`, pero el build falló con `EPERM` al intentar abrir `.next/trace` porque el servidor de desarrollo continuaba activo. Después de detener `npm run dev`, se repitió la verificación: la prueba proporcionada pasó, el build de producción compiló correctamente y el estado técnico general fue `pass`.

Esta verificación comprueba estructura, prueba y compilación; no califica automáticamente el contenido de los documentos ni demuestra funciones PWA u offline todavía no implementadas.

## Trabajo y entrega en equipo

Inviten a los integrantes y al docente al mismo repositorio privado. Cada persona registra su evidencia en una sección de `evidence/individual.md`. Todos entregan en Classroom el mismo SHA final y enlaces, identificando su sección. El formato exacto está en `ACTIVIDAD-01.md`; no se requiere un pull request adicional ni una copia por alumno.

## Estructura y límites

- `src/app/`: pantalla Next.js.
- `src/lib/data/`: inspecciones sintéticas.
- `docs/`: requisitos y decisión del equipo.
- `evidence/`: evidencia propia de cada integrante.
- `tests/`: prueba inicial proporcionada; no es una suite completa de comportamiento.

El starter todavía no implementa instalación PWA, offline ni sincronización. La ejecución también mostró que un servidor de desarrollo activo puede mantener bloqueado `.next/trace` en Windows e impedir temporalmente el build. No incluyan datos personales reales en el producto, archivos `.env` ni credenciales. La identificación de integrantes se conserva en el repositorio privado y Classroom.

## Incremento de la Semana 2

### Entorno y configuración

La implementación del manifest se verificó con Node.js `v20.19.0` y npm `10.8.2`. El archivo `.nvmrc` fija la versión local en `20.19.0` y `package.json` declara compatibilidad con Node.js desde `20.19.0` y antes de la versión 21. Este rango también admite revisiones posteriores de Node 20 utilizadas por el entorno de integración.

### Manifest e instalación

La aplicación incluye `public/manifest.webmanifest` con nombre completo, nombre corto, descripción, idioma `es-MX`, `start_url`, `scope`, modo de visualización `standalone`, colores de fondo y tema e iconos PNG de 192 y 512 píxeles.

Se eligió `display: "standalone"` para que el shell instalado pueda abrirse separado de la interfaz habitual del navegador. Tanto `start_url` como `scope` usan `/` porque la entrega actual tiene una sola aplicación y no necesita solicitar control sobre rutas externas.

El icono de 512 píxeles declara el propósito `maskable` y conserva margen alrededor del símbolo para disminuir el riesgo de recorte en dispositivos que aplican distintas formas. Los SVG originales se conservan como fuentes editables y `scripts/generate-icons.ps1` permite regenerar los PNG de manera reproducible.

`src/app/layout.tsx` enlaza el manifest y los iconos mediante la API de metadatos de Next.js. El color del navegador se declara mediante la exportación `viewport`, compatible con Next.js 14.

### Prueba del manifest

`tests/manifest.spec.ts` utiliza módulos integrados de Node.js. Convierte el manifest a JSON, comprueba los campos críticos, valida rutas locales, confirma que los iconos sean PNG reales y compara sus dimensiones físicas con los tamaños declarados. No necesita un framework de pruebas ni servicios externos.

El script `npm test` conserva la prueba de la Semana 1 y después ejecuta obligatoriamente la prueba del manifest. También acepta el argumento adicional usado por el workflow de evaluación:

```bash
npm test
npm run test -- --run
```

### Verificación del incremento de Francisco

Se ejecutaron los siguientes comandos desde una instalación limpia:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test -- --run
npm run build
npm run verify
```

`npm ci` terminó con código 0 e instaló 28 paquetes en 25 segundos. `starter.spec.mjs` y `manifest.spec.ts` terminaron en `PASS`, tanto en la ejecución normal como con `--run`. El build de Next.js 14.2.35 compiló correctamente, validó los tipos y generó cuatro páginas estáticas. Finalmente, `npm run verify` repitió las pruebas y el build y terminó con estado técnico `pass`.

### Decisiones, límites y fallos

La prueba obligatoria mantiene la extensión `.ts`, pero usa sintaxis JavaScript compatible con CommonJS para ejecutarse directamente con Node.js 20.19.0. Esto evita agregar un framework de pruebas que no resulta necesario para validar un archivo JSON y sus recursos.

El manifest proporciona identidad, metadatos de instalación y modo de presentación, pero no implementa por sí solo operación sin conexión. Este incremento no agrega Service Worker, IndexedDB, sincronización, autenticación ni backend. Los registros visibles continúan siendo exclusivamente sintéticos.

Durante una comprobación preliminar con el runtime interno de Codex se observaron advertencias de caché de webpack, sin afectar la compilación. Al repetir la instalación y el build con Node.js 20.19.0, la compilación terminó sin esas advertencias y con código 0.

### Estados de carga, error y vacío

El listado de inspecciones distingue cuatro estados explícitos: `ready`, `loading`, `error` y `empty`. La pantalla normal muestra los registros sintéticos; carga anuncia que la operación está en proceso; error informa el fallo y ofrece recuperación; y vacío comunica que no existen registros sin tratarlo como una falla.

Los estados pueden reproducirse sin servicios externos:

- `/`: registros sintéticos.
- `/?estado=carga`: estado de carga.
- `/?estado=error`: estado de error.
- `/?estado=vacio`: estado vacío.

Las variantes controladas mediante `estado` son fixtures de verificación con datos sintéticos. No simulan una API o backend implementado.

Next.js también dispone de `src/app/loading.tsx` para cargas del segmento y `src/app/error.tsx` como límite de errores inesperados. El límite de error es un componente cliente y permite reintentar mediante `reset()`.

`tests/inspection-states.spec.ts` confirma que los cuatro estados permanecen implementados, que carga comunica `aria-busy`, que los mensajes dinámicos usan regiones de estado, que los errores usan una alerta y que existe una acción de reintento.

Comandos de verificación:

```bash
npm test
npm run test -- --run
npm run build
npm run verify
```

Resultados observados por Javier en el entorno local con Node.js `v20.19.0` y npm `10.8.2`:

- `npm test`: código 0; `starter.spec.mjs`, `manifest.spec.ts` e `inspection-states.spec.ts` terminaron en `PASS`.
- `npm run test -- --run`: código 0; las mismas tres pruebas terminaron en `PASS` y el argumento adicional fue aceptado.
- `npm run build`: código 0; Next.js 14.2.35 compiló, validó tipos y generó las cuatro páginas previstas.
- `npm run verify`: código 0; repitió pruebas y build y concluyó con `Verificación técnica: pass`.

#### Decisiones y límites

Los estados se modelaron de forma explícita para evitar que un arreglo vacío se interprete como error. Las vistas de prueba son deterministas y no dependen de red.

Esta entrega no implementa una API, persistencia local, sincronización ni operación offline. El estado de error reproducible representa un escenario sintético; `error.tsx` cubre los fallos reales que alcancen el límite de Next.js.
### App Shell y navegación

La interfaz utiliza `src/components/app-shell.tsx` como límite del marco compartido. El componente contiene la cabecera, la marca de la aplicación, la navegación principal, un único landmark `main` y el pie de página. Las páginas se proporcionan mediante `children` y no incorporan otro `main`.

La navegación principal contiene destinos funcionales para Inicio, Inspecciones y Estados. También existe un enlace para saltar directamente al contenido principal, visible al recibir foco mediante teclado.

`src/app/layout.tsx` monta el App Shell sin modificar los metadatos, el manifest o los iconos. Los estados de carga, error y vacío se renderizan dentro del mismo marco visual.

La verificación automatizada `tests/app-shell.spec.ts` comprueba la presencia de los landmarks, el nombre accesible de la navegación, el destino del enlace de salto, la integración con el layout y la existencia de un único elemento `main`.

### Verificación realizada por Carlos

Comandos ejecutados:

```bash
npm test
npm run test -- --run
npm run build
npm run verify
```

Resultados observados:

* `npm test`: código 0; `starter.spec.mjs`, `manifest.spec.ts`, `inspection-states.spec.ts` y `app-shell.spec.ts` terminaron en `PASS`.
* `npm run test -- --run`: código 0; las cuatro pruebas terminaron en `PASS`.
* `npm run build`: código 0; Next.js 14.2.35 compiló correctamente, validó tipos y generó las páginas previstas.
* `npm run verify`: código 0; repitió las pruebas y el build y concluyó con `Verificación técnica: pass`.
* `reports/verification.json`: generado correctamente.

### Verificación manual

* Navegación mediante teclado: correcta; los enlaces Inicio, Inspecciones y Estados son accesibles mediante teclado y muestran foco visible.
* Enlace para saltar contenido: correcto; aparece al recibir foco y permite pasar directamente al contenido principal.
* Vista de 375 px: correcta; no se observó desplazamiento horizontal ni elementos encimados, la marca y navegación permanecieron utilizables y las tarjetas se acomodaron en una sola columna.
* Estados carga, error y vacío dentro del shell: correctos; los tres conservaron header, navegación y footer.

### Límites del App Shell

La comprobación automatizada valida la estructura semántica mediante invariantes del código y el build valida TypeScript y React. Esto no sustituye una auditoría completa con lector de pantalla o herramientas especializadas.

La navegación utiliza rutas y fragmentos existentes. No agrega páginas nuevas, autenticación, funcionamiento offline ni sincronización.

## Incremento de la Semana 3

### Registro y actualización controlada del Service Worker

`src/components/service-worker-registration.tsx` registra `/sw.js` desde un efecto de React ejecutado únicamente en el navegador. El componente cliente se monta desde el layout, devuelve `null` y no bloquea el renderizado inicial de la aplicación.

La lógica de `src/lib/pwa/register-service-worker.ts` comprueba primero que el navegador sea compatible y registra el worker con alcance `/`. Si el registro falla, devuelve `null` y comunica el error mediante un callback opcional sin impedir que la interfaz continúe funcionando.

Una actualización se reconoce cuando ya existe `registration.waiting` o cuando `updatefound` produce un worker que alcanza el estado `installed` mientras la página ya está controlada. Esta última condición evita presentar la primera instalación como si fuera una actualización.

El worker nuevo permanece en espera. No se ejecuta `skipWaiting()` automáticamente: `activateWaitingServiceWorker()` debe recibir una decisión explícita de otra parte de la interfaz y entonces envía exactamente `{ type: "SKIP_WAITING" }`. Este incremento proporciona esa API de control, pero todavía no incorpora una acción visual para el usuario.

Después de una activación autorizada, el componente escucha `controllerchange`. La primera toma de control se registra sin recargar la página; los cambios posteriores recargan una sola vez mediante referencias persistentes y el listener se elimina al desmontar el componente.

`tests/service-worker.spec.ts` verifica el registro desde React y ejecuta `public/sw.js` en un contexto simulado para comprobar los eventos del ciclo de vida, la precarga, la propagación de errores de `cache.addAll`, la limpieza selectiva de cachés, el mensaje `SKIP_WAITING` y la exclusión de peticiones distintas de GET.

### Consulta offline y estrategia de caché

La Semana 3 incorpora una estrategia de caché para mantener una experiencia básica cuando el dispositivo pierde la conexión.

El Service Worker existente utiliza `Network First` para las navegaciones y `Cache First` para los recursos estáticos. Cuando una navegación no puede resolverse mediante la red ni mediante una respuesta almacenada, se utiliza `/offline.html` como fallback final.

La página `public/offline.html` es autónoma y no depende de recursos externos. Muestra un mensaje indicando que el dispositivo está sin conexión y permite volver a intentar la navegación hacia `/`.

Las solicitudes que pueden contener información sensible no se almacenan en caché. Se excluyen las peticiones que no utilizan `GET`, las rutas `/api/`, otros orígenes, las solicitudes con `Authorization` y los parámetros `token`, `password`, `secret` o `api_key`.

La estrategia queda documentada en `docs/cache-strategy.md`.

La prueba reproducible `tests/offline.spec.ts` comprueba la existencia del fallback, la estrategia `Network First`, la recuperación desde caché sin conexión, el fallback final hacia `/offline.html`, la estrategia `Cache First` para recursos estáticos y la exclusión de solicitudes que no deben interceptarse.

La prueba puede ejecutarse directamente con:

```bash
node tests/offline.spec.ts
```

### Verificación de la Semana 3

```bash
npm ci
npm run test -- --run
npm run build
npm run verify
bash public-tests/check.sh
```

Resultados observados:

* Las seis pruebas terminaron en `PASS`.
* El build de Next.js terminó correctamente.
* `npm run verify` terminó con `Verificación técnica: pass`.
* El check público terminó con `PUBLIC_OK`.

La prueba automatizada simula el Service Worker. La comprobación manual usando DevTools y el modo Network Offline queda pendiente, si todavía no se realizó.

## Incremento de la Semana 4

### Objetivo

El incremento compara renderizado CSR y SSR dentro del dominio de inspecciones
de laboratorio, utilizando únicamente datos sintéticos.

### Rutas y estrategias

| Ruta | Estrategia | Uso |
|---|---|---|
| `/inspecciones` | CSR | Listado interactivo de inspecciones. |
| `/inspecciones/[id]` | SSR dinámico | Detalle de una inspección. |

Aunque el build identifica `/inspecciones` como estática, lo que se genera de
esa forma es el shell inicial. Los registros se cargan en el navegador después
de la hidratación.

### Estados verificables

Listado CSR:

- `/inspecciones`: contenido.
- `/inspecciones?estado=carga`: carga.
- `/inspecciones?estado=error`: error.
- `/inspecciones?estado=vacio`: vacío.

Detalle SSR:

- `/inspecciones/inspection-001`: detalle válido.
- `/inspecciones/inspection-002`: segundo detalle válido.
- `/inspecciones/no-existe`: registro inexistente.
- `/inspecciones/error-demo`: error sintético.

### Instalación y ejecución

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

El entorno declarado es Node.js 20.19.0 con npm 10.8.2.

### Verificación

```bash
npm test
npm run build
make verify
bash public-tests/check.sh
```

Resultados reproducidos durante la revisión del cierre:

- Las siete pruebas acumulativas terminaron en `PASS`.
- `rendering.spec.ts` mostró `CSR + SSR PASS`.
- El build de Next.js compiló y validó tipos correctamente.
- `/inspecciones/[id]` apareció como ruta dinámica renderizada bajo demanda.
- `make verify` concluyó con `Verificación técnica: pass`.
- El check público acumulativo terminó con `PUBLIC_OK`.
- Los checks de GitHub Actions del PR #9 fueron reportados como exitosos.

Los commits individuales permanecen en el historial: Francisco implementó el
CSR en `c4147f8`, Javier implementó el SSR en `184af60` y Carlos completó el
cierre documental y de verificación en `efeba63`. La evidencia de Carlos quedó
registrada en `b167d39`.

### Métrica reproducible

Con Node.js 20.19.0, npm 10.8.2 y Next.js 14.2.35, `npm run build` mostró:

| Ruta | Tamaño propio | First Load JS |
|---|---:|---:|
| `/inspecciones` | 2.25 kB | 89.5 kB |
| `/inspecciones/[id]` | 152 B | 87.4 kB |

Estas métricas corresponden al bundle generado; no representan latencia de red.

### Decisión técnica

El listado utiliza CSR porque requiere interacción, filtros y futuras
actualizaciones locales. El detalle utiliza SSR dinámico porque una URL directa
debe resolver el identificador en el servidor y entregar su contenido inicial.

La decisión completa está documentada en `docs/rendering-decision.md`.

### Limitaciones

- Los datos utilizados son sintéticos.
- No existe un backend real ni una base de datos.
- Los retrasos de carga son deliberados para demostrar estados.
- `error-demo` es un escenario controlado de demostración.
- IndexedDB y la sincronización quedan para una etapa posterior.
- El check original del kit puede confundir menciones documentales de
  credenciales con secretos reales; el fallo y su tratamiento están
  documentados en la decisión de renderizado.

### GitHub Actions

El workflow oficial está en
`.github/workflows/week-04-w04-csr-ssr.yml`. Su contenido se conserva sin
modificaciones y el PR #9 ejecuta los criterios AC-01, AC-02 y AC-03.

## Semana 5 — Persistencia local y sincronización idempotente

### Qué se implementó

Se incorporó persistencia local de inspecciones mediante `localStorage`, una cola de sincronización idempotente, reintentos, recuperación de operaciones interrumpidas, sincronización al recuperar conectividad y una política determinista de resolución de conflictos.

La resolución compara primero `version`, después `updatedAt` y, ante un empate exacto, selecciona remoto como desempate determinista. Esto no significa que el servidor sea siempre más correcto; se utiliza para garantizar un resultado reproducible.

### Archivos principales

* `src/lib/storage/schema.ts`
* `src/lib/sync/queue.ts`
* `src/lib/sync/conflict-policy.ts`
* `src/lib/sync/conflict-resolution.ts`
* `tests/sync.spec.ts`
* `tests/conflict-resolution.spec.ts`
* `docs/sync-policy.md`
* `scripts/verify.mjs`
* `public-tests/check.sh`
* `.github/workflows/week-05-w05-sync-data.yml`

### Cómo funciona la cola

El estado local se conserva como un `SyncSnapshot` con inspecciones y operaciones.

Cada operación utiliza una `idempotencyKey` para evitar duplicados. Los estados de la cola son `pending`, `syncing`, `retry`, `failed` y `conflict`.

Si una operación queda en `syncing` por una interrupción, la cola la recupera como `retry` y conserva la misma clave idempotente.

El transporte se inyecta mediante `SyncTransport`, por lo que las pruebas no dependen de un backend privado.

El evento `online` activa `syncPending()` para intentar procesar las operaciones pendientes.

### Política de reintentos

Configuración predeterminada:

* `maxAttempts = 5`
* `baseDelayMs = 1000 ms`
* `maxDelayMs = 60000 ms`

La fórmula utilizada es:

`delay = min(baseDelayMs * 2^(attemptCount - 1), maxDelayMs)`

Los errores recuperables generan reintentos y los errores fatales pasan a `failed`.

### Política de conflictos

La resolución es determinista:

1. Mayor `version`.
2. Si la versión coincide, mayor `updatedAt`.
3. Si ambos valores coinciden exactamente, gana remoto mediante `server-tie-break`.

El desempate remoto no significa que el servidor sea siempre más correcto; se usa porque proporciona un resultado determinista ante un empate completo.

Cuando gana remoto, se elimina la operación conflictiva y la inspección queda `synced`.

Cuando gana local, se elimina la operación conflictiva y se crea una nueva operación `pending` con una nueva `idempotencyKey`, `attemptCount = 0` y `baseVersion` igual a la versión remota.

Una edición local posterior queda protegida para evitar que una respuesta antigua sobrescriba una mutación más reciente.

### Ejecución y pruebas

Comandos de referencia:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test -- --run
npm run build
make verify
bash public-tests/check.sh
```

En el entorno Windows utilizado para esta entrega, `make` no está disponible; el equivalente reproducido para la verificación acumulativa fue:

```bash
node scripts/verify.mjs
```

### Resultados reales

`npx tsc --noEmit` terminó sin errores.

`npm test` terminó con todas las pruebas en `PASS`.

`npm run test -- --run` terminó con todas las pruebas en `PASS`.

`node scripts/verify.mjs` terminó con `Verificación técnica: pass`.

El build de Next.js 14.2.35 compiló correctamente y validó los tipos.

El check público acumulativo terminó con:

```text
Estructura acumulativa correcta.
PUBLIC_OK
```

El workflow oficial de Semana 5 conserva el SHA-256 esperado:

```text
86258e52bbae322de17540dae8bc9cd953716b2b3f6c950192e38ad16f0ddc42
```

### Datos sintéticos

Todas las inspecciones utilizadas en esta actividad son sintéticas.

No se incluyen secretos, tokens ni datos personales reales en el almacenamiento, las pruebas, la documentación o la evidencia.

### Limitaciones

`localStorage` tiene capacidad limitada y sus operaciones son síncronas. La solución es adecuada para el alcance pequeño y sintético de esta actividad, pero no para grandes volúmenes de datos.

No existe un backend real con deduplicación de `idempotencyKey`, consistencia distribuida ni sincronización entre múltiples dispositivos.

El check público del kit puede producir falsos positivos al detectar palabras relacionadas con credenciales dentro de documentación, pruebas o `package-lock.json`. Esta limitación se documenta y no se oculta eliminando contenido legítimo.

### SHA de los integrantes

Francisco: `d3c0e64`.

Javier: `4704d3d` y `b18fff3`.

Carlos: implementación f0d38e7ee4a65c536a09fabd0d4a90526658dc9b; cierre documental 3159ac90f7a79efb458877b9188a480750b6cf1f; evidencia inicial 14132c50354245cb9249b46bd15ff554b3c1be91; corrección posterior a revisión c8041d1090d41e86fc8026499235411ad024e66c.

## Semana 6 — Capacidades opcionales y permisos mínimos

### Incremento inicial: evidencia fotográfica

El detalle de una inspección incorpora un panel cliente para adjuntar evidencia fotográfica opcional. El control utiliza `accept="image/*"` y `capture="environment"`: un dispositivo compatible puede ofrecer la cámara trasera después del gesto de la persona, mientras que los demás navegadores conservan el selector de archivos como fallback.

`src/lib/device/camera.ts` separa la detección de soporte de la solicitud efectiva. `getCameraAvailability()` no solicita permisos; `requestCameraAccess()` solo debe invocarse desde una acción explícita y transforma los rechazos esperados en resultados controlados. `stopCameraStream()` intenta detener todas las pistas.

La validación admite JPEG, PNG y WebP con un máximo predeterminado de 5 MB. La imagen permanece en memoria, no se transforma a Base64, no se almacena en `localStorage` y no se transmite a un servidor.

### Estados verificables de cámara

- Sin evidencia: la inspección continúa normalmente.
- Evidencia válida: se informa tipo y tamaño sin mostrar el nombre del archivo.
- Cancelación: se conserva un flujo funcional sin error global.
- Tipo o tamaño inválido: se anuncia un mensaje accesible.
- API ausente o permiso rechazado: se ofrece selección de archivo.

### Verificación del incremento de Francisco

Comandos ejecutados con Node.js `20.19.0` y npm `10.8.2`:

```bash
npm ci
npm test
npm run test -- --run
npx tsc --noEmit
npm run build
make verify
bash public-tests/check.sh
```

`tests/capabilities.spec.ts` utiliza implementaciones sintéticas de `getUserMedia`, archivos y pistas. No activa una cámara real ni muestra solicitudes de permiso durante la prueba.

Resultados observados:

- `npm ci`: código 0; instalación limpia completada. npm informó tres hallazgos de auditoría heredados (dos altos y uno crítico), que no se corrigieron automáticamente para evitar cambios de dependencias fuera del alcance.
- `npm test`: código 0; las diez pruebas acumulativas terminaron en `PASS`.
- `npm run test -- --run`: código 0; las mismas diez pruebas terminaron en `PASS` y el argumento adicional fue aceptado.
- `npx tsc --noEmit`: código 0, sin errores de tipos.
- `npm run build`: código 0; Next.js compiló y mantuvo `/inspecciones/[id]` como ruta SSR dinámica.
- `make verify`: código 0 y resultado `Verificación técnica: pass`.
- `bash public-tests/check.sh`: código 0 y resultado `PUBLIC_OK`.
- Revisión manual: `/inspecciones/inspection-001` respondió correctamente, el panel fue visible a 375 px sin desbordamiento horizontal y no se registraron errores de consola.

### Límites del incremento inicial

- El atributo `capture` es una sugerencia y su comportamiento depende del navegador.
- La evidencia se pierde al recargar porque todavía no forma parte del esquema persistente.
- No se comprime la imagen ni se sincronizan archivos con un backend.
- Notificaciones se integrarán en el siguiente incremento del equipo.

### Incremento de Javier: geolocalización opcional y permisos mínimos

Se incorporó geolocalización puntual y opcional para enriquecer la ficha de inspección con una referencia espacial aproximada, garantizando que la aplicación continúe funcionando sin errores si la persona usuaria rechaza el permiso o el dispositivo no cuenta con hardware de ubicación.

#### Qué se implementó

- **Módulo de dispositivo (`src/lib/device/geolocation.ts`):**
  - Consulta de disponibilidad sin solicitar permiso (`getGeolocationAvailability()`).
  - Lectura puntual mediante `getCurrentPosition`; se excluye deliberadamente `watchPosition` para evitar seguimiento continuo y consumo innecesario de batería.
  - Opciones de bajo consumo y mínima intrusión: `{ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }`.
  - Reducción de precisión: las coordenadas se truncan y redondean a 3 decimales (`~100 m`) antes de exponerse a la vista.
  - Conversión a resultado controlado discriminado: `success`, `unsupported`, `permission-denied`, `position-unavailable`, `timeout` y `unexpected-error`.
  - Soporte para inyección sintética de proveedor de geolocalización en pruebas.
  - La posición nunca se almacena en `localStorage` ni se envía a servidores.
  - La importación del módulo no ejecuta llamadas a la API del navegador.

- **Componente cliente (`src/components/inspection-capabilities.tsx`):**
  - Sección accesible "Ubicación aproximada" dentro del panel de capacidades.
  - Botón de acción explícita "Usar ubicación actual" (único punto donde se solicita permiso al navegador).
  - Estado de carga interactivo con `aria-busy="true"` y texto indicativo.
  - Muestra de coordenadas aproximadas redondeadas con opción de descartar.
  - Retroalimentación accesible para errores (`role="alert"`) y estados informativos (`role="status"`, `aria-live="polite"`).
  - Campo de entrada para referencia sintética manual como fallback cuando el permiso es denegado o no existe la API.
  - Nota visible de privacidad indicando que la ubicación no se guarda ni se transmite.

#### Cómo reproducirlo

1. Ejecutar `npm run dev` y abrir `http://localhost:3000/inspecciones/inspection-001`.
2. En la parte inferior, localizar la sección "Ubicación aproximada".
3. Observar el estado inicial que indica que el dato es opcional.
4. Pulsar el botón **"Usar ubicación actual"**:
   - Se muestra el estado de carga ("Obteniendo ubicación aproximada…").
   - Si se concede el permiso, aparecen las coordenadas aproximadas a tres decimales y el botón "Descartar ubicación".
   - Si se deniega el permiso o se simula un fallo, se muestra un mensaje explicativo accesible.
5. Probar el campo de **Referencia manual (opcional)** escribiendo una ubicación sintética (ej. "Laboratorio B, planta 2").

#### Pruebas ejecutadas

La suite acumulativa `tests/capabilities.spec.ts` se amplió para verificar diez escenarios con proveedores y coordenadas sintéticas:
1. Importar el módulo no solicita ubicación.
2. Consultar disponibilidad no solicita permiso.
3. La solicitud utiliza las opciones mínimas acordadas (`enableHighAccuracy: false`, `timeout: 10000`, `maximumAge: 60000`).
4. Una respuesta correcta produce coordenadas aproximadas redondeadas a 3 decimales.
5. El código de error 1 se transforma en `permission-denied`.
6. El código de error 2 se transforma en `position-unavailable`.
7. El código de error 3 se transforma en `timeout`.
8. La ausencia de la API produce `unsupported`.
9. No se utiliza `watchPosition` en ninguna circunstancia.
10. El componente incorpora botón, estados de carga y error, fallback manual y nota de privacidad.

#### Resultados reales

Comandos ejecutados con Node.js `v20.19.0` y npm `10.8.2`:

- `npm test`: código 0; las diez suites de pruebas pasaron en `PASS`, incluyendo `capabilities.spec.ts: cámara opcional + geolocalización opcional PASS`.
- `npm run test -- --run`: código 0; las diez pruebas pasaron en `PASS` con el argumento del evaluador.
- `npx tsc --noEmit`: código 0; sin errores de tipado en TypeScript.
- `npm run build`: código 0; compiló correctamente, `/inspecciones/[id]` se generó como ruta dinámica bajo demanda (3.13 kB, 90.4 kB First Load JS).
- `make verify` (y `node scripts/verify.mjs`): código 0; verificación técnica `pass`.
- `bash public-tests/check.sh` (con Git Bash): código 0; salida `PUBLIC_OK`.

#### Limitaciones

- La compatibilidad y exactitud real dependen del dispositivo, del sistema operativo y del navegador web.
- Las coordenadas no se persisten en `localStorage` ni en la cola de sincronización; se mantienen únicamente en memoria y se descartan al recargar o navegar.
- La demostración utiliza coordenadas estrictamente sintéticas en las pruebas y no envía datos a ningún servidor externo.

### Cierre de Semana 6 — notificaciones opcionales

La entrega integra tres capacidades progresivas y mantiene la inspección funcional cuando una API no existe, el permiso se rechaza o una operación falla:

- **Cámara — Francisco:** evidencia fotográfica opcional en memoria, con selector de archivo como fallback. Commit de implementación: `6d4582533338dfca5d74cd2be5443e08d3df1635`.
- **Geolocalización — Javier:** lectura puntual y aproximada, sin seguimiento continuo y con referencia manual como fallback. Commit de implementación: `fe8acd6eb8a9c4c8026d13cf89c91075cf4e935f`.
- **Notificaciones y cierre — Carlos:** permiso bajo acción explícita, notificación sintética local, fallback dentro de la aplicación, pruebas y verificadores acumulativos. Commit de implementación: `7b76e75dca6d5a34f4c0329d2ac3be0927c14b64`.

#### Archivos principales

- `src/lib/device/camera.ts`
- `src/lib/device/geolocation.ts`
- `src/lib/notifications/client.ts`
- `src/components/inspection-capabilities.tsx`
- `tests/capabilities.spec.ts`
- `docs/capabilities.md`
- `.github/workflows/week-06-w06-device-push.yml`

#### Flujo de permisos y fallbacks

Consultar soporte no solicita permisos. Cámara se activa desde el selector; geolocalización se solicita con **Usar ubicación actual**; y notificaciones se solicitan únicamente con **Activar notificaciones**. Ningún módulo ejecuta una capacidad al importarse.

Para notificaciones, un permiso `granted` habilita la prueba; `denied`, `dismissed`, `unsupported` o una excepción conservan la inspección y presentan un mensaje interno. La visualización intenta, en orden, `ServiceWorkerRegistration.showNotification()`, una notificación directa de ventana y el fallback accesible dentro de la ficha. La etiqueta `labinspect:<inspectionId>:status` es estable para reducir duplicados.

La demostración usa IDs, ubicaciones, archivos y mensajes sintéticos. La notificación no incluye coordenadas ni imágenes. No se implementan Web Push remoto, suscripciones, claves VAPID, proveedores externos ni entrega garantizada en segundo plano.

#### Instalación, ejecución y verificación

Desde la carpeta que contiene `package.json`:

```bash
npm ci
npm run dev
```

La demostración manual está disponible en `http://localhost:3000/inspecciones/inspection-001`. El servidor de desarrollo debe detenerse antes del build final.

Verificación acumulativa:

```bash
npm test
npm run test -- --run
npx tsc --noEmit
npm run build
make verify
bash public-tests/check.sh
```

El workflow oficial de la semana se conserva sin modificaciones en `.github/workflows/week-06-w06-device-push.yml`; su SHA-256 esperado es `cda79b0a9547ec24da3ee5d6fde05e1744eae3159bdb007a3a866080bce0f6a9`.

#### Resultados reales del cierre de Carlos

La validación se realizó con Node.js `v20.19.0` y npm `10.8.2`:

- `npm ci`: código 0; instaló 28 paquetes y reportó tres vulnerabilidades heredadas —dos altas y una crítica— sin aplicar correcciones automáticas.
- `npm test`: código 0; las diez suites acumulativas terminaron en `PASS`.
- `npm run test -- --run`: código 0; las diez suites terminaron en `PASS` aceptando el argumento adicional.
- `npx tsc --noEmit`: código 0; sin errores de tipos.
- `npm run build`: código 0; Next.js 14.2.35 compiló y `/inspecciones/[id]` permaneció como ruta dinámica bajo demanda, con 4.39 kB propios y 91.6 kB de First Load JS.
- `make verify`: no pudo iniciarse porque GNU Make no está instalado en el entorno Windows. El equivalente exacto `npm run verify` terminó con código 0 y `Verificación técnica: pass`.
- `bash public-tests/check.sh`: se ejecutó con Git Bash, terminó con código 0 y mostró `PUBLIC_OK`.
- `git diff --check`: terminó sin salida.

La revisión manual confirmó que cámara, geolocalización y notificaciones aparecen en ese orden, que no se solicita permiso al cargar, que el botón de activación es visible, que no existen errores de consola y que a 375 px no hay desbordamiento horizontal (`innerWidth = 375`, `scrollWidth = 360`). El navegador integrado mantuvo pendiente su diálogo al intentar solicitar permiso; por ello la concesión y el rechazo reales deben repetirse en Chrome por Carlos antes de entregar. Los resultados `granted`, `denied`, `dismissed`, `unsupported` y `display-error` sí quedaron cubiertos mediante dependencias sintéticas en la prueba automatizada.

#### Limitaciones del cierre

- Los permisos persistentes y la presentación final dependen del navegador y del sistema operativo.
- La selección de cámara, la ubicación y las notificaciones se mantienen como demostraciones locales; no se agregan al esquema de sincronización.
- La PWA no garantiza ejecución en segundo plano.
- Las pruebas automatizadas usan dependencias sintéticas: no activan hardware, permisos ni notificaciones reales.
- La auditoría de npm informa vulnerabilidades heredadas; no se ejecuta `npm audit fix --force` porque cambiaría dependencias fuera del alcance de la actividad.

## Semana 8 — incremento de Francisco

Continuamos desde Semana 6; Semana 7 correspondió a exámenes. Este es el **primer incremento, no el cierre de Semana 8**. Plan, diagnóstico y riesgos en [docs/test-strategy.md](docs/test-strategy.md).

### Setup y ejecución actual

Usar Node **20.19.0** (`.nvmrc`) y npm **10.8.2**, desde la raíz del repositorio:

```bash
node --version
npm --version
npm ci
npm run dev
```

En `/inspecciones`, debajo del listado sintético, aparece **Registrar inspección**. Completar fecha y descripción, conservando exclusivamente datos sintéticos, y pulsar **Guardar en este dispositivo**. Se muestran el registro local y su estado pendiente. **Nueva inspección** habilita otra captura; repetir el mismo envío no crea otra operación. Los datos guardados se cargan de nuevo al montar la vista. Si falla la escritura, los campos se conservan para reintentar; no se borra un almacenamiento corrupto automáticamente.

El panel opcional reutiliza cámara, ubicación y notificaciones de Semana 6 sin pedir permisos al cargar. Sus evidencias siguen siendo temporales, no forman parte de la operación sincronizable. El indicador **Con conexión** describe conectividad, no confirma envío: **Javier todavía debe conectar el transporte y la sincronización de la interfaz**.

Detener el servidor de desarrollo antes del build. Para la revisión de producción:

```bash
npm run build
npm run start
```

### Verificación y reportes actuales

```bash
npm ci
make verify
```

El equivalente exacto de `make verify` es `npm run verify` (el Makefile invoca ese comando). Ahora verifica estructura, lint, tipos de app y pruebas, diez suites heredadas, las pruebas nuevas, cobertura y build. Una etapa fallida hace fallar la verificación; se conservan sus logs.

También se pueden ejecutar por separado:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm test
npm run test -- --run
npm run test:coverage
npm run build
bash public-tests/check.sh
git diff --check
```

En Windows, utilizar Bash de Git si el `bash` predeterminado no ejecuta correctamente el check público: `& 'C:\Program Files\Git\bin\bash.exe' public-tests/check.sh` en PowerShell.

Las pruebas nuevas ejecutan **40 casos**: 26 de validación, 9 de idempotencia y 5 del componente en memoria. No usan navegador, cuentas, GPS, cámara ni permisos reales. No equivalen al E2E ni a una auditoría de accesibilidad.

Resultados locales observados en este incremento: `npm ci`, lint, tipos, las diez suites heredadas y los 40 casos, la variante `--run`, cobertura, build, `npm run verify` y `make verify` terminaron con código 0. El check público mostró `PUBLIC_OK`. La cobertura fue 45.02% de líneas (973/2161) y 79.81% de ramas (170/213) del alcance declarado, sin esconder los módulos no ejecutados.

Salidas generadas y excluidas de Git:

- `reports/verification.json`: SHA del checkout, runtime, alcance y resultado de cada etapa.
- `test-results/unit.xml`: resultados JUnit; `test-results/*.log`: diagnóstico de las etapas.
- `coverage/index.html`, `coverage/lcov.info`, `coverage/coverage-summary.json`: cobertura de `src/lib` y del componente de captura, incluidos módulos no ejecutados. No se impone un porcentaje ficticio ni se presenta esta cifra como cobertura de toda la app.

El nuevo workflow `.github/workflows/academic-evaluation.yml` ejecuta instalación limpia y `make verify`, y conserva esos reportes con `if: always()`. Su nombre y resumen indican que es el incremento 1/3. Los workflows oficiales previos permanecen sin modificaciones. Para revisar evidencia, abrir la ejecución correspondiente al SHA publicado y descargar `w08-francisco-<SHA>`; no usar una ejecución de otro commit.

### Pendientes y límites

- Javier: transporte sintético, conexión de cola/UI, integración con persistencia real y evidencia roja/verde de un defecto controlado en rama temporal.
- Carlos: E2E de captura offline, recarga con Service Worker, reconexión sin duplicados y capacidad rechazada/ausente; terminar CI, reportes y documentación.
- La revisión visual local no se realizó: la herramienta de navegador rechazó el permiso de acceso. La recuperación probada en memoria no demuestra una recarga realmente offline.
- Persistencia en localStorage y coordinación de una sola instancia; no hay garantía entre pestañas, segundo plano o backend durable.
- `npm ci` continúa informando tres vulnerabilidades heredadas (dos altas y una crítica). Se deja su actualización para un cambio evaluado; no se aplicó `npm audit fix --force`.
- Francisco debe revisar personalmente el diff y repetir los comandos antes de la entrega. La evidencia distingue la ejecución asistida de la validación humana pendiente.

La entrega común será posterior a la revisión de las tres partes: SHA final, enlace al commit, ejecución de Actions del mismo SHA, estrategia y evidencia individual. Las instrucciones de Semana 8 no requieren tag. No se entrega esta rama parcial como si fuera el cierre.

## Semana 8 — incremento de Javier

Este es el **segundo incremento (2/3) de Semana 8**: conecta la captura local con la sincronización sintética y demuestra su funcionamiento mediante pruebas de integración y un experimento de defecto controlado. No marca la Semana 8 como terminada; las pruebas E2E en navegador y el cierre siguen pendientes de Carlos.

### Qué conecta ahora la interfaz

- `src/components/inspection-capture.tsx` comparte la misma instancia de `InspectionSyncQueue` con `src/lib/sync/sync-controller.ts` y utiliza el receptor sintético `src/lib/sync/synthetic-transport.ts`.
- Al guardar una inspección, primero se valida y persiste localmente junto con su operación en `localStorage` (`utt-lab-inspections:sync:v1`). Si hay conexión disponible, el controlador solicita `syncPending()` y refleja el resultado en la lista; si no hay conexión, la conserva pendiente sin realizar envíos. Un fallo del transporte nunca convierte un guardado local válido en pérdida de datos.
- Al abrir la vista con conexión o al recibir el evento `online`, el controlador procesa automáticamente las operaciones pendientes respetando `nextAttemptAt` y `maxAttempts`.
- El botón **Sincronizar pendientes** permite recuperar manualmente el procesamiento sin recargar la página, sin crear otra operación, sin generar otra clave, sin reiniciar `attemptCount`, sin saltarse `nextAttemptAt` y sin ejecutar envíos simultáneos.
- Los estados visibles (`Pendiente de sincronización`, `Sincronizando…`, `Pendiente de reintento`, `Sincronizada`, `Error de sincronización` y `Conflicto pendiente`) se determinan consultando tanto las inspecciones como las operaciones del `SyncSnapshot`. El indicador de red (**Con conexión** / **Sin conexión**) solo informa conectividad del navegador y no equivale a **Sincronizada**.

### Cómo probar guardado, reconexión y deduplicación

1. Ejecutar `npm run dev` y abrir `http://localhost:3000/inspecciones`.
2. Con DevTools en modo **Offline** (o sin conexión), completar fecha y descripción sintética y pulsar **Guardar en este dispositivo**: el registro queda en `Pendiente de sincronización`.
3. Desactivar el modo **Offline** (evento `online`) o pulsar **Sincronizar pendientes**: el controlador procesa la operación pendiente y actualiza el estado del registro a `Sincronizada`.
4. La deduplicación del receptor sintético (`SyntheticSyncReceiver`) compara la identidad y el contenido estable de cada operación (`entityId`, `type`, `baseVersion` y los campos de la inspección en `payload`), ignorando campos que cambian legítimamente durante los reintentos (`attemptCount`, `nextAttemptAt`, `state` y `updatedAt` de la operación). Si recibe nuevamente la misma `idempotencyKey` con el mismo contenido estable (por ejemplo, tras una respuesta perdida), devuelve el resultado original sin volver a aplicar el efecto (`effectsApplied` no se incrementa). Si recibe la misma clave con contenido distinto, rechaza la operación con `fatal-error` y conserva intactos los datos originales.

### Qué conserva y qué pierde el receptor sintético

- **Qué conserva mientras la instancia está activa:** registro de claves idempotentes procesadas, huella de contenido estable, resultado original de cada operación aceptada, inspecciones remotas aplicadas y contadores separados de intentos recibidos (`attemptsReceived`) y efectos aplicados (`effectsApplied`).
- **Límite explícito:** el receptor simula un sistema remoto, pero no es un servidor durable. Su memoria puede perderse al recargar o reiniciar y no representa sincronización con un backend de producción. Los registros locales sí permanecen en `localStorage` bajo `utt-lab-inspections:sync:v1`.

### Comandos y verificación del incremento 2/3

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
npm run verify
& 'C:\Program Files\Git\bin\bash.exe' public-tests/check.sh
git diff --check
```

### Casos ejecutados, resultados observados y cobertura

Con Node.js `v20.19.0` y npm `10.8.2`:

- Diez suites heredadas en `PASS`.
- `npm run test:unit`: **40 casos aprobados** en 3 suites (`test-results/unit.xml`), código 0.
- `npm run test:integration`: **15 casos aprobados** en 2 suites (`tests/integration/offline-sync.test.ts` con 7 casos y `tests/integration/sync-controller.test.ts` con 8 casos; genera `test-results/integration.xml`), código 0. En el escenario central de respuesta perdida se verifican exactamente 2 intentos recibidos, 1 efecto remoto aplicado, 1 inspección local en estado `synced` y 0 operaciones pendientes.
- `npm run test:coverage`: recopila en una sola ejecución (`c8 node scripts/run-tests.mjs unit integration`) las pruebas unitarias y de integración sobre `src/lib/**/*.ts` y `src/components/inspection-capture.tsx`, conservando en el denominador los módulos no ejecutados (0%). Resultado observado: **62.51% de líneas/sentencias** (`1853/2964`), **84.01% de ramas** (`389/463`) y **63.63% de funciones** (`140/220`), con `inspection-capture.tsx` en 98.87%, `capture.ts` en 100%, `schema.ts` en 98.17%, `sync-controller.ts` en 96.94%, `synthetic-transport.ts` en 91.91% y `queue.ts` en 75.83%.
- `make verify`, `npm run verify` y `check.sh` terminaron con código 0 (`Verificación técnica: pass` y `PUBLIC_OK`).

### Experimento de defecto controlado y pendientes de Carlos

- La evidencia completa del experimento de defecto controlado en la rama temporal `w08/javier-defecto-controlado` (defecto en [`2d3a24ac2d22c7341b4287f8b84d23dd2d12ecf3`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/2d3a24ac2d22c7341b4287f8b84d23dd2d12ecf3), [Actions rojo](https://github.com/imnotfrank-x/pwa-inspecciones-/actions/runs/40250330208), reversión en [`f9c908987a0b7bfa3d3aa0f2f34188d2ef605267`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/f9c908987a0b7bfa3d3aa0f2f34188d2ef605267) y [Actions verde](https://github.com/imnotfrank-x/pwa-inspecciones-/actions/runs/40250381443)) se encuentra en [docs/controlled-defect.md](docs/controlled-defect.md).
- **Pendiente para Carlos (incremento 3/3):** pruebas E2E con Playwright sobre servidor de producción (`npm run build && npm run start`), comprobación de recarga offline real con Service Worker, prueba E2E de fallback de capacidades opcionales y cierre final de Semana 8.

## Semana 8 — correcciones de Francisco sobre la integración

Base de Javier conservada: `b38a8ae7f2a3ff1cc940dfad7f56a8ab7ab70bed`. Las correcciones están en `codex/w08-francisco-sync-fixes`, sin reescribir su rama ni sus commits. Las cifras de los apartados anteriores son resultados históricos de cada incremento.

La revisión reprodujo tres fallos pese al CI verde: la acción manual enviaba offline; un fallo al persistir la confirmación dejaba `syncing=true` y un rechazo sin manejar; y el controlador destruido podía iniciar otros envíos. Se corrigieron en controlador, cola y componente:

- Offline no se envía ni se consumen intentos. El botón queda deshabilitado, pero también se protege la llamada directa y cada envío de un lote.
- Al perder conexión o ejecutar `dispose()`, se permite terminar el envío ya iniciado y guardar su resultado; no se inicia el siguiente. La pausa anterior al transporte restaura la operación sin cambiar su clave ni consumir backoff.
- Un fallo de almacenamiento libera la UI, publica una alerta y conserva la operación. Si no puede leer, retiene la última copia visible. Reintentar recupera una confirmación pendiente con la misma clave y sin otro efecto remoto.
- Los rechazos de acciones de UI y del listener `online` se capturan después de publicar el error; las llamadas directas al controlador siguen rechazando ante errores reales, de modo que las pruebas pueden detectarlos.

`tests/integration/sync-regressions.test.ts` agrega diez casos. Ocho de ellos se ejecutaron contra la implementación previa y fallaron antes de corregirla. También se corrigió la prueba de componente que antes esperaba éxito estando offline y se amplió para errores al confirmar mediante botón y formulario. La suite actual contiene **40 casos unitarios y 25 de integración**, además de las diez suites heredadas.

Validación local de las correcciones con Node `v20.19.0` y npm `10.8.2`: instalación limpia, `make verify`, compatibilidad `--run`, check público y `git diff --check` aprobados. Cobertura combinada: líneas/sentencias **63.80% (1939/3039)**, ramas **84.32% (452/536)** y funciones **64.25% (142/221)**. Son mediciones locales, no cobertura E2E ni garantía de ausencia de defectos.

En ese incremento, los comandos eran `npm ci`, `make verify` (equivalente exacto: `npm run verify`), `npm run test -- --run` y el check público con Bash de Git. Su workflow publicaba `w08-sync-fixes-<SHA>` con resultados JUnit, logs, reporte de verificación y cobertura; la sección de cierre posterior describe el workflow final. Ver siempre el resultado y runtime del SHA exacto, no una ejecución antigua.

El experimento rojo/verde de Javier se conserva intacto en [docs/controlled-defect.md](docs/controlled-defect.md). Estas correcciones no se le atribuyen; su autoría y la evidencia de los otros integrantes no se alteran. La evidencia adicional de Francisco declara asistencia de Codex y revisión humana pendiente.

Límites: reintentos por acción/evento respetando `nextAttemptAt`, sin temporizador continuo ni garantía de segundo plano; receptor sintético no durable; coordinación limitada a una instancia; sin E2E ni revisión visual nueva en este incremento. Carlos debe comprobar el flujo real con Service Worker y capacidad denegada/ausente antes del cierre. Persisten los tres hallazgos heredados de auditoría de dependencias. No hay merge a `main` ni tags.

## Semana 8 — cierre E2E de Carlos

El tercer incremento incorpora Playwright `1.64.1` y comprueba el flujo crítico en
Chromium contra el servidor de producción de Next.js. Los escenarios usan contextos
de navegador independientes, únicamente datos sintéticos y esperas basadas en estados
observables; no insertan inspecciones directamente mediante JavaScript.

### Preparación y comandos

Usar Node.js `v20.19.0` y npm `10.8.2`:

```bash
npm ci
npx playwright install chromium
npm run verify:all
```

`npm run verify` conserva la batería previa: estructura, lint, tipos, diez suites
heredadas, 40 casos unitarios, 25 de integración, cobertura y build. `npm run
verify:all` ejecuta primero esa verificación y, después del build, añade los E2E.
Para lanzar solo Playwright debe existir previamente un build de producción:

```bash
npm run build
npm run test:e2e
```

Para observar el navegador y abrir el reporte HTML:

```bash
npm run test:e2e -- --headed
npx playwright show-report
```

Los resultados se escriben en `test-results/e2e/`, el JUnit en
`test-results/e2e.xml` y el informe navegable en `playwright-report/`. Estas rutas
están excluidas de Git.

### Escenarios E2E

- `tests/e2e/inspection-offline.spec.ts` abre `/inspecciones` con conexión, espera
  a que el Service Worker controle la página, recarga para preparar la caché y activa
  el modo offline real de Chromium. Captura la inspección mediante el formulario,
  verifica la operación pendiente y el botón de sincronización deshabilitado, recarga
  todavía sin red y confirma el mismo ID y contenido desde `localStorage`. Al restaurar
  la conexión espera el estado **Sincronizada**, pulsa nuevamente **Sincronizar
  pendientes** y confirma una sola inspección y una cola vacía.
- `tests/e2e/capabilities-fallback.spec.ts` elimina la API de geolocalización antes
  de abrir la página, comprueba el aviso de capacidad no disponible, utiliza
  **Referencia manual (opcional)** y guarda una inspección completa. La referencia
  manual permanece solo en memoria durante esa vista: el E2E confirma que no forma
  parte del snapshot persistido.

### Resultados del cierre

La ejecución local con Node.js `v20.19.0` y npm `10.8.2` obtuvo:

- `npm run verify:all`: código 0; verificación técnica `pass` y **2 E2E aprobados**.
- Diez suites heredadas en `PASS`, **40/40 unitarias** y **25/25 de integración**.
- Cobertura de unitarias + integración: **63.80%** de líneas/sentencias,
  **84.32%** de ramas y **64.25%** de funciones; no incluye una métrica de cobertura
  E2E ni representa cobertura global de toda la PWA.
- Build de Next.js 14.2.35 correcto; `/inspecciones` quedó en 11 kB propios y
  103 kB de First Load JS, mientras `/inspecciones/[id]` permaneció dinámica.
- `npm run test -- --run`, el check público y `git diff --check` se ejecutan además
  antes de publicar el cierre.

El primer E2E de fallback encontró un selector ambiguo porque Next.js mantiene su
propio anunciador de ruta con `role="alert"`. Se corrigió el test seleccionando el
aviso funcional mediante `data-reason="unsupported"`; no fue un defecto del producto.
La recarga offline real pasó sin requerir cambios al Service Worker. En el entorno
aislado de ejecución fue necesario permitir acceso al servidor local para que
Playwright alcanzara `127.0.0.1:3108`.

### CI y límites

`.github/workflows/academic-evaluation.yml` instala dependencias con `npm ci`, instala
Chromium y sus dependencias mediante `npx playwright install --with-deps chromium` y
ejecuta `npm run verify:all`. Una prueba fallida falla el job. La etapa con
`if: always()` publica `w08-final-<SHA>` con `reports/verification.json`,
`test-results/`, `coverage/` y `playwright-report/`.

El E2E demuestra el flujo visible, la caché del Service Worker y la persistencia real
del navegador. La deduplicación de efectos remotos sigue demostrada por la integración
con `SyntheticSyncReceiver`; ese receptor vive en memoria y no es un servidor durable.
No se demuestra coordinación entre pestañas, sincronización garantizada en segundo
plano, hardware real, todos los navegadores ni un backend de producción. Se conservan
sin cambios el experimento controlado y la evidencia de los demás integrantes.
