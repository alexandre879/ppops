/** Structural content (order, keys, links). Text lives in src/i18n/dictionaries. */

export const FINISHES = ["venetian", "munich", "spanish", "splatter", "scratched", "brick", "travertine", "stencil"] as const;

export type FinishKey = (typeof FINISHES)[number];

export const NAV = [
  { href: "/services", key: "services" },
  { href: "/projects", key: "projects" },
  { href: "/manufacturing", key: "manufacturing" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;
