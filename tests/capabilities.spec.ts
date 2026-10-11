// @ts-nocheck
{
  const assert = require("node:assert/strict");
  const { existsSync, readFileSync } = require("node:fs");
  const { resolve } = require("node:path");
  const ts = require("typescript");

  const root = resolve(__dirname, "..");
  const cameraPath = resolve(root, "src/lib/device/camera.ts");
  const componentPath = resolve(
    root,
    "src/components/inspection-capabilities.tsx"
  );
  const detailPagePath = resolve(root, "src/app/inspecciones/[id]/page.tsx");
  const documentationPath = resolve(root, "docs/capabilities.md");
  const packageJson = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8")
  );

  const geolocationPath = resolve(root, "src/lib/device/geolocation.ts");

  for (const path of [
    cameraPath,
    geolocationPath,
    componentPath,
    detailPagePath,
    documentationPath
  ]) {
    assert.ok(existsSync(path), `Debe existir ${path}`);
  }

  assert.match(
    packageJson.scripts.test,
    /capabilities\.spec\.ts/,
    "npm test debe ejecutar capabilities.spec.ts"
  );

  const previousTsExtension = require.extensions[".ts"];
  require.extensions[".ts"] = function transpileTypeScript(module, filename) {
    const source = readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };

  const {
    CAMERA_EVIDENCE_MAX_BYTES,
    CAMERA_FILE_INPUT,
    getCameraAvailability,
    requestCameraAccess,
    stopCameraStream,
    validateCameraEvidence
  } = require(cameraPath);

  (async () => {
    let requestCount = 0;
    let receivedConstraints;
    const stream = {
      getTracks() {
        return [];
      }
    };
    const mediaDevices = {
      async getUserMedia(constraints) {
        requestCount += 1;
        receivedConstraints = constraints;
        return stream;
      }
    };

    assert.equal(
      requestCount,
      0,
      "importar el módulo no debe solicitar acceso a la cámara"
    );
    assert.deepEqual(getCameraAvailability({ mediaDevices }), {
      supported: true
    });
    assert.equal(
      requestCount,
      0,
      "consultar soporte no debe activar el permiso"
    );

    const access = await requestCameraAccess({ mediaDevices });
    assert.equal(access.status, "ready");
    assert.equal(access.stream, stream);
    assert.equal(requestCount, 1);
    assert.deepEqual(receivedConstraints, {
      audio: false,
      video: { facingMode: { ideal: "environment" } }
    });

    const unavailable = await requestCameraAccess({ mediaDevices: null });
    assert.equal(unavailable.status, "fallback");
    assert.equal(unavailable.reason, "unsupported");

    const denied = await requestCameraAccess({
      mediaDevices: {
        async getUserMedia() {
          throw { name: "NotAllowedError" };
        }
      }
    });
    assert.equal(denied.status, "fallback");
    assert.equal(denied.reason, "permission-denied");

    const failed = await requestCameraAccess({
      mediaDevices: {
        async getUserMedia() {
          throw new Error("fallo sintético");
        }
      }
    });
    assert.equal(failed.status, "fallback");
    assert.equal(failed.reason, "capture-error");

    assert.equal(CAMERA_FILE_INPUT.accept, "image/*");
    assert.equal(CAMERA_FILE_INPUT.capture, "environment");
    assert.equal(CAMERA_FILE_INPUT.multiple, false);

    const image = {
      name: "evidencia-sintetica.jpg",
      size: 128 * 1024,
      type: "image/jpeg"
    };
    const selected = validateCameraEvidence(image);
    assert.equal(selected.status, "selected");
    assert.equal(selected.file, image);
    assert.equal(selected.mimeType, "image/jpeg");
    assert.equal(selected.size, image.size);

    const cancelled = validateCameraEvidence(null);
    assert.equal(cancelled.status, "fallback");
    assert.equal(cancelled.reason, "cancelled");

    const invalidType = validateCameraEvidence({
      size: 100,
      type: "text/plain"
    });
    assert.equal(invalidType.status, "fallback");
    assert.equal(invalidType.reason, "invalid-type");

    const tooLarge = validateCameraEvidence({
      size: CAMERA_EVIDENCE_MAX_BYTES + 1,
      type: "image/png"
    });
    assert.equal(tooLarge.status, "fallback");
    assert.equal(tooLarge.reason, "too-large");

    const invalidFile = validateCameraEvidence({
      size: -1,
      type: "image/webp"
    });
    assert.equal(invalidFile.status, "fallback");
    assert.equal(invalidFile.reason, "invalid-file");
    assert.throws(
      () => validateCameraEvidence(image, 0),
      /maxBytes/,
      "un límite inválido debe fallar de forma explícita"
    );

    let stopped = 0;
    const stoppedTracks = stopCameraStream({
      getTracks() {
        return [
          { stop() { stopped += 1; } },
          { stop() { throw new Error("pista sintética defectuosa"); } },
          { stop() { stopped += 1; } }
        ];
      }
    });
    assert.equal(stopped, 2);
    assert.equal(stoppedTracks, 2);
    assert.equal(stopCameraStream(null), 0);

    // --- Pruebas del incremento de geolocalización (Semana 6) ---
    const {
      GEOLOCATION_OPTIONS,
      GEOLOCATION_DISPLAY_DECIMALS,
      GEOLOCATION_MESSAGES,
      roundCoordinate,
      toApproximateCoordinates,
      formatApproximateCoordinates,
      getGeolocationAvailability,
      requestApproximateLocation
    } = require(geolocationPath);

    // 1. Importar el módulo no solicita ubicación
    let geoRequestCount = 0;
    let geoWatchCount = 0;
    let receivedGeoOptions;

    const syntheticGeoProvider = {
      getCurrentPosition(successCallback, errorCallback, options) {
        geoRequestCount += 1;
        receivedGeoOptions = options;
        successCallback({
          coords: {
            latitude: 19.432608,
            longitude: -99.133209,
            accuracy: 14.8
          }
        });
      },
      watchPosition() {
        geoWatchCount += 1;
        throw new Error("watchPosition no debe ser invocado");
      }
    };

    assert.equal(
      geoRequestCount,
      0,
      "1. Importar el módulo no debe solicitar ubicación"
    );

    // 2. Consultar disponibilidad no solicita permiso
    const availability = getGeolocationAvailability({
      geolocation: syntheticGeoProvider
    });
    assert.deepEqual(availability, { supported: true });
    assert.equal(
      geoRequestCount,
      0,
      "2. Consultar disponibilidad no debe activar la solicitud de permiso"
    );

    // 3. La solicitud usa las opciones mínimas acordadas
    assert.deepEqual(GEOLOCATION_OPTIONS, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000
    });

    const successResult = await requestApproximateLocation({
      geolocation: syntheticGeoProvider
    });

    assert.equal(geoRequestCount, 1);
    assert.deepEqual(
      receivedGeoOptions,
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      },
      "3. La solicitud debe usar las opciones mínimas acordadas"
    );

    // 4. Una respuesta correcta produce coordenadas aproximadas (3 decimales)
    assert.equal(successResult.status, "success");
    assert.deepEqual(
      successResult.coordinates,
      {
        latitude: 19.433,
        longitude: -99.133,
        accuracyMeters: 15
      },
      "4. Una respuesta correcta produce coordenadas redondeadas a 3 decimales"
    );
    assert.equal(
      formatApproximateCoordinates(successResult.coordinates),
      "19.433, -99.133"
    );
    assert.equal(roundCoordinate(19.432608, 3), 19.433);

    // 5. El error 1 se transforma en permission-denied
    const deniedResult = await requestApproximateLocation({
      geolocation: {
        getCurrentPosition(_success, errorCallback) {
          errorCallback({ code: 1, message: "User denied Geolocation" });
        }
      }
    });
    assert.equal(
      deniedResult.status,
      "permission-denied",
      "5. El error 1 se transforma en permission-denied"
    );
    assert.equal(
      deniedResult.message,
      GEOLOCATION_MESSAGES["permission-denied"]
    );

    // 6. El error 2 se transforma en position-unavailable
    const unavailableResult = await requestApproximateLocation({
      geolocation: {
        getCurrentPosition(_success, errorCallback) {
          errorCallback({ code: 2, message: "Position unavailable" });
        }
      }
    });
    assert.equal(
      unavailableResult.status,
      "position-unavailable",
      "6. El error 2 se transforma en position-unavailable"
    );
    assert.equal(
      unavailableResult.message,
      GEOLOCATION_MESSAGES["position-unavailable"]
    );

    // 7. El error 3 se transforma en timeout
    const timeoutResult = await requestApproximateLocation({
      geolocation: {
        getCurrentPosition(_success, errorCallback) {
          errorCallback({ code: 3, message: "Timeout expired" });
        }
      }
    });
    assert.equal(
      timeoutResult.status,
      "timeout",
      "7. El error 3 se transforma en timeout"
    );
    assert.equal(timeoutResult.message, GEOLOCATION_MESSAGES.timeout);

    // 8. La ausencia de API produce unsupported
    const unsupportedAvailability = getGeolocationAvailability({
      geolocation: null
    });
    assert.equal(unsupportedAvailability.supported, false);
    assert.equal(unsupportedAvailability.reason, "unsupported");

    const unsupportedResult = await requestApproximateLocation({
      geolocation: null
    });
    assert.equal(
      unsupportedResult.status,
      "unsupported",
      "8. La ausencia de API produce unsupported"
    );

    // 9. No se utiliza watchPosition
    assert.equal(
      geoWatchCount,
      0,
      "9. No se debe llamar a watchPosition en ningún momento"
    );
    const geolocationModuleSource = readFileSync(geolocationPath, "utf8");
    assert.ok(
      !geolocationModuleSource.includes("watchPosition("),
      "9. El código del módulo de geolocalización no debe invocar watchPosition"
    );

    // 10. El componente incorpora botón, estados, fallback manual y nota de privacidad
    const component = readFileSync(componentPath, "utf8");
    const detailPage = readFileSync(detailPagePath, "utf8");
    assert.match(component, /^"use client";/);
    assert.match(component, /type="file"/);
    assert.match(component, /capture=\{CAMERA_FILE_INPUT\.capture\}/);
    assert.match(component, /validateCameraEvidence/);
    assert.match(component, /role="alert"/);
    assert.match(component, /No se ha enviado ni guardado permanentemente/);
    assert.match(detailPage, /<InspectionCapabilities/);

    // Validaciones de geolocalización en el componente
    assert.match(
      component,
      /Ubicación aproximada/,
      "10a. El componente debe tener la sección de Ubicación aproximada"
    );
    assert.match(
      component,
      /Usar ubicación actual/,
      "10b. El componente debe tener el botón Usar ubicación actual"
    );
    assert.match(
      component,
      /Obteniendo ubicación/,
      "10c. El componente debe manejar el estado de carga"
    );
    assert.match(
      component,
      /Referencia manual \(opcional\)/,
      "10d. El componente debe ofrecer alternativa manual para escribir referencia"
    );
    assert.match(
      component,
      /Privacidad: la ubicación no se guarda ni se transmite/,
      "10e. El componente debe incluir la nota de privacidad de ubicación"
    );
    assert.match(
      component,
      /aria-live="polite"/,
      "10f. El componente debe usar aria-live para retroalimentación accesible"
    );
    assert.match(
      component,
      /role="status"/,
      "10g. El componente debe usar role=status para mensajes de estado"
    );

    console.log(
      "capabilities.spec.ts: cámara opcional + geolocalización opcional PASS"
    );
  })()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => {
      if (previousTsExtension) {
        require.extensions[".ts"] = previousTsExtension;
      } else {
        delete require.extensions[".ts"];
      }

      delete require.cache[cameraPath];
      delete require.cache[geolocationPath];
    });
}
