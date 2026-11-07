"use client";

import { MapPin } from "lucide-react";

import { setConsent, useConsent } from "@/lib/consent";

import { buttonClass } from "./ui";

/** Google Maps sets third-party cookies, so the iframe loads only after consent. */
export function ConsentMap({ src, title, blockedText, loadLabel }: { src: string; title: string; blockedText: string; loadLabel: string }) {
  const consent = useConsent();
  const frame = "h-96 w-full rounded-[2rem] border border-stone-200 shadow-[0_30px_70px_-40px_rgb(28_25_23/0.5)]";

  if (consent !== "all") {
    return (
      <div className={`${frame} flex flex-col items-center justify-center gap-4 bg-stone-100 p-8 text-center`}>
        <MapPin className="h-10 w-10 text-brand-500" aria-hidden />
        <p className="max-w-md text-sm leading-relaxed text-stone-600">{blockedText}</p>
        <button type="button" className={buttonClass("outline")} onClick={() => setConsent("all")}>
          {loadLabel}
        </button>
      </div>
    );
  }
  return <iframe src={src} title={title} className={frame} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />;
}
