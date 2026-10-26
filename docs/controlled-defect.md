# Experimento de defecto controlado — Semana 8

## 1. Propósito y alcance

Este documento registra la evidencia técnica del experimento de defecto controlado realizado durante el incremento 2/3 de Semana 8 (Javier). Su objetivo es demostrar que la suite de pruebas de integración detecta de forma determinista una regresión en una regla de negocio del producto —la deduplicación idempotente ante un reintento por respuesta perdida— sin alterar las pruebas ni romper la compilación, los tipos o las dependencias.

El experimento se ejecutó íntegramente en la rama temporal aislada `w08/javier-defecto-controlado`, creada a partir del commit de implementación verificado en `w08/javier-integracion`. Ningún commit defectuoso fue integrado mediante `merge` o `cherry-pick` en la rama entregable `w08/javier-integracion` ni en `main`.

## 2. Trazabilidad de ramas, commits y GitHub Actions

| Etapa | Rama | Commit SHA | Estado esperado | Ejecución en GitHub Actions |
|---|---|---|---|---|
| Implementación base verificada | `w08/javier-integracion` | [`ceabe4775c700223b0318cad703a32d3f7120ea5`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/ceabe4775c700223b0318cad703a32d3f7120ea5) | Verde (`pass`) | [Run 40250234698](https://github.com/imnotfrank-x/pwa-inspecciones-/actions/runs/40250234698) |
| Introducción del defecto controlado | `w08/javier-defecto-controlado` | [`2d3a24ac2d22c7341b4287f8b84d23dd2d12ecf3`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/2d3a24ac2d22c7341b4287f8b84d23dd2d12ecf3) | Rojo (`failure`) | [Run 40250330208](https://github.com/imnotfrank-x/pwa-inspecciones-/actions/runs/40250330208) |
| Restauración mediante `git revert` | `w08/javier-defecto-controlado` | [`f9c908987a0b7bfa3d3aa0f2f34188d2ef605267`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/f9c908987a0b7bfa3d3aa0f2f34188d2ef605267) | Verde (`success`) | [Run 40250381443](https://github.com/imnotfrank-x/pwa-inspecciones-/actions/runs/40250381443) |

## 3. Descripción del defecto introducido

- **Archivo modificado:** `src/lib/sync/synthetic-transport.ts`
- **Regla de negocio vulnerada:** Cuando el receptor sintético recibe una operación cuya `idempotencyKey` ya fue procesada previamente con la misma huella de contenido estable (`entityId`, `type`, `baseVersion` y `payload`), debe devolver el resultado original aceptado sin volver a aplicar el efecto ni incrementar el contador `effectsApplied`.
- **Cambio introducido:** Se eliminó el retorno temprano que devuelve el resultado original almacenado en `this.processedKeys` cuando la clave idempotente ya existe con el mismo contenido. Como consecuencia, aunque el `Map` de inspecciones remotas (`this.appliedInspections`) sobrescribe el registro por `entityId` y devuelve `success`, el receptor vuelve a ejecutar la mutación y el contador `effectsApplied` sube de `1` a `2`.

### Diff exacto del defecto (`2d3a24ac2d22c7341b4287f8b84d23dd2d12ecf3`)

```diff
diff --git a/src/lib/sync/synthetic-transport.ts b/src/lib/sync/synthetic-transport.ts
index dcf3ce2..b09b7a3 100644
--- a/src/lib/sync/synthetic-transport.ts
+++ b/src/lib/sync/synthetic-transport.ts
@@ -216,10 +216,6 @@ export class SyntheticSyncReceiver {
       };
     }
 
-    if (existing) {
-      return { ...existing.result };
-    }
-
     this.effectsCount += 1;
     const serverVersion = Math.max(currentRemote?.version ?? 0, operation.baseVersion) + 1;
     const serverUpdatedAt = this.now().toISOString();
```

## 4. Detección del fallo (Resultado ROJO)

- **Comando ejecutado:** `npm run test:integration`
- **Suite:** `Integración de captura offline, persistencia JSON y transporte sintético` (`tests/integration/offline-sync.test.ts`)
- **Caso de prueba que falló:** `respuesta perdida: dos intentos recibidos producen un solo efecto remoto y dejan la inspección en synced`
- **Aserción fallida:** `assert.equal(receiver.effectsApplied, 1)` en `tests/integration/offline-sync.test.ts:209:12`
- **Valor esperado:** `1` efecto aplicado
- **Valor observado:** `2` efectos aplicados
- **Código de salida:** `1`

### Salida real observada en fallo

```text
> pwa-inspecciones-laboratorio@0.1.0 test:integration
> node scripts/run-tests.mjs integration

▶ Integración de captura offline, persistencia JSON y transporte sintético
  ✔ guardado offline persiste una inspección y una operación pendiente en JSON con cero envíos (13.8346ms)
  ✔ otra instancia de JsonSyncStorage y cola recupera exactamente el mismo registro y clave idempotente (5.1055ms)
  ✔ al sincronizar al reconectar aplica una sola vez y marca la inspección como synced sin operaciones pendientes (8.6039ms)
  ✔ ante un fallo recuperable conserva la operación, omite reintento prematuro y reenvía al vencer conservando identidad y contenido (6.8956ms)
  ✖ respuesta perdida: dos intentos recibidos producen un solo efecto remoto y dejan la inspección en synced (20.7132ms)
    AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    
    2 !== 1
    
        at TestContext.<anonymous> (C:\Users\javie\OneDrive\Documentos\Proyectos 10cimo\PWA\PWA-starter-9A-E05-preparado\tests\integration\offline-sync.test.ts:209:12)
        at async Test.run (node:internal/test_runner/test:797:9)
        at async Suite.processPendingSubtests (node:internal/test_runner/test:526:7) {
      generatedMessage: true,
      code: 'ERR_ASSERTION',
      actual: 2,
      expected: 1,
      operator: 'strictEqual'
    }

  ✔ reutilizar una clave idempotente ya aceptada con contenido diferente se rechaza sin alterar el resultado ni los datos originales (6.3937ms)
  ✔ conserva un conflicto remoto sin informar éxito falso ni aplicar efectos adicionales (3.3979ms)
✖ Integración de captura offline, persistencia JSON y transporte sintético (71.8474ms)
ℹ tests 15
ℹ suites 2
ℹ pass 14
ℹ fail 1
```

Este resultado confirma por qué no basta con verificar únicamente ` snapshot.inspections.length === 1` o el tamaño de un `Map` por ID: sin el contador separado `effectsApplied` y la aserción sobre el receptor sintético, la sobrescritura silenciosa habría ocultado que la operación se aplicó dos veces.

## 5. Restauración y verificación de recuperación (Resultado VERDE)

En la misma rama `w08/javier-defecto-controlado` se revirtió el commit defectuoso mediante:

```bash
git revert --no-edit 2d3a24ac2d22c7341b4287f8b84d23dd2d12ecf3
npm run test:integration
git push
```

- **Commit generado por el revert:** [`f9c908987a0b7bfa3d3aa0f2f34188d2ef605267`](https://github.com/imnotfrank-x/pwa-inspecciones-/commit/f9c908987a0b7bfa3d3aa0f2f34188d2ef605267)
- **Resultado local de `npm run test:integration`:** 15 pruebas ejecutadas en 2 suites, 15 aprobadas (`pass 15`, `fail 0`), código de salida `0`. En el caso `respuesta perdida: dos intentos recibidos producen un solo efecto remoto y dejan la inspección en synced` se restableció `attemptsReceived = 2`, `effectsApplied = 1`, `inspections.length = 1`, `syncState = "synced"` y `operations.length = 0`.
- **Resultado en GitHub Actions:** La ejecución [Run 40250381443](https://github.com/imnotfrank-x/pwa-inspecciones-/actions/runs/40250381443) sobre `f9c908987a0b7bfa3d3aa0f2f34188d2ef605267` volvió a estado verde (`success`).
