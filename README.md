# QAForge

QAForge is a web application for managing test suites, monitoring automated test runs, reviewing failures, tracking defects, and triggering CI/CD automation.

## Prerequisites

- Node.js and npm
- Python 3
- Git
- Docker Desktop with Docker Compose

## Run with Docker

From the `QAForge` directory, start the frontend, backend, and PostgreSQL database:

```powershell
docker compose up --build
```

Open the frontend at [http://localhost:5173](http://localhost:5173). The backend API
and interactive documentation are available at [http://localhost:8000](http://localhost:8000)
and [http://localhost:8000/docs](http://localhost:8000/docs).
The backend connects to PostgreSQL on the Compose network, and its database readiness
check is available at [http://localhost:8000/health/database](http://localhost:8000/health/database).

The database password is read from `QAForge/.env` as `POSTGRES_PASSWORD`. Keep that
file local and do not commit it.
Stop the containers with `Ctrl+C`, or run
`docker compose down`. Database data remains in the `qaforge_postgres_data` volume;
to remove that data as well, run `docker compose down --volumes`.

### Database migrations

Apply pending migrations before signing in to a new database:

```powershell
docker compose exec backend alembic upgrade head
```

Run Alembic inside the backend container so it uses the same PostgreSQL settings as
the API:

```powershell
docker compose exec backend alembic revision --autogenerate -m "describe schema change"
docker compose exec backend alembic upgrade head
```

This is the command to open terminal in powershell to run SQL commands:
docker exec -it qaforge-db psql -U qaforge -d qaforge


## Run Locally

Start PostgreSQL from the `QAForge` directory. For local backend runs,
`POSTGRES_PASSWORD` is loaded from the project-level `.env` automatically, and the
database host defaults to `localhost`.

```powershell
docker compose up -d db
cd .\backend
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload

'or (for mac)'

python3 -m pip install -r requirements.txt
python3 -m alembic upgrade head
python3 -m uvicorn app.main:app --reload

```

In a second terminal, start the frontend:

```powershell
cd .\frontend
npm install
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173`.

### Accounts, Login, and Settings

QAForge includes a local demo account and a Create account option on the login
screen. Each account has an isolated workspace for test suites, test cases,
runs, API tests, defects, and dashboard data. Existing data is assigned to the
demo account when the workspace-isolation migration is applied. The demo
account is initialized by that migration, so set any custom demo credentials
before applying migrations to a fresh database.

Local demo credentials:

- Username: `su`
- Password: `su`

New users can create an account with a display name, email, username, and
password of at least eight characters. The account menu opens Account and
Settings, where the profile can be updated and the light/dark theme selected.
Profile changes are saved in PostgreSQL; the theme preference is saved in that
browser. Signing out clears the session. All `/api` endpoints other than
`/api/auth/*` require an authenticated session.

The demo credentials are deliberately simple and **not suitable for a publicly
reachable deployment**. To configure them for a fresh database and provide a
stable session key, set these values in the project `.env`:

```env
QAFORGE_DEMO_USERNAME=su
QAFORGE_DEMO_PASSWORD=su
QAFORGE_SESSION_SECRET=replace-with-a-long-random-secret
QAFORGE_SESSION_COOKIE_SECURE=false
```

For HTTPS deployments, set `QAFORGE_SESSION_COOKIE_SECURE=true` and replace the
demo credentials with a strong username and password before migrating a fresh
database. Self-service registration
does not include email verification or password recovery. If no session key is
configured, the backend generates a temporary one at startup and existing
sessions are invalidated when it restarts.

## Backend API

The backend is a FastAPI application. When it is running locally, its interactive Swagger API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

The Test Suites page reads and writes suites through the FastAPI `/api/test-suites`
endpoints. In Docker Compose, the frontend calls the backend at
`http://localhost:8000`, and the backend persists suites in PostgreSQL.
For local frontend development, set `VITE_API_BASE_URL` in
`frontend/.env.local` if the API is not at that default URL.

Test Cases are managed through `/api/test-cases`. Each case includes its title,
description, preconditions, steps, expected result, priority, type, status, and
tags. Cases may be linked to multiple Test Suites; deleting a suite removes its
link without deleting the reusable case. The list endpoint supports `search`,
`suite_id`, `priority`, `status`, `page`, and `page_size` query parameters and
returns the matching items with pagination metadata. Each create, update, and
delete appends a versioned snapshot available from
`/api/test-cases/{case_id}/history`.

Test Runs are created from an active suite and snapshot its active test cases
that are linked to that suite. New test cases default to the first active suite;
cases can be assigned to multiple suites. Record each result as passed, failed,
blocked, or skipped through
`PATCH /api/test-runs/{run_id}/results/{result_id}`. Runs complete when every
case has a recorded outcome; run results remain available until the run is
deleted. The Failures page is derived from failed run results through
`GET /api/failures`, and dashboard statistics use persisted run outcomes rather
than sample values. Test execution is manual; QAForge does not execute test
case code.

Defects are managed through `/api/defects` and can be linked to a failed test
result. Their captured run and case names remain available if the linked run is
later removed.

API Tests are stored request definitions with manually recorded outcomes.
`/api/api-tests/{api_test_id}/executions` appends pass, fail, or blocked history.
QAForge does not send requests to the documented endpoints.

The Pipelines page reads the latest GitHub Actions runs for one configured
workflow and can dispatch it on a server-configured ref. This integration is
configured for the whole application, not per user. Set the following in the
project `.env`:

```env
GITHUB_ACTIONS_REPOSITORY=owner/repository
GITHUB_ACTIONS_WORKFLOW=backend-tests.yml
GITHUB_ACTIONS_REF=development
GITHUB_ACTIONS_TOKEN=your-fine-grained-token
GITHUB_ACTIONS_ALLOW_DISPATCH=true
```

The token needs Actions read/write permission and stays on the backend. Dispatch
is disabled unless explicitly enabled. Only enable dispatch for trusted users
and deployments.

## Frontend Commands

Run these commands from `QAForge/frontend`:

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```

### Browser tests

Browser tests use Playwright to exercise Test Suites, Test Cases, Test Runs,
Failures, API Tests, and Defects against the real FastAPI service and PostgreSQL
database. Start PostgreSQL and apply migrations before running them locally:

```powershell
cd ..\backend
alembic upgrade head
cd ..\frontend
npx playwright install chromium
npm run test:e2e
```

The Playwright configuration starts the FastAPI backend and Vite frontend. The
database must already be running, and the backend uses the normal local
`POSTGRES_*` settings. Playwright writes an HTML report to
`frontend/playwright-report` and machine-readable results to
`frontend/test-results`.
GitHub Actions runs the backend and browser suites on pushes and pull requests
that change backend, frontend, Docker Compose, or the CI workflow; reports
are uploaded as workflow artifacts.

## Backend Commands

Run these commands from `QAForge/backend`:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Install the backend development dependencies and run the API tests with:

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -v
```

## Project Structure

```text
QAForge/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       └── dashboard.py  # Dashboard statistics endpoint
│   │   ├── core/        # Backend core configuration and utilities
│   │   ├── models/      # Data models
│   │   ├── schemas/     # API schemas
│   │   ├── services/    # Application services
│   │   └── main.py      # FastAPI application setup
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── public/          # Static files served from the site root
│   ├── src/
│   │   ├── components/  # Shared layout, navigation, and page components
│   │   ├── App.tsx      # Application shell and page navigation
│   │   └── App.css      # Application styles
│   └── package.json
└── README.md
```

## API Configuration

The dashboard uses local fallback data until an API URL is configured. To load metrics and pipeline runs from a controller, create `frontend/.env.local`:

```env
VITE_DASHBOARD_API_URL=http://localhost:8080/api/dashboard
```

The endpoint should return:

```json
{
  "passRate": 94.2,
  "totalRuns": 1284,
  "failedRuns": 27,
  "averageDuration": "4m31s",
  "recentPipelineRuns": [
    { "suite": "Regression", "branch": "main", "status": "Passed" }
  ]
}
```

## Git Workflow

Run Git commands from the repository root, `QAForge`, not `QAForge/frontend`.

```powershell
cd C:\path\to\QAForge
git status
git pull origin main
git switch -c feature/short-description
```

After making and testing changes:

```powershell
git status
git diff
git add .
git commit -m "Describe the change"
git push -u origin feature/short-description
```

Useful commands:

```powershell
git branch                    # List local branches
git switch main               # Switch branches
git log --oneline -10         # View recent commits
git restore path/to/file      # Discard local changes in one file
git diff --staged             # Review staged changes
```

Do not commit `.env.local`; it may contain local or sensitive configuration.

## UI Packages

- [CoreUI](https://coreui.io/react/)
- [Lucide React](https://lucide.dev/guide/packages/lucide-react)
