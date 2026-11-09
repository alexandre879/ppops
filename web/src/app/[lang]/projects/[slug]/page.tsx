import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { MediaImage } from "@/components/media";
import { CtaBand } from "@/components/sections";
import { Chip, Container, Eyebrow, LiquidBackdrop } from "@/components/ui";
import { isLocale, languageAlternates, localePath } from "@/i18n/config";
import { getDictionary, label } from "@/i18n";
import { getProject, getSite } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { projectStructuredData } from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const project = await getProject(lang, slug);
  if (!project) return { title: getDictionary(lang).projectDetail.notFound };
  return { title: project.title, description: project.public_summary, alternates: languageAlternates(lang, `/projects/${slug}`) };
}

export default async function ProjectPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.projectDetail;
  const [project, site] = await Promise.all([getProject(lang, slug), getSite(lang)]);
  if (!project) notFound();

  const facts = [
    { label: t.location, value: project.city },
    { label: t.building, value: label(dict.labels.buildingType, project.building_type, project.building_type_display) },
    { label: t.floors, value: project.floors ? String(project.floors) : "" },
    { label: t.area, value: project.area_m2 ? `${formatNumber(lang, project.area_m2)} ${dict.labels.areaUnit}` : "" },
    { label: t.year, value: project.year ? String(project.year) : "" },
    { label: t.status, value: label(dict.labels.projectStatus, project.status, project.status_display) },
  ].filter((fact) => fact.value);
  const gallery = project.photos.filter((photo) => photo.image !== project.cover);

  return (
    <>
      <JsonLd data={projectStructuredData(site, lang, project, { projects: dict.nav.projects })} />
      <section className="relative isolate overflow-clip bg-stone-50">
        <LiquidBackdrop tone="light" />
        <Container className="pt-24 pb-12 sm:pt-32 sm:pb-14 lg:pt-36">
          <Link
            href={localePath(lang, "/projects")}
            className="glass-light inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:text-stone-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> {t.back}
          </Link>
          <div className="mt-8 max-w-3xl animate-rise">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{project.title}</h1>
            {project.public_summary && <p className="mt-5 text-lg leading-relaxed text-stone-600">{project.public_summary}</p>}
          </div>
          <dl className="mt-10 grid animate-rise grid-cols-2 gap-2.5 [animation-delay:150ms] sm:grid-cols-3 lg:grid-cols-6">
            {facts.map((fact) => (
              <div key={fact.label} className="glass-light rounded-2xl p-4">
                <dt className="text-xs font-semibold tracking-wider text-stone-500 uppercase">{fact.label}</dt>
                <dd className="mt-1 font-semibold text-stone-950">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <Container className="py-14">
        <div className="reveal aspect-[16/8] overflow-hidden rounded-[2rem] shadow-[0_30px_70px_-35px_rgb(28_25_23/0.6)]">
          <MediaImage src={project.cover} alt={project.title} label={dict.common.projectPhoto} />
        </div>

        {project.services.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-bold tracking-wider text-stone-500 uppercase">{t.servicesDelivered}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.services.map((service) => (
                <Link key={service.slug} href={localePath(lang, `/services/${service.slug}`)}>
                  <Chip className="px-4 py-1.5 text-sm hover:border-brand-500">{service.title}</Chip>
                </Link>
              ))}
            </div>
          </div>
        )}

        {gallery.length > 0 && (
          <div className="mt-14">
            <h2 className="text-2xl font-extrabold">{t.gallery}</h2>
            <div className="reveal-group mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
              {gallery.map((photo) => (
                <figure key={photo.image}>
                  <div className="relative overflow-hidden rounded-2xl">
                    <img src={photo.image} alt={photo.caption || project.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    <span className="glass-light absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-xs font-semibold text-stone-900">
                      {label(dict.labels.photoStage, photo.stage, photo.stage_display)}
                    </span>
                  </div>
                  {photo.caption && <figcaption className="mt-2 text-sm text-stone-500">{photo.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        )}
      </Container>
      <CtaBand site={site} dict={dict} lang={lang} />
    </>
  );
}
