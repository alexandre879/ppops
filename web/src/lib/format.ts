import { intlLocale, type Locale } from "@/i18n/config";
import { fmt, type Dictionary } from "@/i18n";

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function formatPrice(locale: Locale, dict: Dictionary, value: number | null, unit?: string) {
  if (value == null) return null;
  const amount = new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: 2 }).format(value);
  const unitLabel = unit ? (dict.labels.unit[unit] ?? unit) : "";
  return `${fmt(dict.common.priceFrom, { price: amount })}${unitLabel ? ` / ${unitLabel}` : ""}`;
}

export function formatNumber(locale: Locale, value: number) {
  return new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: 0 }).format(value);
}
