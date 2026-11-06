import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Noto_Sans_Georgian } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AiAssistant } from "@/components/ai-assistant";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isLocale, languageAlternates, ogLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCategories, getSite } from "@/lib/api";

import "../globals.css";

// Content is edited live in the admin platform, so pages render on request.
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-manrope", display: "swap" });
const georgian = Noto_Sans_Georgian({ subsets: ["georgian"], variable: "--font-georgian", display: "swap" });

// Runs before the page paints. Scroll-reveal content is hidden only under "js"; if the reveal
// script has not started within 4 s (blocked or failed), the class goes and everything shows.
const REVEAL_BOOT = `document.documentElement.classList.add("js");setTimeout(function(){if(!window.__nhmReveal)document.documentElement.classList.remove("js")},4000)`;

type Props = { children: ReactNode; params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const site = await getSite(lang);
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    title: { default: [site.company_name, site.tagline].filter(Boolean).join(" — "), template: `%s | ${site.company_name}` },
    description: site.hero_subtitle,
    openGraph: { siteName: site.company_name, type: "website", locale: ogLocale[lang] },
    alternates: languageAlternates(),
  };
}

export const viewport: Viewport = { themeColor: "#f26b1d" };

export default async function LocaleLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const [site, categories] = await Promise.all([getSite(lang), getCategories(lang)]);
  return (
    <html lang={lang} className={`${inter.variable} ${manrope.variable} ${georgian.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOT }} />
        <a
          href="#main"
          className="sr-only z-[60] rounded-md bg-brand-500 px-4 py-2 font-semibold text-stone-950 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {dict.header.skip}
        </a>
        <SiteHeader lang={lang} phones={site.phones.slice(0, 2)} nav={dict.nav} t={dict.header} />
        <main id="main">{children}</main>
        <SiteFooter lang={lang} dict={dict} site={site} categories={categories} />
        <ScrollReveal />
        <AiAssistant lang={lang} t={dict.assistant} phones={site.phones} company={site.company_name} />
      </body>
    </html>
  );
}
