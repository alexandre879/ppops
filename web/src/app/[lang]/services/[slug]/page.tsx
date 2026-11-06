import { ArrowLeft, Check, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCard } from "@/components/cards";
import { MediaImage } from "@/components/media";
import { CtaBand } from "@/components/sections";
import { ButtonLink, buttonClass, Chip, Container, Eyebrow, LiquidBackdrop } from "@/components/ui";
import { isLocale, languageAlternates, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getService, getSite } from "@/lib/api";
import { formatPrice, telHref } from "@/lib/format";

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const service = await getService(lang, slug);
  if (!service) return { title: getDictionary(lang).serviceDetail.notFound };
  return { title: service.title, description: service.summary, alternates: languageAlternates(`/services/${slug}`) };
}

export default async function ServicePage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.serviceDetail;
  const [service, site] = await Promise.all([getService(lang, slug), getSite(lang)]);
  if (!service) notFound();
  const price = formatPrice(lang, dict, service.price_from, service.unit);
  const paragraphs = service.description.split(/\n{2,}/).filter(Boolean);
  const contactHref = `${localePath(lang, "/contact")}?service=${service.slug}`;

  return (
    <>
      <section className="relative isolate overflow-clip border-b border-stone-200/70 bg-stone-50">
        <LiquidBackdrop tone="light" />
        <Container className="pt-24 pb-12 sm:pt-32 sm:pb-16 lg:pt-36">
          <Link
            href={`${localePath(lang, "/services")}#${service.category.slug}`}
            className="glass-light inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:text-stone-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> {service.category.name}
          </Link>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="animate-rise">
              <Eyebrow>{service.category.name}</Eyebrow>
              <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{service.title}</h1>
              {service.summary && <p className="mt-5 text-lg leading-relaxed text-stone-600">{service.summary}</p>}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start">
                <ButtonLink href={contactHref}>{dict.common.requestEstimate}</ButtonLink>
                {site.phones.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {site.phones.slice(0, 2).map((phone) => (
                      <a key={phone} href={telHref(phone)} className={buttonClass("outline")}>
                        <Phone className="h-4 w-4" aria-hidden /> {phone}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="aspect-[4/3] animate-rise overflow-hidden rounded-[2rem] shadow-[0_30px_70px_-35px_rgb(28_25_23/0.6)] ring-1 ring-stone-900/5 [animation-delay:150ms]">
              <MediaImage src={service.image} alt={service.title} label={service.category.name} />
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 py-16 lg:grid-cols-[1fr_320px] lg:gap-16">
        <div className="space-y-12">
          {paragraphs.length > 0 && (
            <div className="space-y-4 text-lg leading-relaxed text-stone-700">
              {paragraphs.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </div>
          )}

          {service.features.length > 0 && (
            <div>
              <h2 className="text-2xl font-extrabold">{t.included}</h2>
              <ul className="reveal-group mt-6 grid gap-3 sm:grid-cols-2">
                {service.features.map((feature) => (
                  <li key={feature} className="flex gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-18px_rgb(28_25_23/0.3)]">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {service.solutions.length > 0 && (
            <div>
              <h2 className="text-2xl font-extrabold">{t.materials}</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {service.solutions.map((solution) => (
                  <Chip key={solution.slug} className="px-4 py-1.5 text-sm">
                    {solution.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {service.images.length > 0 && (
            <div>
              <h2 className="text-2xl font-extrabold">{t.gallery}</h2>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                {service.images.map((image) => (
                  <figure key={image.image} className="overflow-hidden rounded-2xl">
                    <img src={image.image} alt={image.caption || service.title} loading="lazy" className="aspect-square w-full object-cover" />
                    {image.caption && <figcaption className="mt-2 text-sm text-stone-500">{image.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-[0_24px_60px_-34px_rgb(28_25_23/0.45)]">
            <p className="text-sm font-semibold text-stone-500">{dict.common.price}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-stone-950">{price ?? dict.common.priceOnRequest}</p>
            <p className="mt-3 text-sm text-stone-600">{t.priceNote}</p>
            <ButtonLink href={contactHref} className="mt-6 w-full">
              {dict.common.getFreeEstimate}
            </ButtonLink>
            <ul className="mt-6 space-y-2 border-t border-stone-100 pt-5">
              {site.phones.map((phone) => (
                <li key={phone}>
                  <a href={telHref(phone)} className="flex items-center gap-2 text-sm font-semibold text-stone-800 hover:text-brand-700">
                    <Phone className="h-4 w-4 text-brand-600" aria-hidden /> {phone}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </Container>

      {service.projects.length > 0 && (
        <section className="border-t border-stone-200/70 bg-stone-50 py-16 sm:py-20">
          <Container>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t.related}</h2>
            <div className="reveal-group mt-8 grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {service.projects.map((project) => (
                <ProjectCard key={project.slug} project={project} lang={lang} dict={dict} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <CtaBand site={site} dict={dict} lang={lang} />
    </>
  );
}
