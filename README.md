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
