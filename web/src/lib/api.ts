import { cache } from "react";

import type { Locale } from "@/i18n/config";

import type {
  Category,
  Product,
  ProjectDetail,
  ProjectSummary,
  ServiceDetail,
  ServiceSummary,
  Site,
  Solution,
} from "./types";

// Server-side only: the Next.js server talks to Django directly.
const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

/** Shown if the API is unreachable, so the header, footer and phone numbers never disappear. */
const FALLBACK_SITE: Site = {
  company_name: "New House World",
  tagline: "",
  hero_title: "New House World",
  hero_subtitle: "",
  hero_image: null,
  about_text: "",
  mission: "",
  promise: "",
  phones: ["+995 557 60 30 04", "+995 568 28 27 72"],
  email: "",
  address: "",
  working_hours: "",
  facebook_url: "",
  instagram_url: "",
  map_embed_url: "",
  years_experience: 0,
  projects_completed: 0,
  specialists: 0,
};

class NotFound extends Error {}

async function request<T>(path: string, locale: Locale): Promise<T> {
  const response = await fetch(`${API_URL}/api/public${path}`, {
    cache: "no-store",
    // Django's LocaleMiddleware returns content in this language (with fallbacks).
    headers: { "Accept-Language": locale },
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) throw new NotFound(path);
  if (!response.ok) throw new Error(`API ${path} responded ${response.status}`);
  return (await response.json()) as T;
}

async function withFallback<T>(path: string, locale: Locale, fallback: T): Promise<T> {
  try {
    return await request<T>(path, locale);
  } catch (error) {
    if (!(error instanceof NotFound)) console.error(`[api] ${path}:`, error);
    return fallback;
  }
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : "";
}

// cache(): layouts and pages share one request per render instead of refetching.
export const getSite = cache((locale: Locale) => withFallback<Site>("/site/", locale, FALLBACK_SITE));
export const getCategories = cache((locale: Locale) => withFallback<Category[]>("/categories/", locale, []));
export const getSolutions = cache((locale: Locale) => withFallback<Solution[]>("/solutions/", locale, []));
export const getProducts = cache((locale: Locale) => withFallback<Product[]>("/products/", locale, []));

export const getServices = (locale: Locale, params: { category?: string; featured?: boolean } = {}) =>
  withFallback<ServiceSummary[]>(
    `/services/${query({ category: params.category, featured: params.featured ? "1" : undefined })}`,
    locale,
    [],
  );

export const getProjects = cache((locale: Locale) => withFallback<ProjectSummary[]>("/projects/", locale, []));

export const getService = cache((locale: Locale, slug: string) =>
  withFallback<ServiceDetail | null>(`/services/${encodeURIComponent(slug)}/`, locale, null),
);

export const getProject = cache((locale: Locale, slug: string) =>
  withFallback<ProjectDetail | null>(`/projects/${encodeURIComponent(slug)}/`, locale, null),
);
