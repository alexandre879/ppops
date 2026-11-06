import { ArrowRight, ArrowUpRight, Building2, Clock, Factory, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCard } from "@/components/cards";
import { FacadeIllustration } from "@/components/facade-illustration";
import { CategoryIconView } from "@/components/icons";
import { MediaImage } from "@/components/media";
import { ContactSection, ProcessSection, WhyUsSection } from "@/components/sections";
import { TextureSwatch } from "@/components/texture-swatch";
import { ButtonLink, Container, CountUp, Eyebrow, LiquidBackdrop, SectionHeading } from "@/components/ui";
import { isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCategories, getProducts, getProjects, getSite } from "@/lib/api";
import { FINISHES } from "@/lib/content";
import { telHref } from "@/lib/format";

const HIGHLIGHT_ICONS = [Factory, ShieldCheck, Building2, Clock];

type Props = { params: Promise<{ lang: string }> };

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.home;
  const [site, categories, projects, products] = await Promise.all([
    getSite(lang),
    getCategories(lang),
    getProjects(lang),
    getProducts(lang),
  ]);
  const stats = [
    { value: site.years_experience, label: t.stats.years, suffix: "+" },
    { value: site.projects_completed, label: t.stats.projects, suffix: "+" },
    { value: site.specialists, label: t.stats.specialists, suffix: "" },
  ].filter((stat) => stat.value > 0);
  const productNames = products.length >= 3 ? products.map((p) => p.name) : dict.capabilities;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    name: site.company_name,
    description: site.about_text,
    telephone: site.phones,
    inLanguage: lang,
    ...(site.email && { email: site.email }),
    ...(site.address && { address: site.address }),
    areaServed: "Georgia",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero: frosted panel over moving orange light */}
      <section className="relative isolate overflow-clip bg-stone-950 text-white">
        <LiquidBackdrop />
        <div className="bg-blueprint mask-soft absolute inset-0 -z-10" aria-hidden />
        <Container className="pt-24 pb-14 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
            <div className="glass animate-rise rounded-[2rem] p-6 sm:p-10">
              <Eyebrow light>{t.eyebrow}</Eyebrow>
              <h1 className="text-sheen mt-5 pb-1 text-4xl leading-[1.08] font-extrabold sm:text-5xl lg:text-6xl">{site.hero_title}</h1>
              {site.hero_subtitle && <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-300">{site.hero_subtitle}</p>}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={localePath(lang, "/contact")}>
                  {dict.common.getFreeEstimate} <ArrowRight className="h-4 w-4" aria-hidden />
                </ButtonLink>
                <ButtonLink href={localePath(lang, "/services")} variant="ghostLight">
                  {dict.common.exploreServices}
                </ButtonLink>
              </div>
              {site.phones.length > 0 && (
                <div className="mt-6 flex items-start gap-1.5 text-sm text-stone-400">
                  <span>{dict.common.orCallUs}</span>
                  <span className="flex flex-col gap-0.5">
                    {site.phones.slice(0, 2).map((phone) => (
                      <a key={phone} href={telHref(phone)} className="font-semibold text-white transition-colors hover:text-brand-400">
                        {phone}
                      </a>
                    ))}
                  </span>
                </div>
              )}
              {stats.length > 0 && (
                <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-7">
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-xs leading-snug text-stone-400">{stat.label}</dt>
                      <dd className="order-first font-display text-3xl font-extrabold text-white sm:text-4xl">
                        <CountUp value={stat.value} />
                        <span className="text-brand-500">{stat.suffix}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="relative mx-auto w-full max-w-lg animate-rise [animation-delay:200ms]">
              <div className="absolute inset-0 -z-10 scale-110 bg-[radial-gradient(closest-side,rgb(242_107_29/0.35),transparent)]" aria-hidden />
              {site.hero_image ? (
                <img src={site.hero_image} alt="" className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl ring-1 ring-white/15" />
              ) : (
                <FacadeIllustration className="w-full" label={dict.common.illustration} />
              )}
              <div className="glass absolute bottom-10 -left-4 hidden max-w-60 animate-float rounded-2xl p-4 sm:block">
                <p className="flex items-center gap-2.5 text-sm font-bold text-white">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-stone-950">
                    <Factory className="h-4 w-4" aria-hidden />
                  </span>
                  {t.badgeManufacturing}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-stone-300">{t.badgeManufacturingText}</p>
              </div>
              <div className="absolute top-6 -right-3 hidden max-w-56 animate-float rounded-2xl border border-white/30 bg-brand-500/80 p-4 text-stone-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_24px_50px_-20px_rgb(242_107_29/0.7)] backdrop-blur-xl [animation-delay:-3.5s] sm:block">
                <p className="text-sm font-bold">{t.badgeEnergy}</p>
                <p className="mt-0.5 text-xs text-stone-900/80">{t.badgeEnergyText}</p>
              </div>
            </div>
          </div>

          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {t.highlights.map((item, i) => {
              const Icon = HIGHLIGHT_ICONS[i];
              return (
                <li key={item.title} className="glass flex animate-rise gap-4 rounded-2xl p-5" style={{ animationDelay: `${350 + i * 90}ms` }}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 ring-1 ring-brand-400/25">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-stone-400">{item.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Services */}
      <section className="relative isolate overflow-clip py-20 sm:py-28">
        <LiquidBackdrop tone="light" />
        <Container>
          <SectionHeading
            eyebrow={t.services.eyebrow}
            title={t.services.title}
            description={t.services.description}
            action={
              <ButtonLink href={localePath(lang, "/services")} variant="outline">
                {dict.common.allServices} <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
            }
          />
          {categories.length > 0 ? (
            <div className="reveal-group mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <article
                  key={category.slug}
                  className="sheen group flex flex-col overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-[0_10px_30px_-18px_rgb(28_25_23/0.25)] transition duration-500 ease-liquid hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-[0_30px_60px_-28px_rgb(188_62_12/0.4)]"
                >
                  {/* Optional photo, uploaded in the admin under Services → Categories. */}
                  {category.image && (
                    <div className="aspect-[16/9] overflow-hidden bg-stone-100">
                      <MediaImage src={category.image} alt="" className="transition duration-1000 ease-liquid group-hover:scale-105" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-7">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition duration-500 group-hover:bg-brand-500 group-hover:text-stone-950 group-hover:ring-brand-400">
                      <CategoryIconView icon={category.icon} className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 text-xl font-bold">
                      <Link href={`${localePath(lang, "/services")}#${category.slug}`} className="hover:text-brand-700">
                        {category.name}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">{category.description}</p>
                    <ul className="mt-5 space-y-1 border-t border-stone-100 pt-4 text-sm">
                      {category.services.slice(0, 4).map((service) => (
                        <li key={service.slug}>
                          <Link
                            href={localePath(lang, `/services/${service.slug}`)}
                            className="group/link -mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 font-medium text-stone-800 transition-colors hover:bg-brand-50 hover:text-brand-700"
                          >
                            {service.title}
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-stone-400 transition group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 group-hover/link:text-brand-600" aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-10 text-stone-500">{dict.common.servicesUpdating}</p>
          )}
        </Container>
      </section>

      {/* Decorative finishes */}
      <section className="bg-stone-50 py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow={t.finishes.eyebrow}
            title={t.finishes.title}
            description={t.finishes.description}
            action={
              <ButtonLink href={`${localePath(lang, "/services")}#decorative-finishes`} variant="outline">
                {t.finishes.action} <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
            }
          />
          <ul className="reveal-group mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {FINISHES.map((finish) => (
              <li
                key={finish}
                className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-stone-200 shadow-[0_14px_34px_-20px_rgb(28_25_23/0.45)] ring-1 ring-stone-900/5"
              >
                <TextureSwatch
                  finish={finish}
                  className="absolute inset-0 h-full w-full transition duration-[1400ms] ease-liquid will-change-transform group-hover:scale-115 group-hover:rotate-2"
                />
                <div className="absolute inset-0 bg-linear-to-t from-stone-950/25 via-transparent to-white/15" aria-hidden />
                <p className="glass-light absolute inset-x-2.5 bottom-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-stone-900 transition duration-500 ease-liquid group-hover:-translate-y-1 sm:inset-x-4 sm:bottom-4">
                  {t.finishes.names[finish]}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-stone-500">{t.finishes.note}</p>
        </Container>
      </section>

      {/* Manufacturing */}
      <section className="py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <SectionHeading eyebrow={t.manufacturing.eyebrow} title={t.manufacturing.title} description={t.manufacturing.description} />
            <ButtonLink href={localePath(lang, "/manufacturing")} className="mt-8">
              {t.manufacturing.action} <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
          <div className="reveal relative isolate overflow-clip rounded-[2rem] bg-stone-950 p-6 text-white shadow-[0_40px_80px_-40px_rgb(28_25_23/0.7)] sm:p-10">
            <LiquidBackdrop />
            <div className="bg-blueprint mask-soft absolute inset-0 -z-10" aria-hidden />
            <p className="flex items-center gap-2 text-sm font-bold tracking-wider text-brand-400 uppercase">
              <ShieldCheck className="h-4 w-4" aria-hidden /> {t.manufacturing.standards}
            </p>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {productNames.map((name) => (
                <li
                  key={name}
                  className="flex items-start gap-3 rounded-2xl bg-white/6 px-4 py-3 text-sm font-medium ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/12"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500 shadow-[0_0_10px_rgb(242_107_29/0.9)]" aria-hidden />
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Projects */}
      {projects.length > 0 && (
        <section className="border-t border-stone-200/70 py-20 sm:py-28">
          <Container>
            <SectionHeading
              eyebrow={t.projects.eyebrow}
              title={t.projects.title}
              description={t.projects.description}
              action={
                <ButtonLink href={localePath(lang, "/projects")} variant="outline">
                  {dict.common.viewAllProjects} <ArrowRight className="h-4 w-4" aria-hidden />
                </ButtonLink>
              }
            />
            <div className="reveal-group mt-12 grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {projects.slice(0, 6).map((project) => (
                <ProjectCard key={project.slug} project={project} lang={lang} dict={dict} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <ProcessSection dict={dict} />
      <WhyUsSection dict={dict} />
      <ContactSection site={site} categories={categories} dict={dict} lang={lang} />
    </>
  );
}
