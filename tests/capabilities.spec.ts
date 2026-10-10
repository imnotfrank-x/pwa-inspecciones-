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

  for (const path of [cameraPath, componentPath, detailPagePath, documentationPath]) {
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

    const component = readFileSync(componentPath, "utf8");
    const detailPage = readFileSync(detailPagePath, "utf8");
    assert.match(component, /^"use client";/);
    assert.match(component, /type="file"/);
    assert.match(component, /capture=\{CAMERA_FILE_INPUT\.capture\}/);
    assert.match(component, /validateCameraEvidence/);
    assert.match(component, /role="alert"/);
    assert.match(component, /No se ha enviado ni guardado permanentemente/);
    assert.match(detailPage, /<InspectionCapabilities/);

    console.log("capabilities.spec.ts: cámara opcional + fallback PASS");
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
    });
}
