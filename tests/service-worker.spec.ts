const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");

const root = resolve(__dirname, "..");

function readProjectFile(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

const packageJson = JSON.parse(readProjectFile("package.json"));
const registrationModule = readProjectFile(
  "src/lib/pwa/register-service-worker.ts"
);
const registrationComponent = readProjectFile(
  "src/components/service-worker-registration.tsx"
);
const layout = readProjectFile("src/app/layout.tsx");
const serviceWorker = readProjectFile("public/sw.js");

assert.match(
  packageJson.scripts.test,
  /service-worker\.spec\.ts/,
  "npm test debe ejecutar la prueba del Service Worker"
);

assert.match(registrationModule, /typeof window === "undefined"/);
assert.match(registrationModule, /"serviceWorker" in navigator/);
assert.match(
  registrationModule,
  /serviceWorker\.register\("\/sw\.js",\s*\{\s*scope:\s*"\/"/s,
  "El registro debe usar /sw.js con alcance /"
);
assert.match(
  registrationModule,
  /catch \(error\)/,
  "Los errores del registro deben capturarse"
);
assert.match(
  registrationModule,
  /registration\.waiting/,
  "Debe detectarse un worker que ya se encuentra esperando"
);
assert.match(registrationModule, /"updatefound"/);
assert.match(registrationModule, /state === "installed"/);
assert.match(
  registrationModule,
  /navigator\.serviceWorker\.controller/,
  "La primera instalación no debe anunciarse como actualización"
);
assert.match(
  registrationModule,
  /postMessage\(\{ type: "SKIP_WAITING" \}\)/,
  "La activación manual debe enviar el mensaje esperado"
);

assert.match(
  registrationComponent,
  /^"use client";/,
  "El registro desde React debe ser un componente cliente"
);
assert.match(registrationComponent, /useEffect\(\(\) =>/);
assert.match(registrationComponent, /registerServiceWorker\(/);
assert.match(registrationComponent, /"controllerchange"/);
assert.match(registrationComponent, /useRef\(false\)/);
assert.match(registrationComponent, /removeEventListener\(/);
assert.match(registrationComponent, /return null;/);
assert.doesNotMatch(
  registrationComponent,
  /addEventListener\(\s*["']load["']/,
  "El registro no debe depender exclusivamente del evento load"
);

assert.match(
  layout,
  /import \{ ServiceWorkerRegistration \} from "\.\.\/components\/service-worker-registration"/
);
assert.match(
  layout,
  /<ServiceWorkerRegistration \/>/,
  "El layout debe montar el componente de registro"
);
assert.doesNotMatch(
  layout,
  /^"use client";/,
  "El layout debe permanecer como Server Component"
);

const listeners = new Map();
const deletedCaches = [];
let precacheUrls = [];
let rejectPrecache = false;
let claimCalls = 0;
let skipWaitingCalls = 0;

const caches = {
  async open() {
    return {
      async addAll(urls) {
        precacheUrls = [...urls];

        if (rejectPrecache) {
          throw new Error("fallo de precarga simulado");
        }
      },
      async put() {}
    };
  },
  async keys() {
    return [
      "labinspect-precache-w03-v1",
      "labinspect-runtime-w03-v1",
      "labinspect-precache-w02-antigua",
      "cache-externa"
    ];
  },
  async delete(cacheName) {
    deletedCaches.push(cacheName);
    return true;
  },
  async match() {
    return undefined;
  }
};

const self = {
  location: { origin: "https://labinspect.test" },
  clients: {
    async claim() {
      claimCalls += 1;
    }
  },
  addEventListener(eventName, handler) {
    listeners.set(eventName, handler);
  },
  skipWaiting() {
    skipWaitingCalls += 1;
  }
};

vm.runInContext(
  serviceWorker,
  vm.createContext({
    URL,
    caches,
    console,
    fetch: async () => {
      throw new Error("fetch no esperado");
    },
    Promise,
    Set,
    self
  }),
  { filename: "public/sw.js" }
);

for (const eventName of ["install", "activate", "fetch", "message"]) {
  assert.equal(
    typeof listeners.get(eventName),
    "function",
    `El Service Worker debe registrar el evento ${eventName}`
  );
}

async function runWaitUntilEvent(eventName, event) {
  let operation;

  listeners.get(eventName)({
    ...event,
    waitUntil(promise) {
      operation = promise;
    }
  });

  assert.ok(operation, `${eventName} debe utilizar waitUntil`);
  return operation;
}

(async () => {
  await runWaitUntilEvent("install", {});

  for (const expectedUrl of [
    "/",
    "/offline.html",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
  ]) {
    assert.ok(
      precacheUrls.includes(expectedUrl),
      `La precarga debe incluir ${expectedUrl}`
    );
  }

  rejectPrecache = true;
  await assert.rejects(
    runWaitUntilEvent("install", {}),
    /fallo de precarga simulado/,
    "Un fallo de cache.addAll debe hacer fallar la instalación"
  );
  rejectPrecache = false;

  await runWaitUntilEvent("activate", {});
  assert.deepEqual(deletedCaches, ["labinspect-precache-w02-antigua"]);
  assert.equal(claimCalls, 1, "activate debe reclamar los clientes");

  listeners.get("message")({ data: { type: "OTRO_MENSAJE" } });
  assert.equal(skipWaitingCalls, 0);

  listeners.get("message")({ data: { type: "SKIP_WAITING" } });
  assert.equal(skipWaitingCalls, 1);

  let intercepted = false;
  listeners.get("fetch")({
    request: {
      method: "POST",
      url: "https://labinspect.test/registro"
    },
    respondWith() {
      intercepted = true;
    }
  });
  assert.equal(
    intercepted,
    false,
    "Las peticiones distintas de GET no deben interceptarse"
  );

  console.log("service-worker.spec.ts: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
