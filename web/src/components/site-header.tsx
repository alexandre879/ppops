"use client";

import clsx from "clsx";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { NAV } from "@/lib/content";
import { telHref } from "@/lib/format";

import { Logo } from "./icons";
import { LanguageSwitcher } from "./language-switcher";
import { buttonClass } from "./ui";

type Props = {
  lang: Locale;
  phone?: string;
  nav: Dictionary["nav"];
  t: Dictionary["header"];
};

/** Floating glass bar over the page; it turns more solid once the page scrolls. */
export function SiteHeader({ lang, phone, nav, t }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => {
    const full = localePath(lang, href);
    return pathname === full || pathname.startsWith(`${full}/`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 lg:pt-4">
      <div
        className={clsx(
          "glass-dark mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 rounded-full pr-2 pl-4 text-white transition-[background-color,box-shadow] duration-500 lg:h-16 lg:pr-2.5 lg:pl-5",
          (scrolled || open) && "bg-stone-950/85 shadow-[inset_0_1px_0_rgb(255_255_255/0.1),0_20px_50px_-20px_rgb(0_0_0/0.7)]",
        )}
      >
        <Link href={localePath(lang)} aria-label={t.home} onClick={() => setOpen(false)} className="shrink-0 rounded-lg">
          <Logo light />
        </Link>

        <nav aria-label={t.mainNav} className="hidden items-center gap-1 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={localePath(lang, item.href)}
              className={clsx(
                "rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-300",
                isActive(item.href)
                  ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]"
                  : "text-stone-300 hover:bg-white/6 hover:text-white",
              )}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {nav[item.key]}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 xl:flex">
          <Suspense>
            <LanguageSwitcher lang={lang} label={t.language} />
          </Suspense>
          {phone && (
            <a href={telHref(phone)} className="hidden items-center gap-2 text-sm font-semibold whitespace-nowrap text-stone-200 hover:text-white 2xl:flex">
              <Phone className="h-4 w-4 text-brand-400" aria-hidden />
              {phone}
            </a>
          )}
          <Link href={localePath(lang, "/contact")} className={buttonClass("primary", "h-11 shrink-0 px-5! py-0! whitespace-nowrap")}>
            {t.getEstimate}
          </Link>
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <Suspense>
            <LanguageSwitcher lang={lang} label={t.language} />
          </Suspense>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.closeMenu : t.openMenu}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 -z-10 bg-stone-950/55 xl:hidden" onClick={() => setOpen(false)} aria-hidden />
          <div
            id="mobile-menu"
            className="glass-dark mx-auto mt-2 max-h-[calc(100dvh-6rem)] max-w-7xl animate-rise overflow-y-auto rounded-3xl bg-stone-950/90 p-3 [animation-duration:0.45s] xl:hidden"
          >
            <nav aria-label={t.mobileNav} className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={localePath(lang, item.href)}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={clsx(
                    "flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-lg font-bold transition-colors",
                    isActive(item.href) ? "bg-white/10 text-brand-400" : "text-white hover:bg-white/6",
                  )}
                >
                  {nav[item.key]}
                  <ArrowUpRight className="h-5 w-5 text-stone-500" aria-hidden />
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
              <Link href={localePath(lang, "/contact")} onClick={() => setOpen(false)} className={buttonClass("primary", "w-full")}>
                {t.getEstimate}
              </Link>
              {phone && (
                <a href={telHref(phone)} className={buttonClass("ghostLight", "w-full")}>
                  <Phone className="h-4 w-4" aria-hidden /> {phone}
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
