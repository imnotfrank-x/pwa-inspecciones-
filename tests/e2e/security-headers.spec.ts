import { expect, test } from "@playwright/test";
import {
  PERMISSIONS_POLICY_DIRECTIVES,
  PERMISSIONS_POLICY_VALUE,
  REQUIRED_CSP_DIRECTIVES,
  parseCspDirectives,
  parsePermissionsPolicy
} from "../../src/lib/security/headers";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

function assertResponseSecurityHeaders(
  headers: Record<string, string>,
  routeLabel: string
) {
  const csp = headers["content-security-policy"];
  expect(csp, `Falta Content-Security-Policy en ${routeLabel}`).toBeTruthy();

  const directives = parseCspDirectives(csp);
  for (const required of REQUIRED_CSP_DIRECTIVES) {
    expect(
      directives[required],
      `Falta directiva ${required} en ${routeLabel}`
    ).toBeDefined();
  }

  expect(directives["default-src"]).toEqual(["'self'"]);
  expect(directives["script-src"]).toEqual(["'self'", "'unsafe-inline'"]);
  expect(directives["script-src"]).not.toContain("'unsafe-eval'");
  expect(directives["style-src"]).toEqual(["'self'", "'unsafe-inline'"]);
  expect(directives["img-src"]).toEqual(["'self'", "data:", "blob:"]);
  expect(directives["connect-src"]).toEqual(["'self'"]);
  expect(directives["worker-src"]).toEqual(["'self'"]);
  expect(directives["manifest-src"]).toEqual(["'self'"]);
  expect(directives["object-src"]).toEqual(["'none'"]);
  expect(directives["base-uri"]).toEqual(["'self'"]);
  expect(directives["form-action"]).toEqual(["'self'"]);
  expect(directives["frame-ancestors"]).toEqual(["'none'"]);

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");

  const permissionsPolicy = headers["permissions-policy"];
  expect(permissionsPolicy).toBe(PERMISSIONS_POLICY_VALUE);
  const parsedPermissions = parsePermissionsPolicy(permissionsPolicy);
  expect(parsedPermissions).toEqual(PERMISSIONS_POLICY_DIRECTIVES);
  expect(parsedPermissions).not.toHaveProperty("notifications");
}

test("aplica CSP y cabeceras en todas las rutas y mantiene operativas captura, SSR, capacidades y Service Worker sin errores de CSP", async ({
  context,
  request
}) => {
  for (const route of [
    "/",
    "/inspecciones",
    "/inspecciones/inspection-001",
    "/sw.js",
    "/manifest.webmanifest",
    "/offline.html"
  ]) {
    const response = await request.get(route);
    expect(response.ok(), `Respuesta no exitosa en ${route}`).toBe(true);
    assertResponseSecurityHeaders(response.headers(), route);
  }

  await context.addInitScript(() => {
    const win = window as Window & {
      __cspViolations?: Array<{ effectiveDirective: string; blockedURI: string }>;
      __xssExecuted?: boolean;
    };
    win.__cspViolations = [];
    window.addEventListener("securitypolicyviolation", (event) => {
      win.__cspViolations?.push({
        effectiveDirective: event.effectiveDirective,
        blockedURI: event.blockedURI
      });
    });

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(
          success: (pos: {
            coords: { latitude: number; longitude: number; accuracy: number };
          }) => void
        ) {
          success({
            coords: {
              latitude: 32.51494,
              longitude: -117.03824,
              accuracy: 18
            }
          });
        }
      }
    });

    class SyntheticNotification {
      static permission: NotificationPermission = "default";
      static async requestPermission(): Promise<NotificationPermission> {
        SyntheticNotification.permission = "granted";
        return "granted";
      }
      title: string;
      options?: NotificationOptions;
      constructor(title: string, options?: NotificationOptions) {
        this.title = title;
        this.options = options;
      }
    }

    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: SyntheticNotification
    });
  });

  const page = await context.newPage();
  const pageErrors: string[] = [];
  const cspConsoleErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (msg) => {
    if (
      msg.type() === "error" &&
      /Content Security Policy|securitypolicyviolation|Refused to/i.test(
        msg.text()
      )
    ) {
      cspConsoleErrors.push(msg.text());
    }
  });

  const inspectionsResponse = await page.goto("/inspecciones");
  expect(inspectionsResponse).not.toBeNull();
  assertResponseSecurityHeaders(
    inspectionsResponse!.headers(),
    "navegación /inspecciones"
  );

  await expect(
    page.getByRole("heading", { name: "Registrar inspección" })
  ).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  const xssPayload =
    'Hallazgo <script>window.__xssExecuted = true</script><img src="x" onerror="window.__xssExecuted = true">';
  await page.getByLabel("Laboratorio sintético").fill("Laboratorio CSP Alfa");
  await page.getByLabel("Alias sintético del inspector").fill("Inspector CSP");
  await page.getByLabel("Fecha de inspección").fill("2026-10-31");
  await page.getByLabel("Condición").selectOption("ok");
  await page.getByLabel("Número de hallazgos").fill("0");
  await page.getByLabel("Descripción sintética").fill(xssPayload);
  await page.getByRole("button", { name: "Guardar en este dispositivo" }).click();

  const savedItem = page.locator(".local-inspection-list li", {
    hasText: "Laboratorio CSP Alfa"
  });
  await expect(savedItem).toHaveCount(1);
  await expect(savedItem).toContainText(xssPayload);
  expect(
    await page.evaluate(
      () => (window as Window & { __xssExecuted?: boolean }).__xssExecuted
    )
  ).toBeUndefined();

  const detailResponse = await page.goto("/inspecciones/inspection-001");
  expect(detailResponse).not.toBeNull();
  assertResponseSecurityHeaders(
    detailResponse!.headers(),
    "navegación /inspecciones/inspection-001"
  );

  await expect(
    page.getByRole("heading", { name: "Laboratorio de Redes" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Datos de la inspección" })
  ).toBeVisible();

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "evidencia-sintetica.png",
    mimeType: "image/png",
    buffer: ONE_PIXEL_PNG
  });
  await expect(
    page.getByText(/Evidencia lista en memoria: image\/png/)
  ).toBeVisible();

  await page.getByRole("button", { name: "Usar ubicación actual" }).click();
  await expect(
    page.getByText(/Ubicación aproximada: 32\.515, -117\.038/)
  ).toBeVisible();

  await page.getByRole("button", { name: "Activar notificaciones" }).click();
  await expect(
    page.getByRole("button", { name: "Mostrar notificación de prueba" })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mostrar notificación de prueba" })
    .click();
  await expect(
    page.getByText(/Notificación sintética mostrada mediante/)
  ).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(cspConsoleErrors).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        (
          window as Window & {
            __cspViolations?: Array<{
              effectiveDirective: string;
              blockedURI: string;
            }>;
          }
        ).__cspViolations ?? []
    )
  ).toEqual([]);

  const blockedViolation = await page.evaluate(
    () =>
      new Promise<{ effectiveDirective: string; blockedURI: string }>(
        (resolveViolation) => {
          window.addEventListener(
            "securitypolicyviolation",
            (event) => {
              resolveViolation({
                effectiveDirective: event.effectiveDirective,
                blockedURI: event.blockedURI
              });
            },
            { once: true }
          );
          const script = document.createElement("script");
          script.src = "https://example.com/external-untrusted.js";
          document.head.appendChild(script);
        }
      )
  );

  expect(blockedViolation.effectiveDirective).toContain("script-src");
  expect(blockedViolation.blockedURI).toBe(
    "https://example.com/external-untrusted.js"
  );
});
