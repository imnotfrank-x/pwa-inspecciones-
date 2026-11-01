const isDevelopment = process.env.NODE_ENV === "development";

export const PERMISSIONS_POLICY_VALUE =
  "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()";

export function buildContentSecurityPolicy(options = {}) {
  const dev = options.isDevelopment ?? isDevelopment;
  const scriptSrc = dev
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

export function buildSecurityHeaders(options = {}) {
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders()
      }
    ];
  }
};

export default nextConfig;
