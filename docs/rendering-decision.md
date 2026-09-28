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