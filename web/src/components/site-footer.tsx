import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { localePath, type Locale } from "@/i18n/config";
import { fmt, type Dictionary } from "@/i18n";
import { LEGAL_SLUGS } from "@/i18n/legal";
import { NAV } from "@/lib/content";
import { telHref } from "@/lib/format";
import type { Category, Site } from "@/lib/types";

import { CookieSettingsButton } from "./cookie-banner";
import { Logo } from "./icons";

export function SiteFooter({ lang, dict, site, categories }: { lang: Locale; dict: Dictionary; site: Site; categories: Category[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-stone-950 text-stone-400">
      <div className="h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400" aria-hidden />
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          {site.tagline && <p className="mt-5 text-sm leading-relaxed">{site.tagline}.</p>}
          {site.promise && <p className="mt-4 text-sm leading-relaxed text-stone-500">{site.promise}</p>}
        </div>

        <div>
          <h3 className="text-sm font-bold tracking-wider text-white uppercase">{dict.footer.services}</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`${localePath(lang, "/services")}#${category.slug}`} className="hover:text-white">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold tracking-wider text-white uppercase">{dict.footer.company}</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {NAV.filter((item) => item.key !== "services").map((item) => (
              <li key={item.href}>
                <Link href={localePath(lang, item.href)} className="hover:text-white">
                  {dict.nav[item.key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold tracking-wider text-white uppercase">{dict.footer.contact}</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {site.phones.map((phone) => (
              <li key={phone}>
                <a href={telHref(phone)} className="flex items-center gap-2.5 hover:text-white">
                  <Phone className="h-4 w-4 text-brand-500" aria-hidden />
                  {phone}
                </a>
              </li>
            ))}
            {site.email && (
              <li>
                <a href={`mailto:${site.email}`} className="flex items-center gap-2.5 hover:text-white">
                  <Mail className="h-4 w-4 text-brand-500" aria-hidden />
                  {site.email}
                </a>
              </li>
            )}
            {site.address && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                {site.address}
              </li>
            )}
            {site.working_hours && (
              <li className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-brand-500" aria-hidden />
                {site.working_hours}
              </li>
            )}
          </ul>
          {(site.facebook_url || site.instagram_url) && (
            <div className="mt-5 flex gap-4 text-sm font-semibold">
              {site.facebook_url && (
                <a href={site.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  Facebook
                </a>
              )}
              {site.instagram_url && (
                <a href={site.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  Instagram
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <nav aria-label={dict.footer.legal} className="container-page flex flex-wrap gap-x-6 gap-y-2 pt-6 text-sm">
          {LEGAL_SLUGS.map((slug) => (
            <Link key={slug} href={localePath(lang, `/${slug}`)} className="hover:text-white">
              {dict.footer[slug]}
            </Link>
          ))}
          <CookieSettingsButton label={dict.footer.cookieSettings} />
        </nav>
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-stone-500 sm:flex-row sm:justify-between">
          <p>
            © {year} {site.legal_name || site.company_name}. {dict.footer.rights}
            {site.registration_code && (
              <span className="block sm:inline sm:before:mx-2 sm:before:content-['·']">
                {fmt(dict.footer.legalEntity, { name: site.legal_name || site.company_name, code: site.registration_code })}
              </span>
            )}
          </p>
          <p>{dict.footer.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
