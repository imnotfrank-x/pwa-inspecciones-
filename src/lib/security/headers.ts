export type SecurityHeader = Readonly<{
  key: string;
  value: string;
}>;

export type SecurityHeadersOptions = Readonly<{
  isDevelopment?: boolean;
}>;

export const REQUIRED_CSP_DIRECTIVES = [
  "default-src",
  "script-src",
  "style-src",
  "img-src",
  "connect-src",
  "worker-src",
  "manifest-src",
  "object-src",
  "base-uri",
  "form-action",
  "frame-ancestors"
] as const;

export const PERMISSIONS_POLICY_DIRECTIVES = Object.freeze({
  camera: "(self)",
  geolocation: "(self)",
  microphone: "()",
  payment: "()",
  usb: "()"
});

export const PERMISSIONS_POLICY_VALUE =
  "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()";

export function buildContentSecurityPolicy(
  options: SecurityHeadersOptions = {}
): string {
  const scriptSrc = options.isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; ");
}

export function buildSecurityHeaders(
  options: SecurityHeadersOptions = {}
): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(options)
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff"
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin"
    },
    {
      key: "X-Frame-Options",
      value: "DENY"
    },
    {
      key: "Permissions-Policy",
      value: PERMISSIONS_POLICY_VALUE
    }
  ];
}

export function parseCspDirectives(
  policy: string
): Record<string, string[]> {
  const directives: Record<string, string[]> = {};
  for (const rawSegment of policy.split(";")) {
    const trimmed = rawSegment.trim();
    if (!trimmed) continue;
    const [name, ...tokens] = trimmed.split(/\s+/);
    directives[name.toLowerCase()] = tokens;
  }
  return directives;
}

export function parsePermissionsPolicy(
  policy: string
): Record<string, string> {
  const features: Record<string, string> = {};
  for (const rawItem of policy.split(",")) {
    const trimmed = rawItem.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const name = trimmed.slice(0, separatorIndex).trim().toLowerCase();
    const allowlist = trimmed.slice(separatorIndex + 1).trim();
    features[name] = allowlist;
  }
  return features;
}
