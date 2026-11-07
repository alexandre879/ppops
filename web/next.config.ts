import type { NextConfig } from "next";

// Where the browser-facing /api/public and /media requests are proxied in
// development. In Docker, nginx routes these before they reach Next.js.
const backend = process.env.API_PROXY_TARGET ?? "http://localhost:8000";


// Sent with every response. HSTS only over HTTPS (nginx/TLS proxy sets X-Forwarded-Proto).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
const hsts = { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" };
const overHttps = [{ type: "header" as const, key: "x-forwarded-proto", value: "https" }];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Django URLs end with a slash; keep them intact when proxying.
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/:path*", has: overHttps, headers: [hsts] },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/public/:path*/", destination: `${backend}/api/public/:path*/` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
    ];
  },
};

export default nextConfig;
