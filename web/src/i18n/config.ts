export const locales = ["ka", "en", "ru"] as const;
export type Locale = (typeof locales)[number];

/** Georgian first: the company's home market. */
export const defaultLocale: Locale = "ka";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_HEADER = "x-nhm-locale";

export const localeNames: Record<Locale, string> = { ka: "ქართული", en: "English", ru: "Русский" };
export const localeShort: Record<Locale, string> = { ka: "ქარ", en: "EN", ru: "RU" };
export const intlLocale: Record<Locale, string> = { ka: "ka-GE", en: "en-GB", ru: "ru-RU" };
export const ogLocale: Record<Locale, string> = { ka: "ka_GE", en: "en_US", ru: "ru_RU" };

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale);
}

/** "/services" → "/ka/services" */
export function localePath(locale: Locale, path = "") {
  return `/${locale}${path === "/" ? "" : path}`;
}

/** hreflang alternates for page metadata. */
export function languageAlternates(path = "") {
  return {
    languages: {
      ...Object.fromEntries(locales.map((locale) => [locale, localePath(locale, path)])),
      "x-default": localePath(defaultLocale, path),
    },
  };
}
