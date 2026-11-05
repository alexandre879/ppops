import { ArrowRight, Check, Clock, Mail, Phone } from "lucide-react";

import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { telHref } from "@/lib/format";
import type { Category, Site } from "@/lib/types";

import { EnquiryForm } from "./enquiry-form";
import { ButtonLink, Container, Eyebrow, LiquidBackdrop, SectionHeading } from "./ui";

export function serviceOptions(categories: Category[]) {
  return categories.flatMap((c) => c.services.map((s) => ({ slug: s.slug, title: s.title, group: c.name })));
}

export function WhyUsSection({ dict }: { dict: Dictionary }) {
  const t = dict.whyUs;
  return (
    <section className="py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
        </div>
        <ul className="reveal-group grid gap-3 sm:grid-cols-2">
          {t.reasons.map((reason) => (
            <li
              key={reason}
              className="flex gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-18px_rgb(28_25_23/0.3)] transition duration-500 ease-liquid hover:-translate-y-0.5 hover:border-brand-200"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 shadow-[0_4px_12px_-4px_rgb(242_107_29/0.8)]">
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden />
              </span>
              <span className="font-medium text-stone-800">{reason}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function ProcessSection({ dict }: { dict: Dictionary }) {
  const t = dict.process;
  return (
    <section className="relative isolate overflow-clip bg-stone-50 py-20 sm:py-28">
      <LiquidBackdrop tone="light" />
      <Container>
        <SectionHeading eyebrow={t.eyebrow} title={t.title} align="center" />
        <ol className="reveal-group mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((step, i) => (
            <li
              key={step.title}
              className="sheen relative rounded-3xl border border-white bg-white/80 p-7 shadow-[0_14px_40px_-24px_rgb(28_25_23/0.35)] backdrop-blur-sm transition duration-500 ease-liquid hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-28px_rgb(188_62_12/0.4)]"
            >
              <span className="bg-linear-to-br from-brand-400 to-brand-700 bg-clip-text font-display text-5xl font-extrabold text-transparent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

export function CtaBand({ site, dict, lang }: { site: Site; dict: Dictionary; lang: Locale }) {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="reveal relative isolate flex flex-col gap-8 overflow-clip rounded-4xl bg-brand-500 px-6 py-12 shadow-[0_40px_80px_-40px_rgb(188_62_12/0.8)] sm:px-12 lg:flex-row lg:items-center lg:justify-between">
          <LiquidBackdrop tone="brand" />
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold text-stone-950 sm:text-4xl">{dict.cta.title}</h2>
            {site.promise && <p className="mt-3 text-lg text-stone-900/80">{site.promise}</p>}
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <ButtonLink href={localePath(lang, "/contact")} variant="dark" className="whitespace-nowrap">
              {dict.common.getFreeEstimate} <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            {site.phones[0] && (
              <a
                href={telHref(site.phones[0])}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/25 px-6 py-3 text-sm font-semibold whitespace-nowrap text-stone-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] backdrop-blur-md transition duration-300 ease-liquid hover:-translate-y-0.5 hover:bg-white/40"
              >
                <Phone className="h-4 w-4" aria-hidden /> {site.phones[0]}
              </a>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function ContactSection({
  site,
  categories,
  dict,
  lang,
  defaultService,
  page,
}: {
  site: Site;
  categories: Category[];
  dict: Dictionary;
  lang: Locale;
  defaultService?: string;
  /** On the contact page the section is the page itself: its heading becomes the page title. */
  page?: { eyebrow: string; title: string; description: string };
}) {
  const t = dict.contactSection;
  return (
    <section
      id="contact"
      className={`relative isolate overflow-clip bg-stone-950 text-white ${page ? "pt-28 pb-20 sm:pt-36 sm:pb-28 lg:pt-44" : "py-20 sm:py-28"}`}
    >
      <LiquidBackdrop />
      <div className="bg-blueprint mask-soft absolute inset-0 -z-10" aria-hidden />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-brand-500/60 to-transparent" aria-hidden />
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
        <div>
          {page ? (
            <div className="animate-rise">
              <Eyebrow light>{page.eyebrow}</Eyebrow>
              <h1 className="mt-4 pb-1 text-4xl font-extrabold text-white sm:text-5xl">{page.title}</h1>
              <p className="mt-5 text-lg leading-relaxed text-stone-300">{page.description}</p>
            </div>
          ) : (
            <SectionHeading light eyebrow={t.eyebrow} title={t.title} description={t.description} />
          )}
          <ul className={page ? "mt-10 animate-rise space-y-3 [animation-delay:120ms]" : "reveal mt-10 space-y-3"}>
            {site.phones.map((phone) => (
              <li key={phone}>
                <a href={telHref(phone)} className="group flex items-center gap-4 rounded-2xl p-1.5 pr-4 transition duration-300 ease-liquid hover:bg-white/5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-brand-400 shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] ring-1 ring-white/12 backdrop-blur-md transition duration-300 group-hover:bg-brand-500 group-hover:text-stone-950 group-hover:shadow-[0_0_20px_-2px_rgb(242_107_29/0.7)]">
                    <Phone className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-lg font-semibold tabular-nums">{phone}</span>
                </a>
              </li>
            ))}
            {site.email && (
              <li>
                <a href={`mailto:${site.email}`} className="group flex items-center gap-4 rounded-2xl p-1.5 pr-4 transition duration-300 ease-liquid hover:bg-white/5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-brand-400 shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] ring-1 ring-white/12 backdrop-blur-md transition duration-300 group-hover:bg-brand-500 group-hover:text-stone-950 group-hover:shadow-[0_0_20px_-2px_rgb(242_107_29/0.7)]">
                    <Mail className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-lg font-semibold">{site.email}</span>
                </a>
              </li>
            )}
            {site.working_hours && (
              <li className="flex items-center gap-4 p-1.5 text-stone-300">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-brand-400 ring-1 ring-white/12 backdrop-blur-md">
                  <Clock className="h-5 w-5" aria-hidden />
                </span>
                {site.working_hours}
              </li>
            )}
          </ul>
        </div>
        <div className={`${page ? "animate-rise [animation-delay:200ms]" : "reveal"} relative`}>
          <div
            className="absolute -inset-px -z-10 rounded-4xl bg-linear-to-br from-brand-400/70 via-brand-500/20 to-transparent blur-[1px]"
            aria-hidden
          />
          <div className="absolute -inset-8 -z-20 rounded-[3rem] bg-brand-500/15 blur-3xl" aria-hidden />
          <div className="rounded-4xl bg-white p-6 text-stone-900 shadow-[0_40px_90px_-40px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_255_255/0.06)] sm:p-9">
            <EnquiryForm services={serviceOptions(categories)} defaultService={defaultService} lang={lang} t={dict.form} />
          </div>
        </div>
      </Container>
    </section>
  );
}
