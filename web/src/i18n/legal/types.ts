/**
 * Legal pages. Paragraphs starting with "- " render as list items.
 * Placeholders: {company} = trading name, {entity} = registered legal name and ID code.
 */
export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = { title: string; description: string; sections: LegalSection[] };
export type LegalSlug = "privacy" | "terms" | "cookies" | "refunds";

export type LegalContent = {
  updatedLabel: string;
  updated: string;
  contactHeading: string;
  contactIntro: string;
  labels: { company: string; idCode: string; address: string; email: string; phone: string };
  docs: Record<LegalSlug, LegalDoc>;
};

