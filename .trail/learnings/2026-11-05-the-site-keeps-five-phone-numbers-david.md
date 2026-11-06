---
title: The site keeps five phone numbers; the new one was added rather than replacing the fourth
author: David
date: 2026-11-05
branch: main
cost: { minutes: 4, tokens: 19332 }
id: l-b78371c1
scope: repo
status: superseded
src: agent
touches:
  - backend/apps/core/models.py
  - backend/apps/quotes/pdf.py
  - web/src/lib/api.ts
---

## Decided
+995 568 28 27 72 was added as a fifth company phone. The four existing numbers (+995 579 01 32 41, +995 551 27 77 30, +995 593 28 68 94, +995 557 60 30 04) all stay. The user chose this explicitly.

## Tried and ruled out
Replacing the fourth number (+995 557 60 30 04) with the new one. The user wanted all five numbers shown.

## Watch out
The quotation PDF header band is 24 mm high. Five numbers only fit because the line spacing was tightened, so a sixth number would overflow it. Pages and the AI assistant read the `phones` list, so a new number field only has to be added to the model's `phones` property.

In the code:
- backend/apps/core/models.py: `phone_quinary` field, included in `SiteSettings.phones`
- backend/apps/core/migrations/0004_sitesettings_phone_quinary.py
- backend/apps/quotes/pdf.py: `site.phones[:5]`, line y = 6.5 + i * 3.7 mm
- admin/src/app/(app)/settings/page.tsx and admin/src/lib/i18n/{ka,ru}.ts: "Fifth phone" label
- web/src/lib/api.ts: fallback phones list
