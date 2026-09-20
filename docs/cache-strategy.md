# Estrategia de caché y consulta offline

## Objetivo

La Semana 3 incorpora una estrategia de caché para permitir que la aplicación mantenga una experiencia básica cuando el dispositivo pierde la conexión.

La solución reutiliza el Service Worker existente y agrega una página de fallback independiente en `public/offline.html`.

El objetivo es permitir la consulta de recursos previamente disponibles sin almacenar solicitudes que puedan contener información sensible.

## Inventario de recursos

### Recursos precacheados

Durante la instalación del Service Worker se almacenan previamente los recursos esenciales:

* `/`
* `/offline.html`
* `/manifest.webmanifest`
* `/icons/icon-192.png`
* `/icons/icon-512.png`

Estos recursos permiten disponer de los elementos mínimos de la aplicación cuando la red no está disponible.

### Recursos almacenados en runtime

Las navegaciones exitosas y los recursos estáticos obtenidos desde la red pueden almacenarse en la caché de runtime.

Las claves de caché utilizadas por el Service Worker tienen el prefijo `labinspect-` y distinguen entre:

* caché de precarga;
* caché de runtime.

## Estrategias de consulta

### Navegaciones — Network First

Las solicitudes de navegación utilizan una estrategia **Network First**.

El comportamiento es:

1. Se intenta obtener la página desde la red.
2. Si la respuesta es válida, se devuelve al usuario y se almacena una copia en la caché de runtime.
3. Si la red falla, se busca la URL solicitada en la caché.
4. Si no existe, se intenta utilizar `/`.
5. Como último recurso se devuelve `/offline.html`.

Esta estrategia prioriza información reciente cuando existe conexión y permite consultar una versión almacenada cuando la red no está disponible.

### Recursos estáticos — Cache First

Los recursos estáticos utilizan una estrategia **Cache First**.

Se consideran recursos estáticos:

* archivos de `/_next/static/`;
* recursos de `/icons/`;
* `/manifest.webmanifest`.

El comportamiento es:

1. Se consulta primero la caché.
2. Si el recurso existe, se devuelve directamente.
3. Si no existe, se solicita a la red.
4. Si la respuesta es válida, se almacena una copia en la caché de runtime.

Esta estrategia es apropiada para archivos estáticos generados por Next.js porque sus rutas incluyen recursos versionados.

## Peticiones que no se interceptan

El Service Worker no intercepta:

* solicitudes que no utilizan `GET`;
* solicitudes hacia `/api/`;
* solicitudes a otros orígenes;
* solicitudes que contienen el encabezado `Authorization`;
* solicitudes cuyos parámetros incluyen `token`, `password`, `secret` o `api_key`.

Estas exclusiones evitan almacenar operaciones de escritura, llamadas de API o solicitudes que puedan contener información sensible.

## Ciclo de vida del Service Worker

### Instalación

Durante `install`, el Service Worker abre la caché de precarga y utiliza `addAll()` para almacenar los recursos esenciales.

Si la precarga falla, la instalación debe informar el error para evitar considerar completada una instalación incompleta.

### Activación

Durante `activate`, el Service Worker revisa las cachés existentes y elimina las versiones que ya no correspondan a la versión actual.

Después solicita el control de los clientes mediante `clients.claim()`.

### Intercepción de solicitudes

Durante `fetch`, primero se evalúa si la solicitud puede ser interceptada.

Se descartan solicitudes no `GET`, de `/api/`, de otros orígenes, con `Authorization` o con parámetros sensibles.

Las navegaciones se resuelven mediante Network First y los recursos estáticos mediante Cache First.

### Actualización

Las cachés utilizan nombres versionados. Cuando se publica una nueva versión del Service Worker, se puede utilizar una nueva versión de caché.

La eliminación de cachés antiguas durante `activate` evita conservar indefinidamente recursos obsoletos.

## Invalidación y consistencia

La invalidación se controla mediante versiones de las cachés.

Al cambiar la versión del Service Worker:

1. se crea una nueva caché con el nuevo identificador;
2. durante `activate` se eliminan cachés antiguas que ya no correspondan;
3. los recursos de la nueva versión se vuelven a precargar;
4. las nuevas respuestas de runtime se almacenan en la caché vigente.

La estrategia Network First reduce el riesgo de servir información antigua en navegaciones cuando existe conexión.

## Fallback offline

La página `public/offline.html` funciona como último recurso para las navegaciones que no pueden resolverse mediante la red ni mediante respuestas almacenadas.

La página es autónoma, utiliza únicamente HTML y CSS incluidos en el propio archivo y no depende de recursos externos. Por ello puede mostrarse cuando el dispositivo se encuentra completamente sin conexión.

El enlace `Volver a intentar` dirige nuevamente a `/` para permitir que el usuario vuelva a intentar la navegación.

## Seguridad y privacidad

La estrategia evita almacenar solicitudes que puedan contener información sensible.

No se interceptan:

* métodos diferentes de `GET`;
* rutas `/api/`;
* solicitudes de otros orígenes;
* solicitudes con `Authorization`;
* URLs con parámetros `token`, `password`, `secret` o `api_key`.

Estas reglas reducen el riesgo de que credenciales, tokens u otros datos sensibles terminen almacenados en las cachés del navegador.

La solución no implementa autenticación, cifrado adicional ni persistencia de datos de inspecciones mediante IndexedDB.

## Riesgos y mitigaciones

| Riesgo                                 | Mitigación                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Servir una página antigua sin conexión | Network First intenta consultar la red antes de usar la caché.                              |
| Mantener cachés obsoletas              | Las cachés se identifican mediante versiones y se eliminan durante `activate`.              |
| Almacenar información sensible         | Se excluyen `Authorization` y parámetros sensibles.                                         |
| Interceptar operaciones de escritura   | Solo se consideran solicitudes `GET`.                                                       |
| Falla durante la precarga              | La prueba reproduce un fallo de `addAll()` y comprueba que la instalación informe el error. |
| Recurso estático no almacenado         | Cache First consulta la red y guarda una copia válida en runtime.                           |
| Primera visita sin conexión            | Se mantiene `/offline.html` como fallback precacheado.                                      |
| Eliminación de caché por el navegador  | La aplicación no depende exclusivamente de la caché para conservar datos persistentes.      |

## Supuestos y limitaciones

Esta estrategia supone que el Service Worker ya fue registrado correctamente por la aplicación y que el navegador permite utilizar las APIs de caché.

La primera visita necesita conexión para descargar los recursos que no estén disponibles en la precarga.

El navegador puede eliminar datos almacenados en caché según sus propias políticas de almacenamiento.

La solución permite una experiencia básica de consulta offline, pero no implementa:

* creación de inspecciones sin conexión;
* sincronización posterior con un servidor;
* IndexedDB;
* cola de operaciones pendientes;
* resolución de conflictos;
* validación de un backend real.

## Evidencia reproducible

El comportamiento se valida mediante `tests/offline.spec.ts`.

La prueba reproduce un entorno mínimo de Service Worker y verifica:

* la existencia y estructura de `offline.html`;
* la ausencia de dependencias externas en `offline.html`;
* la estrategia Network First para navegaciones;
* recuperación desde la caché cuando no hay conexión;
* fallback mediante `/`;
* uso de `/offline.html` como fallback final;
* estrategia Cache First para recursos estáticos;
* consulta de red cuando un recurso estático no está almacenado;
* almacenamiento en runtime de un recurso estático obtenido desde la red;
* uso de `waitUntil` durante la instalación;
* propagación de un fallo de precarga;
* exclusión de solicitudes `POST`;
* exclusión de `/api/`;
* exclusión de otros orígenes;
* exclusión de solicitudes con `Authorization`;
* exclusión de parámetros sensibles.

La prueba individual se ejecuta mediante:

```
node tests/offline.spec.ts
```

El resultado validado durante la corrección es:

```
offline.spec.ts: PASS
```

La prueba también forma parte del comando acumulativo:

```
npm test
```

## Comandos de verificación

Antes de entregar la rama se deben ejecutar nuevamente las verificaciones del proyecto:

```
npm test
npm run test -- --run
npm run build
npm run verify
bash public-tests/check.sh
```

Los resultados documentados en esta sección deben corresponder a una ejecución realizada sobre la versión final de la rama.
