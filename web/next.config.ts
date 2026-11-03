import type { NextConfig } from "next";

// Where the browser-facing /api/public and /media requests are proxied in
// development. In Docker, nginx routes these before they reach Next.js.
const backend = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Django URLs end with a slash; keep them intact when proxying.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/public/:path*/", destination: `${backend}/api/public/:path*/` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
    ];
  },
};

export default nextConfig;
