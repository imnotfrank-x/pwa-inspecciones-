# Evidencia individual — Equipo 9A-E05

- Grupo y equipo: 9A-E05
- Repositorio del equipo: <https://github.com/imnotfrank-x/pwa-inspecciones->

## Integrante: Gil Ginez Francisco Xavier — 3523110137

- **Mi contribución concreta y enlace a archivo, commit anterior o revisión:** Preparé el repositorio privado y la rama de documentación del equipo; comprobé la instalación, el arranque y la verificación técnica del starter; y documenté en `README.md` las versiones utilizadas, los resultados obtenidos y las limitaciones observadas. Evidencia: [commit 1263d66](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/1263d66d72a67a89c33704ae213af8ce4e65c87f).
- **Decisión que puedo explicar y por qué:** Puedo explicar por qué el equipo usa `npm ci` y conserva `package-lock.json`: permite instalar las dependencias resueltas del starter de forma reproducible y detectar inconsistencias con `package.json`. También puedo explicar por qué el servidor de desarrollo debe detenerse antes del build, ya que en Windows puede mantener bloqueado `.next/trace`.
- **Comando o prueba proporcionada que ejecuté:** Ejecuté `npm ci`, `npm run dev` y `npm run verify` desde la carpeta que contiene `package.json`.
- **Resultado real que observé:** `npm ci` terminó correctamente e instaló 28 paquetes. `npm run dev` inició Next.js 14.2.35, compiló la ruta principal y respondió `GET / 200`. En el primer intento de `npm run verify`, `starter.spec.mjs` terminó en `PASS`, pero el build falló con `EPERM` porque el servidor seguía usando `.next/trace`. Después de detener el servidor, repetí el comando: la prueba terminó en `PASS`, el build compiló correctamente y la verificación técnica terminó en `pass`.
- **Qué verifica esa prueba y qué no verifica:** `npm run verify` comprueba la estructura requerida, ejecuta `starter.spec.mjs`, realiza el build de producción y genera `reports/verification.json`. No evalúa automáticamente la calidad de los requisitos o de la decisión arquitectónica, no certifica ausencia de secretos y no demuestra funcionamiento offline.
- **Limitación, dificultad o riesgo que identifiqué:** El build puede fallar en Windows si el servidor de desarrollo conserva bloqueado `.next/trace`. Además, `npm ci` informó dos vulnerabilidades de severidad alta en dependencias; no se aplicaron actualizaciones forzadas porque podrían modificar el starter y requieren una evaluación separada.
- **Uso de IA:** Utilicé Codex para analizar las instrucciones, organizar la distribución del trabajo y revisar la interpretación de los resultados técnicos. Verifiqué personalmente las versiones, ejecuté los comandos, comprobé sus resultados y confirmé que las afirmaciones correspondieran con la salida real.

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

Pendiente de completar personalmente por el integrante.
