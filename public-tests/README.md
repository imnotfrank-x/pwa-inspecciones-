# Public Tests

Este directorio contiene comprobaciones públicas de estructura para la entrega acumulativa del proyecto.

## Objetivo

El script `check.sh` ejecuta la comprobación estructural acumulativa y verifica que permanezcan disponibles los archivos requeridos de las semanas anteriores y los artefactos incorporados durante la Semana 3.

La comprobación no sustituye `npm test`, el build ni la revisión documental. Tampoco certifica automáticamente la ausencia de secretos.

## Ejecución

Desde la raíz del repositorio:

    bash public-tests/check.sh

Si la estructura es correcta, el script termina con:

    PUBLIC_OK

## Estructura acumulativa

La comprobación conserva los artefactos principales del proyecto:

- `package.json`
- `package-lock.json`
- `README.md`
- `START_HERE.md`
- `ACTIVIDAD-01.md`
- `docs/requirements.md`
- `docs/decision-record.md`
- `evidence/individual.md`
- `public/manifest.webmanifest`

También verifica los artefactos de la Semana 3 relacionados con Service Worker y funcionamiento offline:

- `public/sw.js`
- `public/offline.html`
- `src/lib/pwa/register-service-worker.ts`
- `tests/service-worker.spec.ts`
- `tests/offline.spec.ts`
- `docs/cache-strategy.md`

## Semana 3

La Semana 3 incorpora consulta offline y una estrategia de caché basada en el Service Worker existente.

`public/offline.html` proporciona el fallback visual cuando una navegación no puede resolverse mediante la red ni mediante respuestas almacenadas.

`tests/offline.spec.ts` permite reproducir y verificar el comportamiento offline sin depender de servicios externos. Comprueba las estrategias `Network First` y `Cache First`, la recuperación desde caché, el fallback hacia `/offline.html` y la exclusión de solicitudes que no deben interceptarse.

`docs/cache-strategy.md` documenta las decisiones de caché, los recursos precacheados, las navegaciones, los recursos estáticos y las solicitudes excluidas.

El script público comprueba la presencia de estos artefactos para evitar que una entrega acumulativa pierda archivos necesarios de semanas anteriores.
