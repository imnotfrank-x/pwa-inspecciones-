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

## Integrante: Hernández Camacho Carlos Eduardo — 3515110194

### Carlos

**Contribución concreta:**
Completé el documento `docs/requirements.md`, definiendo el problema y contexto del producto, los usuarios y escenarios ESC-01 y ESC-02, los requisitos funcionales y no funcionales, los datos sintéticos y los criterios de aceptación de la Semana 1. El cambio quedó registrado en el commit [`7ec356120d9a3b4069d881ce2523cbe86e51a331`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/7ec356120d9a3b4069d881ce2523cbe86e51a331).

**Decisión que puedo explicar:**
Decidí diferenciar las funciones disponibles durante la Semana 1 de las capacidades futuras. La conservación local y la sincronización de registros se documentaron como requisitos futuros debido a que la actividad indica que todavía no deben implementarse las funciones offline.

**Comando ejecutado personalmente:**
Ejecuté `npm ci` y posteriormente `npm test` desde la carpeta que contiene `package.json`.

**Resultado real:**
`npm ci` terminó correctamente, instalando 28 paquetes y auditando 29 paquetes. Durante la auditoría se reportaron 2 vulnerabilidades de severidad alta. Después ejecuté `npm test` y obtuve el resultado `starter.spec.mjs: PASS`.

**Qué verifica la prueba:**
La ejecución de `npm test` verifica que las pruebas proporcionadas por el starter se ejecutan correctamente y que la prueba indicada terminó con resultado `PASS`.

**Qué no verifica:**
Esta prueba no demuestra por sí sola que todos los requisitos documentados estén implementados, ni valida la calidad del análisis de requisitos, la accesibilidad, la privacidad o las funcionalidades offline futuras.

**Limitación o riesgo identificado:**
Durante `npm ci` se reportaron 2 vulnerabilidades de severidad alta en las dependencias instaladas. No ejecuté `npm audit fix --force` porque podría introducir cambios incompatibles en las dependencias del proyecto.

**Uso de IA:**
Utilicé IA como apoyo para estructurar y redactar el documento de requisitos. La ejecución de los comandos y el resultado reportado de `npm test` fueron realizados personalmente y corresponden al resultado observado en mi entorno.


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
