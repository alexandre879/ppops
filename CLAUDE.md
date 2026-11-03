# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build

```bash
# Web (Next.js)
cd web && npm run build

# Admin (Next.js)
cd admin && npm run build

# Backend (Django)
cd backend && .venv/bin/python manage.py collectstatic
```

### Lint

```bash
# Web
cd web && npm run lint

# Admin
cd admin && npm run lint

# Backend
cd backend && .venv/bin/python manage.py check
```

### Tests

```bash
# Backend API tests
cd backend && .venv/bin/python manage.py test apps

# Web typecheck
cd web && npm run typecheck

# Admin typecheck
cd admin && npm run typecheck
```

### Single test

```bash
# Backend: cd backend && .venv/bin/python manage.py test apps.<test_name>
# Web: cd web && npm test -- <test-path>
# Admin: cd admin && npm test -- <test-path>
```

### Development

```bash
# With Docker (recommended)
docker compose up -d --build

# Website:      http://localhost:8080 (→ /ka, /en, /ru)
# Admin:        http://localhost:8081  (sign in with ADMIN_EMAIL/ADMIN_PASSWORD)
# API docs:     http://localhost:8081/api/docs/

# Without Docker
# Backend: cd backend && .venv/bin/python manage.py runserver     # port 8000
# Web:       cd web && npm run dev                               # port 3000
# Admin:     cd admin && npm run dev                             # port 3001
```

## High-level Architecture

This is a **trilingual** (Georgian/English/Russian) full-stack platform:

- **web/** — Public Next.js 16 site (App Router, Tailwind 4). Every page under `/ka`, `/en`, or `/ru`. Language switcher in header. Default Georgian, fallback to English then browser language. hreflang alternates, per-language sitemap generated.

- **admin/** — Next.js 16 management platform (App Router, Tailwind 4). Dashboard, CRM, quotations with PDF estimator, contracts, projects, inventory, manufacturing, employees, users/roles. Language switcher saves choice on user account. Interface strings in `admin/src/lib/i18n/{ka,ru}.ts`.

- **backend/** — Django 5.2 LTS + Django REST Framework. REST API with role-based permissions. PostgreSQL + Redis. PDF generation with ReportLab. OpenAPI docs at `/api/docs/`. `/api/public/` gateway via nginx; rest of API same-origin behind auth cookie.

- **Data flow**: Website enquiry form → CRM (customers, communications, contracts) → Quotation (estimator with service recipes, material costs, labour norms) → Project creation → Project tracking (teams, milestones, documents, expenses, payments, payments).

- **Trilingual content**: Every model has ქარ / EN / RU fields. Empty translation falls back to English, then Georgian. PDFs, units, and quotation terms produced in request language.

- **Authentication**: JWT cookie auth (`API_PROXY_TARGET` defaults to `http://localhost:8000`). Access tokens live 15 min in memory; refresh token is httpOnly, SameSite=Lax, scoped to `/api/auth/`.

## Languages

All content is trilingual (ka/en/ru). See README for details on how translations work per-layer (website, admin, content forms, quotations, server messages).

## Key paths

- `backend/apps/core/` — shared models, permissions, uploads, site settings, seed command
- `backend/apps/accounts/` — users, roles, JWT cookie auth
- `backend/apps/catalog/` — service categories, services, solutions, estimator recipes
- `backend/apps/crm/` — customers, enquiries, communications, contracts
- `backend/apps/projects/` — projects, photos, documents, expenses, payments, milestones
- `backend/apps/quotes/` — pricing settings, quotations, estimator, PDF
- `backend/apps/inventory/` — materials, stock ledger, products, production, equipment
- `backend/apps/staff/` — employees, teams
- `web/src/` — Next.js public website
- `admin/src/` — Next.js management platform

## Important notes

- Never use `--demo` flag in production (seed command).
- Material prices, labour rates and recipes from `seed` are placeholders — review in *Materials stock*, *Services → recipe* and *Settings → Pricing*.
- Access tokens 15 min in memory; refresh token httpOnly, SameSite=Lax, scoped to `/api/auth/`.
- Contracts, project documents and receipts stored outside public media, served only through authenticated API endpoints.
- Public site can only reach `/api/public/` (nginx).
- For production: HTTPS, `AUTH_COOKIE_SECURE=True`, `SECURE_COOKIES=True`, real domains in `DJANGO_ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS`.
- Back up `pgdata`, `media`, `private_media` volumes.

## Seed / Demo accounts

```text
admin@newhousemodern.ge  Administrator  ChangeMe-2026!
manager@newhousemodern.ge  Project manager  Demo-2026!
sales@newhousemodern.ge  Sales & estimating  Demo-2026!
production@newhousemodern.ge  Production & warehouse  Demo-2026!
```