# Decisión de renderizado CSR/SSR — Semana 4

## 1. Estado

- Fecha: 2026-09-27
- Estado: Aceptada para el incremento de la Semana 4
- Proyecto: PWA de inspecciones y mantenimiento de laboratorios
- Datos: exclusivamente sintéticos

## 2. Contexto

La aplicación necesita mostrar un listado de inspecciones y permitir consultar el detalle de cada registro. La actividad de la Semana 4 requiere implementar y comparar renderizado del lado del cliente y renderizado del lado del servidor, incluyendo estados de carga, contenido, vacío, error y registro inexistente.

El proyecto utiliza Next.js 14 con App Router. La aplicación ya cuenta con App Shell, manifest, Service Worker y funcionamiento offline inicial. Este incremento no agrega persistencia, sincronización ni un backend real.

## 3. Decisión

Se utilizará CSR para el listado `/inspecciones` y SSR dinámico para el detalle `/inspecciones/[id]`.

| Ruta | Estrategia | Razón principal |
|---|---|---|
| `/inspecciones` | CSR | El listado tendrá interacción, filtros, actualización local e integración futura con IndexedDB. |
| `/inspecciones/[id]` | SSR dinámico | Una URL directa debe resolver en el servidor la inspección solicitada y entregar su contenido inicial. |

## 4. Listado CSR

`src/app/inspecciones/page.tsx` declara `"use client"` y comienza con un estado de carga estable. La consulta sintética se inicia dentro de `useEffect`, después de la hidratación.

El listado ofrece las siguientes URLs verificables:

- `/inspecciones`: contenido.
- `/inspecciones?estado=carga`: carga persistente.
- `/inspecciones?estado=error`: error sintético.
- `/inspecciones?estado=vacio`: arreglo sin registros.

El botón de reintento elimina el estado de error de la URL e inicia nuevamente la carga sin recargar toda la aplicación.

Aunque el build identifica `/inspecciones` como ruta estática, lo que se genera estáticamente es el shell inicial. Los registros se incorporan en el navegador después de la hidratación, por lo que el comportamiento del listado es CSR.

## 5. Detalle SSR

`src/app/inspecciones/[id]/page.tsx` permanece como componente de servidor y declara `dynamic = "force-dynamic"`.

La página recibe `params.id`, consulta el arreglo de datos sintéticos y presenta el registro encontrado.

Casos verificables:

- `/inspecciones/inspection-001`: detalle válido.
- `/inspecciones/inspection-002`: detalle válido.
- `/inspecciones/no-existe`: registro inexistente.
- `/inspecciones/error-demo`: error sintético controlado.

`notFound()` diferencia un identificador inexistente de un fallo del servidor. El límite `error.tsx` ofrece una acción de reintento y no muestra mensajes internos, stack traces ni el digest del error.

## 6. Estados de carga y accesibilidad

El componente compartido `LoadingState` utiliza:

- `role="status"`.
- `aria-live="polite"`.
- `aria-busy="true"`.

Los errores utilizan `role="alert"`. Los estados del segmento dinámico no agregan otro elemento `main`, porque `AppShell` ya proporciona el landmark principal.

La navegación, títulos y listas descriptivas conservan estructura semántica y foco visible.

## 7. Prevención de hydration mismatch

El listado CSR utiliza el mismo estado inicial de carga en el HTML generado y en el primer render del navegador. La lectura de parámetros y la carga de datos ocurren después del montaje mediante `useEffect`.

De esta forma, React no intenta hidratar una estructura distinta de la entregada inicialmente por Next.js.

El detalle SSR no usa APIs del navegador ni `"use client"`, por lo que su selección de datos se ejecuta exclusivamente en el servidor.

## 8. Métrica reproducible de carga

La métrica seleccionada es el tamaño reportado por `npm run build`. Esta medida puede repetirse usando el mismo commit, Node.js 20.19.0, npm 10.8.2 y Next.js 14.2.35.

| Ruta | Renderizado | Tamaño propio | First Load JS |
|---|---|---:|---:|
| `/inspecciones` | Shell estático con datos CSR | 2.25 kB | 89.5 kB |
| `/inspecciones/[id]` | SSR dinámico | 152 B | 87.4 kB |

Comando utilizado:

```bash
npm run build
```

La tabla mide el tamaño del bundle generado. No representa latencia de red,
tiempo de respuesta de un servidor ni rendimiento de un dispositivo. Los
valores pueden cambiar si se modifica el código, las dependencias o la versión
de Next.js.

Los retrasos de 350 ms y 400 ms no son métricas de rendimiento. Son mecanismos
sintéticos para hacer observables los estados de carga.

## 9. Pruebas y verificación

`tests/rendering.spec.ts` comprueba el contrato crítico de ambas estrategias:

- límite de cliente y carga posterior a la hidratación para el listado CSR;
- URLs deterministas para contenido, carga, error y vacío;
- semántica accesible de los estados compartidos;
- componente de servidor, `params.id`, `notFound()` y renderizado dinámico en
  el detalle SSR;
- consulta de registros válidos, registro inexistente y error sintético;
- integridad normalizada del workflow oficial de la Semana 4.

La verificación acumulativa se ejecuta con:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run build
make verify
bash public-tests/check.sh
```

En la revisión del cierre, las siete pruebas terminaron en `PASS`, el build
mostró `ƒ /inspecciones/[id]`, `make verify` concluyó con estado técnico
`pass` y el check público acumulativo terminó con `PUBLIC_OK`.

## 10. Supuestos y límites

- No existe un backend ni una base de datos real.
- Todos los registros proceden de un arreglo sintético versionado.
- La espera fija de 400 ms no representa una consulta de producción.
- `error-demo` existe únicamente para demostrar el límite de error.
- El modo offline conserva el App Shell, pero todavía no permite crear o
  sincronizar inspecciones.
- No se implementan autenticación, IndexedDB, sincronización ni resolución de
  conflictos en este incremento.
- Las pruebas deterministas no sustituyen una prueba E2E completa en todos los
  navegadores objetivo.

## 11. Fallos encontrados

El check público incluido en el ZIP de la Semana 4 busca las palabras
`api_key`, `secret`, `password` o `token` en todo el repositorio. Esa búsqueda
produce falsos positivos en `package-lock.json`, documentación y pruebas que
describen controles de seguridad.

No se eliminaron controles ni documentación para ocultar las coincidencias. El
check acumulativo del repositorio verifica los artefactos requeridos, mientras
que la ausencia real de credenciales continúa sujeta a revisión del contenido.

El workflow oficial se integró sin modificar su contenido. En Windows, el hash
de los bytes puede variar por la conversión CRLF; al normalizar los saltos de
línea a LF conserva el SHA-256 oficial
`9253a08a0a38d1f26abb6d61d9112dd24da9a99e374ba13b77ea96aeb6ffb4fe`.

## 12. Consecuencias y trade-offs

### Ventajas

- El listado queda preparado para filtros, IndexedDB e interacción offline.
- El detalle entrega contenido resuelto por ID desde el servidor.
- Los estados son reproducibles sin servicios privados ni datos reales.
- La solución conserva el App Shell y las capacidades PWA acumuladas.

### Costos

- Se mantienen dos modelos de renderizado y dos ciclos de error diferentes.
- El límite de error del servidor necesita un componente cliente para
  proporcionar `reset()`.
- Las demoras sintéticas facilitan la evaluación, pero no deben interpretarse
  como rendimiento real.

## 13. Trabajo futuro

- Sustituir las demoras sintéticas por una capa de datos.
- Implementar persistencia local mediante IndexedDB.
- Incorporar sincronización y resolución de conflictos.
- Agregar pruebas E2E en un navegador real.
- Medir carga y respuesta bajo un dispositivo y una red definidos.
