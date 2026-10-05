# Política de sincronización y resolución de conflictos

## 1. Propósito y alcance

Esta política define cómo la PWA registra inspecciones de forma offline-first, las conserva localmente y las sincroniza al recuperar conectividad.

El alcance de esta actividad incluye persistencia local, cola idempotente, reintentos, recuperación después del cierre de la pestaña, evento `online` y resolución determinista de conflictos.

Los datos utilizados en la actividad son exclusivamente sintéticos.

## 2. Modelo del almacenamiento

El estado local se representa como un `SyncSnapshot` con:

- `schemaVersion`;
- `inspections`: inspecciones almacenadas;
- `operations`: operaciones pendientes o procesadas.

Una `StoredInspection` conserva los datos de la inspección junto con `version`, `updatedAt` y `syncState`.

Una `SyncOperation` conserva `id`, `idempotencyKey`, `entityId`, `payload`, `baseVersion`, `attemptCount`, `nextAttemptAt`, estado y metadatos de error o conflicto.

El esquema valida tipos, fechas, versiones, estados, IDs y unicidad de operaciones y claves idempotentes antes de persistir el snapshot.

## 3. Razón para usar `localStorage` en esta actividad

Se utiliza `localStorage` porque la actividad busca demostrar el concepto de persistencia local y sincronización sin introducir una infraestructura de base de datos más compleja.

La implementación se mantiene detrás de la abstracción `SyncStorage`, por lo que la cola no depende directamente de `localStorage` y puede probarse con un almacenamiento sintético.

## 4. Límite de cuota y sincronía de `localStorage`

`localStorage` tiene una cuota limitada que depende del navegador, del origen y del entorno; no debe asumirse una capacidad fija universal.

Una escritura que exceda la cuota puede fallar. Por este motivo, `localStorage` es adecuado para el alcance pequeño y sintético de esta actividad, pero no se considera una solución apropiada para grandes volúmenes de datos.

Además, las operaciones de `localStorage` son síncronas y ejecutadas en el hilo principal, por lo que cargas grandes podrían afectar la experiencia de usuario.

## 5. Estados de la cola

Las operaciones de sincronización utilizan estos estados:

- `pending`: operación lista para enviarse;
- `syncing`: operación actualmente en transporte;
- `retry`: operación que falló de forma recuperable y tiene programado un nuevo intento;
- `failed`: operación que agotó los intentos o encontró un error fatal;
- `conflict`: el transporte informó que existe una versión remota incompatible y se requiere resolución.

La inspección almacenada utiliza `pending`, `synced` o `failed`.

## 6. Clave idempotente y prevención de duplicados

Cada operación utiliza una `idempotencyKey`.

Antes de crear una operación, la cola busca una operación existente con la misma clave.

Si la operación existente representa el mismo `entityId`, `baseVersion` y payload, se devuelve como operación existente y no se crea un duplicado.

Si la misma clave intenta representar datos incompatibles, se lanza `IdempotencyConflictError`.

Las claves tienen una validación de formato y longitud.

## 7. Transporte sintético inyectable

El transporte se inyecta mediante `SyncTransport`.

Esto permite probar la cola sin depender de un backend real ni de servicios privados.

El transporte puede devolver:

- `success`;
- `conflict`;
- `retryable-error`;
- `fatal-error`.

Esta abstracción permite ejecutar pruebas deterministas y reproducibles.

## 8. Clasificación de errores

Un `retryable-error` puede volver a intentarse.

Un `fatal-error` pasa directamente la operación al estado `failed`.

Las excepciones producidas durante el transporte se convierten en un error recuperable y se registran como `retryable-error`.

Los mensajes de error se limitan a 500 caracteres para evitar almacenar información excesiva.

## 9. Fórmula de reintentos

Para un error recuperable, el retraso se calcula como:

`delay = min(baseDelayMs * 2^(attemptCount - 1), maxDelayMs)`

La configuración predeterminada es:

- `baseDelayMs = 1000 ms`;
- `maxDelayMs = 60000 ms`;
- `maxAttempts = 5`.

Por ejemplo, los retrasos iniciales siguen una progresión de 1, 2, 4 y 8 segundos, hasta el límite configurado.

## 10. Límite máximo de intentos

Una operación inicia con `attemptCount = 0`.

Después de un fallo recuperable, el contador se incrementa.

Cuando alcanza `maxAttempts`, la operación pasa a `failed` y deja de programar nuevos intentos.

Con la configuración predeterminada, el máximo es de 5 intentos.

Una nueva operación creada durante un rebase de conflicto comienza nuevamente con `attemptCount = 0`.

## 11. Recuperación después de cerrar la pestaña

Antes de procesar la cola, las operaciones que quedaron en estado `syncing` se consideran interrupciones de una sincronización anterior.

La cola las recupera pasando `syncing` a `retry`, conserva la misma `idempotencyKey` y programa un nuevo intento.

Esto permite continuar después de un cierre de pestaña, recarga o interrupción del proceso sin perder la operación persistida.

## 12. Evento `online`

La cola ofrece `registerOnlineSync`.

Al dispararse el evento `online`, se invoca `syncPending` para intentar procesar las operaciones disponibles.

La operación permanece persistida aunque falle el transporte, por lo que recuperar conectividad no depende de que el primer intento tenga éxito.

## 13. Política de conflictos

La resolución se realiza de forma determinista.

El orden de decisión es:

1. Gana la inspección con mayor `version`.
2. Si ambas tienen la misma `version`, gana la que tenga el `updatedAt` más reciente.
3. Si `version` y `updatedAt` son iguales, gana remoto mediante un desempate determinista.

Los conflictos entre inspecciones con IDs diferentes son inválidos y se rechazan.

El desempate remoto no significa que el servidor sea siempre más correcto; se utiliza porque proporciona un resultado determinista ante un empate exacto.

## 14. Nueva clave al rebasar una mutación

Cuando gana la versión local, se elimina la operación conflictiva original y se crea una nueva operación rebasada.

La nueva operación:

- usa una `idempotencyKey` distinta;
- conserva la mutación local;
- utiliza la versión remota como `baseVersion`;
- comienza con `attemptCount = 0`;
- queda en estado `pending`;
- elimina la metadata del conflicto y el error anterior.

No se permite reutilizar la clave idempotente de la operación conflictiva original.

## 15. Protección ante respuestas desordenadas

Una respuesta antigua no debe sobrescribir una edición local posterior.

Al completar una sincronización exitosa, la cola solo marca la inspección como `synced` cuando el registro actual todavía coincide con el payload de la operación y no existe otra operación para esa misma entidad.

Así, una edición local posterior permanece pendiente y conserva su prioridad.

La resolución de un conflicto antiguo tampoco reemplaza esa edición posterior.

## 16. Datos exclusivamente sintéticos

La actividad utiliza únicamente datos sintéticos.

No deben incluirse secretos, tokens, credenciales ni datos personales reales en el almacenamiento, las pruebas, la documentación o la evidencia.

## 17. Casos cubiertos por pruebas

Las pruebas de `conflict-resolution.spec.ts` cubren:

1. versión remota mayor;
2. versión local mayor;
3. misma versión con local más reciente;
4. misma versión con remoto más reciente;
5. empate completo con remoto como desempate;
6. IDs diferentes;
7. aplicación de ganador remoto;
8. aplicación de ganador local;
9. rechazo de reutilización de la clave anterior;
10. protección ante una edición local posterior;
11. inmutabilidad de la política;
12. preservación del workflow oficial mediante verificación del hash.

Además, `tests/sync.spec.ts` conserva las pruebas acumulativas de almacenamiento, cola, reintentos y sincronización.

## 18. Supuestos

Se asume que:

- el almacenamiento local disponible pertenece al origen correcto;
- el transporte cumple el contrato `SyncTransport`;
- las versiones son enteros no negativos;
- las fechas utilizadas por la aplicación son fechas ISO válidas;
- las inspecciones y operaciones son pequeñas y sintéticas;
- la sincronización se ejecuta en un contexto de navegador.

## 19. Limitaciones

`localStorage` no ofrece una base de datos transaccional ni está diseñado para grandes cantidades de información.

Su cuota depende del navegador y puede provocar errores de escritura.

Al ser síncrono, las operaciones grandes pueden bloquear el hilo principal.

La actividad utiliza almacenamiento local y transporte sintético; no demuestra todavía autenticación, autorización, deduplicación real en servidor ni consistencia distribuida entre múltiples dispositivos.

El check público del kit puede detectar palabras asociadas con credenciales en documentación, pruebas de seguridad o `package-lock.json`, produciendo falsos positivos. Esta limitación se documenta y no se oculta eliminando documentación legítima.

El resultado de la verificación técnica tampoco sustituye la revisión académica indicada por la actividad.

## 20. Posibles mejoras

Para una solución de producción podrían evaluarse:

- **IndexedDB** para mayor capacidad y operaciones de datos más adecuadas;
- **Web Locks** para coordinar acceso entre contextos del mismo origen;
- **BroadcastChannel** para comunicar cambios entre pestañas;
- **Background Sync** para intentar sincronización en segundo plano;
- un backend real con control de versiones y **deduplicación de operaciones por idempotency key** en el servidor.

Estas mejoras quedan fuera del alcance de esta actividad.
