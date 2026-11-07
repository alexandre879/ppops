"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { ButtonLink, buttonClass, Container } from "@/components/ui";
import { defaultLocale, isLocale, localePath, type Locale } from "@/i18n/config";

// Kept here rather than in the dictionaries: this runs in the browser, and importing them would
// add all three languages' text to every page's scripts.
const TEXT: Record<Locale, { title: string; text: string; retry: string; contact: string }> = {
  ka: {
    title: "გვერდი ვერ ჩაიტვირთა",
    text: "ეს დროებითი ხარვეზია. გთხოვთ, სცადოთ თავიდან ან დაგვიკავშირდეთ.",
    retry: "თავიდან ცდა",
    contact: "კონტაქტი",
  },
  en: {
    title: "This page couldn't load",
    text: "It's a temporary problem. Please try again, or contact us.",
    retry: "Try again",
    contact: "Contact",
  },
  ru: {
    title: "Не удалось загрузить страницу",
    text: "Это временный сбой. Попробуйте ещё раз или свяжитесь с нами.",
    retry: "Попробовать снова",
    contact: "Контакты",
  },
};

export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  const value = useParams().lang;
  const lang = typeof value === "string" && isLocale(value) ? value : defaultLocale;
  const t = TEXT[lang];

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center pt-32 pb-20 text-center">
      <h1 className="text-3xl font-extrabold">{t.title}</h1>
      <p className="mt-3 max-w-md text-stone-600">{t.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className={buttonClass("primary")}>
          {t.retry}
        </button>
        <ButtonLink href={localePath(lang, "/contact")} variant="outline">
          {t.contact}
        </ButtonLink>
      </div>
    </Container>
  );
}
