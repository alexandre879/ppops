import type { MetadataRoute } from "next";

import { defaultLocale } from "@/i18n/config";
import { getSite } from "@/lib/api";

// The company name and tagline are edited in the admin, so read them per request.
export const dynamic = "force-dynamic";

/** Name, icon and colours used when a visitor adds the website to their phone's home screen. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getSite(defaultLocale);
  return {
    name: site.company_name,
    short_name: site.company_name,
    description: site.tagline,
    lang: defaultLocale,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f26b1d",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
