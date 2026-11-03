import { Factory, HardHat, Ruler, Sofa } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CtaBand, ProcessSection, WhyUsSection } from "@/components/sections";
import { Container, Eyebrow, LiquidBackdrop, PageHero } from "@/components/ui";
import { isLocale, languageAlternates } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { getSite } from "@/lib/api";

const STRENGTH_ICONS = [HardHat, Ruler, Factory, Sofa];

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).aboutPage;
  return { title: t.eyebrow, description: t.description, alternates: languageAlternates("/about") };
}

export default async function AboutPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.aboutPage;
  const site = await getSite(lang);

  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={fmt(t.title, { company: site.company_name })} description={site.tagline} />

      <section className="py-16 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <div className="reveal">
            <Eyebrow>{t.overview}</Eyebrow>
            <p className="mt-5 text-xl leading-relaxed text-stone-700">{site.about_text}</p>
          </div>
          <div className="reveal-group space-y-5">
            {site.mission && (
              <div className="relative isolate overflow-clip rounded-[2rem] bg-stone-950 p-8 text-white">
                <LiquidBackdrop />
                <p className="text-sm font-bold tracking-wider text-brand-400 uppercase">{t.mission}</p>
                <p className="mt-3 text-lg leading-relaxed text-stone-200">{site.mission}</p>
              </div>
            )}
            {site.promise && (
              <div className="relative isolate overflow-clip rounded-[2rem] bg-brand-500 p-8 text-stone-950">
                <LiquidBackdrop tone="brand" />
                <p className="text-sm font-bold tracking-wider uppercase">{t.promise}</p>
                <p className="mt-3 text-lg leading-relaxed font-medium">{site.promise}</p>
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="border-t border-stone-200/70 py-16 sm:py-20">
        <Container className="reveal-group grid gap-5 md:grid-cols-2">
          {t.strengths.map(({ title, text }, i) => {
            const Icon = STRENGTH_ICONS[i];
            return (
              <div key={title} className="sheen flex gap-5 p-7 rounded-3xl border border-stone-200/80 bg-white shadow-[0_10px_30px_-18px_rgb(28_25_23/0.25)] transition duration-500 ease-liquid hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_30px_60px_-28px_rgb(188_62_12/0.35)]">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h2 className="text-xl font-bold">{title}</h2>
                  <p className="mt-2 leading-relaxed text-stone-600">{text}</p>
                </div>
              </div>
            );
          })}
        </Container>
      </section>

      <ProcessSection dict={dict} />
      <WhyUsSection dict={dict} />
      <CtaBand site={site} dict={dict} lang={lang} />
    </>
  );
}
