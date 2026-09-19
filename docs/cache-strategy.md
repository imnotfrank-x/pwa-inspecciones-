# Estrategia de caché y consulta offline

## Objetivo

La Semana 3 incorpora una estrategia de caché para permitir que la aplicación mantenga una experiencia básica cuando el dispositivo pierde la conexión.

La solución utiliza el Service Worker existente y agrega una página de fallback independiente en `public/offline.html`.

## Recursos precacheados

Durante la instalación del Service Worker se almacenan previamente los recursos esenciales:

- `/`
- `/offline.html`
- `/manifest.webmanifest`
- `/icons/icon-192.png`
- `/icons/icon-512.png`

Esto permite disponer de los recursos mínimos de la aplicación incluso cuando la red no está disponible.

## Navegaciones

Las solicitudes de navegación utilizan una estrategia **Network First**.

El comportamiento es:

1. Se intenta obtener la página desde la red.
2. Si la respuesta es válida, se almacena una copia en la caché de runtime.
3. Si la red falla, se busca primero la URL solicitada en la caché.
4. Si no existe, se intenta utilizar `/`.
5. Como último recurso se devuelve `/offline.html`.

De esta manera, una página visitada previamente puede seguir disponible sin conexión.

## Recursos estáticos

Los recursos estáticos utilizan una estrategia **Cache First**.

Se consideran recursos estáticos:

- archivos de `/_next/static/`
- recursos de `/icons/`
- `/manifest.webmanifest`

Primero se consulta la caché. Si el recurso ya está almacenado, se devuelve sin realizar una petición de red. Si no está disponible, se solicita a la red y, cuando la respuesta es válida, se almacena en la caché de runtime.

## Peticiones que no se interceptan

El Service Worker no intercepta:

- solicitudes que no utilizan `GET`;
- solicitudes hacia `/api/`;
- solicitudes a otros orígenes;
- solicitudes que contienen el encabezado `Authorization`;
- solicitudes cuyos parámetros incluyen `token`, `password`, `secret` o `api_key`.

Esto evita almacenar en caché operaciones de escritura, llamadas de API y solicitudes que pueden contener información sensible.

## Fallback offline

La página `public/offline.html` funciona como último recurso para las navegaciones que no pueden resolverse mediante la red ni mediante las respuestas almacenadas.

La página es autónoma y no depende de recursos externos, por lo que puede mostrarse cuando el dispositivo se encuentra completamente sin conexión.

## Evidencia reproducible

El comportamiento se valida mediante `tests/offline.spec.ts`.

La prueba reproduce un entorno mínimo de Service Worker y verifica:

- la existencia y estructura de `offline.html`;
- la estrategia Network First para navegaciones;
- recuperación desde la caché cuando no hay conexión;
- uso de `/offline.html` como fallback final;
- estrategia Cache First para recursos estáticos;
- exclusión de solicitudes `POST`;
- exclusión de `/api/`;
- exclusión de otros orígenes;
- exclusión de solicitudes con credenciales o parámetros sensibles.

La prueba se ejecuta mediante:

    node tests/offline.spec.ts

y también forma parte del comando:

    npm test
