# Evidencia individual â€” Equipo 10A-E05

- Grupo y equipo: 10A-E05
- Repositorio del equipo: <https://github.com/imnotfrank-x/pwa-inspecciones->

## Integrante: Gil Ginez Francisco Xavier â€” 3523110137

- **Mi contribuciÃ³n concreta y enlace a archivo, commit anterior o revisiÃ³n:** PreparÃ© el repositorio privado y la rama de documentaciÃ³n del equipo; comprobÃ© la instalaciÃ³n, el arranque y la verificaciÃ³n tÃ©cnica del starter; y documentÃ© en `README.md` las versiones utilizadas, los resultados obtenidos y las limitaciones observadas. Evidencia: [commit 1263d66d72a67a89c33704ae213af8ce4e65c87f](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/1263d66d72a67a89c33704ae213af8ce4e65c87f).
- **DecisiÃ³n que puedo explicar y por quÃ©:** Puedo explicar por quÃ© el equipo usa `npm ci` y conserva `package-lock.json`: permite instalar las dependencias resueltas del starter de forma reproducible y detectar inconsistencias con `package.json`. TambiÃ©n puedo explicar por quÃ© el servidor de desarrollo debe detenerse antes del build, ya que en Windows puede mantener bloqueado `.next/trace`.
- **Comando o prueba proporcionada que ejecutÃ©:** EjecutÃ© `npm ci`, `npm run dev` y `npm run verify` desde la carpeta que contiene `package.json`.
- **Resultado real que observÃ©:** `npm ci` terminÃ³ correctamente e instalÃ³ 28 paquetes. `npm run dev` iniciÃ³ Next.js 14.2.35, compilÃ³ la ruta principal y respondiÃ³ `GET / 200`. En el primer intento de `npm run verify`, `starter.spec.mjs` terminÃ³ en `PASS`, pero el build fallÃ³ con `EPERM` porque el servidor seguÃ­a usando `.next/trace`. DespuÃ©s de detener el servidor, repetÃ­ el comando: la prueba terminÃ³ en `PASS`, el build compilÃ³ correctamente y la verificaciÃ³n tÃ©cnica terminÃ³ en `pass`.
- **QuÃ© verifica esa prueba y quÃ© no verifica:** `npm run verify` comprueba la estructura requerida, ejecuta `starter.spec.mjs`, realiza el build de producciÃ³n y genera `reports/verification.json`. No evalÃºa automÃ¡ticamente la calidad de los requisitos o de la decisiÃ³n arquitectÃ³nica, no certifica ausencia de secretos y no demuestra funcionamiento offline.
- **LimitaciÃ³n, dificultad o riesgo que identifiquÃ©:** El build puede fallar en Windows si el servidor de desarrollo conserva bloqueado `.next/trace`. AdemÃ¡s, `npm ci` informÃ³ dos vulnerabilidades de severidad alta en dependencias; no se aplicaron actualizaciones forzadas porque podrÃ­an modificar el starter y requieren una evaluaciÃ³n separada.
- **Uso de IA:** UtilicÃ© Codex para analizar las instrucciones, organizar la distribuciÃ³n del trabajo y revisar la interpretaciÃ³n de los resultados tÃ©cnicos. VerifiquÃ© personalmente las versiones, ejecutÃ© los comandos, comprobÃ© sus resultados y confirmÃ© que las afirmaciones correspondieran con la salida real.

### Incremento personal â€” Semana 2

- **Commit de mi contribuciÃ³n:** [`f439887c70a46c49c00672d11fcbad36445cc467`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/f439887c70a46c49c00672d11fcbad36445cc467).
- **ContribuciÃ³n concreta:** ImplementÃ© `public/manifest.webmanifest`, incorporÃ© iconos PNG reales de 192 y 512 pÃ­xeles, conservÃ© sus fuentes SVG editables, enlacÃ© el manifest desde `src/app/layout.tsx`, declarÃ© la versiÃ³n de Node utilizada y agreguÃ© `tests/manifest.spec.ts` al comando obligatorio `npm test`.
- **DecisiÃ³n tÃ©cnica que puedo explicar:** La prueba del manifest utiliza `node:assert/strict` y mÃ³dulos integrados de Node.js. El archivo conserva la extensiÃ³n `.ts` solicitada, pero usa sintaxis JavaScript compatible con CommonJS para poder ejecutarse directamente con Node.js 20.19.0, sin introducir un framework adicional para comprobar JSON y archivos estÃ¡ticos.
- **DecisiÃ³n de instalaciÃ³n que puedo explicar:** ElegÃ­ `display: "standalone"`, `start_url: "/"` y `scope: "/"` porque el incremento prepara un shell instalable de una sola aplicaciÃ³n. El icono de 512 pÃ­xeles declara `maskable` y mantiene una zona segura para soportar recortes de distintas plataformas.
- **Prueba ejecutada y resultado reproducible:** En el entorno local con Node.js `v20.19.0` y npm `10.8.2` se ejecutaron `npm ci --ignore-scripts --no-audit --no-fund`, `npm test`, `npm run test -- --run`, `npm run build` y `npm run verify`. La instalaciÃ³n agregÃ³ 28 paquetes; `starter.spec.mjs` y `manifest.spec.ts` terminaron en `PASS`; el build de Next.js 14.2.35 compilÃ³, validÃ³ tipos y generÃ³ cuatro pÃ¡ginas estÃ¡ticas; y la verificaciÃ³n terminÃ³ con estado tÃ©cnico `pass`.
- **QuÃ© verifica mi prueba:** Comprueba que el manifest sea JSON vÃ¡lido, que contenga los campos crÃ­ticos de instalaciÃ³n, que enlace el manifest desde el layout, que declare iconos PNG locales de 192 y 512 pÃ­xeles, que esos archivos existan y que sus dimensiones reales coincidan.
- **QuÃ© no verifica:** La prueba no demuestra funcionamiento offline, instalaciÃ³n en todos los navegadores, sincronizaciÃ³n, persistencia local ni compatibilidad completa entre Android e iOS.
- **LimitaciÃ³n o fallo diagnosticado:** El manifest y los iconos describen la experiencia instalable, pero no proporcionan cachÃ© offline. Esa capacidad requerirÃ¡ un Service Worker en un incremento posterior. Una ejecuciÃ³n preliminar con el runtime interno de Codex mostrÃ³ advertencias de cachÃ© de webpack; la repeticiÃ³n con Node.js 20.19.0 terminÃ³ correctamente y sin esas advertencias.
- **Uso declarado de IA:** UtilicÃ© Codex para analizar el contrato, revisar la compatibilidad con Node.js 20.19.0, completar la implementaciÃ³n, generar los PNG a partir del diseÃ±o SVG y ejecutar una verificaciÃ³n reproducible. RevisarÃ© los cambios y repetirÃ© personalmente los comandos antes de entregar para confirmar que puedo explicar y modificar cada decisiÃ³n.

### Incremento personal â€” Semana 3

- **Commit de mi contribuciÃ³n:** [`1cb006149bb67b8d8b131dfd3feb8b92d5d92f7c`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/1cb006149bb67b8d8b131dfd3feb8b92d5d92f7c).
- **ContribuciÃ³n concreta:** ImplementÃ© `public/sw.js` con cachÃ©s de precache y runtime versionadas, precache de los recursos indispensables, limpieza selectiva de versiones anteriores, estrategia Network First para navegaciones, Cache First para recursos estÃ¡ticos conocidos y recuperaciÃ³n mediante la pÃ¡gina principal o el fallback offline. ExcluÃ­ mÃ©todos distintos de GET, otros orÃ­genes, rutas de API, solicitudes con autorizaciÃ³n y parÃ¡metros sensibles. TambiÃ©n incorporÃ© la activaciÃ³n explÃ­cita de una actualizaciÃ³n mediante el mensaje `SKIP_WAITING`.
- **DecisiÃ³n tÃ©cnica que puedo explicar:** El evento `install` no captura ni oculta un fallo de `cache.addAll`. Si un recurso indispensable no puede almacenarse, la instalaciÃ³n de la versiÃ³n nueva falla y el worker anterior permanece disponible. La limpieza ocurre despuÃ©s, durante `activate`, y elimina Ãºnicamente cachÃ©s antiguas con el prefijo `labinspect-`, por lo que no borra almacenamiento perteneciente a otra aplicaciÃ³n.
- **Prueba ejecutada y resultado:** Se ejecutaron `node --check public/sw.js`, una comprobaciÃ³n temporal con `node:vm`, `npm test` y `npm run build` usando Node.js `v20.19.0` y npm `10.8.2`. La comprobaciÃ³n temporal confirmÃ³ el registro de `install`, `activate`, `fetch` y `message`, el rechazo de un precache fallido, la limpieza selectiva y la activaciÃ³n exclusiva mediante `SKIP_WAITING`. Las cuatro pruebas acumuladas terminaron en `PASS` y el build de Next.js 14.2.35 compilÃ³ y validÃ³ tipos correctamente.
- **LimitaciÃ³n o fallo diagnosticado:** Esta contribuciÃ³n define el contrato con `/offline.html`, pero el recurso serÃ¡ incorporado por la parte de fallback del equipo. El Service Worker tampoco quedarÃ¡ registrado desde React hasta integrar `src/lib/pwa/register-service-worker.ts`. Por ello, la prueba manual completa con DevTools y Network Offline debe realizarse despuÃ©s de integrar las tres contribuciones.
- **Cambio que puedo defender o modificar en vivo:** Puedo incrementar `CACHE_VERSION`, explicar por quÃ© las cachÃ©s activas se conservan y las anteriores se eliminan, y cambiar una ruta entre Network First y Cache First justificando el efecto sobre disponibilidad y vigencia de los datos.
- **Uso declarado de IA:** UtilicÃ© Codex para interpretar el contrato de la actividad, proponer la estrategia, implementar y revisar `public/sw.js` y ejecutar las comprobaciones indicadas. La validaciÃ³n fue reproducible con Node.js 20.19.0; revisarÃ© personalmente el diff, repetirÃ© los comandos y comprobarÃ© el comportamiento en DevTools antes de la entrega final.

## Integrante: HernÃ¡ndez Camacho Carlos Eduardo â€” 3515110194

### Carlos

**ContribuciÃ³n concreta:**

CompletÃ© el documento `docs/requirements.md`, definiendo el problema y contexto del producto, los usuarios y escenarios ESC-01 y ESC-02, los requisitos funcionales y no funcionales, los datos sintÃ©ticos y los criterios de aceptaciÃ³n de la Semana 1. El cambio quedÃ³ registrado en el commit `7ec356120d9a3b4069d881ce2523cbe86e51a331`.

**DecisiÃ³n que puedo explicar:**

DecidÃ­ diferenciar las funciones disponibles durante la Semana 1 de las capacidades futuras. La conservaciÃ³n local y la sincronizaciÃ³n de registros se documentaron como requisitos futuros debido a que la actividad indica que todavÃ­a no deben implementarse las funciones offline.

**Comando o prueba proporcionada que ejecutÃ© personalmente:**

EjecutÃ© `npm run verify` desde la carpeta que contiene `package.json`.

**Resultado real que observÃ©:**

`npm run verify` terminÃ³ correctamente. La prueba proporcionada `starter.spec.mjs` obtuvo `PASS`. Posteriormente se ejecutÃ³ el build de producciÃ³n con Next.js 14.2.35, el cual compilÃ³ correctamente, realizÃ³ la comprobaciÃ³n de tipos y generÃ³ las cuatro pÃ¡ginas estÃ¡ticas. Finalmente, el proceso mostrÃ³ `VerificaciÃ³n tÃ©cnica: pass` y generÃ³ `reports/verification.json`.

**QuÃ© verifica esa prueba:**

`npm run verify` comprueba la estructura requerida, ejecuta la prueba proporcionada por el starter, realiza el build de producciÃ³n y genera `reports/verification.json`. En esta ejecuciÃ³n se comprobÃ³ que la prueba terminÃ³ en `PASS` y que el proyecto puede compilarse correctamente en el entorno utilizado.

**QuÃ© no verifica:**

Esta ejecuciÃ³n no demuestra por sÃ­ sola que todos los requisitos documentados estÃ©n implementados, ni valida la calidad del anÃ¡lisis de requisitos, la accesibilidad, la privacidad o las funcionalidades offline futuras. Tampoco constituye una certificaciÃ³n de ausencia de secretos.

**LimitaciÃ³n o riesgo identificado:**

Una limitaciÃ³n de esta verificaciÃ³n es que un resultado tÃ©cnico `pass` no garantiza que los requisitos futuros, como almacenamiento offline y sincronizaciÃ³n, estÃ©n implementados. Esas capacidades se documentan para semanas posteriores y requieren validaciones especÃ­ficas cuando sean desarrolladas.

**Uso de IA:**

UtilicÃ© IA como apoyo para estructurar y redactar el documento de requisitos y para revisar la interpretaciÃ³n de las instrucciones de la actividad. La ejecuciÃ³n de `npm run verify`, asÃ­ como la comprobaciÃ³n del resultado mostrado en la terminal, fueron realizadas personalmente y corresponden al resultado observado en mi entorno.
### Incremento personal â€” Semana 2

* **Commit de mi contribuciÃ³n:** `d625c4e0dda1e24911bf7f82ae26734e30ea9e31`.

* **ContribuciÃ³n concreta:** ImplementÃ© `src/components/app-shell.tsx`, integrÃ© el App Shell desde `src/app/layout.tsx`, eliminÃ© los landmarks `main` duplicados de las vistas, incorporÃ© la navegaciÃ³n principal y el enlace para saltar directamente al contenido principal, completÃ© los estilos responsive y agreguÃ© `tests/app-shell.spec.ts`.

* **DecisiÃ³n tÃ©cnica que puedo explicar:** CentralicÃ© la cabecera, la navegaciÃ³n, el contenido principal y el footer en `AppShell`. Las pÃ¡ginas proporcionan su contenido mediante `children`, evitando duplicar la estructura compartida y garantizando que la vista utilice un Ãºnico landmark `main`.

* **DecisiÃ³n de accesibilidad que puedo explicar:** IncorporÃ© una navegaciÃ³n con nombre accesible, estados de foco visibles y un enlace para saltar directamente al contenido principal. El elemento `main` utiliza `tabIndex={-1}` para poder recibir el foco despuÃ©s de activar el enlace de salto.

* **Pruebas ejecutadas personalmente:** EjecutÃ© `npm test`, `npm run test -- --run`, `npm run build` y `npm run verify`.

* **Resultado real observado:** `npm test` terminÃ³ correctamente y mostrÃ³ `PASS` para `starter.spec.mjs`, `manifest.spec.ts`, `inspection-states.spec.ts` y `app-shell.spec.ts`. `npm run test -- --run` tambiÃ©n terminÃ³ correctamente con las cuatro pruebas en `PASS`. `npm run build` compilÃ³ correctamente con Next.js 14.2.35, validÃ³ los tipos y generÃ³ las pÃ¡ginas previstas. `npm run verify` repitiÃ³ las pruebas y el build y concluyÃ³ con `VerificaciÃ³n tÃ©cnica: pass`. TambiÃ©n se generÃ³ `reports/verification.json`.

* **VerificaciÃ³n manual:** La navegaciÃ³n mediante teclado funcionÃ³ correctamente y los enlaces mostraron foco visible. El enlace `Saltar al contenido principal` apareciÃ³ al recibir foco y permitiÃ³ pasar al contenido principal. Los estados de carga, error y vacÃ­o conservaron el header, la navegaciÃ³n y el footer. En la vista de aproximadamente 375 px no se observÃ³ desplazamiento horizontal ni elementos encimados, y las tarjetas se acomodaron en una sola columna.

* **QuÃ© verifica mi prueba:** Comprueba que el App Shell contenga header, navegaciÃ³n, `main` y footer; que la navegaciÃ³n tenga un nombre accesible; que el enlace de salto tenga el destino correcto; que el layout integre `AppShell`; y que las vistas `page.tsx`, `loading.tsx` y `error.tsx` no generen un segundo `main`.

* **QuÃ© no verifica:** No constituye una auditorÃ­a completa con lector de pantalla, no evalÃºa todos los navegadores ni demuestra funcionamiento offline, sincronizaciÃ³n o persistencia local.

* **LimitaciÃ³n o fallo diagnosticado:** La integraciÃ³n exigiÃ³ retirar los landmarks duplicados que existÃ­an en `page.tsx`, `loading.tsx` y `error.tsx`, ya que mantenerlos habrÃ­a producido varios elementos `main` en una misma vista.

* **Uso declarado de IA:** UtilicÃ© Codex como apoyo para interpretar la guÃ­a de la actividad, revisar y estructurar la implementaciÃ³n del App Shell y apoyar la revisiÃ³n de los cambios. ValidÃ© personalmente la implementaciÃ³n mediante las pruebas automatizadas, el build, `npm run verify` y las comprobaciones manuales de navegaciÃ³n, Skip link, estados y vista responsive.

### Incremento personal â€” Semana 3

- **Commit de mi contribuciÃ³n:** `4f94b80`.
- **ContribuciÃ³n concreta:** ImplementÃ© la consulta y el fallback offline de la aplicaciÃ³n. IncorporÃ© `public/offline.html` como pÃ¡gina autÃ³noma de fallback, agreguÃ© `tests/offline.spec.ts` para reproducir el comportamiento del Service Worker, documentÃ© la estrategia en `docs/cache-strategy.md`, integrÃ© la prueba offline al comando `npm test` y actualicÃ© la documentaciÃ³n de la Semana 3.
- **DecisiÃ³n tÃ©cnica que puedo explicar:** ConservÃ© el Service Worker existente y trabajÃ© sobre su contrato ya definido. Las navegaciones utilizan `Network First`: primero se intenta la red y, si falla, se recupera la respuesta almacenada, despuÃ©s `/` y finalmente `/offline.html`. Los recursos estÃ¡ticos utilizan `Cache First` para aprovechar los recursos almacenados sin realizar una peticiÃ³n de red innecesaria.
- **DecisiÃ³n de seguridad que puedo explicar:** Las solicitudes que no deben almacenarse en cachÃ© quedan fuera del control del Service Worker. Se excluyen mÃ©todos distintos de `GET`, rutas `/api/`, otros orÃ­genes, solicitudes con `Authorization` y parÃ¡metros sensibles como `token`, `password`, `secret` y `api_key`.
- **ContribuciÃ³n de prueba:** `tests/offline.spec.ts` ejecuta el Service Worker en un contexto simulado y comprueba el fallback, la estrategia `Network First`, la recuperaciÃ³n desde cachÃ©, el uso de `/offline.html`, la estrategia `Cache First` y la exclusiÃ³n de solicitudes sensibles o no compatibles.
- **Prueba ejecutada personalmente:** EjecutÃ© `node tests/offline.spec.ts` y posteriormente `bash public-tests/check.sh`.
- **Resultado real observado:** `node tests/offline.spec.ts` terminÃ³ con `offline.spec.ts: PASS`. La comprobaciÃ³n pÃºblica `bash public-tests/check.sh` terminÃ³ correctamente y mostrÃ³ `PUBLIC_OK`. TambiÃ©n se actualizÃ³ `npm test` para incluir `tests/offline.spec.ts`.
- **QuÃ© verifica mi prueba:** Comprueba que `public/offline.html` exista y tenga el contenido bÃ¡sico esperado, que no dependa de recursos externos, que el Service Worker utilice `/offline.html`, que las navegaciones puedan recuperarse desde cachÃ© cuando no existe conexiÃ³n, que exista un fallback final y que los recursos estÃ¡ticos utilicen Cache First. TambiÃ©n comprueba que no se intercepten solicitudes `POST`, rutas `/api/`, otros orÃ­genes ni solicitudes con credenciales o parÃ¡metros sensibles.
- **QuÃ© no verifica:** La prueba no sustituye una prueba manual completa en un navegador real con DevTools y Network Offline. Tampoco demuestra sincronizaciÃ³n de datos, persistencia mediante IndexedDB ni funcionamiento de un backend real, porque esas capacidades no forman parte de esta contribuciÃ³n.
- **LimitaciÃ³n o dificultad identificada:** Al ejecutar `bash public-tests/check.sh` en Windows, Bash inicialmente reportÃ³ errores relacionados con los finales de lÃ­nea CRLF del archivo `check.sh`. Se corrigiÃ³ el formato del archivo a LF y posteriormente el script terminÃ³ correctamente con `PUBLIC_OK`.
- **DocumentaciÃ³n incorporada:** ActualicÃ© `README.md`, `docs/cache-strategy.md` y `public-tests/README.md` para registrar el comportamiento offline, la estrategia de cachÃ© y los artefactos acumulativos de la Semana 3.
- **Uso declarado de IA:** UtilicÃ© IA como apoyo para interpretar la guÃ­a de la Semana 3, estructurar las pruebas y revisar los cambios. La creaciÃ³n de los archivos, la ejecuciÃ³n de las pruebas y la comprobaciÃ³n de los resultados se realizaron en mi entorno local, y puedo explicar las decisiones tÃ©cnicas registradas en esta evidencia.

## Integrante: Hernandez Mendez Javier â€” 3523110052

### Javier

**ContribuciÃ³n concreta y enlace:**
CompletÃ© Ã­ntegramente el documento `docs/decision-record.md` (ADR-001) para fundamentar la decisiÃ³n arquitectÃ³nica del producto: registrÃ© el estado de la decisiÃ³n, el contexto operativo y restricciones del proyecto (usuarios inspectores, conectividad intermitente, uso mÃ³vil, datos sintÃ©ticos y alcance de la Semana 1), desarrollÃ© la matriz comparativa de cuatro alternativas (PWA, Web tradicional, App nativa y App multiplataforma) evaluadas bajo siete criterios tÃ©cnicos, justifiquÃ© la adopciÃ³n de Next.js como PWA destacando los beneficios para los inspectores y definiendo el criterio de exclusiÃ³n frente a apps nativas, analicÃ© consecuencias y riesgos (costos de sincronizaciÃ³n, conflictos al reconectar, datos desactualizados y compatibilidad de navegadores con sus respectivas mitigaciones), y definÃ­ el protocolo para la validaciÃ³n tÃ©cnica futura. El cambio quedÃ³ registrado en el commit [`a85c897cdad8e74cb510709d516428b383117bde`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/a85c897cdad8e74cb510709d516428b383117bde).

**DecisiÃ³n que puedo explicar y por quÃ©:**
Puedo explicar por quÃ© el equipo eligiÃ³ la estrategia de Progressive Web App (PWA) manteniendo Next.js 14 en lugar de una aplicaciÃ³n nativa o web tradicional: la PWA permite una distribuciÃ³n inmediata vÃ­a web sin intermediaciÃ³n de tiendas ni costos de cuentas de desarrollador, reutiliza la base de cÃ³digo existente para escritorio y mÃ³vil, y proporciona el soporte tÃ©cnico para implementar progresivamente almacenamiento local (IndexedDB) y Service Workers requeridos por el escenario de conectividad intermitente (ESC-02). Asimismo, puedo explicar que una app nativa Ãºnicamente se justificarÃ­a si se requirieran sensores industriales especializados o procesamiento pesado continuo en segundo plano.

**Comando ejecutado personalmente:**
Con el servidor de desarrollo detenido, ejecutÃ© personalmente `npm ci` y `npm run verify` desde la carpeta que contiene `package.json`.

**Resultado real que observÃ©:**
- `npm ci`: TerminÃ³ correctamente con cÃ³digo 0, instalando 28 paquetes y auditando 29 paquetes en 25 segundos. ReportÃ³ 2 vulnerabilidades de severidad alta en dependencias provistas por el starter (sin forzar modificaciones con `npm audit fix --force`).
- `npm run verify`: EjecutÃ³ `tests/starter.spec.mjs` con resultado `PASS`, compilÃ³ exitosamente el build de producciÃ³n con Next.js 14.2.35 generando las pÃ¡ginas estÃ¡ticas (4/4), y concluyÃ³ con `VerificaciÃ³n tÃ©cnica: pass. RevisiÃ³n acadÃ©mica: pendiente. Reporte: reports/verification.json` (Node.js v22.22.0).

**QuÃ© verifica esa prueba y quÃ© no verifica:**
- *QuÃ© verifica:* Comprueba la presencia de la estructura y archivos obligatorios del repositorio, ejecuta la prueba automatizada `starter.spec.mjs`, compila el build de producciÃ³n para validar tipados y dependencias, y genera el archivo `reports/verification.json`.
- *QuÃ© no verifica:* Un estado `pass` no evalÃºa ni califica el contenido, profundidad o calidad de los requisitos en `requirements.md` ni del ADR en `decision-record.md`; no certifica ausencia de credenciales o secretos; no valida accesibilidad (RNF-02) ni privacidad (RNF-04); y no demuestra funcionamiento offline, manifest ni sincronizaciÃ³n, ya que son capacidades futuras no implementadas en Semana 1.

**LimitaciÃ³n, dificultad o riesgo que identifiquÃ©:**
La persistencia offline y la sincronizaciÃ³n no ocurren automÃ¡ticamente por usar Next.js o PWA; demandan diseÃ±ar explÃ­citamente esquemas en IndexedDB, colas transaccionales de mutaciones y estrategias de resoluciÃ³n de conflictos (LWW o control de versiones) para evitar sobreescrituras al reconectar. AdemÃ¡s, existen diferencias entre navegadores (las restricciones de almacenamiento y ciclo de vida de WebKit/Safari en iOS frente a Chromium en Android). TÃ©cnicamente, se identificaron 2 vulnerabilidades de severidad alta en las dependencias del starter que no deben forzarse con `npm audit fix --force` para no romper la compatibilidad, y se confirmÃ³ que el servidor de desarrollo debe detenerse antes de compilar para evitar bloqueos en `.next/trace` en Windows.

**Uso de IA:**
UtilicÃ© IA (Antigravity IDE con modelo Gemini) como asistente de redacciÃ³n y estructuraciÃ³n analÃ­tica para contrastar las alternativas arquitectÃ³nicas del ADR y redactar de forma rigurosa los riesgos y validaciones. EjecutÃ© personalmente los comandos tÃ©cnicos (`npm ci`, `npm run verify`), verifiquÃ© y registrÃ© los resultados reales observados en mi terminal y en `reports/verification.json`, asegurando que ninguna afirmaciÃ³n asumiera funciones offline ya implementadas.

### Incremento personal â€” Semana 2

- **Commit de mi contribuciÃ³n:** `d4bea1fe28df84a8ec93b102cd18cfa3b4817351`.
- **ContribuciÃ³n concreta:** ImplementÃ© el componente de inspecciones con estados `ready`, `loading`, `error` y `empty`; agreguÃ© los lÃ­mites `loading.tsx` y `error.tsx`; preparÃ© URLs deterministas para reproducir cada estado; y escribÃ­ `tests/inspection-states.spec.ts`.
- **DecisiÃ³n tÃ©cnica que puedo explicar:** SeparÃ© el estado de la vista de los datos. Un arreglo sin registros produce un estado vacÃ­o y no un error, mientras que los fallos tienen una representaciÃ³n propia con una acciÃ³n de recuperaciÃ³n.
- **DecisiÃ³n de accesibilidad que puedo explicar:** La carga comunica `aria-busy` y utiliza una regiÃ³n con `role="status"`; el error usa `role="alert"`; y las acciones de recuperaciÃ³n funcionan mediante enlaces o botones accesibles por teclado.
- **Prueba que ejecutÃ©:** EjecutÃ© en mi entorno local, mediante Codex, `npm test`, `npm run test -- --run`, `npm run build` y `npm run verify` con Node.js `v20.19.0` y npm `10.8.2`.
- **Resultado real observado:** Los dos comandos de prueba terminaron con cÃ³digo 0 y mostraron `PASS` para `starter.spec.mjs`, `manifest.spec.ts` e `inspection-states.spec.ts`. El build de Next.js 14.2.35 compilÃ³, validÃ³ tipos y generÃ³ cuatro pÃ¡ginas. `npm run verify` concluyÃ³ con `VerificaciÃ³n tÃ©cnica: pass`. En la revisiÃ³n visual, las cuatro rutas mostraron estados distintos; a 375 px no hubo desplazamiento horizontal y los enlaces mostraron foco visible al usar Tab.
- **QuÃ© verifica mi prueba:** Confirma la presencia de los cuatro estados, el tratamiento del arreglo vacÃ­o, los atributos accesibles, el lÃ­mite de error y su acciÃ³n de reintento.
- **QuÃ© no verifica:** No provoca una caÃ­da real de un servidor, no prueba sincronizaciÃ³n, no demuestra funcionamiento offline y no sustituye una revisiÃ³n completa con tecnologÃ­as asistivas.
- **LimitaciÃ³n o fallo diagnosticado:** Los estados reproducibles se seleccionan mediante parÃ¡metros sintÃ©ticos porque esta semana todavÃ­a no existe una API que produzca transiciones reales de red.
- **Uso declarado de IA:** UtilicÃ© Codex para interpretar la guÃ­a, revisar e integrar los cambios en `package.json`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/inspection-list.tsx`, `src/app/loading.tsx`, `src/app/error.tsx` y `tests/inspection-states.spec.ts`, ejecutar las comprobaciones automatizadas y visuales, y redactar esta evidencia. ValidÃ© los fragmentos mediante las tres pruebas, el build, `npm run verify` y la inspecciÃ³n de las cuatro rutas; revisarÃ© personalmente el diff y repetirÃ© los comandos antes de la entrega acadÃ©mica.

### Incremento personal â€” Semana 3

- **Commit de mi contribuciÃ³n:** [`4d0dcd0a23a1926044beabcf8dbbd12afd7eeff0`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/4d0dcd0a23a1926044beabcf8dbbd12afd7eeff0).
- **ContribuciÃ³n concreta:** ImplementÃ© el registro de `/sw.js` desde un componente cliente no visual, integrÃ© ese componente en el layout, detectÃ© workers instalados o en espera y agreguÃ© una funciÃ³n para activar de forma explÃ­cita una actualizaciÃ³n mediante el mensaje `SKIP_WAITING`. El listener de `controllerchange` evita recargar durante la primera toma de control y limita las actualizaciones posteriores a una sola recarga.
- **DecisiÃ³n tÃ©cnica que puedo explicar:** No activo automÃ¡ticamente un worker en espera porque sustituir los recursos mientras el usuario conserva abierta la versiÃ³n anterior puede mezclar versiones de la interfaz. `activateWaitingServiceWorker()` requiere una decisiÃ³n explÃ­cita antes de enviar `SKIP_WAITING`.
- **Prueba ejecutada y resultado:** Con Node.js `v20.19.0` y npm `10.8.2` ejecutÃ© `npm test`, `npm run test -- --run` y `npm run build`. Las cinco pruebas acumuladas terminaron en `PASS` en ambas variantes y el build de Next.js 14.2.35 compilÃ³, validÃ³ tipos y generÃ³ cuatro pÃ¡ginas correctamente.
- **LimitaciÃ³n o fallo diagnosticado:** TodavÃ­a falta integrar `public/offline.html`. Como `public/sw.js` utiliza `cache.addAll` para precargarlo, la instalaciÃ³n real del worker falla de forma intencional mientras ese recurso no exista; por ello aÃºn no se afirma que la prueba offline completa haya pasado.
- **Cambio que puedo defender o modificar en vivo:** Puedo modificar el callback que anuncia una actualizaciÃ³n, explicar la diferencia entre la instalaciÃ³n inicial y un worker en espera, o cambiar el control que evita recargas repetidas despuÃ©s de `controllerchange`.
- **Uso declarado de IA:** UtilicÃ© Codex para interpretar las instrucciones, implementar y revisar `src/lib/pwa/register-service-worker.ts`, `src/components/service-worker-registration.tsx`, `src/app/layout.tsx`, `tests/service-worker.spec.ts`, `package.json` y `README.md`, ejecutar las comprobaciones reproducibles y redactar esta evidencia. ValidÃ© el resultado mediante las cinco pruebas, el argumento adicional del evaluador, la comprobaciÃ³n de tipos y el build; revisarÃ© personalmente el diff y repetirÃ© los comandos antes de la entrega acadÃ©mica.

