import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from "@/i18n/config";

/** Remembered choice → browser language → Georgian. */
function preferredLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  for (const part of (request.headers.get("accept-language") ?? "").split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return defaultLocale;
}

/** Every page lives under /ka, /en or /ru; anything else is redirected there. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const current = pathname.split("/")[1];
  if (isLocale(current)) {
    // Pass the language to server code that has no route params (the not-found page).
    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, current);
    const response = NextResponse.next({ request: { headers } });
    // Remember the language the visitor is reading in for their next visit to "/".
    if (request.cookies.get(LOCALE_COOKIE)?.value !== current) {
      response.cookies.set(LOCALE_COOKIE, current, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return response;
  }
  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip the API/media proxies, Next.js internals and files (sitemap.xml, icon.svg, …).
  matcher: ["/((?!api|media|_next|.*\\..*).*)"],
};
