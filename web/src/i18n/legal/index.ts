import type { Locale } from "../config";
import en from "./en";
import ka from "./ka";
import ru from "./ru";
import type { LegalContent, LegalSlug } from "./types";

const legal: Record<Locale, LegalContent> = { ka, en, ru };

export type { LegalContent, LegalSlug };
export const LEGAL_SLUGS: LegalSlug[] = ["privacy", "terms", "cookies", "refunds"];

export function getLegal(locale: Locale): LegalContent {
  return legal[locale];
}
