import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ServiceCard } from "@/components/cards";
import { CategoryIconView } from "@/components/icons";
import { CtaBand } from "@/components/sections";
import { Chip, Container, PageHero } from "@/components/ui";
import { isLocale, languageAlternates } from "@/i18n/config";
import { getDictionary, label } from "@/i18n";
import { getCategories, getSite, getSolutions } from "@/lib/api";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).servicesPage;
  return { title: t.eyebrow, description: t.description, alternates: languageAlternates(lang, "/services") };
}

export default async function ServicesPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.servicesPage;
  const [site, categories, solutions] = await Promise.all([getSite(lang), getCategories(lang), getSolutions(lang)]);
  const kinds = Array.from(new Set(solutions.map((s) => s.kind)));

  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} description={t.description}>
        {categories.length > 0 && (
          <nav aria-label={t.categoriesNav} className="mt-8 flex flex-wrap gap-2">
            {categories.map((category) => (
              <a
                key={category.slug}
                href={`#${category.slug}`}
                className="rounded-full border border-white/15 bg-white/6 px-4 py-2 text-sm font-medium text-stone-200 backdrop-blur-md transition-colors duration-300 hover:border-brand-400 hover:bg-white/12 hover:text-white"
              >
                {category.name}
              </a>
            ))}
          </nav>
        )}
      </PageHero>

      <div className="py-8">
        {categories.length === 0 && <Container className="py-16 text-stone-500">{dict.common.servicesUpdating}</Container>}
        {categories.map((category, i) => (
          <section key={category.slug} id={category.slug} className={`scroll-mt-24 py-14 ${i % 2 ? "bg-stone-50" : ""}`}>
            <Container>
              <div className="reveal flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand-400 to-brand-600 text-stone-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_24px_-10px_rgb(242_107_29/0.8)]">
                  <CategoryIconView icon={category.icon} className="h-6 w-6" />
                </span>
                <div className="max-w-3xl">
                  <h2 className="text-2xl font-extrabold sm:text-3xl">{category.name}</h2>
                  <p className="mt-2 text-stone-600">{category.description}</p>
                </div>
              </div>
              <div className="reveal-group mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {category.services.map((service) => (
                  <ServiceCard key={service.slug} service={service} lang={lang} learnMore={dict.common.learnMore} />
                ))}
              </div>
            </Container>
          </section>
        ))}
      </div>

      {solutions.length > 0 && (
        <section className="border-t border-stone-200 py-16">
          <Container>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t.materialsTitle}</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {kinds.map((kind) => (
                <div key={kind}>
                  <h3 className="text-sm font-bold tracking-wider text-brand-700 uppercase">{label(dict.labels.solutionKind, kind)}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {solutions
                      .filter((s) => s.kind === kind)
                      .map((s) => (
                        <Chip key={s.slug}>{s.name}</Chip>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      <CtaBand site={site} dict={dict} lang={lang} />
    </>
  );
}
