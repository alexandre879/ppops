/**
 * Admin interface translations (Georgian, English, Russian).
 *
 * Strings are written in English in the code — t("Save") — and looked up in the
 * Georgian/Russian catalogs, falling back to English. The language is read once
 * at startup; switching saves the choice and reloads the app, so module-level
 * labels (table columns, form fields) are always in the current language.
 */
import ka from "./i18n/ka";
import ru from "./i18n/ru";

export type Lang = "ka" | "en" | "ru";
export type Catalog = Record<string, string | Record<string, string>>;

export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: "ka", label: "ქართული", short: "ქარ" },
  { code: "en", label: "English", short: "EN" },
  { code: "ru", label: "Русский", short: "RU" },
];

const STORAGE_KEY = "nhm_admin_lang";
const CATALOGS: Record<Lang, Catalog> = { ka, en: {}, ru };
const INTL: Record<Lang, string> = { ka: "ka-GE", en: "en-GB", ru: "ru-RU" };

export const isLang = (value: unknown): value is Lang => value === "ka" || value === "en" || value === "ru";

function detect(): Lang {
  if (typeof window === "undefined") return "ka";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // storage unavailable (private mode): fall through
  }
  const browser = window.navigator.language?.slice(0, 2);
  return isLang(browser) ? browser : "ka";
}

export const lang: Lang = detect();
export const intlLocale = INTL[lang];

if (typeof document !== "undefined") document.documentElement.lang = lang;

export function hasSavedLanguage() {
  try {
    return isLang(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

function interpolate(text: string, vars?: Record<string, string | number>) {
  return vars ? text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match)) : text;
}

/** Translate an English source string, e.g. t("Delete {name}?", { name }). */
export function t(key: string, vars?: Record<string, string | number>): string {
  const entry = CATALOGS[lang][key];
  return interpolate(typeof entry === "string" ? entry : key, vars);
}

/**
 * Plural-aware translation. English keys use {count}; catalogs may give CLDR
 * forms, e.g. ru: { one: "{count} день", few: "{count} дня", many: "{count} дней" }.
 */
export function tn(key: string, count: number, vars?: Record<string, string | number>): string {
  const entry = CATALOGS[lang][key];
  let text = key;
  if (typeof entry === "string") text = entry;
  else if (entry) text = entry[new Intl.PluralRules(intlLocale).select(count)] ?? entry.other ?? key;
  return interpolate(text, { count, ...vars });
}

export function setLanguage(next: Lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore: the reload below still applies the browser default
  }
  window.location.reload();
}
