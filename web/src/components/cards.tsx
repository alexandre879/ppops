import { ArrowUpRight, MapPin } from "lucide-react";
import Link from "next/link";

import { localePath, type Locale } from "@/i18n/config";
import { label, plural, type Dictionary } from "@/i18n";
import { formatNumber } from "@/lib/format";
import type { ProjectSummary, ServiceRef } from "@/lib/types";

import { MediaImage } from "./media";

export function ServiceCard({ service, lang, learnMore }: { service: ServiceRef; lang: Locale; learnMore: string }) {
  return (
    <Link
      href={localePath(lang, `/services/${service.slug}`)}
      className="sheen group flex flex-col rounded-3xl border border-stone-200/80 bg-white shadow-[0_10px_30px_-18px_rgb(28_25_23/0.25)] transition duration-500 ease-liquid hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-[0_30px_60px_-28px_rgb(188_62_12/0.4)]"
    >
      <div className="aspect-[16/10] overflow-hidden">
        <MediaImage src={service.image} alt={service.title} className="transition duration-1000 ease-liquid group-hover:scale-110" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold">{service.title}</h3>
        {service.summary && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-stone-600">{service.summary}</p>}
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-brand-700">
          {learnMore} <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function ProjectCard({ project, lang, dict }: { project: ProjectSummary; lang: Locale; dict: Dictionary }) {
  const { labels } = dict;
  return (
    <Link href={localePath(lang, `/projects/${project.slug}`)} className="group block">
      <div className="sheen relative aspect-[4/3] rounded-3xl bg-stone-100 shadow-[0_14px_34px_-20px_rgb(28_25_23/0.45)] transition duration-500 ease-liquid group-hover:-translate-y-1.5 group-hover:shadow-[0_30px_60px_-28px_rgb(188_62_12/0.45)]">
        <MediaImage src={project.cover} alt={project.title} label={dict.common.projectPhoto} className="transition duration-1000 ease-liquid group-hover:scale-110" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className="glass-light rounded-full px-3 py-1 text-xs font-semibold text-stone-900">
            {label(labels.buildingType, project.building_type, project.building_type_display)}
          </span>
          {project.status !== "completed" && (
            <span className="rounded-full bg-brand-500/90 px-3 py-1 text-xs font-semibold text-stone-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] backdrop-blur-md">
              {label(labels.projectStatus, project.status, project.status_display)}
            </span>
          )}
        </div>
        <span className="glass-light absolute right-3 bottom-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full text-stone-900 opacity-0 transition duration-500 ease-liquid group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <div className="mt-4 px-1">
        <h3 className="text-lg font-bold transition-colors group-hover:text-brand-700">{project.title}</h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
          {project.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {project.city}
            </span>
          )}
          {project.floors ? <span>{plural(lang, labels.floors, project.floors)}</span> : null}
          {project.area_m2 ? <span>{formatNumber(lang, project.area_m2)} {labels.areaUnit}</span> : null}
          {project.year ? <span>{project.year}</span> : null}
        </p>
      </div>
    </Link>
  );
}
