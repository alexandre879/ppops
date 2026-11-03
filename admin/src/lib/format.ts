import { intlLocale, lang, t } from "./i18n";

/*
 * Browsers (Chrome included) usually ship without Georgian locale data, so
 * Intl silently falls back to English for "ka-GE". Georgian dates, month names
 * and number separators are therefore formatted by hand.
 */
const GEORGIAN = lang === "ka";
const KA_MONTHS = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
const KA_MONTHS_SHORT = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];
const KA_WEEKDAYS = ["კვირა", "ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი"];

function numberFormatter(options: Intl.NumberFormatOptions) {
  if (!GEORGIAN) return new Intl.NumberFormat(intlLocale, options).format;
  // Georgian convention: 1 234 567,50
  const base = new Intl.NumberFormat("en-US", options);
  return (value: number) => base.format(value).replace(/,/g, " ").replace(".", ",");
}

const number2 = numberFormatter({ minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = numberFormatter({ maximumFractionDigits: 3 });
const compactIntl = new Intl.NumberFormat(intlLocale, { notation: "compact", maximumFractionDigits: 1 });
const oneDecimal = numberFormatter({ maximumFractionDigits: 1 });

function compactNumber(value: number) {
  if (!GEORGIAN) return compactIntl.format(value);
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${oneDecimal(value / 1e6)} მლნ`;
  if (abs >= 1e3) return `${oneDecimal(value / 1e3)} ათ.`;
  return oneDecimal(value);
}

const pad = (n: number) => String(n).padStart(2, "0");
const dateFmt = new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

type Num = number | string | null | undefined;

// The API reports amounts in "GEL"; show the localized symbol/code for it.
const shownCurrency = (currency: string) => (currency === "GEL" ? currencyLabel() : currency);

export function money(value: Num, currency = "GEL") {
  if (value === null || value === undefined || value === "") return "—";
  return `${number2(Number(value))} ${shownCurrency(currency)}`.trim();
}

export function compactMoney(value: Num, currency = "GEL") {
  if (value === null || value === undefined || value === "") return "—";
  return `${compactNumber(Number(value))} ${shownCurrency(currency)}`.trim();
}

/** Axis labels: 80000 → "80K" / "80 ათ." */
export const compactValue = (value: number) => compactNumber(value);

export function qty(value: Num) {
  if (value === null || value === undefined || value === "") return "—";
  return qtyFmt(Number(value));
}

/** Parses "YYYY-MM-DD" as a local date (avoids the UTC off-by-one). */
export function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
}

function shortDate(d: Date) {
  return GEORGIAN ? `${pad(d.getDate())} ${KA_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` : dateFmt.format(d);
}

export function date(value: string | null | undefined) {
  return value ? shortDate(parseDate(value)) : "—";
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return GEORGIAN ? `${shortDate(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}` : dateTimeFmt.format(d);
}

/** "Monday, 2 November 2026" in the interface language. */
export function longDate(d: Date) {
  if (GEORGIAN) return `${KA_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${KA_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
  return new Intl.DateTimeFormat(intlLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** "2026-03" → "Mar" / "მარ" / "мар." — or "March 2026" with the year. */
export function monthLabel(month: string, withYear = false) {
  const [year, m] = month.split("-").map(Number);
  if (GEORGIAN) return withYear ? `${KA_MONTHS[m - 1]} ${year}` : KA_MONTHS_SHORT[m - 1];
  return new Intl.DateTimeFormat(intlLocale, withYear ? { month: "long", year: "numeric" } : { month: "short" }).format(new Date(year, m - 1, 1));
}

export function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDate(value).getTime() - today.getTime()) / 86_400_000);
}

const UNIT_LABELS: Record<string, Record<string, string>> = {
  en: { m2: "m²", m3: "m³", m: "m", l: "L", h: "h", pcs: "pcs", kg: "kg", bag: "bag", sheet: "sheet", set: "set", roll: "roll", t: "t", day: "day", project: "project" },
  ka: { m2: "მ²", m3: "მ³", m: "მ", l: "ლ", h: "სთ", pcs: "ც", kg: "კგ", bag: "ტომარა", sheet: "ფურცელი", set: "კომპლ.", roll: "რულონი", t: "ტ", day: "დღე", project: "პროექტი" },
  ru: { m2: "м²", m3: "м³", m: "м", l: "л", h: "ч", pcs: "шт.", kg: "кг", bag: "меш.", sheet: "лист", set: "компл.", roll: "рул.", t: "т", day: "день", project: "проект" },
};

/** Unit code ("m2") → label in the interface language ("მ²"). */
export const unit = (value: string | null | undefined) => (value ? (UNIT_LABELS[lang][value] ?? value) : "");

export const currencyLabel = () => t("GEL");

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
