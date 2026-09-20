const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");

const root = resolve(__dirname, "..");

function readProjectFile(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function createResponse(body = "ok", options = {}) {
  return {
    body,
    ok: options.ok ?? true,
    type: options.type ?? "basic",
    clone() {
      return createResponse(body, options);
    }
  };
}

function createRequest(url, options = {}) {
  return {
    method: options.method ?? "GET",
    url,
    mode: options.mode ?? "same-origin",
    headers: new Headers(options.headers ?? {})
  };
}

const offlineHtml = readProjectFile("public/offline.html");
const serviceWorker = readProjectFile("public/sw.js");
const packageJson = JSON.parse(readProjectFile("package.json"));

assert.match(
  offlineHtml,
  /<html\s+lang="es-MX">/i,
  'offline.html debe declarar lang="es-MX"'
);

assert.match(
  offlineHtml,
  /<h1[^>]*>\s*Sin conexión\s*<\/h1>/i,
  "offline.html debe mostrar el mensaje Sin conexión"
);

assert.match(
  offlineHtml,
  /<a[^>]+href="\/"[^>]*>/i,
  "offline.html debe incluir un enlace hacia /"
);

assert.doesNotMatch(
  offlineHtml,
  /https?:\/\//i,
  "offline.html no debe depender de recursos externos"
);

assert.doesNotMatch(
  offlineHtml,
  /```/,
  "offline.html no debe contener marcas de Markdown"
);

assert.match(
  serviceWorker,
  /const OFFLINE_FALLBACK_URL = "\/offline\.html"/,
  "El Service Worker debe declarar /offline.html como fallback"
);

assert.match(
  packageJson.scripts.test,
  /offline\.spec\.ts/,
  "npm test debe ejecutar la prueba offline"
);

const listeners = new Map();
const cacheStore = new Map();
const fetchCalls = [];

let respondWithCalls = 0;
let rejectPrecache = false;

let fetchBehavior = async () => {
  throw new Error("fetch no configurado");
};

function cloneResponse(response) {
  return response?.clone ? response.clone() : response;
}

function getCacheKey(request) {
  return typeof request === "string" ? request : request.url;
}

function createCache() {
  return {
    async addAll(urls) {
      if (rejectPrecache) {
        throw new Error("fallo de precarga simulado");
      }

      for (const url of urls) {
        cacheStore.set(url, createResponse(`precached:${url}`));
      }
    },

    async put(request, response) {
      cacheStore.set(getCacheKey(request), cloneResponse(response));
    }
  };
}

const caches = {
  async open() {
    return createCache();
  },

  async match(request) {
    return cacheStore.get(getCacheKey(request));
  },

  async keys() {
    return [
      "labinspect-precache-w03-v1",
      "labinspect-runtime-w03-v1"
    ];
  },

  async delete() {
    return true;
  }
};

const self = {
  location: {
    origin: "https://labinspect.test"
  },

  clients: {
    async claim() {}
  },

  addEventListener(eventName, handler) {
    listeners.set(eventName, handler);
  },

  skipWaiting() {}
};

const context = vm.createContext({
  URL,
  Headers,
  caches,
  console,

  fetch: async (request) => {
    fetchCalls.push(request);
    return fetchBehavior(request);
  },

  Promise,
  Set,
  self
});

vm.runInContext(serviceWorker, context, {
  filename: "public/sw.js"
});

for (const eventName of ["install", "activate", "fetch", "message"]) {
  assert.equal(
    typeof listeners.get(eventName),
    "function",
    `El Service Worker debe registrar el evento ${eventName}`
  );
}

async function dispatchWaitUntil(eventName) {
  let operation;

  listeners.get(eventName)({
    waitUntil(promise) {
      operation = Promise.resolve(promise);
    }
  });

  assert.ok(
    operation,
    `${eventName} debe utilizar waitUntil`
  );

  await operation;
}

async function dispatchFetch(request) {
  let responsePromise;

  listeners.get("fetch")({
    request,

    respondWith(promise) {
      respondWithCalls += 1;
      responsePromise = Promise.resolve(promise);
    }
  });

  return responsePromise;
}

async function expectIntercepted(request) {
  const before = respondWithCalls;
  const responsePromise = await dispatchFetch(request);

  assert.equal(
    respondWithCalls,
    before + 1,
    `La petición ${request.url} debe ser interceptada`
  );

  assert.ok(
    responsePromise,
    `La petición ${request.url} debe producir una respuesta`
  );

  return responsePromise;
}

async function expectNotIntercepted(request) {
  const before = respondWithCalls;
  const responsePromise = await dispatchFetch(request);

  assert.equal(
    respondWithCalls,
    before,
    `La petición ${request.url} no debe ser interceptada`
  );

  assert.equal(
    responsePromise,
    undefined,
    `La petición ${request.url} no debe producir respondWith`
  );
}

async function main() {
  cacheStore.clear();
  rejectPrecache = false;

  await dispatchWaitUntil("install");

  assert.ok(
    cacheStore.has("/offline.html"),
    "La instalación debe precargar /offline.html"
  );

  cacheStore.clear();
  rejectPrecache = true;

  await assert.rejects(
    () => dispatchWaitUntil("install"),
    /fallo de precarga simulado/,
    "La instalación debe propagar un fallo de precarga"
  );

  rejectPrecache = false;
  cacheStore.clear();

  let networkResponse = createResponse("respuesta-de-red");

  fetchBehavior = async () => networkResponse;

  const navigationRequest = createRequest(
    "https://labinspect.test/inspecciones",
    {
      mode: "navigate"
    }
  );

  const navigationResponse =
    await expectIntercepted(navigationRequest);

  assert.equal(
    navigationResponse.body,
    "respuesta-de-red",
    "Con conexión, Network First debe devolver la respuesta de red"
  );

  assert.ok(
    cacheStore.has(navigationRequest.url),
    "La navegación obtenida de red debe almacenarse en runtime"
  );

  cacheStore.set(
    navigationRequest.url,
    createResponse("pagina-cacheada")
  );

  fetchBehavior = async () => {
    throw new Error("sin conexión");
  };

  const cachedNavigationResponse =
    await expectIntercepted(navigationRequest);

  assert.equal(
    cachedNavigationResponse.body,
    "pagina-cacheada",
    "Sin conexión, debe devolverse la navegación almacenada"
  );

  cacheStore.delete(navigationRequest.url);

  cacheStore.set(
    "/",
    createResponse("pagina-principal-cacheada")
  );

  const rootFallbackResponse =
    await expectIntercepted(navigationRequest);

  assert.equal(
    rootFallbackResponse.body,
    "pagina-principal-cacheada",
    "Si la ruta exacta no existe, debe usarse la página principal almacenada"
  );

  cacheStore.delete("/");

  cacheStore.set(
    "/offline.html",
    createResponse("fallback-offline")
  );

  const offlineFallbackResponse =
    await expectIntercepted(navigationRequest);

  assert.equal(
    offlineFallbackResponse.body,
    "fallback-offline",
    "El fallback final debe ser /offline.html"
  );

  cacheStore.set(
    "https://labinspect.test/_next/static/chunks/app.js",
    createResponse("recurso-estatico")
  );

  const staticRequest = createRequest(
    "https://labinspect.test/_next/static/chunks/app.js"
  );

  const staticResponse =
    await expectIntercepted(staticRequest);

  assert.equal(
    staticResponse.body,
    "recurso-estatico",
    "Los recursos estáticos deben usar Cache First"
  );

  const networkCallsBeforeStatic = fetchCalls.length;

  cacheStore.set(
    "https://labinspect.test/_next/static/chunks/new.js",
    createResponse("nuevo-recurso")
  );

  await expectIntercepted(
    createRequest(
      "https://labinspect.test/_next/static/chunks/new.js"
    )
  );

  assert.equal(
    fetchCalls.length,
    networkCallsBeforeStatic,
    "Cache First no debe consultar la red cuando el recurso ya está almacenado"
  );

  cacheStore.delete(
    "https://labinspect.test/_next/static/chunks/missing.js"
  );

  fetchBehavior = async () =>
    createResponse("recurso-estatico-desde-red");

  const missingStaticRequest = createRequest(
    "https://labinspect.test/_next/static/chunks/missing.js"
  );

  const missingStaticResponse =
    await expectIntercepted(missingStaticRequest);

  assert.equal(
    missingStaticResponse.body,
    "recurso-estatico-desde-red",
    "Si un recurso estático no está en caché, debe consultarse la red"
  );

  assert.ok(
    cacheStore.has(missingStaticRequest.url),
    "La respuesta estática obtenida de red debe guardarse en runtime"
  );

  await expectNotIntercepted(
    createRequest(
      "https://labinspect.test/registro",
      {
        method: "POST"
      }
    )
  );

  await expectNotIntercepted(
    createRequest(
      "https://labinspect.test/api/inspecciones"
    )
  );

  await expectNotIntercepted(
    createRequest(
      "https://example.com/recurso.js"
    )
  );

  await expectNotIntercepted(
    createRequest(
      "https://labinspect.test/privado",
      {
        headers: {
          Authorization: "Bearer ejemplo"
        }
      }
    )
  );

  for (const sensitiveKey of [
    "token",
    "password",
    "secret",
    "api_key"
  ]) {
    await expectNotIntercepted(
      createRequest(
        `https://labinspect.test/recurso?${sensitiveKey}=ejemplo`
      )
    );
  }

  console.log("offline.spec.ts: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
