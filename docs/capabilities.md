# Capacidades opcionales y permisos mínimos

## 1. Alcance

La Semana 6 incorpora capacidades del dispositivo mediante mejora progresiva. La inspección principal debe seguir siendo utilizable cuando una API no exista, el dispositivo no tenga el hardware correspondiente o la persona rechace un permiso.

Los registros, mensajes y archivos usados para la demostración son sintéticos. Ninguna capacidad se activa durante la importación del módulo, el renderizado inicial o la consulta pasiva de soporte.

## 2. Principios compartidos

1. Cada permiso parte de una acción explícita y comprensible de la persona usuaria.
2. Una negativa se representa como un resultado controlado y no como un fallo de toda la inspección.
3. Se recolecta la cantidad mínima de datos necesaria.
4. Cada capacidad ofrece una alternativa manual o un mensaje dentro de la aplicación.
5. Las pruebas inyectan implementaciones sintéticas; nunca solicitan permisos reales.

## 3. Cámara y evidencia opcional

### Decisión

La interfaz utiliza un `input` de archivo con `accept="image/*"` y `capture="environment"`. En dispositivos compatibles, la persona puede abrir la cámara trasera después de activar el control. En los demás navegadores, el mismo control funciona como selector de una imagen existente.

Este mecanismo minimiza el tiempo de acceso al dispositivo y evita mantener un flujo de video abierto. `src/lib/device/camera.ts` también ofrece `requestCameraAccess()` y `stopCameraStream()` para una futura vista previa directa. Consultar soporte mediante `getCameraAvailability()` no ejecuta `getUserMedia()`.

### Validación

- formatos admitidos: JPEG, PNG y WebP;
- límite predeterminado: 5 MB;
- una cancelación mantiene la inspección operativa;
- un tipo o tamaño inválido produce retroalimentación accesible;
- todas las pistas se intentan detener aunque una de ellas falle.

### Privacidad y persistencia

El incremento inicial conserva solamente el objeto seleccionado en memoria mientras la vista permanece abierta. No convierte la imagen a Base64, no la escribe en `localStorage`, no la agrega todavía a la cola de sincronización y no la transmite a ningún servicio.

La interfaz tampoco muestra el nombre del archivo, porque un nombre elegido por la persona podría contener datos que no son necesarios para validar la evidencia.

### Fallback

Si la captura directa no existe, falla o es rechazada, se mantiene el selector de archivo. Si tampoco se selecciona un archivo, la inspección continúa sin evidencia.

## 4. Geolocalización

### Decisión técnica

La geolocalización se concibe como un dato complementario y estrictamente opcional dentro de la ficha de inspección. La arquitectura delega la obtención en `src/lib/device/geolocation.ts` y presenta la funcionalidad en `src/components/inspection-capabilities.tsx`. 

Se optó deliberadamente por una lectura puntual mediante `navigator.geolocation.getCurrentPosition()`, excluyendo por contrato cualquier uso de `watchPosition()` para prevenir consumo sostenido de batería y rastreo continuo innecesario.

### Momento en que se solicita permiso

El permiso de ubicación nunca se solicita durante el renderizado inicial, la importación del módulo ni la consulta pasiva de compatibilidad (`getGeolocationAvailability()`). La petición sólo se activa cuando la persona usuaria pulsa de forma explícita el botón "Usar ubicación actual".

### Opciones utilizadas

Para evitar sobrecarga de hardware, tiempo de espera excesivo y recopilación invasiva, la llamada se configura con las opciones mínimas acordadas:

```ts
{
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 60000
}
```

- `enableHighAccuracy: false`: prioriza rapidez y bajo consumo sobre precisión métrica vía GPS.
- `timeout: 10000`: cancela la consulta si el dispositivo o red tardan más de 10 segundos.
- `maximumAge: 60000`: admite una lectura en caché de hasta 1 minuto para evitar accesos redundantes al hardware.

### Reducción de precisión

Por principio de minimización de datos y privacidad, las coordenadas se truncan y redondean a tres decimales (`roundCoordinate(val, 3)`). Esto ofrece una referencia aproximada a nivel de cuadrante o instalación (orden de ~100 metros) y descarta la precisión milimétrica que no es requerida para una inspección general.

### Fallback manual

Si el dispositivo no cuenta con hardware de ubicación, la persona usuaria rechaza el permiso o el servicio experimenta fallas, la interfaz presenta un campo de texto para ingresar una referencia sintética manual (por ejemplo, "Laboratorio B, planta 2"). La inspección permanece 100% operativa sin requerir coordenadas.

### Privacidad y persistencia

Las coordenadas obtenidas residen únicamente en el estado en memoria de React mientras la vista se encuentra activa. No se escriben en `localStorage`, no se serializan en el esquema persistente, no se añaden a la cola de sincronización y no se envían a ningún servidor externo. Tampoco se registran coordenadas reales durante pruebas automatizadas.

### Casos de error

Los códigos de error estándar de la Web Geolocation API se mapean a estados controlados con mensajes comprensibles y retroalimentación accesible (`role="alert"`):
- Código 1 (`PERMISSION_DENIED`) → `permission-denied`: mensaje explicativo indicando que la inspección puede continuar y sugiriendo la referencia manual.
- Código 2 (`POSITION_UNAVAILABLE`) → `position-unavailable`: mensaje indicando indisponibilidad temporal.
- Código 3 (`TIMEOUT`) → `timeout`: aviso de tiempo excedido con posibilidad de reintentar o usar entrada manual.
- Ausencia de API (`navigator.geolocation` inexistente) → `unsupported`.
- Excepciones no controladas → `unexpected-error`.

### Límites conocidos

- La exactitud real depende de los proveedores de geolocalización y conectividad del sistema operativo y navegador.
- Al no persistir las coordenadas en el esquema de almacenamiento local, el valor se pierde al recargar o abandonar la página.
- El soporte en navegadores de escritorio puede variar si los servicios de ubicación del sistema operativo están desactivados a nivel global.

## 5. Notificaciones

Esta sección será completada en el incremento de Carlos. El permiso se solicitará únicamente desde una acción explícita y existirá un mensaje dentro de la aplicación cuando las notificaciones no estén disponibles o sean rechazadas.

## 6. Límites actuales

- `capture="environment"` es una sugerencia y cada navegador decide si abre la cámara o un selector.
- La presencia de `mediaDevices.getUserMedia` no garantiza que exista una cámara utilizable.
- Este incremento no comprime ni edita imágenes.
- La evidencia permanece en memoria y se pierde al recargar la página.
- No se demuestra todavía un backend para almacenar archivos ni entrega remota de notificaciones push.
