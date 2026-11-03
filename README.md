# New House Modern — website & business platform

Corporate website and internal management platform for **New House Modern**
(façade plastering, cladding, decorative finishes, renovation, custom furniture,
in-house scaffolding & formwork manufacturing).

```
┌──────────────┐   ┌──────────────┐
│  web/        │   │  admin/      │      Next.js 16 (App Router, Tailwind 4)
│  public site │   │  management  │
└──────┬───────┘   └──────┬───────┘
       │ /api/public/      │ /api/ (JWT)
       └────────┬──────────┘
         ┌──────▼───────┐
         │  backend/    │   Django 5.2 LTS + Django REST Framework
         │  REST API    │   PostgreSQL · Redis · ReportLab (PDF)
         └──────────────┘
```

| Part | What it does |
|---|---|
| **web/** | Public website: home, services (+ detail), projects portfolio, manufacturing, about, contact & enquiry form. Content comes live from the database. |
| **admin/** | Management platform: dashboard, enquiries & customers (CRM), quotations with cost estimator & PDF, contracts, projects (teams, photos, documents, expenses, payments, milestones), services catalog, inventory & stock ledger, manufacturing orders, equipment, employees & teams, users & roles, settings. |
| **backend/** | REST API, role-based permissions, business logic, PDF generation, Django admin fallback at `/django-admin/`, OpenAPI docs at `/api/docs/`. |

## Languages — Georgian, English, Russian

Everything is trilingual; **Georgian is the default**.

| Where | How |
|---|---|
| Website | Every page lives under `/ka`, `/en` or `/ru` (switcher in the header). Visitors to `/` are sent to their remembered language, else their browser language, else Georgian. hreflang alternates and a per-language sitemap are generated. |
| Admin platform | Language switcher in the top bar and on the login page; the choice is saved on the user account. Interface strings live in `admin/src/lib/i18n/{ka,ru}.ts` (keys are the English text). |
| Content | Services, categories, materials & solutions, products, portfolio projects, company texts and default quotation terms have a ქარ / EN / RU tab in every form. An empty translation falls back to English, then Georgian. |
| Quotations | Each quotation has a language: the PDF, units and auto-estimated lines are produced in it. |
| Server messages | Validation and error messages follow the request language (`backend/locale`, plus Georgian for Django REST framework in `backend/locale_vendor`). After editing a `.po` file run `python manage.py compilemessages`. |

> Georgian and Russian texts were written by Claude — have a native speaker review them before launch.

## Quick start (Docker)

```bash
cp .env.example .env          # then set passwords and DJANGO_SECRET_KEY
docker compose up -d --build
```

- Website: <http://localhost:8080> (→ `/ka`, `/en`, `/ru`)
- Admin platform: <http://localhost:8081> — sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
- API docs: <http://localhost:8081/api/docs/>

On start the backend runs migrations and (with `SEED_ON_START=true`) loads the company
content: services, categories, materials & solutions, manufactured products and the first
administrator. `SEED_ARGS=--demo` additionally creates sample customers, projects, quotations
and stock so the platform can be explored — **never use `--demo` in production**.

## Local development (without Docker)

Requirements: Python 3.12+, Node 22, PostgreSQL.

```bash
# 1. Backend — http://localhost:8000
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env                     # DEBUG=True, local DATABASE_URL
createdb newhousemodern
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed --demo
.venv/bin/python manage.py runserver

# 2. Public website — http://localhost:3000
cd web && npm install && npm run dev

# 3. Admin platform — http://localhost:3001
cd admin && npm install && npm run dev
```

Both Next.js apps proxy `/api` and `/media` to Django (`API_PROXY_TARGET`, default
`http://localhost:8000`), so the admin's auth cookie stays same-origin.

### Demo accounts (`seed --demo`)

| Email | Role | Password |
|---|---|---|
| `admin@newhousemodern.ge` | Administrator | `ADMIN_PASSWORD` (default `ChangeMe-2026!`) |
| `manager@newhousemodern.ge` | Project manager | `Demo-2026!` |
| `sales@newhousemodern.ge` | Sales & estimating | `Demo-2026!` |
| `production@newhousemodern.ge` | Production & warehouse | `Demo-2026!` |

## Roles & permissions

Access is checked on the server for every request (`apps/accounts/roles.py`); the admin UI
hides what a role cannot use.

| Module | Admin | Manager | Sales | Production | Site staff |
|---|---|---|---|---|---|
| Dashboard, projects (read) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Projects (edit), finance | ✓ | ✓ | | | |
| CRM, quotations | ✓ | ✓ | ✓ | | |
| Inventory & manufacturing | ✓ | ✓ | read | ✓ | |
| Services catalog (edit) | ✓ | ✓ | | | |
| Employees & teams | ✓ | ✓ | | read | |
| Users, settings (edit) | ✓ | | | | |

## How the main workflows fit together

1. **Enquiry** arrives from the website form (honeypot + rate limit) → *Enquiries*.
2. **Convert** it to a customer → log calls, meetings and site visits on the customer.
3. **Quotation** → add lines manually or *Add from a service*: the estimator uses the
   service **recipe** (material consumption per m² + waste %) and **labour norm**, with
   material unit costs, labour rate, overhead and margin from *Settings → Pricing*.
   Download a branded PDF (Georgian text supported).
4. **Accept & start project** creates the project (budget = quote total) and a draft contract.
5. Track the **project**: teams, milestones, photos (optionally shown in the website
   portfolio), private documents, expenses and client payments. The dashboard shows
   revenue vs expenses, overdue work and budget use.
6. **Inventory**: every stock change is an append-only movement; completing a production
   order adds the products to stock exactly once.

> The material prices, labour rate and recipes created by `seed` are **placeholders** —
> review them in *Materials stock*, *Services → recipe* and *Settings → Pricing*.

## Security notes

- Access tokens (15 min) live in memory; the refresh token is an **httpOnly, SameSite=Lax**
  cookie scoped to `/api/auth/`, rotated on use and blacklisted on logout.
- Contracts, project documents and receipts are stored outside the public media folder and
  only served through authenticated API endpoints.
- The public site can only reach `/api/public/` (nginx); the rest of the API is served on
  the admin host.
- For production: run behind HTTPS, set `AUTH_COOKIE_SECURE=True` and `SECURE_COOKIES=True`,
  use real domains in `DJANGO_ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS`, and back up the
  `pgdata`, `media` and `private_media` volumes.

## Tests & checks

```bash
cd backend && .venv/bin/python manage.py test apps   # API, permissions, estimator, PDF, stock
cd web && npm run lint && npm run typecheck && npm run build
cd admin && npm run lint && npm run typecheck && npm run build
```

## Project layout

```
backend/
  config/            settings, URLs, API router
  apps/core/         shared models, permissions, uploads, site settings, seed command
  apps/accounts/     users, roles, JWT cookie auth
  apps/catalog/      service categories, services, solutions, estimator recipes
  apps/crm/          customers, enquiries, communications, contracts
  apps/projects/     projects, photos, documents, expenses, payments, milestones
  apps/quotes/       pricing settings, quotations, estimator, PDF
  apps/inventory/    materials, stock ledger, products, production, equipment
  apps/staff/        employees, teams
  apps/dashboard/    KPI summary endpoint
  apps/public/       read-only website API + enquiry form
web/                 public website (Next.js)
admin/               management platform (Next.js)
nginx/               reverse proxy config
docker-compose.yml
```
