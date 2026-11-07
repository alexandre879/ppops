import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCard } from "@/components/cards";
import { CtaBand } from "@/components/sections";
import { Container, PageHero } from "@/components/ui";
import { isLocale, languageAlternates, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getProjects, getSite } from "@/lib/api";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ service?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).projectsPage;
  return { title: t.title, description: t.description, alternates: languageAlternates(lang, "/projects") };
}

export default async function ProjectsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { service } = await searchParams;
  const dict = getDictionary(lang);
  const t = dict.projectsPage;
  const [site, projects] = await Promise.all([getSite(lang), getProjects(lang)]);

  const services = new Map<string, string>();
  for (const project of projects) for (const s of project.services) services.set(s.slug, s.title);
  const shown = service ? projects.filter((p) => p.services.some((s) => s.slug === service)) : projects;
  const base = localePath(lang, "/projects");

  const filterClass = (active: boolean) =>
    clsx(
      "rounded-full border px-4 py-2 text-sm font-medium transition",
      active ? "border-brand-500 bg-brand-500 text-stone-950" : "border-stone-300 text-stone-700 hover:border-stone-950",
    );

  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <Container className="py-14 sm:py-16">
        {services.size > 1 && (
          <nav aria-label={t.filterLabel} className="mb-10 flex flex-wrap gap-2">
            <Link href={base} className={filterClass(!service)} scroll={false}>
              {t.all}
            </Link>
            {Array.from(services).map(([slug, title]) => (
              <Link key={slug} href={`${base}?service=${slug}`} className={filterClass(service === slug)} scroll={false}>
                {title}
              </Link>
            ))}
          </nav>
        )}
        {shown.length > 0 ? (
          <div className="reveal-group grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((project) => (
              <ProjectCard key={project.slug} project={project} lang={lang} dict={dict} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-stone-300 px-6 py-16 text-center">
            <p className="text-lg font-semibold text-stone-900">{t.emptyTitle}</p>
            <p className="mt-2 text-stone-600">{t.emptyText}</p>
          </div>
        )}
      </Container>
      <CtaBand site={site} dict={dict} lang={lang} />
    </>
  );
}
