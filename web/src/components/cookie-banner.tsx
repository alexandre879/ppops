"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { OPEN_SETTINGS_EVENT, openConsentSettings, setConsent, useConsent } from "@/lib/consent";

import { buttonClass } from "./ui";

/** Asks once; reopened from the footer's "Cookie settings". Both choices are equally prominent. */
export function CookieBanner({ lang, t }: { lang: Locale; t: Dictionary["consent"] }) {
  const consent = useConsent();
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  // undefined = still hydrating: render nothing so server and client markup match.
  if (consent === undefined || (consent !== null && !reopened)) return null;

  const choose = (choice: "all" | "essential") => {
    setConsent(choice);
    setReopened(false);
  };

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label={t.label}
      aria-describedby="cookie-banner-text"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-2xl border border-white/10 bg-stone-950/95 p-5 text-stone-300 shadow-2xl backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <div className="flex items-start gap-4">
        <Cookie className="mt-0.5 hidden h-6 w-6 shrink-0 text-brand-500 sm:block" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-white">{t.title}</h2>
          <p id="cookie-banner-text" className="mt-2 text-sm leading-relaxed">
            {t.text}{" "}
            <Link href={localePath(lang, "/cookies")} className="font-semibold text-brand-400 underline underline-offset-2 hover:text-brand-300">
              {t.policy}
            </Link>
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" className={buttonClass("primary", "justify-center")} onClick={() => choose("all")}>
              {t.accept}
            </button>
            <button type="button" className={buttonClass("ghostLight", "justify-center")} onClick={() => choose("essential")}>
              {t.reject}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Footer link that reopens the banner so visitors can change or withdraw consent. */
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button type="button" className="hover:text-white" onClick={openConsentSettings}>
      {label}
    </button>
  );
}
