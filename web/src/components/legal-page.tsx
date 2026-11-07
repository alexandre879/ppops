import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Container, PageHero } from "@/components/ui";
import { isLocale, languageAlternates } from "@/i18n/config";
import { fmt } from "@/i18n";
import { getLegal, type LegalSlug } from "@/i18n/legal";
import { getSite } from "@/lib/api";
import { telHref } from "@/lib/format";
import type { Site } from "@/lib/types";

type Props = { params: Promise<{ lang: string }> };

function vars(site: Site, idLabel: string) {
  const entity = site.legal_name || site.company_name;
  return {
    company: site.company_name,
    entity: site.registration_code ? `${entity} (${idLabel} ${site.registration_code})` : entity,
  };
}

/** Paragraphs starting with "- " are grouped into bullet lists. */
function Body({ paragraphs, values }: { paragraphs: string[]; values: Record<string, string> }) {
  const out: ReactNode[] = [];
  let items: string[] = [];
  const flush = () => {
    if (!items.length) return;
    out.push(
      <ul key={out.length} className="list-disc space-y-2 pl-5 marker:text-brand-500">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>,
    );
    items = [];
  };
  for (const raw of paragraphs) {
    const text = fmt(raw, values);
    if (text.startsWith("- ")) {
      items.push(text.slice(2));
      continue;
    }
    flush();
    out.push(<p key={out.length}>{text}</p>);
  }
  flush();
  return <div className="mt-4 space-y-4">{out}</div>;
}

export function legalMetadata(slug: LegalSlug) {
  return async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const legal = getLegal(lang);
    const doc = legal.docs[slug];
    const site = await getSite(lang);
    return { title: doc.title, description: fmt(doc.description, vars(site, legal.labels.idCode)), alternates: languageAlternates(lang, `/${slug}`) };
  };
}

export function legalPage(slug: LegalSlug) {
  return async function LegalPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const legal = getLegal(lang);
    const doc = legal.docs[slug];
    const site = await getSite(lang);
    const values = vars(site, legal.labels.idCode);
    const { labels } = legal;

    return (
      <>
        <PageHero eyebrow={`${legal.updatedLabel}: ${legal.updated}`} title={doc.title} description={fmt(doc.description, values)} />
        <section className="py-14 sm:py-20">
          <Container>
            <article className="mx-auto max-w-3xl text-[17px] leading-relaxed text-stone-700">
              {doc.sections.map((section, i) => (
                <section key={section.heading} className={i ? "mt-10" : undefined}>
                  <h2 className="text-2xl font-bold text-stone-950">{section.heading}</h2>
                  <Body paragraphs={section.body} values={values} />
                </section>
              ))}

              <section className="mt-12 rounded-2xl border border-stone-200 bg-stone-50 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-stone-950">{legal.contactHeading}</h2>
                <p className="mt-2">{legal.contactIntro}</p>
                <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
                  <dt className="font-semibold text-stone-900">{labels.company}</dt>
                  <dd>{site.legal_name || site.company_name}</dd>
                  {site.registration_code && (
                    <>
                      <dt className="font-semibold text-stone-900">{labels.idCode}</dt>
                      <dd>{site.registration_code}</dd>
                    </>
                  )}
                  {site.address && (
                    <>
                      <dt className="font-semibold text-stone-900">{labels.address}</dt>
                      <dd>{site.address}</dd>
                    </>
                  )}
                  {site.email && (
                    <>
                      <dt className="font-semibold text-stone-900">{labels.email}</dt>
                      <dd>
                        <a href={`mailto:${site.email}`} className="text-brand-600 underline underline-offset-2">
                          {site.email}
                        </a>
                      </dd>
                    </>
                  )}
                  {site.phones[0] && (
                    <>
                      <dt className="font-semibold text-stone-900">{labels.phone}</dt>
                      <dd>
                        <a href={telHref(site.phones[0])} className="text-brand-600 underline underline-offset-2">
                          {site.phones[0]}
                        </a>
                      </dd>
                    </>
                  )}
                </dl>
              </section>
            </article>
          </Container>
        </section>
      </>
    );
  };
}
