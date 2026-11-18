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
python -m uvicorn app.main:app --reload
```

In a second terminal, start the frontend:

```powershell
cd .\frontend
npm install
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173`.

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
link without deleting the reusable case.

## Frontend Commands

Run these commands from `QAForge/frontend`:

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```

### Browser tests

Browser tests use Playwright to exercise the Test Suites page against the real
FastAPI service and PostgreSQL database. Start PostgreSQL and apply migrations
before running them locally:

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
