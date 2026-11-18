import logging
import os
import secrets

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.sessions import SessionMiddleware

from app.api.routes import (
    api_tests,
    auth,
    dashboard,
    defects,
    pipelines,
    test_cases,
    test_runs,
    test_suites,
)
from app.core.auth import require_authenticated_user
from app.core.database import engine

logger = logging.getLogger(__name__)

app = FastAPI(
    title="QAForge API",
    version="1.0.0",
)

session_secret = os.getenv("QAFORGE_SESSION_SECRET")
if not session_secret:
    session_secret = secrets.token_urlsafe(32)
    logger.warning(
        "QAFORGE_SESSION_SECRET is unset; using a temporary key. "
        "Sessions will be invalidated when the API restarts."
    )

app.add_middleware(
    SessionMiddleware,
    secret_key=session_secret,
    session_cookie="qaforge_session",
    max_age=12 * 60 * 60,
    same_site="strict",
    https_only=os.getenv("QAFORGE_SESSION_COOKIE_SECURE", "false").lower()
    == "true",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "application": "QAForge API",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "QAForge API",  
    }


@app.get("/health/database")
def database_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.exception("PostgreSQL health check failed")
        raise HTTPException(
            status_code=503,
            detail="Database connection failed",
        ) from exc

    return {
        "status": "healthy",
        "database": "connected",
    }


app.include_router(auth.router)
authenticated_api = {"dependencies": [Depends(require_authenticated_user)]}
app.include_router(dashboard.router, **authenticated_api)
app.include_router(api_tests.router, **authenticated_api)
app.include_router(defects.router, **authenticated_api)
app.include_router(pipelines.router, **authenticated_api)
app.include_router(test_cases.router, **authenticated_api)
app.include_router(test_runs.router, **authenticated_api)
app.include_router(test_suites.router, **authenticated_api)
