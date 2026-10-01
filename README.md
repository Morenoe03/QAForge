# QAForge

QAForge is a web application for managing test suites, monitoring automated test runs, reviewing failures, tracking defects, and triggering CI/CD automation.

## Prerequisites

- Node.js and npm
- Python 3
- Git

## Run Locally

Run these commands from the repository root, `QAForge`:

```powershell
cd .\frontend
npm install
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173`.

## Backend API

The backend is a FastAPI application. When it is running locally, its interactive Swagger API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Frontend Commands

Run these commands from `QAForge/frontend`:

## Backend Commands

Run this command from `QAForge/backend`:

```powershell
uvicorn app.main:app --reload
```

```powershell
npm run dev       # Start the development server
npm run build     # Type-check and create a production build
npm run lint      # Run ESLint
npm run preview   # Preview the production build locally
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
