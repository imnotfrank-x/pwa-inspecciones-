# PWA de inspecciones de laboratorio — proyecto del equipo

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
