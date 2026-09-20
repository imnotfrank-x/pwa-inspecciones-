# Evidencia individual — Equipo 10A-E05

* Grupo y equipo: 10A-E05
* Repositorio del equipo: https://github.com/imnotfrank-x/pwa-inspecciones-

---

## Integrante: Gil Ginez Francisco Xavier — 3523110137

### Incremento personal — Semana 1

* **Contribución concreta y evidencia:** Preparé el repositorio privado y la rama de documentación del equipo; comprobé la instalación, el arranque y la verificación técnica del starter; y documenté en `README.md` las versiones utilizadas, los resultados obtenidos y las limitaciones observadas. Evidencia: commit `1263d66d72a67a89c33704ae213af8ce4e65c87f`.

* **Decisión que puedo explicar y por qué:** Puedo explicar por qué el equipo usa `npm ci` y conserva `package-lock.json`: permite instalar las dependencias resueltas del starter de forma reproducible y detectar inconsistencias con `package.json`. También puedo explicar por qué el servidor de desarrollo debe detenerse antes del build, ya que en Windows puede mantener bloqueado `.next/trace`.

* **Comando o prueba proporcionada que ejecuté:** Ejecuté `npm ci`, `npm run dev` y `npm run verify` desde la carpeta que contiene `package.json`.

* **Resultado real que observé:** `npm ci` terminó correctamente e instaló 28 paquetes. `npm run dev` inició Next.js 14.2.35, compiló la ruta principal y respondió `GET / 200`. En el primer intento de `npm run verify`, `starter.spec.mjs` terminó en `PASS`, pero el build falló con `EPERM` porque el servidor seguía usando `.next/trace`. Después de detener el servidor, repetí el comando: la prueba terminó en `PASS`, el build compiló correctamente y la verificación técnica terminó en `pass`.

* **Qué verifica esa prueba y qué no verifica:** `npm run verify` comprueba la estructura requerida, ejecuta `starter.spec.mjs`, realiza el build de producción y genera `reports/verification.json`. No evalúa automáticamente la calidad de los requisitos o de la decisión arquitectónica, no certifica ausencia de secretos y no demuestra funcionamiento offline.

* **Limitación, dificultad o riesgo que identifiqué:** El build puede fallar en Windows si el servidor de desarrollo conserva bloqueado `.next/trace`. Además, `npm ci` informó dos vulnerabilidades de severidad alta en dependencias; no se aplicaron actualizaciones forzadas porque podrían modificar el starter y requieren una evaluación separada.

* **Uso de IA:** Utilicé Codex para analizar las instrucciones, organizar la distribución del trabajo y revisar la interpretación de los resultados técnicos. Verifiqué personalmente las versiones, ejecuté los comandos, comprobé sus resultados y confirmé que las afirmaciones correspondieran con la salida real.

### Incremento personal — Semana 2

* **Commit de mi contribución:** `f439887c70a46c49c00672d11fcbad36445cc467`.

* **Contribución concreta:** Implementé `public/manifest.webmanifest`, incorporé iconos PNG reales de 192 y 512 píxeles, conservé sus fuentes SVG editables, enlacé el manifest desde `src/app/layout.tsx`, declaré la versión de Node utilizada y agregué `tests/manifest.spec.ts` al comando obligatorio `npm test`.

* **Decisión técnica que puedo explicar:** La prueba del manifest utiliza `node:assert/strict` y módulos integrados de Node.js. El archivo conserva la extensión `.ts` solicitada, pero usa sintaxis JavaScript compatible con CommonJS para poder ejecutarse directamente con Node.js 20.19.0, sin introducir un framework adicional para comprobar JSON y archivos estáticos.

* **Decisión de instalación que puedo explicar:** Elegí `display: "standalone"`, `start_url: "/"` y `scope: "/"` porque el incremento prepara un shell instalable de una sola aplicación. El icono de 512 píxeles declara `maskable` y mantiene una zona segura para soportar recortes de distintas plataformas.

* **Prueba ejecutada y resultado reproducible:** En el entorno local con Node.js `v20.19.0` y npm `10.8.2` se ejecutaron `npm ci --ignore-scripts --no-audit --no-fund`, `npm test`, `npm run test -- --run`, `npm run build` y `npm run verify`. La instalación agregó 28 paquetes; `starter.spec.mjs` y `manifest.spec.ts` terminaron en `PASS`; el build de Next.js 14.2.35 compiló, validó tipos y generó cuatro páginas estáticas; y la verificación terminó con estado técnico `pass`.

* **Qué verifica mi prueba:** Comprueba que el manifest sea JSON válido, que contenga los campos críticos de instalación, que enlace el manifest desde el layout, que declare iconos PNG locales de 192 y 512 píxeles, que esos archivos existan y que sus dimensiones reales coincidan.

* **Qué no verifica:** La prueba no demuestra funcionamiento offline, instalación en todos los navegadores, sincronización, persistencia local ni compatibilidad completa entre Android e iOS.

* **Limitación o fallo diagnosticado:** El manifest y los iconos describen la experiencia instalable, pero no proporcionan caché offline. Esa capacidad requerirá un Service Worker en un incremento posterior.

* **Uso declarado de IA:** Utilicé Codex para analizar el contrato, revisar la compatibilidad con Node.js 20.19.0, completar la implementación, generar los PNG a partir del diseño SVG y ejecutar una verificación reproducible. Revisé los cambios y repetí personalmente los comandos antes de documentar los resultados.

### Incremento personal — Semana 3

* **Contribución:** Esta sección no corresponde a Francisco. Su incremento de Semana 3 no forma parte de esta evidencia individual.

---

## Integrante: Hernández Camacho Carlos Eduardo — 3515110194

### Incremento personal — Semana 1

* **Contribución concreta:** Completé el documento `docs/requirements.md`, definiendo el problema y contexto del producto, los usuarios y escenarios ESC-01 y ESC-02, los requisitos funcionales y no funcionales, los datos sintéticos y los criterios de aceptación de la Semana 1. El cambio quedó registrado en el commit `7ec356120d9a3b4069d881ce2523cbe86e51a331`.

* **Decisión que puedo explicar:** Decidí diferenciar las funciones disponibles durante la Semana 1 de las capacidades futuras. La conservación local y la sincronización de registros se documentaron como requisitos futuros debido a que la actividad indica que todavía no deben implementarse las funciones offline.

* **Comando o prueba proporcionada que ejecuté personalmente:** Ejecuté `npm run verify` desde la carpeta que contiene `package.json`.

* **Resultado real que observé:** `npm run verify` terminó correctamente. La prueba proporcionada `starter.spec.mjs` obtuvo `PASS`. Posteriormente se ejecutó el build de producción con Next.js 14.2.35, el cual compiló correctamente, realizó la comprobación de tipos y generó las cuatro páginas estáticas. Finalmente, el proceso mostró `Verificación técnica: pass` y generó `reports/verification.json`.

* **Qué verifica esa prueba:** `npm run verify` comprueba la estructura requerida, ejecuta la prueba proporcionada por el starter, realiza el build de producción y genera `reports/verification.json`. En esta ejecución se comprobó que la prueba terminó en `PASS` y que el proyecto puede compilarse correctamente en el entorno utilizado.

* **Qué no verifica:** Esta ejecución no demuestra por sí sola que todos los requisitos documentados estén implementados, ni valida la calidad del análisis de requisitos, la accesibilidad, la privacidad o las funcionalidades offline futuras. Tampoco constituye una certificación de ausencia de secretos.

* **Limitación o riesgo identificado:** Una limitación de esta verificación es que un resultado técnico `pass` no garantiza que los requisitos futuros, como almacenamiento offline y sincronización, estén implementados. Esas capacidades se documentan para semanas posteriores y requieren validaciones específicas cuando sean desarrolladas.

* **Uso de IA:** Utilicé IA como apoyo para estructurar y redactar el documento de requisitos y para revisar la interpretación de las instrucciones de la actividad. La ejecución de `npm run verify`, así como la comprobación del resultado mostrado en la terminal, fueron realizadas personalmente y corresponden al resultado observado en mi entorno.

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

* **Contribución concreta:** Implementé la parte de comportamiento offline del incremento. Incorporé `public/offline.html` como página de respaldo para cuando no exista conexión, creé `tests/offline.spec.ts` para comprobar de forma reproducible el contrato offline, documenté la estrategia de caché en `docs/cache-strategy.md` y agregué la prueba offline al comando `npm test`.

* **Decisión técnica que puedo explicar:** Definí una estrategia diferenciada según el tipo de recurso. Las navegaciones utilizan **Network First**, intentando primero obtener contenido actualizado de la red y recurriendo al caché cuando no hay conexión. Los recursos estáticos conocidos utilizan **Cache First**, priorizando la disponibilidad local. Para una navegación sin conexión se contempla la recuperación mediante la URL solicitada, la página principal `/` y finalmente `/offline.html`.

* **Decisión de seguridad que puedo explicar:** El Service Worker no debe almacenar indiscriminadamente información potencialmente sensible. Por ello, la estrategia documentada excluye solicitudes a `/api/`, solicitudes de otros orígenes, solicitudes con encabezado `Authorization` y consultas que contienen parámetros sensibles como `api_key`, `token`, `password` y `secret`.

* **Contribución de prueba:** `tests/offline.spec.ts` ejecuta el Service Worker en un contexto simulado y comprueba el fallback, la estrategia `Network First`, la recuperación desde caché, el uso de `/offline.html`, la estrategia `Cache First` y la exclusión de solicitudes sensibles o no compatibles.

* **Prueba ejecutada personalmente:** Ejecuté `node tests/offline.spec.ts` y posteriormente `bash public-tests/check.sh`. También verifiqué que `npm test` incluyera la prueba offline.

* **Resultado real observado:** `node tests/offline.spec.ts` terminó con `offline.spec.ts: PASS`. La comprobación pública `bash public-tests/check.sh` terminó correctamente y mostró `PUBLIC_OK`. Las pruebas acumuladas del proyecto también terminaron correctamente y el build de producción compiló sin errores.

* **Qué verifica mi prueba:** Comprueba que `public/offline.html` exista y tenga el contenido básico esperado, que no dependa de recursos externos, que el Service Worker utilice `/offline.html`, que las navegaciones puedan recuperarse desde caché cuando no existe conexión, que exista un fallback final y que los recursos estáticos utilicen Cache First. También comprueba que no se intercepten solicitudes `POST`, rutas `/api/`, otros orígenes ni solicitudes con credenciales o parámetros sensibles.

* **Qué no verifica:** La prueba no sustituye una prueba manual completa en un navegador real con DevTools y Network Offline. Tampoco demuestra sincronización de datos, persistencia mediante IndexedDB ni funcionamiento de un backend real, porque esas capacidades no forman parte de esta contribución.

* **Limitación o dificultad identificada:** Al ejecutar `bash public-tests/check.sh` en Windows, Bash inicialmente reportó errores relacionados con los finales de línea CRLF del archivo `check.sh`. Se corrigió el formato del archivo a LF y posteriormente el script terminó correctamente con `PUBLIC_OK`.

* **Documentación incorporada:** Actualicé `README.md`, `docs/cache-strategy.md` y `public-tests/README.md` para registrar el comportamiento offline, la estrategia de caché y los artefactos acumulativos de la Semana 3.

* **Uso declarado de IA:** Utilicé IA como apoyo para interpretar la guía de la Semana 3, estructurar las pruebas y revisar los cambios. La creación de los archivos, la ejecución de las pruebas y la comprobación de los resultados se realizaron en mi entorno local, y puedo explicar las decisiones técnicas registradas en esta evidencia.

---

## Integrante: Hernandez Mendez Javier — 3523110052

### Incremento personal — Semana 1

* **Contribución concreta y evidencia:** Completé íntegramente el documento `docs/decision-record.md` (ADR-001) para fundamentar la decisión arquitectónica del producto: registré el estado de la decisión, el contexto operativo y restricciones del proyecto, desarrollé la matriz comparativa de alternativas, justifiqué la adopción de Next.js como PWA, analicé consecuencias y riesgos y definí el protocolo para la validación técnica futura. El cambio quedó registrado en el commit `a85c897cdad8e74cb510709d516428b383117bde`.

* **Decisión que puedo explicar y por qué:** Puedo explicar por qué el equipo eligió la estrategia de Progressive Web App (PWA) manteniendo Next.js 14 en lugar de una aplicación nativa o web tradicional: la PWA permite una distribución vía web, reutiliza la base de código existente para escritorio y móvil y proporciona soporte técnico para implementar progresivamente almacenamiento local y Service Workers requeridos por el escenario de conectividad intermitente.

* **Comando ejecutado personalmente:** Con el servidor de desarrollo detenido, ejecuté personalmente `npm ci` y `npm run verify` desde la carpeta que contiene `package.json`.

* **Resultado real que observé:** `npm ci` terminó correctamente con código 0, instalando 28 paquetes. Reportó 2 vulnerabilidades de severidad alta en dependencias provistas por el starter. `npm run verify` ejecutó `tests/starter.spec.mjs` con resultado `PASS`, compiló exitosamente el build de producción con Next.js 14.2.35 y concluyó con `Verificación técnica: pass`. El reporte se generó en `reports/verification.json`.

* **Qué verifica esa prueba y qué no verifica:** Comprueba la presencia de la estructura y archivos obligatorios del repositorio, ejecuta la prueba automatizada `starter.spec.mjs`, compila el build de producción para validar tipados y dependencias y genera `reports/verification.json`. Un estado `pass` no evalúa por sí solo el contenido o calidad del análisis arquitectónico, no certifica ausencia de secretos y no demuestra funcionamiento offline.

* **Limitación, dificultad o riesgo que identifiqué:** La persistencia offline y la sincronización no ocurren automáticamente por usar Next.js o PWA; demandan diseñar explícitamente almacenamiento local, colas de mutaciones y estrategias de resolución de conflictos cuando corresponda. También se identificaron diferencias entre navegadores y las dos vulnerabilidades de severidad alta reportadas por las dependencias del starter.

* **Uso de IA:** Utilicé IA como asistente de redacción y estructuración analítica para contrastar las alternativas arquitectónicas del ADR y redactar los riesgos y validaciones. Ejecuté personalmente los comandos técnicos, verifiqué los resultados reales y registré las evidencias observadas.

### Incremento personal — Semana 2

* **Commit de mi contribución:** `d4bea1fe28df84a8ec93b102cd18cfa3b4817351`.

* **Contribución concreta:** Implementé el componente de inspecciones con estados `ready`, `loading`, `error` y `empty`; agregué los límites `loading.tsx` y `error.tsx`; preparé URLs deterministas para reproducir cada estado; y escribí `tests/inspection-states.spec.ts`.

* **Decisión técnica que puedo explicar:** Separé el estado de la vista de los datos. Un arreglo sin registros produce un estado vacío y no un error, mientras que los fallos tienen una representación propia con una acción de recuperación.

* **Decisión de accesibilidad que puedo explicar:** La carga comunica `aria-busy` y utiliza una región con `role="status"`; el error usa `role="alert"`; y las acciones de recuperación funcionan mediante enlaces o botones accesibles por teclado.

* **Prueba que ejecuté:** Ejecuté en mi entorno local `npm test`, `npm run test -- --run`, `npm run build` y `npm run verify`.

* **Resultado real observado:** Los comandos de prueba terminaron correctamente y mostraron `PASS` para `starter.spec.mjs`, `manifest.spec.ts` e `inspection-states.spec.ts`. El build de Next.js 14.2.35 compiló, validó tipos y generó cuatro páginas. `npm run verify` concluyó con `Verificación técnica: pass`. En la revisión visual, las cuatro rutas mostraron estados distintos; a 375 px no hubo desplazamiento horizontal y los enlaces mostraron foco visible al usar Tab.

* **Qué verifica mi prueba:** Confirma la presencia de los cuatro estados, el tratamiento del arreglo vacío, los atributos accesibles, el límite de error y su acción de reintento.

* **Qué no verifica:** No provoca una caída real de un servidor, no prueba sincronización, no demuestra funcionamiento offline y no sustituye una revisión completa con tecnologías asistivas.

* **Limitación o fallo diagnosticado:** Los estados reproducibles se seleccionan mediante parámetros sintéticos porque en ese momento todavía no existía una API que produjera transiciones reales de red.

* **Uso declarado de IA:** Utilicé Codex para interpretar la guía, revisar e integrar los cambios, ejecutar las comprobaciones automatizadas y visuales y redactar esta evidencia. Validé los fragmentos mediante las pruebas, el build, `npm run verify` y la inspección de las rutas.

### Incremento personal — Semana 3

* **Commit de mi contribución:** `4d0dcd0a23a1926044beabcf8dbbd12afd7eeff0`.

* **Contribución concreta:** Implementé el registro de `/sw.js` desde un componente cliente no visual, integré ese componente en el layout, detecté workers instalados o en espera y agregué una función para activar de forma explícita una actualización mediante el mensaje `SKIP_WAITING`. El listener de `controllerchange` evita recargas durante la primera toma de control y limita las actualizaciones posteriores a una sola recarga.

* **Decisión técnica que puedo explicar:** No activo automáticamente un worker en espera porque sustituir los recursos mientras el usuario conserva abierta la versión anterior puede mezclar versiones de la interfaz. `activateWaitingServiceWorker()` requiere una decisión explícita antes de enviar `SKIP_WAITING`.

* **Prueba ejecutada y resultado:** Con Node.js `v20.19.0` y npm `10.8.2` ejecuté `npm test`, `npm run test -- --run` y `npm run build`. Las pruebas acumuladas terminaron en `PASS` y el build de Next.js 14.2.35 compiló y validó tipos correctamente.

* **Limitación o fallo diagnosticado:** La integración del Service Worker depende de que existan los recursos que este precarga, incluido `/offline.html`. Por ello, la validación completa del comportamiento offline requiere que las contribuciones de caché, fallback y registro estén integradas.

* **Cambio que puedo defender o modificar en vivo:** Puedo modificar el callback que anuncia una actualización, explicar la diferencia entre la instalación inicial y un worker en espera, o cambiar el control que evita recargas repetidas después de `controllerchange`.

* **Uso declarado de IA:** Utilicé Codex para interpretar las instrucciones, implementar y revisar `src/lib/pwa/register-service-worker.ts`, `src/components/service-worker-registration.tsx`, `src/app/layout.tsx`, `tests/service-worker.spec.ts`, `package.json` y `README.md`, ejecutar las comprobaciones reproducibles y redactar esta evidencia. Validé el resultado mediante las pruebas, la comprobación de tipos y el build; revisaré personalmente el diff y repetiré los comandos antes de la entrega académica.
