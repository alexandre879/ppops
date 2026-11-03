"use client";

import clsx from "clsx";
import { usePathname, useSearchParams } from "next/navigation";

import { localeNames, localeShort, locales, type Locale } from "@/i18n/config";

/** Links to the same page in each language (the proxy remembers the choice). */
export function LanguageSwitcher({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const rest = pathname.replace(/^\/(ka|en|ru)(?=\/|$)/, "");

  return (
    <nav aria-label={label} className="flex items-center gap-0.5 rounded-full bg-white/8 p-1 ring-1 ring-white/10">
      {locales.map((locale) => (
        <a
          key={locale}
          href={`/${locale}${rest}${search ? `?${search}` : ""}`}
          hrefLang={locale}
          lang={locale}
          aria-current={locale === lang ? "true" : undefined}
          title={localeNames[locale]}
          className={clsx(
            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-300",
            locale === lang ? "bg-white text-stone-950 shadow-sm" : "text-stone-300 hover:text-white",
          )}
        >
          {localeShort[locale]}
        </a>
      ))}
    </nav>
  );
}
