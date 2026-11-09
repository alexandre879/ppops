/**
 * schema.org data that helps search engines show the company, its services and breadcrumbs.
 * Only filled-in fields are included, so an empty admin field never becomes an empty claim.
 */
import { localePath, type Locale } from "@/i18n/config";

import type { ProjectDetail, ServiceDetail, Site } from "./types";

const siteUrl = () => (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** API image paths ("/media/…") made absolute, as structured data requires. */
const absolute = (path: string | null | undefined) =>
  !path ? undefined : /^https?:\/\//.test(path) ? path : `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`;

const pageUrl = (lang: Locale, path = "") => `${siteUrl()}${localePath(lang, path)}`;

const AREA_SERVED = { "@type": "Country", name: "Georgia" };

// UN/CEFACT codes for the service units (backend apps/catalog/models.py Service.Unit).
const UNIT_CODES: Record<string, string> = { m2: "MTK", m: "MTR", pcs: "C62", h: "HUR", day: "DAY" };

/** Drops keys whose value is empty, so the output only states what the admin filled in. */
function compact<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)),
  ) as T;
}

function organization(site: Site, lang: Locale) {
  return compact({
    "@type": "GeneralContractor",
    "@id": `${siteUrl()}/#organization`,
    name: site.company_name,
    legalName: site.legal_name,
    url: pageUrl(lang),
    logo: absolute("/logo-mark.png"),
    image: absolute(site.hero_image),
    description: site.about_text,
    telephone: site.phones[0],
    email: site.email,
    address: site.address ? { "@type": "PostalAddress", streetAddress: site.address, addressCountry: "GE" } : undefined,
    areaServed: AREA_SERVED,
    sameAs: [site.facebook_url, site.instagram_url].filter(Boolean),
    contactPoint: site.phones.map((telephone) => ({
      "@type": "ContactPoint",
      telephone,
      contactType: "customer service",
      availableLanguage: ["ka", "en", "ru"],
    })),
  });
}

/** Homepage: the company and the website. */
export function homeStructuredData(site: Site, lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization(site, lang),
      {
        "@type": "WebSite",
        "@id": `${siteUrl()}/#website`,
        name: site.company_name,
        url: pageUrl(lang),
        inLanguage: lang,
        publisher: { "@id": `${siteUrl()}/#organization` },
      },
    ],
  };
}

function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
  };
}

/** Service page: the service with its starting price, and its breadcrumb trail. */
export function serviceStructuredData(site: Site, lang: Locale, service: ServiceDetail, labels: { services: string; unit: string }) {
  const url = pageUrl(lang, `/services/${service.slug}`);
  const offer =
    service.price_from == null
      ? undefined
      : {
          "@type": "Offer",
          url,
          priceCurrency: "GEL",
          priceSpecification: compact({
            "@type": "UnitPriceSpecification",
            minPrice: service.price_from,
            priceCurrency: "GEL",
            unitCode: UNIT_CODES[service.unit],
            unitText: labels.unit,
          }),
        };
  return {
    "@context": "https://schema.org",
    "@graph": [
      compact({
        "@type": "Service",
        name: service.title,
        description: service.summary,
        serviceType: service.category.name,
        url,
        image: absolute(service.image),
        areaServed: AREA_SERVED,
        provider: compact({ "@type": "GeneralContractor", "@id": `${siteUrl()}/#organization`, name: site.company_name, url: pageUrl(lang), telephone: site.phones[0] }),
        offers: offer,
      }),
      breadcrumbs([
        { name: site.company_name, url: pageUrl(lang) },
        { name: labels.services, url: pageUrl(lang, "/services") },
        { name: service.title, url },
      ]),
    ],
  };
}

/** Portfolio project page: its breadcrumb trail. */
export function projectStructuredData(site: Site, lang: Locale, project: ProjectDetail, labels: { projects: string }) {
  return {
    "@context": "https://schema.org",
    ...breadcrumbs([
      { name: site.company_name, url: pageUrl(lang) },
      { name: labels.projects, url: pageUrl(lang, "/projects") },
      { name: project.title, url: pageUrl(lang, `/projects/${project.slug}`) },
    ]),
  };
}
