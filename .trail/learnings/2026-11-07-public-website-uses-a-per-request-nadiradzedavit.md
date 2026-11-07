---
title: Public website uses a per-request nonce CSP; optional storage waits for cookie consent
author: Nadiradzedavit
date: 2026-11-07
branch: main
cost: { minutes: 12, tokens: 194179 }
id: l-4dc7557a
scope: repo
status: active
src: agent
touches:
  - web/src/i18n/legal/types.ts
  - web/src/i18n/legal/en.ts
  - web/src/i18n/legal/ka.ts
  - web/src/i18n/legal/ru.ts
  - web/src/proxy.ts
  - backend/apps/public/serializers.py
  - backend/apps/projects/views.py
---

## Decided
- The public site sends a strict Content-Security-Policy with a fresh nonce per request (no 'unsafe-inline' for scripts). Any new inline <script> must take the nonce, or the browser blocks it.
- The admin keeps Next.js inline scripts, so its CSP only restricts framing, plugins, base-uri and form targets.
- Anything optional (Google Maps embed, saving the AI assistant chat) loads only after the visitor picks "Accept all" in the cookie banner. The site has no analytics or ad trackers; keep it that way or update the cookie policy and banner text.
- The enquiry form requires an 18+/privacy consent checkbox, enforced on the server; the time of consent is stored on the enquiry.
- Contract, estimate and invoice project documents follow the crm, quotes and finance roles, not the open "projects" module.

## Watch out
- Legal page texts (privacy, terms, cookies, refunds) are generic templates, not lawyer-reviewed. Legal name and ID code come from Site settings and stay hidden until filled in.

In the code: web/src/proxy.ts (contentSecurityPolicy), web/src/app/[lang]/layout.tsx (nonce on REVEAL_BOOT), web/src/lib/consent.ts, web/src/i18n/legal/, backend/apps/public/serializers.py (privacy_consent), backend/apps/projects/views.py (RESTRICTED_KINDS).
