import type { MetadataRoute } from "next";

import { defaultLocale, locales } from "@/i18n/config";
import { LEGAL_SLUGS } from "@/i18n/legal";
import { getCategories, getProjects } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const [categories, projects] = await Promise.all([getCategories(defaultLocale), getProjects(defaultLocale)]);
  const paths = [
    "",
    "/services",
    "/projects",
    "/manufacturing",
    "/about",
    "/contact",
    ...LEGAL_SLUGS.map((slug) => `/${slug}`),
    ...categories.flatMap((c) => c.services.map((s) => `/services/${s.slug}`)),
    ...projects.map((p) => `/projects/${p.slug}`),
  ];
  // One entry per language, each listing its translations (hreflang).
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : path.split("/").length > 2 ? 0.6 : 0.8,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
    })),
  );
}
