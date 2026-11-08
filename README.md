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

## Development with Docker

Runs every app from your working copy with live reload; no `.env` needed.

```bash
./start.sh     # starts Docker if needed, builds, starts everything and waits until it responds
./pause.sh     # freezes everything instantly (frees the CPU); ./start.sh resumes where it left off
./stop.sh      # stops everything; the database and uploads are kept
```

The first run also adds `start proj`, `pause proj` and `stop proj` commands to bash, zsh and fish,
so from then on you can control the project from any folder (in a new terminal).

On Linux, install Docker Engine with the Compose and Buildx plugins (Arch:
`sudo pacman -S docker docker-compose docker-buildx`), start it with
`sudo systemctl enable --now docker`, and add yourself to the `docker` group. The containers
run as user id 1000, so the checkout should belong to that user (`id -u` prints `1000`).

- Website: <http://localhost:3000>
- Admin platform: <http://localhost:3001> — [demo accounts](#demo-accounts-seed---demo), admin password `ChangeMe-2026!`
- API docs: <http://localhost:8000/api/docs/> · Django admin: <http://localhost:8000/django-admin/>
- PostgreSQL: `localhost:5433`, user/password/database `nhm` / `nhm` / `newhousemodern`

Saving a file reloads Django or Next.js. After `git pull`, run the same command again: it applies
new migrations, reinstalls changed Python or npm packages and recreates what changed. Each machine
has its own database, so share schema changes as migrations.

```bash
docker compose -f docker-compose.dev.yml logs -f backend     # follow one service's logs
docker compose -f docker-compose.dev.yml exec backend python manage.py makemigrations
docker compose -f docker-compose.dev.yml down -v             # stop and wipe database & uploads
```

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

## Website AI assistant

The glowing button at the bottom right of every website page opens a chat that answers
visitors' questions **only from the company's own website content** (retrieval-augmented
generation):

1. For each question, the backend searches the published content (company profile and
   contacts, service categories, services and starting prices, materials, products, portfolio
   projects) in all three languages and picks the most relevant pages
   (`backend/apps/public/knowledge.py`).
2. Only those pages go to Claude as search results, with instructions to answer from them
   alone and to suggest a call or a free estimate when the answer isn't there
   (`backend/apps/public/assistant.py`).
3. The reply comes back in the visitor's language, with links to the pages it cites.

Set `ANTHROPIC_API_KEY` in `.env` to switch it on; until then the chat shows *Offline* and
the company's phone number. Each question is a paid API call (model `claude-opus-5-5`,
`ASSISTANT_MODEL` to change it), limited per visitor by `THROTTLE_ASSISTANT` (default 30
an hour). Internal data (costs, budgets, customers, labour norms, stock) is never read, and
content edited in the admin is used from the next question on.

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

## Production deployment

`newhousemodern.shop` runs on a DigitalOcean Droplet (`k3s-1`) under k3s, in the `ppops`
namespace. **The Droplet also hosts another app (`blueapp.store`), so take care with its
resources.** The manifests are in `k8s/`; the website is at `/` and the admin at `/admin`.

**Every push to `main` that changes `backend/`, `web/` or `admin/` goes live automatically.** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs the backend
tests, then `k8s/deploy.sh`, which:

1. uploads the source to the server and builds the images there;
2. saves a database dump to `/srv/backups/ppops/` on the server (the last 7 are kept);
3. restarts the app, which applies any new migrations on start-up.

If the tests or the build fail, the live site is left as it was. You can follow a run, or start
one by hand, from the **Actions** tab on GitHub. Running `./k8s/deploy.sh` from your own machine
does the same, but it uploads your local files, including anything uncommitted.

Setup, once: the `DEPLOY_SSH_KEY` repository secret holds a private key for the `ppops-deployer`
account on the server. That key can only start a deploy of this project
(`/usr/local/sbin/ppops-deploy`, from `k8s/server-deploy.sh`); it has no shell or other access.

Changes to `k8s/` are not deployed automatically, because a manifest could give a pod access to the
whole server. Apply them by hand with `./k8s/full-deploy.sh`, which needs root access. If
`k8s/server-deploy.sh` changes, install it on the server by hand too.

Secrets the app needs (`ppops-postgres`, `ppops-secrets`) are created once by `deploy.sh` and live
only on the server; none belong in `k8s/`.

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
