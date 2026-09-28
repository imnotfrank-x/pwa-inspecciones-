# Evidencia individual — Equipo 10A-E05

- Grupo y equipo: 10A-E05
- Repositorio del equipo: <https://github.com/imnotfrank-x/pwa-inspecciones->

## Integrante: Gil Ginez Francisco Xavier — 3523110137

- **Mi contribución concreta y enlace a archivo, commit anterior o revisión:** Preparé el repositorio privado y la rama de documentación del equipo; comprobé la instalación, el arranque y la verificación técnica del starter; y documenté en `README.md` las versiones utilizadas, los resultados obtenidos y las limitaciones observadas. Evidencia: [commit 1263d66d72a67a89c33704ae213af8ce4e65c87f](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/1263d66d72a67a89c33704ae213af8ce4e65c87f).
- **Decisión que puedo explicar y por qué:** Puedo explicar por qué el equipo usa `npm ci` y conserva `package-lock.json`: permite instalar las dependencias resueltas del starter de forma reproducible y detectar inconsistencias con `package.json`. También puedo explicar por qué el servidor de desarrollo debe detenerse antes del build, ya que en Windows puede mantener bloqueado `.next/trace`.
- **Comando o prueba proporcionada que ejecuté:** Ejecuté `npm ci`, `npm run dev` y `npm run verify` desde la carpeta que contiene `package.json`.
- **Resultado real que observé:** `npm ci` terminó correctamente e instaló 28 paquetes. `npm run dev` inició Next.js 14.2.35, compiló la ruta principal y respondió `GET / 200`. En el primer intento de `npm run verify`, `starter.spec.mjs` terminó en `PASS`, pero el build falló con `EPERM` porque el servidor seguía usando `.next/trace`. Después de detener el servidor, repetí el comando: la prueba terminó en `PASS`, el build compiló correctamente y la verificación técnica terminó en `pass`.
- **Qué verifica esa prueba y qué no verifica:** `npm run verify` comprueba la estructura requerida, ejecuta `starter.spec.mjs`, realiza el build de producción y genera `reports/verification.json`. No evalúa automáticamente la calidad de los requisitos o de la decisión arquitectónica, no certifica ausencia de secretos y no demuestra funcionamiento offline.
- **Limitación, dificultad o riesgo que identifiqué:** El build puede fallar en Windows si el servidor de desarrollo conserva bloqueado `.next/trace`. Además, `npm ci` informó dos vulnerabilidades de severidad alta en dependencias; no se aplicaron actualizaciones forzadas porque podrían modificar el starter y requieren una evaluación separada.
- **Uso de IA:** Utilicé Codex para analizar las instrucciones, organizar la distribución del trabajo y revisar la interpretación de los resultados técnicos. Verifiqué personalmente las versiones, ejecuté los comandos, comprobé sus resultados y confirmé que las afirmaciones correspondieran con la salida real.

### Incremento personal — Semana 2

- **Commit de mi contribución:** [`f439887c70a46c49c00672d11fcbad36445cc467`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/f439887c70a46c49c00672d11fcbad36445cc467).
- **Contribución concreta:** Implementé `public/manifest.webmanifest`, incorporé iconos PNG reales de 192 y 512 píxeles, conservé sus fuentes SVG editables, enlacé el manifest desde `src/app/layout.tsx`, declaré la versión de Node utilizada y agregué `tests/manifest.spec.ts` al comando obligatorio `npm test`.
- **Decisión técnica que puedo explicar:** La prueba del manifest utiliza `node:assert/strict` y módulos integrados de Node.js. El archivo conserva la extensión `.ts` solicitada, pero usa sintaxis JavaScript compatible con CommonJS para poder ejecutarse directamente con Node.js 20.19.0, sin introducir un framework adicional para comprobar JSON y archivos estáticos.
- **Decisión de instalación que puedo explicar:** Elegí `display: "standalone"`, `start_url: "/"` y `scope: "/"` porque el incremento prepara un shell instalable de una sola aplicación. El icono de 512 píxeles declara `maskable` y mantiene una zona segura para soportar recortes de distintas plataformas.
- **Prueba ejecutada y resultado reproducible:** En el entorno local con Node.js `v20.19.0` y npm `10.8.2` se ejecutaron `npm ci --ignore-scripts --no-audit --no-fund`, `npm test`, `npm run test -- --run`, `npm run build` y `npm run verify`. La instalación agregó 28 paquetes; `starter.spec.mjs` y `manifest.spec.ts` terminaron en `PASS`; el build de Next.js 14.2.35 compiló, validó tipos y generó cuatro páginas estáticas; y la verificación terminó con estado técnico `pass`.
- **Qué verifica mi prueba:** Comprueba que el manifest sea JSON válido, que contenga los campos críticos de instalación, que enlace el manifest desde el layout, que declare iconos PNG locales de 192 y 512 píxeles, que esos archivos existan y que sus dimensiones reales coincidan.
- **Qué no verifica:** La prueba no demuestra funcionamiento offline, instalación en todos los navegadores, sincronización, persistencia local ni compatibilidad completa entre Android e iOS.
- **Limitación o fallo diagnosticado:** El manifest y los iconos describen la experiencia instalable, pero no proporcionan caché offline. Esa capacidad requerirá un Service Worker en un incremento posterior. Una ejecución preliminar con el runtime interno de Codex mostró advertencias de caché de webpack; la repetición con Node.js 20.19.0 terminó correctamente y sin esas advertencias.
- **Uso declarado de IA:** Utilicé Codex para analizar el contrato, revisar la compatibilidad con Node.js 20.19.0, completar la implementación, generar los PNG a partir del diseño SVG y ejecutar una verificación reproducible. Revisaré los cambios y repetiré personalmente los comandos antes de entregar para confirmar que puedo explicar y modificar cada decisión.

### Incremento personal — Semana 3

- **Commit de mi contribución:** [`1cb006149bb67b8d8b131dfd3feb8b92d5d92f7c`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/1cb006149bb67b8d8b131dfd3feb8b92d5d92f7c).
- **Contribución concreta:** Implementé `public/sw.js` con cachés de precache y runtime versionadas, precache de los recursos indispensables, limpieza selectiva de versiones anteriores, estrategia Network First para navegaciones, Cache First para recursos estáticos conocidos y recuperación mediante la página principal o el fallback offline. Excluí métodos distintos de GET, otros orígenes, rutas de API, solicitudes con autorización y parámetros sensibles. También incorporé la activación explícita de una actualización mediante el mensaje `SKIP_WAITING`.
- **Decisión técnica que puedo explicar:** El evento `install` no captura ni oculta un fallo de `cache.addAll`. Si un recurso indispensable no puede almacenarse, la instalación de la versión nueva falla y el worker anterior permanece disponible. La limpieza ocurre después, durante `activate`, y elimina únicamente cachés antiguas con el prefijo `labinspect-`, por lo que no borra almacenamiento perteneciente a otra aplicación.
- **Prueba ejecutada y resultado:** Se ejecutaron `node --check public/sw.js`, una comprobación temporal con `node:vm`, `npm test` y `npm run build` usando Node.js `v20.19.0` y npm `10.8.2`. La comprobación temporal confirmó el registro de `install`, `activate`, `fetch` y `message`, el rechazo de un precache fallido, la limpieza selectiva y la activación exclusiva mediante `SKIP_WAITING`. Las cuatro pruebas acumuladas terminaron en `PASS` y el build de Next.js 14.2.35 compiló y validó tipos correctamente.
- **Limitación o fallo diagnosticado:** Esta contribución define el contrato con `/offline.html`, pero el recurso será incorporado por la parte de fallback del equipo. El Service Worker tampoco quedará registrado desde React hasta integrar `src/lib/pwa/register-service-worker.ts`. Por ello, la prueba manual completa con DevTools y Network Offline debe realizarse después de integrar las tres contribuciones.
- **Cambio que puedo defender o modificar en vivo:** Puedo incrementar `CACHE_VERSION`, explicar por qué las cachés activas se conservan y las anteriores se eliminan, y cambiar una ruta entre Network First y Cache First justificando el efecto sobre disponibilidad y vigencia de los datos.
- **Uso declarado de IA:** Utilicé Codex para interpretar el contrato de la actividad, proponer la estrategia, implementar y revisar `public/sw.js` y ejecutar las comprobaciones indicadas. La validación fue reproducible con Node.js 20.19.0; revisaré personalmente el diff, repetiré los comandos y comprobaré el comportamiento en DevTools antes de la entrega final.

### Incremento personal — Semana 4

- **Commit de mi contribución:** [`c4147f80f96e321113d074083ec018b39801dde5`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/c4147f80f96e321113d074083ec018b39801dde5).
- **Contribución concreta:** Implementé la ruta CSR `src/app/inspecciones/page.tsx`, el componente accesible y reutilizable `src/components/loading-state.tsx`, los estados deterministas de carga, contenido, error y vacío, la recuperación del error sin recargar la página completa y los enlaces hacia el futuro detalle de cada inspección. También incorporé la cobertura inicial de CSR en `tests/rendering.spec.ts` y conecté la ruta desde la navegación principal.
- **Decisión técnica que puedo explicar:** El primer HTML del listado representa el estado de carga y conserva exactamente ese mismo estado durante la hidratación. La consulta sintética comienza dentro de `useEffect`, por lo que el navegador no recibe inicialmente una estructura distinta de la que React espera hidratar. Las URLs `?estado=carga`, `?estado=error` y `?estado=vacio` permiten reproducir cada caso sin fallos aleatorios ni servicios externos.
- **Prueba ejecutada y resultado:** En la sesión asistida se ejecutaron `npm test`, `npm run build` y `make verify`. Las siete pruebas acumulativas terminaron en `PASS`, incluido `rendering.spec.ts: CSR PASS`; Next.js compiló y validó tipos correctamente; `/inspecciones` se generó como ruta estática con 2.25 kB propios y 89.5 kB de First Load JS; y la verificación técnica terminó en `pass`. También se solicitaron por HTTP las cuatro variantes de la ruta y todas respondieron con estado 200. Antes de entregar, repetiré personalmente estos comandos y la comprobación en el navegador.
- **Qué verifica mi prueba:** Comprueba que el listado declare el límite de cliente, que la consulta se inicie después de la hidratación, que existan URLs verificables para carga, error y vacío, que se reutilice `LoadingState`, que carga y error tengan semántica accesible, que exista una acción de reintento y que cada tarjeta prepare la navegación al detalle.
- **Qué no verifica:** La prueba inicial inspecciona el contrato del código y no sustituye una prueba E2E en un navegador real. Tampoco valida todavía el detalle SSR, la persistencia en IndexedDB, la sincronización ni un origen de datos remoto.
- **Limitación o fallo diagnosticado:** Al ser CSR, los registros no aparecen en el HTML inicial y requieren JavaScript después de mostrar el estado de carga. El retraso de 350 ms y los fallos seleccionados por URL son mecanismos sintéticos de demostración, no mediciones de una red real. El build terminó correctamente, aunque webpack mostró advertencias no bloqueantes al intentar guardar su caché local.
- **Cambio que puedo defender o modificar en vivo:** Puedo cambiar el retraso sintético, agregar un nuevo estado verificable o modificar la recuperación del error explicando cómo se conserva un primer render estable para evitar discrepancias de hidratación.
- **Uso declarado de IA:** Utilicé Codex para revisar el contrato de la Semana 4, implementar el listado CSR y el estado de carga, preparar la prueba inicial y ejecutar verificaciones reproducibles. Revisaré personalmente el diff, repetiré las pruebas y confirmaré en el navegador los cuatro estados antes de entregar.

## Integrante: Hernández Camacho Carlos Eduardo — 3515110194

### Carlos

**Contribución concreta:**

Completé el documento `docs/requirements.md`, definiendo el problema y contexto del producto, los usuarios y escenarios ESC-01 y ESC-02, los requisitos funcionales y no funcionales, los datos sintéticos y los criterios de aceptación de la Semana 1. El cambio quedó registrado en el commit `7ec356120d9a3b4069d881ce2523cbe86e51a331`.

**Decisión que puedo explicar:**

Decidí diferenciar las funciones disponibles durante la Semana 1 de las capacidades futuras. La conservación local y la sincronización de registros se documentaron como requisitos futuros debido a que la actividad indica que todavía no deben implementarse las funciones offline.

**Comando o prueba proporcionada que ejecuté personalmente:**

Ejecuté `npm run verify` desde la carpeta que contiene `package.json`.

**Resultado real que observé:**

`npm run verify` terminó correctamente. La prueba proporcionada `starter.spec.mjs` obtuvo `PASS`. Posteriormente se ejecutó el build de producción con Next.js 14.2.35, el cual compiló correctamente, realizó la comprobación de tipos y generó las cuatro páginas estáticas. Finalmente, el proceso mostró `Verificación técnica: pass` y generó `reports/verification.json`.

**Qué verifica esa prueba:**

`npm run verify` comprueba la estructura requerida, ejecuta la prueba proporcionada por el starter, realiza el build de producción y genera `reports/verification.json`. En esta ejecución se comprobó que la prueba terminó en `PASS` y que el proyecto puede compilarse correctamente en el entorno utilizado.

**Qué no verifica:**

Esta ejecución no demuestra por sí sola que todos los requisitos documentados estén implementados, ni valida la calidad del análisis de requisitos, la accesibilidad, la privacidad o las funcionalidades offline futuras. Tampoco constituye una certificación de ausencia de secretos.

**Limitación o riesgo identificado:**

Una limitación de esta verificación es que un resultado técnico `pass` no garantiza que los requisitos futuros, como almacenamiento offline y sincronización, estén implementados. Esas capacidades se documentan para semanas posteriores y requieren validaciones específicas cuando sean desarrolladas.

**Uso de IA:**

Utilicé IA como apoyo para estructurar y redactar el documento de requisitos y para revisar la interpretación de las instrucciones de la actividad. La ejecución de `npm run verify`, así como la comprobación del resultado mostrado en la terminal, fueron realizadas personalmente y corresponden al resultado observado en mi entorno.
### Incremento personal — Semana 2

* **Commit de mi contribución:** `d625c4e0dda1e24911bf7f82ae26734e30ea9e31`.

* **Contribución concreta:** Implementé `src/components/app-shell.tsx`, integré el App Shell desde `src/app/layout.tsx`, eliminé los landmarks `main` duplicados de las vistas, incorporé la navegación principal y el enlace para saltar directamente al contenido principal, completé los estilos responsive y agregué `tests/app-shell.spec.ts`.

* **Decisión técnica que puedo explicar:** Centralicé la cabecera, la navegación, el contenido principal y el footer en `AppShell`. Las páginas proporcionan su contenido mediante `children`, evitando duplicar la estructura compartida y garantizando que la vista utilice un único landmark `main`.

* **Decisión de accesibilidad que puedo explicar:** Incorporé una navegación con nombre accesible, estados de foco visibles y un enlace para saltar directamente al contenido principal. El elemento `main` utiliza `tabIndex={-1}` para poder recibir el foco después de activar el enlace de salto.

* **Pruebas ejecutadas personalmente:** Ejecuté `npm test`, `npm run test -- --run`, `npm run build` y `npm run verify`.

* **Resultado real observado:** `npm test` terminó correctamente y mostró `PASS` para `starter.spec.mjs`, `manifest.spec.ts`, `inspection-states.spec.ts` y `app-shell.spec.ts`. `npm run test -- --run` también terminó correctamente con las cuatro pruebas en `PASS`. `npm run build` compiló correctamente con Next.js 14.2.35, validó los tipos y generó las páginas previstas. `npm run verify` repitió las pruebas y el build y concluyó con `Verificación técnica: pass`. También se generó `reports/verification.json`.

* **Verificación manual:** La navegación mediante teclado funcionó correctamente y los enlaces mostraron foco visible. El enlace `Saltar al contenido principal` apareció al recibir foco y permitió pasar al contenido principal. Los estados de carga, error y vacío conservaron el header, la navegación y el footer. En la vista de aproximadamente 375 px no se observó desplazamiento horizontal ni elementos encimados, y las tarjetas se acomodaron en una sola columna.

* **Qué verifica mi prueba:** Comprueba que el App Shell contenga header, navegación, `main` y footer; que la navegación tenga un nombre accesible; que el enlace de salto tenga el destino correcto; que el layout integre `AppShell`; y que las vistas `page.tsx`, `loading.tsx` y `error.tsx` no generen un segundo `main`.

* **Qué no verifica:** No constituye una auditoría completa con lector de pantalla, no evalúa todos los navegadores ni demuestra funcionamiento offline, sincronización o persistencia local.

* **Limitación o fallo diagnosticado:** La integración exigió retirar los landmarks duplicados que existían en `page.tsx`, `loading.tsx` y `error.tsx`, ya que mantenerlos habría producido varios elementos `main` en una misma vista.

* **Uso declarado de IA:** Utilicé Codex como apoyo para interpretar la guía de la actividad, revisar y estructurar la implementación del App Shell y apoyar la revisión de los cambios. Validé personalmente la implementación mediante las pruebas automatizadas, el build, `npm run verify` y las comprobaciones manuales de navegación, Skip link, estados y vista responsive.

### Incremento personal — Semana 3

* **Commit de mi contribución:** `4f94b80fdbf14992f2822bf5cdfade5b5e4646cd`.

* **Contribución concreta:** Implementé la parte de comportamiento offline del incremento. Incorporé `public/offline.html` como página de respaldo cuando no existe conexión, creé `tests/offline.spec.ts` para comprobar de forma reproducible el comportamiento offline, documenté la estrategia de caché en `docs/cache-strategy.md` y agregué la prueba offline al comando `npm test`.

* **Decisión técnica que puedo explicar:** Las navegaciones utilizan **Network First**, intentando primero obtener contenido de la red y recurriendo al caché cuando no hay conexión. Los recursos estáticos utilizan **Cache First**, priorizando la disponibilidad local. Para una navegación sin conexión se contempla la recuperación mediante la URL solicitada, la página principal `/` y finalmente `/offline.html`.

* **Decisión de seguridad que puedo explicar:** La estrategia excluye solicitudes a `/api/`, solicitudes de otros orígenes, solicitudes con encabezado `Authorization` y consultas que contienen parámetros potencialmente sensibles como `api_key`, `token`, `password` y `secret`.

* **Contribución de prueba:** `tests/offline.spec.ts` comprueba el fallback, la estrategia `Network First`, la recuperación desde caché, el uso de `/offline.html`, la estrategia `Cache First` y la exclusión de solicitudes sensibles o no compatibles.

* **Prueba ejecutada personalmente:** Ejecuté `node tests/offline.spec.ts`, `npm test`, `npm run build`, `npm run verify` y `bash public-tests/check.sh`.

* **Resultado real observado:** `node tests/offline.spec.ts` terminó con `offline.spec.ts: PASS`. `npm test` terminó con las seis pruebas en `PASS`. `npm run build` compiló correctamente. `npm run verify` terminó con `Verificación técnica: pass`. `bash public-tests/check.sh` terminó con `PUBLIC_OK`.

* **Qué verifica mi prueba:** Comprueba que `public/offline.html` exista, que el Service Worker utilice `/offline.html`, que las navegaciones puedan recuperarse desde caché cuando no existe conexión, que exista un fallback final y que los recursos estáticos utilicen Cache First. También comprueba que no se intercepten solicitudes `POST`, rutas `/api/`, otros orígenes ni solicitudes con credenciales o parámetros sensibles.

* **Qué no verifica:** La prueba no sustituye una prueba manual completa en un navegador real con DevTools y Network Offline. Tampoco demuestra sincronización de datos, persistencia mediante IndexedDB ni funcionamiento de un backend real.

* **Limitación o dificultad identificada:** La primera visita requiere conexión y el navegador puede eliminar la caché según sus políticas de almacenamiento. La actividad permite consulta offline, pero todavía no permite crear o sincronizar inspecciones sin conexión.

* **Documentación incorporada:** Actualicé `README.md`, `docs/cache-strategy.md` y `public-tests/check.sh` para registrar el comportamiento offline, la estrategia de caché y los artefactos acumulativos de la Semana 3.

* **Uso declarado de IA:** Utilicé IA como apoyo para interpretar la guía de la Semana 3, estructurar las pruebas y revisar los cambios. La creación de los archivos, la ejecución de las pruebas y la comprobación de los resultados se realizaron en mi entorno local, y puedo explicar las decisiones técnicas registradas en esta evidencia.


### Incremento personal — Semana 4

- **SHA del commit de mi contribución:** efeba632a9d6a0219813ed0b106dda20b21a0233.
- **Contribución concreta:** Completé docs/rendering-decision.md con la comparación entre CSR y SSR, sus estados verificables, prevención de hydration mismatch, trade-offs, límites y métrica reproducible. Actualicé README.md, la verificación acumulativa, el check público y la cobertura final de tests/rendering.spec.ts. También integré sin modificaciones el workflow oficial de Semana 4.
- **Decisión técnica que puedo explicar:** El listado utiliza CSR porque su evolución requiere interacción, filtros y lectura futura desde almacenamiento local. El detalle utiliza SSR dinámico porque resuelve params.id en el servidor y entrega el contenido correspondiente a una URL directa. La ruta del detalle declara force-dynamic para evitar que los registros se generen estáticamente.
- **Métrica que puedo explicar:** Ejecuté npm run build con Node.js 20.19.0, npm 10.8.2 y Next.js 14.2.35. El listado reportó 2.25 kB propios y 89.5 kB de First Load JS; el detalle reportó 152 B propios y 87.4 kB de First Load JS. Esta métrica mide el bundle generado y no la latencia de red.
- **Pruebas ejecutadas personalmente:** Ejecuté npm ci --ignore-scripts --no-audit --no-fund, npm test, npm run build, make verify y bash public-tests/check.sh.
- **Resultado real:** npm ci --ignore-scripts --no-audit --no-fund: PASS. npm test: PASS, 7/7 pruebas. npm run build: PASS. npm run verify: PASS, con Verificación técnica: pass. make verify: no se pudo ejecutar porque make no está instalado/reconocido en Windows. bash public-tests/check.sh: no se pudo ejecutar desde Bash porque ese entorno no encontró node. La comprobación equivalente realizada en PowerShell confirmó Estructura acumulativa correcta. y PUBLIC_OK.
- **Qué verifican las pruebas:** Comprueban las rutas y límites CSR/SSR, estados accesibles, consulta por ID, registro inexistente, error sintético, conservación del App Shell, documentos obligatorios y workflow oficial sin modificaciones.
- **Qué no verifican:** No demuestran comportamiento con un backend, rendimiento de red, persistencia en IndexedDB, sincronización ni compatibilidad completa entre navegadores.
- **Fallo diagnosticado:** El check público del kit tiene una comprobación amplia de palabras relacionadas con credenciales que puede producir coincidencias en archivos que forman parte de la documentación, dependencias o pruebas. Conservé una comprobación estructural acumulativa y documenté la limitación sin eliminar controles de seguridad.
- **Cambio que puedo realizar en vivo:** Puedo agregar o retirar un archivo del arreglo de verificación, explicar la diferencia entre una ruta estática con hidratación CSR y una ruta SSR dinámica, o actualizar la métrica usando una nueva salida del build.
- **Uso declarado de IA:** Utilicé ChatGPT/Codex para interpretar el contrato, estructurar la documentación y revisar las pruebas. Validé personalmente el diff, los comandos, el workflow y los resultados reproducibles antes de aceptar los cambios.

## Integrante: Hernandez Mendez Javier — 3523110052

### Javier

**Contribución concreta y enlace:**
Completé íntegramente el documento `docs/decision-record.md` (ADR-001) para fundamentar la decisión arquitectónica del producto: registré el estado de la decisión, el contexto operativo y restricciones del proyecto (usuarios inspectores, conectividad intermitente, uso móvil, datos sintéticos y alcance de la Semana 1), desarrollé la matriz comparativa de cuatro alternativas (PWA, Web tradicional, App nativa y App multiplataforma) evaluadas bajo siete criterios técnicos, justifiqué la adopción de Next.js como PWA destacando los beneficios para los inspectores y definiendo el criterio de exclusión frente a apps nativas, analicé consecuencias y riesgos (costos de sincronización, conflictos al reconectar, datos desactualizados y compatibilidad de navegadores con sus respectivas mitigaciones), y definí el protocolo para la validación técnica futura. El cambio quedó registrado en el commit [`a85c897cdad8e74cb510709d516428b383117bde`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/a85c897cdad8e74cb510709d516428b383117bde).

**Decisión que puedo explicar y por qué:**
Puedo explicar por qué el equipo eligió la estrategia de Progressive Web App (PWA) manteniendo Next.js 14 en lugar de una aplicación nativa o web tradicional: la PWA permite una distribución inmediata vía web sin intermediación de tiendas ni costos de cuentas de desarrollador, reutiliza la base de código existente para escritorio y móvil, y proporciona el soporte técnico para implementar progresivamente almacenamiento local (IndexedDB) y Service Workers requeridos por el escenario de conectividad intermitente (ESC-02). Asimismo, puedo explicar que una app nativa únicamente se justificaría si se requirieran sensores industriales especializados o procesamiento pesado continuo en segundo plano.

**Comando ejecutado personalmente:**
Con el servidor de desarrollo detenido, ejecuté personalmente `npm ci` y `npm run verify` desde la carpeta que contiene `package.json`.

**Resultado real que observé:**
- `npm ci`: Terminó correctamente con código 0, instalando 28 paquetes y auditando 29 paquetes en 25 segundos. Reportó 2 vulnerabilidades de severidad alta en dependencias provistas por el starter (sin forzar modificaciones con `npm audit fix --force`).
- `npm run verify`: Ejecutó `tests/starter.spec.mjs` con resultado `PASS`, compiló exitosamente el build de producción con Next.js 14.2.35 generando las páginas estáticas (4/4), y concluyó con `Verificación técnica: pass. Revisión académica: pendiente. Reporte: reports/verification.json` (Node.js v22.22.0).

**Qué verifica esa prueba y qué no verifica:**
- *Qué verifica:* Comprueba la presencia de la estructura y archivos obligatorios del repositorio, ejecuta la prueba automatizada `starter.spec.mjs`, compila el build de producción para validar tipados y dependencias, y genera el archivo `reports/verification.json`.
- *Qué no verifica:* Un estado `pass` no evalúa ni califica el contenido, profundidad o calidad de los requisitos en `requirements.md` ni del ADR en `decision-record.md`; no certifica ausencia de credenciales o secretos; no valida accesibilidad (RNF-02) ni privacidad (RNF-04); y no demuestra funcionamiento offline, manifest ni sincronización, ya que son capacidades futuras no implementadas en Semana 1.

**Limitación, dificultad o riesgo que identifiqué:**
La persistencia offline y la sincronización no ocurren automáticamente por usar Next.js o PWA; demandan diseñar explícitamente esquemas en IndexedDB, colas transaccionales de mutaciones y estrategias de resolución de conflictos (LWW o control de versiones) para evitar sobreescrituras al reconectar. Además, existen diferencias entre navegadores (las restricciones de almacenamiento y ciclo de vida de WebKit/Safari en iOS frente a Chromium en Android). Técnicamente, se identificaron 2 vulnerabilidades de severidad alta en las dependencias del starter que no deben forzarse con `npm audit fix --force` para no romper la compatibilidad, y se confirmó que el servidor de desarrollo debe detenerse antes de compilar para evitar bloqueos en `.next/trace` en Windows.

**Uso de IA:**
Utilicé IA (Antigravity IDE con modelo Gemini) como asistente de redacción y estructuración analítica para contrastar las alternativas arquitectónicas del ADR y redactar de forma rigurosa los riesgos y validaciones. Ejecuté personalmente los comandos técnicos (`npm ci`, `npm run verify`), verifiqué y registré los resultados reales observados en mi terminal y en `reports/verification.json`, asegurando que ninguna afirmación asumiera funciones offline ya implementadas.

### Incremento personal — Semana 2

- **Commit de mi contribución:** `d4bea1fe28df84a8ec93b102cd18cfa3b4817351`.
- **Contribución concreta:** Implementé el componente de inspecciones con estados `ready`, `loading`, `error` y `empty`; agregué los límites `loading.tsx` y `error.tsx`; preparé URLs deterministas para reproducir cada estado; y escribí `tests/inspection-states.spec.ts`.
- **Decisión técnica que puedo explicar:** Separé el estado de la vista de los datos. Un arreglo sin registros produce un estado vacío y no un error, mientras que los fallos tienen una representación propia con una acción de recuperación.
- **Decisión de accesibilidad que puedo explicar:** La carga comunica `aria-busy` y utiliza una región con `role="status"`; el error usa `role="alert"`; y las acciones de recuperación funcionan mediante enlaces o botones accesibles por teclado.
- **Prueba que ejecuté:** Ejecuté en mi entorno local, mediante Codex, `npm test`, `npm run test -- --run`, `npm run build` y `npm run verify` con Node.js `v20.19.0` y npm `10.8.2`.
- **Resultado real observado:** Los dos comandos de prueba terminaron con código 0 y mostraron `PASS` para `starter.spec.mjs`, `manifest.spec.ts` e `inspection-states.spec.ts`. El build de Next.js 14.2.35 compiló, validó tipos y generó cuatro páginas. `npm run verify` concluyó con `Verificación técnica: pass`. En la revisión visual, las cuatro rutas mostraron estados distintos; a 375 px no hubo desplazamiento horizontal y los enlaces mostraron foco visible al usar Tab.
- **Qué verifica mi prueba:** Confirma la presencia de los cuatro estados, el tratamiento del arreglo vacío, los atributos accesibles, el límite de error y su acción de reintento.
- **Qué no verifica:** No provoca una caída real de un servidor, no prueba sincronización, no demuestra funcionamiento offline y no sustituye una revisión completa con tecnologías asistivas.
- **Limitación o fallo diagnosticado:** Los estados reproducibles se seleccionan mediante parámetros sintéticos porque esta semana todavía no existe una API que produzca transiciones reales de red.
- **Uso declarado de IA:** Utilicé Codex para interpretar la guía, revisar e integrar los cambios en `package.json`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/inspection-list.tsx`, `src/app/loading.tsx`, `src/app/error.tsx` y `tests/inspection-states.spec.ts`, ejecutar las comprobaciones automatizadas y visuales, y redactar esta evidencia. Validé los fragmentos mediante las tres pruebas, el build, `npm run verify` y la inspección de las cuatro rutas; revisaré personalmente el diff y repetiré los comandos antes de la entrega académica.

### Incremento personal — Semana 3

- **Commit de mi contribución:** [`4d0dcd0a23a1926044beabcf8dbbd12afd7eeff0`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/4d0dcd0a23a1926044beabcf8dbbd12afd7eeff0).
- **Contribución concreta:** Implementé el registro de `/sw.js` desde un componente cliente no visual, integré ese componente en el layout, detecté workers instalados o en espera y agregué una función para activar de forma explícita una actualización mediante el mensaje `SKIP_WAITING`. El listener de `controllerchange` evita recargar durante la primera toma de control y limita las actualizaciones posteriores a una sola recarga.
- **Decisión técnica que puedo explicar:** No activo automáticamente un worker en espera porque sustituir los recursos mientras el usuario conserva abierta la versión anterior puede mezclar versiones de la interfaz. `activateWaitingServiceWorker()` requiere una decisión explícita antes de enviar `SKIP_WAITING`.
- **Prueba ejecutada y resultado:** Con Node.js `v20.19.0` y npm `10.8.2` ejecuté `npm test`, `npm run test -- --run` y `npm run build`. Las cinco pruebas acumuladas terminaron en `PASS` en ambas variantes y el build de Next.js 14.2.35 compiló, validó tipos y generó cuatro páginas correctamente.
- **Limitación o fallo diagnosticado:** Todavía falta integrar `public/offline.html`. Como `public/sw.js` utiliza `cache.addAll` para precargarlo, la instalación real del worker falla de forma intencional mientras ese recurso no exista; por ello aún no se afirma que la prueba offline completa haya pasado.
- **Cambio que puedo defender o modificar en vivo:** Puedo modificar el callback que anuncia una actualización, explicar la diferencia entre la instalación inicial y un worker en espera, o cambiar el control que evita recargas repetidas después de `controllerchange`.
- **Uso declarado de IA:** Utilicé Codex para interpretar las instrucciones, implementar y revisar `src/lib/pwa/register-service-worker.ts`, `src/components/service-worker-registration.tsx`, `src/app/layout.tsx`, `tests/service-worker.spec.ts`, `package.json` y `README.md`, ejecutar las comprobaciones reproducibles y redactar esta evidencia. Validé el resultado mediante las cinco pruebas, el argumento adicional del evaluador, la comprobación de tipos y el build; revisaré personalmente el diff y repetiré los comandos antes de la entrega académica.

### Incremento personal — Semana 4

- **SHA del commit de implementación:** `184af6077c19fcd56c8b6cc2387ea47018d4ec82`.
- **Archivos implementados:** `src/lib/data/inspection-detail.ts`, `src/app/inspecciones/[id]/page.tsx`, `src/app/inspecciones/[id]/loading.tsx`, `src/app/inspecciones/[id]/error.tsx`, `src/app/inspecciones/[id]/not-found.tsx`, `src/app/globals.css` y `tests/rendering.spec.ts`.
- **Contribución concreta:** Implementé el detalle dinámico de las inspecciones con renderizado en servidor, una consulta sintética por identificador y límites específicos para carga, error y registro inexistente. El listado CSR existente y el workflow oficial permanecieron sin cambios.
- **Razón para utilizar SSR:** El detalle se resuelve en el servidor a partir de `params.id`, antes de entregar su contenido al navegador. Esto permite centralizar la selección del registro y los estados `notFound()` o error en los límites de la ruta, y evita enviar al cliente lógica de consulta que el detalle no necesita. `dynamic = "force-dynamic"` deja explícito que la ruta no se genera estáticamente.
- **Pruebas ejecutadas y resultado real:** Con Node.js `v20.19.0` y npm `10.8.2` ejecuté `npm test`, `npm run build` y `make verify`. Las siete pruebas acumuladas terminaron en `PASS`; `rendering.spec.ts` mostró `CSR + SSR PASS`. El build compiló, validó tipos y terminó con código 0. `make verify` concluyó con `Verificación técnica: pass`.
- **Confirmación de ruta dinámica:** La tabla del build mostró `ƒ /inspecciones/[id]`, acompañada de la leyenda `Dynamic — server-rendered on demand`.
- **Comprobación manual:** Verifiqué `/inspecciones`, los detalles `inspection-001` e `inspection-002`, `/inspecciones/no-existe` y `/inspecciones/error-demo`. El botón `Volver a intentar` ejecutó un nuevo intento, y header, navegación y footer permanecieron visibles. No aparecieron errores de hidratación. En un viewport de 375 px el detalle se mostró en una sola columna y no presentó desbordamiento horizontal.
- **Limitación del retraso sintético:** La espera fija de 400 ms solo sirve para hacer observable `loading.tsx`; no representa latencia de red, rendimiento de producción ni una consulta real. Los errores visibles en la consola al visitar `error-demo` corresponden al fallo sintético deliberado en modo desarrollo.
- **Cambio que puedo explicar o realizar en vivo:** Puedo modificar `SYNTHETIC_DETAIL_DELAY_MS`, explicar por qué debe mantenerse determinista entre 350 y 500 ms, o cambiar el contenido semántico de la lista descriptiva sin convertir la página SSR en componente cliente.
- **Uso declarado de IA y validación humana:** Utilicé Codex para interpretar la guía, implementar y revisar los archivos, ampliar la prueba acumulativa, ejecutar las validaciones y realizar la comprobación asistida en navegador. Los resultados anteriores proceden de ejecuciones reales y no de resultados supuestos. Antes de la entrega, Javier debe realizar la validación humana final revisando el diff y repitiendo al menos `npm test`, `npm run build` y el recorrido manual para poder explicar personalmente cada decisión.
