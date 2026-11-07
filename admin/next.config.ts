import type { NextConfig } from "next";

// The admin talks to Django through same-origin /api and /media paths, so the
// httpOnly refresh cookie works without CORS. In Docker, nginx routes these
// before they reach Next.js; in development Next.js proxies them.
const backend = process.env.API_PROXY_TARGET ?? "http://localhost:8000";


// Sent with every response. HSTS only over HTTPS (nginx/TLS proxy sets X-Forwarded-Proto).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
const hsts = { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" };
const overHttps = [{ type: "header" as const, key: "x-forwarded-proto", value: "https" }];
// The admin keeps Next.js inline scripts, so its policy restricts framing, plugins and form
// targets rather than scripts; the public website carries the full nonce-based policy.
const adminCsp = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${backend}/api/:path*/` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy", value: adminCsp },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/:path*", has: overHttps, headers: [hsts] },
    ];
  },
};

export default nextConfig;
