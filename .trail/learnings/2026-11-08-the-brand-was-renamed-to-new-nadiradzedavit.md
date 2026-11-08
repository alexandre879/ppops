---
title: "The brand was renamed to New House World in text only; domains and emails keep the old name, and the live name lives in the database"
author: Nadiradzedavit
date: 2026-11-08
branch: chore/rename-new-house-world
cost: { minutes: 22, tokens: 617754 }
id: l-31dd452b
scope: repo
status: active
src: agent
touches:
  - README.md
  - admin/src/app/(app)/settings/page.tsx
  - admin/src/app/layout.tsx
  - admin/src/app/login/page.tsx
  - admin/src/components/shell.tsx
  - admin/src/lib/i18n/ka.ts
  - admin/src/lib/i18n/ru.ts
  - backend/apps/core/management/commands/seed.py
  - backend/apps/core/migrations/0007_rename_company_new_house_world.py
  - backend/apps/core/models.py
---

## Decided
- Display text "New House Modern" became "New House World" everywhere in code (admin UI, ka/ru strings, backend defaults, seed, Django admin header, API docs title, tests, comments).
- Domains (newhousemodern.shop / .ge), @newhousemodern.ge emails, npm package and container names were left alone on purpose: renaming them breaks logins, mail and the deploy.
- Old migrations were not edited; a new migration carries the changed model defaults.

## Watch out
- The public site shows the company name and About text saved in the SiteSettings row. Changing model defaults does not touch that row, so after deploy the name must be changed in Admin → Settings.
- No CI runs on pull requests. Backend tests only run in the deploy workflow after merge to main.

In the code: backend/apps/core/models.py (SiteSettings defaults), backend/apps/core/migrations/0007_rename_company_new_house_world.py, admin/src/components/shell.tsx, admin/src/app/login/page.tsx, .github/workflows/deploy.yml (push to main only).
