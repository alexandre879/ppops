import { headers } from "next/headers";

import { ButtonLink, Container } from "@/components/ui";
import { defaultLocale, isLocale, localePath, LOCALE_HEADER } from "@/i18n/config";
import { getDictionary } from "@/i18n";

export default async function NotFound() {
  // not-found pages receive no params; the proxy forwards the URL's language in a header.
  const value = (await headers()).get(LOCALE_HEADER);
  const lang = isLocale(value) ? value : defaultLocale;
  const dict = getDictionary(lang);
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center pt-32 pb-20 text-center">
      <p className="bg-linear-to-br from-brand-400 to-brand-700 bg-clip-text font-display text-8xl font-extrabold text-transparent">404</p>
      <h1 className="mt-4 text-3xl font-extrabold">{dict.notFound.title}</h1>
      <p className="mt-3 max-w-md text-stone-600">{dict.notFound.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href={localePath(lang)}>{dict.notFound.home}</ButtonLink>
        <ButtonLink href={localePath(lang, "/contact")} variant="outline">
          {dict.nav.contact}
        </ButtonLink>
      </div>
    </Container>
  );
}
