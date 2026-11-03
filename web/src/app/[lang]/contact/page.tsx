import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContactSection } from "@/components/sections";
import { Container } from "@/components/ui";
import { isLocale, languageAlternates } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { getCategories, getSite } from "@/lib/api";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ service?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).contactPage;
  return { title: t.eyebrow, description: t.description, alternates: languageAlternates("/contact") };
}

export default async function ContactPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { service } = await searchParams;
  const dict = getDictionary(lang);
  const t = dict.contactPage;
  const [site, categories] = await Promise.all([getSite(lang), getCategories(lang)]);
  const knownService = categories.some((c) => c.services.some((s) => s.slug === service)) ? service : undefined;

  return (
    <>
      <ContactSection
        site={site}
        categories={categories}
        dict={dict}
        lang={lang}
        defaultService={knownService}
        page={{ eyebrow: t.eyebrow, title: t.title, description: t.description }}
      />
      {site.map_embed_url && (
        <Container className="py-14">
          <iframe
            src={site.map_embed_url}
            title={fmt(t.mapTitle, { company: site.company_name })}
            className="reveal h-96 w-full rounded-[2rem] border border-stone-200 shadow-[0_30px_70px_-40px_rgb(28_25_23/0.5)]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Container>
      )}
    </>
  );
}
