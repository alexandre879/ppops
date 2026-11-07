import { ArrowRight, Factory, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MediaImage } from "@/components/media";
import { CtaBand } from "@/components/sections";
import { ButtonLink, Container, PageHero, SectionHeading } from "@/components/ui";
import { isLocale, languageAlternates, localePath } from "@/i18n/config";
import { getDictionary, label } from "@/i18n";
import { getProducts, getSite } from "@/lib/api";

const PILLAR_ICONS = [Factory, ShieldCheck, Truck];

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).manufacturingPage;
  return { title: t.eyebrow, description: t.description, alternates: languageAlternates(lang, "/manufacturing") };
}

export default async function ManufacturingPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.manufacturingPage;
  const [site, products] = await Promise.all([getSite(lang), getProducts(lang)]);
  const categories = Array.from(new Set(products.map((p) => p.category)));

  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} description={t.description}>
        <ButtonLink href={localePath(lang, "/contact")} className="mt-8">
          {t.cta} <ArrowRight className="h-4 w-4" aria-hidden />
        </ButtonLink>
      </PageHero>

      <section className="border-b border-stone-200/70">
        <Container className="reveal-group grid gap-8 py-12 md:grid-cols-3">
          {t.pillars.map(({ title, text }, i) => {
            const Icon = PILLAR_ICONS[i];
            return (
              <div key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-base font-bold">{title}</h2>
                  <p className="mt-1 text-sm text-stone-600">{text}</p>
                </div>
              </div>
            );
          })}
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow={t.capabilitiesEyebrow} title={t.capabilitiesTitle} />
          {products.length > 0 ? (
            <div className="mt-12 space-y-14">
              {categories.map((category) => {
                const group = label(dict.labels.productCategory, category);
                return (
                  <div key={category}>
                    <h3 className="text-sm font-bold tracking-wider text-brand-700 uppercase">{group}</h3>
                    <div className="reveal-group mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      {products
                        .filter((p) => p.category === category)
                        .map((product) => (
                          <article key={product.slug} className="sheen group rounded-3xl border border-stone-200/80 bg-white shadow-[0_10px_30px_-18px_rgb(28_25_23/0.25)] transition duration-500 ease-liquid hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_30px_60px_-28px_rgb(188_62_12/0.35)]">
                            <div className="aspect-[4/3] overflow-hidden">
                              <MediaImage src={product.image} alt={product.name} label={group} className="transition duration-1000 ease-liquid group-hover:scale-110" />
                            </div>
                            <div className="p-5">
                              <h4 className="font-display text-lg font-bold text-stone-950">{product.name}</h4>
                              {product.description && <p className="mt-2 text-sm leading-relaxed text-stone-600">{product.description}</p>}
                              {product.standard && (
                                <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                                  <ShieldCheck className="h-3.5 w-3.5 text-brand-600" aria-hidden /> {product.standard}
                                </p>
                              )}
                            </div>
                          </article>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="reveal-group mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dict.capabilities.map((item) => (
                <li key={item} className="p-5 font-medium rounded-3xl border border-stone-200/80 bg-white shadow-[0_10px_30px_-18px_rgb(28_25_23/0.25)] transition duration-500 ease-liquid hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_30px_60px_-28px_rgb(188_62_12/0.35)]">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      <CtaBand site={site} dict={dict} lang={lang} />
    </>
  );
}
