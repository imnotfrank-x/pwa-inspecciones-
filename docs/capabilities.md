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

Esta sección será completada en el incremento de Javier. La política acordada utilizará una lectura puntual iniciada por botón, precisión reducida y entrada manual como alternativa. No se utilizará seguimiento continuo.

## 5. Notificaciones

Esta sección será completada en el incremento de Carlos. El permiso se solicitará únicamente desde una acción explícita y existirá un mensaje dentro de la aplicación cuando las notificaciones no estén disponibles o sean rechazadas.

## 6. Límites actuales

- `capture="environment"` es una sugerencia y cada navegador decide si abre la cámara o un selector.
- La presencia de `mediaDevices.getUserMedia` no garantiza que exista una cámara utilizable.
- Este incremento no comprime ni edita imágenes.
- La evidencia permanece en memoria y se pierde al recargar la página.
- No se demuestra todavía un backend para almacenar archivos ni entrega remota de notificaciones push.
