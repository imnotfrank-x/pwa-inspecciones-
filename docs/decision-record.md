# ADR-001 — Decisión sobre la estrategia de aplicación

> Registro de decisión arquitectónica (ADR) que documenta el análisis comparativo de alternativas tecnológicas, la justificación de la adopción de una Progressive Web App (PWA) sobre Next.js y la gestión de sus consecuencias arquitectónicas para el sistema de inspecciones de mantenimiento.

---

## 1. Estado

* **Fecha:** 2026-09-05
* **Estado:** Aceptada por el equipo (10A-E05)

---

## 2. Contexto y restricciones

El proyecto tiene como objetivo desarrollar una solución digital para la gestión y seguimiento de inspecciones de mantenimiento en laboratorios e instalaciones. El análisis de necesidades y especificaciones técnicas base quedó formalizado en [`docs/requirements.md`](./requirements.md).

Para la toma de decisiones arquitectónicas se identificaron los siguientes factores contextuales y restricciones operativas:

1. **Usuarios y perfiles operativos:**
   * *Persona inspectora:* Personal operativo que recorre instalaciones físicas (talleres, laboratorios, áreas exteriores) realizando levantamientos de campo y registrando hallazgos de mantenimiento.
   * *Persona responsable de mantenimiento o seguimiento:* Personal administrativo o técnico que monitorea el estado global, revisa reportes, prioriza hallazgos y coordina resoluciones desde terminales de escritorio o dispositivos móviles.
2. **Escenarios de uso:**
   * *ESC-01 (Inspección con conexión):* Consulta y visualización fluida del catálogo de inspecciones y datos sintéticos en condiciones normales de red.
   * *ESC-02 (Inspección con conexión intermitente):* Levantamiento de hallazgos en zonas con conectividad nula o fluctuante (por ejemplo, sótanos técnicos, naves aisladas o laboratorios con blindaje electromagnético), donde la aplicación debe garantizar la captura ininterrumpida y persistencia local sin pérdida de datos.
3. **Uso prioritariamente móvil en campo:**
   * La captura de datos se efectúa predominantemente en dispositivos móviles (teléfonos inteligentes o tabletas) en movimiento, lo que exige interfaces táctiles ágiles, consumo eficiente de batería y portabilidad.
4. **Datos sintéticos y privacidad:**
   * Conforme a los requisitos RNF-03 y RNF-04, el sistema opera con registros sintéticos estructurados (identificador, laboratorio, fecha, responsable simulado, estado, hallazgos y resumen). No se manejan datos personales reales ni credenciales sensibles en el repositorio.
5. **Stack tecnológico base:**
   * El proyecto se fundamenta en el starter oficial del curso basado en **Next.js 14 (React)**, aprovechando su arquitectura moderna de componentes, enrutamiento y capacidades de renderizado.
6. **Alcance de la Semana 1:**
   * El alcance actual se restringe estrictamente a la definición de requisitos, arquitectura del sistema y comprobación del starter. **No se implementan en esta etapa** el Service Worker, Web App Manifest, persistencia en IndexedDB, sincronización en segundo plano ni notificaciones push (requisitos RF-04, RF-05 y RF-06 clasificados como futuros).

---

## 3. Alternativas consideradas

Se evaluaron cuatro enfoques arquitectónicos frente a los requerimientos del sistema:

1. **PWA (Progressive Web App):** Aplicación web moderna enriquecida con Web App Manifest, Service Workers y almacenamiento local en el navegador, ejecutable en cualquier navegador moderno e instalable en la pantalla de inicio.
2. **Web tradicional (SPA o SSR convencional):** Aplicación web estándar con dependencia continua de conexión a Internet (cliente-servidor síncrono); no dispone de mecanismos de interceptación de red ni persistencia local planificada para modo sin conexión.
3. **Aplicación móvil nativa:** Desarrollo independiente para cada plataforma objetivo (Kotlin/Java en Android con Android SDK, Swift en iOS con Xcode).
4. **Aplicación móvil multiplataforma:** Aplicación construida sobre un framework único compilado o interpretado a componentes nativos (React Native, Flutter o .NET MAUI).

### Tabla comparativa de alternativas

| Criterio | PWA (Progressive Web App) | Web tradicional | App nativa (Android / iOS) | App multiplataforma (React Native / Flutter) |
| :--- | :--- | :--- | :--- | :--- |
| **Instalación** | Opcional y ligera. Se agrega directamente a la pantalla de inicio desde el navegador sin intermediarios (`Add to Home Screen`). | No requiere instalación ni almacenamiento en el dispositivo; acceso exclusivo mediante URL en el navegador. | Obligatoria a través de tiendas oficiales (Google Play / App Store) con descargas de binarios pesados (30–100 MB). | Obligatoria a través de tiendas oficiales o sideloading; empaquetado binario de tamaño medio a alto (20–60 MB). |
| **Conectividad intermitente** | Excelente viabilidad futura. El Service Worker permite interceptar peticiones de red y servir recursos cacheados; IndexedDB permite guardar borradores localmente. Requiere diseñar conscientemente la persistencia y sincronización (no es automático). | Nula o deficiente. Ante una desconexión o intermitencia, la aplicación muestra errores de red del navegador y se interrumpe la captura de datos. | Completa y nativa. Acceso a bases de datos locales robustas (Room/SQLite, CoreData); desacople total de la capa de red. | Completa. Soporte para SQLite local y librerías de persistencia offline desacopladas de la red. |
| **Distribución** | Inmediata mediante despliegue web (Vercel, servidores web estándar). Sin procesos de revisión ni comisiones de tiendas de aplicaciones. | Inmediata vía web; actualización instantánea para todos los usuarios con un nuevo despliegue. | Lenta y burocrática. Requiere cuentas de desarrollador de pago, revisión de directrices de Apple/Google (1 a 5 días) para cada actualización. | Lenta para cambios nativos (revisión de tiendas), aunque permite actualizaciones de código dinámico parciales mediante OTA (Over-The-Air) con limitaciones. |
| **Costo y tiempo de desarrollo** | Bajo a moderado. Se aprovecha el starter en Next.js existente. Un único código fuente para escritorio y móvil. | Muy bajo. Desarrollo directo sobre el starter sin complejidades adicionales de Service Workers ni lógica de sincronización. | Muy alto. Exige duplicar el equipo o tiempo de desarrollo para mantener dos bases de código distintas (Swift y Kotlin) y lenguajes diferentes. | Alto. Aunque comparte lógica en JavaScript/Dart, requiere configuración de entornos de compilación móviles nativos (Android Studio, Xcode, CocoaPods). |
| **Mantenimiento** | Unificado. Una sola base de código para todos los dispositivos y plataformas. Correcciones de bugs desplegadas instantáneamente. | Unificado y muy simple. Mantenimiento exclusivo de la plataforma web. | Complejo y fragmentado. Dos ciclos de vida de software, resolución de bugs duplicada y desfase de versiones entre plataformas. | Moderado. Una base de código principal, pero con riesgo continuo de desfases y roturas en puentes nativos tras actualizaciones de SO. |
| **Capacidades del dispositivo** | Suficientes para el dominio del problema: almacenamiento estructurado en cliente (IndexedDB), detección de estado de red (`navigator.onLine`), acceso a cámara estándar vía HTML5 Input/MediaDevices. Limitado en Bluetooth o sensores especializados en iOS. | Muy limitadas. Sólo capacidades estándar del DOM del navegador; sin ejecución en segundo plano ni almacenamiento local robusto. | Acceso total y sin restricciones a cualquier API, sensor, hardware especializado (LiDAR, cámaras termográficas, antenas industriales) y servicios en segundo plano. | Acceso amplio a hardware mediante plugins comunitarios o módulos nativos puenteados; puede haber demoras en adoptar APIs recién lanzadas. |
| **Riesgos principales** | Restricciones de ciclo de vida del Service Worker impuestas por WebKit (Safari en iOS); riesgo de desalojo de caché si el almacenamiento del dispositivo es crítico. | Pérdida de productividad y frustración del usuario en zonas sin red; abandono del sistema por falta de disponibilidad en campo. | Costos económicos prohibitivos para el proyecto; tiempo de entrega inviable para el calendario académico. | Complejidad en la configuración del toolchain nativo; incompatibilidad con la restricción del curso de utilizar Next.js. |

### Análisis cualitativo de alternativas

* **Web tradicional:** Si bien representa la alternativa con menor esfuerzo inicial al coincidir exactamente con el starter de Next.js, resulta inviable para el objetivo del producto. El escenario operativo fundamental (ESC-02) exige levantar inspecciones en sótanos, almacenes o talleres aislados. Una web tradicional dejaría inoperativo al inspector ante caídas de señal, arriesgando la pérdida de hallazgos recién redactados.
* **Aplicación nativa (iOS/Android):** Ofrecería el máximo rendimiento y control sobre el hardware móvil. Sin embargo, resulta desproporcionada y contraproducente para el contexto del proyecto: exigiría construir y mantener dos aplicaciones separadas (Swift y Kotlin), contar con equipos macOS para compilar iOS, pagar suscripciones de desarrollador y someterse a revisiones de tiendas. Ninguno de los requisitos funcionales actuales ni futuros justifica este costo.
* **Aplicación multiplataforma (React Native / Flutter):** Aunque mitiga la duplicidad de código frente a la nativa, requeriría abandonar o reescribir por completo el starter de Next.js provisto por el curso, configurando emuladores, SDKs de Android y entornos pesados que incrementan drásticamente el riesgo de entrega sin aportar ventajas determinantes frente a una PWA para este caso de uso.
* **PWA:** Combina la inmediatez de distribución y el costo contenido del desarrollo web con capacidades clave de aplicaciones móviles: funcionamiento offline resiliente (mediante Service Workers e IndexedDB), experiencia de pantalla completa e instalación sin fricciones.

---

## 4. Decisión

El equipo acuerda **adoptar una estrategia de Progressive Web App (PWA) manteniendo la base tecnológica de Next.js 14**.

### Justificación de la elección

1. **Aprovechamiento del starter del curso:**
   * Se conserva íntegramente la estructura del starter oficial provisto, garantizando compatibilidad con los scripts de verificación (`npm run verify`), las pruebas automatizadas y las directrices académicas establecidas.
2. **Evolución arquitectónica incremental:**
   * La PWA no exige reescribir la aplicación. Permite avanzar por capas: durante la Semana 1 se valida la base web y sus requisitos; en etapas posteriores se incorporarán progresivamente el archivo `manifest.json`, el registro del Service Worker y los mecanismos de almacenamiento local.
3. **Beneficios concretos para el usuario de inspecciones:**
   * *Inmediatez de uso:* La persona inspectora puede acceder a la URL desde cualquier dispositivo móvil o de escritorio sin necesidad de registrarse en tiendas de aplicaciones ni esperar descargas prolongadas.
   * *Instalación opcional y ágil:* Si el inspector utiliza la herramienta cotidianamente, puede anclarla a la pantalla de inicio de su dispositivo, obteniendo un ícono dedicado y visualización sin barra de navegación del explorador.
   * *Continuidad operativa en campo:* La arquitectura PWA sienta las bases técnicas para que, en fases futuras, la pérdida de señal no congele la aplicación ni borre los formularios en curso.
4. **Criterio de exclusión para aplicaciones nativas:**
   * Se evaluó y determinó que una aplicación nativa **únicamente sería preferible si el sistema demandara**:
     * Integración con sensores industriales especializados de bajo nivel (por ejemplo, lectores térmicos dedicados, cámaras infrarrojas o puertos seriales/RS-232).
     * Procesamiento de cómputo intensivo en segundo plano de manera continua e indefinida.
     * Políticas corporativas de distribución cerrada a través de plataformas de gestión de dispositivos móviles empresariales (MDM) exclusivas de tiendas propietarias.
   * Dado que las inspecciones documentan datos alfanuméricos sintéticos y hallazgos descriptivos convencionales, las APIs web modernas cubren plenamente la necesidad.

---

## 5. Consecuencias y riesgos

La adopción de la arquitectura PWA introduce ventajas significativas pero también costos de ingeniería y riesgos operativos que deben gestionarse con mitigaciones concretas:

### 1. Ventajas obtenidas
* **Base de código única:** Reducción sustancial del costo de desarrollo y mantenimiento; las mejoras en la interfaz aplican simultáneamente a usuarios móviles y de escritorio.
* **Ciclo de despliegue continuo:** Actualizaciones instantáneas en el servidor sin fricción de aprobaciones externas ni fragmentación de versiones entre clientes.
* **Resiliencia progresiva:** Los usuarios con navegadores modernos aprovechan capacidades offline e instalación, mientras que usuarios en navegadores heredados conservan acceso funcional web básico.

### 2. Riesgos arquitectónicos y mitigaciones planificadas

| Riesgo identificado | Impacto técnico | Estrategia de mitigación propuesta |
| :--- | :--- | :--- |
| **Costo de diseñar almacenamiento y sincronización local** | La persistencia offline no es automática; requiere estructurar esquemas de datos en el cliente (IndexedDB), manejar transacciones asíncronas y diseñar una cola de operaciones pendientes. | En etapas futuras se implementará una capa de abstracción sobre IndexedDB para aislar la persistencia de la interfaz, estructurando una cola FIFO (*First In, First Out*) de mutaciones pendientes de envío. |
| **Conflictos de datos al reconectar** | Si un registro es modificado localmente mientras otro usuario o proceso modificó el mismo registro en el servidor, pueden producirse inconsistencias o sobreescritura accidental. | Adoptar una estrategia clara de resolución: asignación de UUIDs generados en cliente para altas independientes, marcas de tiempo de modificación (*timestamps*) y política de última escritura gana (*Last-Write-Wins*) o rechazo con aviso si la versión remota es superior. |
| **Datos desactualizados en caché (*stale data*)** | Si la caché de lectura del Service Worker prioriza siempre la copia local (estrategia *Cache-First* agresiva), la persona inspectora podría visualizar inspecciones resueltas como si aún estuvieran pendientes. | Implementar estrategias diferenciadas: *Stale-While-Revalidate* o *Network-First con fallback a caché* para las rutas de datos de inspección, junto con indicadores visuales en la interfaz que informen la fecha y hora de la última sincronización. |
| **Compatibilidad heterogénea entre navegadores (iOS vs Android)** | Apple WebKit (Safari en iOS) impone límites más estrictos en la persistencia del Service Worker, purga el almacenamiento local tras días de inactividad y maneja de forma distinta el evento de instalación frente a Chromium en Android. | Diseñar la aplicación con principios de mejora progresiva: verificar soporte de APIs antes de invocarlas (`if ('serviceWorker' in navigator)`), advertir al usuario sobre limitaciones de persistencia prolongada y guiar manualmente el proceso de "Agregar a inicio" en Safari. |

---

## 6. Validación futura

Para garantizar que la estrategia PWA cumpla con los objetivos sin asumir prematuramente capacidades no construidas, se establecen los siguientes criterios y procedimientos de validación para las semanas de implementación técnica:

1. **Instalabilidad:**
   * *Procedimiento:* Auditar la presencia y estructura del `manifest.json` mediante las herramientas de desarrollo de Chrome (pestaña *Application > Manifest*) y comprobar el disparo del evento `beforeinstallprompt`.
   * *Criterio de éxito:* La aplicación debe permitir la instalación como aplicación independiente (modo `standalone`) con ícono y tema definidos.
2. **Funcionamiento sin conexión:**
   * *Procedimiento:* Activar la simulación *Offline* en la pestaña *Network* de DevTools y posteriormente en un dispositivo físico activando el modo avión.
   * *Criterio de éxito:* La aplicación debe cargar la interfaz base (App Shell) y el catálogo precacheado sin presentar la pantalla de error de desconexión del navegador.
3. **Conservación de registros:**
   * *Procedimiento:* Estando en modo offline, capturar un nuevo hallazgo de prueba, recargar la página completamente y cerrar el navegador.
   * *Criterio de éxito:* Al reabrir la aplicación sin conexión, el hallazgo capturado debe permanecer visible en la lista local con estatus visual de "Pendiente de sincronización".
4. **Detección de reconexión:**
   * *Procedimiento:* Restablecer la conectividad de red y monitorear los eventos nativos `window.addEventListener('online')` y las llamadas en segundo plano.
   * *Criterio de éxito:* La aplicación debe detectar la transición de estado de red sin necesidad de refrescar la página manualmente y mostrar un indicador visual de conexión activa.
5. **Sincronización de registros:**
   * *Procedimiento:* Verificar que la cola de mutaciones de IndexedDB procese los registros pendientes enviándolos secuencialmente a los endpoints del servidor.
   * *Criterio de éxito:* Los registros locales deben actualizar su estatus a "Sincronizado" y quedar reflejados en el almacén de datos central.
6. **Manejo de duplicados y conflictos:**
   * *Procedimiento:* Provocar reintentos de red durante el envío de una misma inspección y simular modificaciones simultáneas en un mismo registro.
   * *Criterio de éxito:* El servidor debe responder de forma idempotente ante UUIDs repetidos y aplicar la regla de resolución sin corromper la integridad de los datos.
7. **Rendimiento (RNF-05):**
   * *Procedimiento:* Ejecutar auditorías de Lighthouse sobre la versión de producción y cronometrar la carga de 100 registros sintéticos en el dispositivo de prueba.
   * *Criterio de éxito:* Calificación de Lighthouse en categoría PWA y Performance adecuada, logrando renderizar los 100 registros en un tiempo objetivo inferior a 2 segundos.

> **Aclaración de alcance:** De acuerdo con la planificación de la Semana 1, ninguna de las capacidades descritas en esta sección se asume como implementada o verificada actualmente. Se documentan como el marco de verificación técnica que regirá las entregas sucesivas.
