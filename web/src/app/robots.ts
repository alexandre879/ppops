import type { MetadataRoute } from "next";

// Read SITE_URL per request: it isn't set when the image is built.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/django-admin/", "/api/"] }, sitemap: `${base}/sitemap.xml` };
}
