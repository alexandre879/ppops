import { intlLocale, type Locale } from "./config";
import en, { type Dictionary } from "./dictionaries/en";
import ka from "./dictionaries/ka";
import ru from "./dictionaries/ru";

const dictionaries: Record<Locale, Dictionary> = { ka, en, ru };

export type { Dictionary };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** fmt("from {price} GEL", { price: 40 }) → "from 40 GEL" */
export function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Picks the CLDR plural form ("one", "few", "many", "other") for the locale. */
export function plural(locale: Locale, forms: Record<string, string>, n: number) {
  const form = new Intl.PluralRules(intlLocale[locale]).select(n);
  return fmt(forms[form] ?? forms.other, { n: n.toLocaleString(intlLocale[locale]) });
}

export function label(map: Record<string, string>, value: string | null | undefined, fallback?: string | null) {
  if (!value) return fallback ?? "";
  return map[value] ?? fallback ?? value;
}
