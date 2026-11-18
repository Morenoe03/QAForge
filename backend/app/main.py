import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import (
    api_tests,
    dashboard,
    defects,
    pipelines,
    test_cases,
    test_runs,
    test_suites,
)
from app.core.database import engine

logger = logging.getLogger(__name__)

app = FastAPI(
    title="QAForge API",
    version="1.0.0",
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


app.include_router(dashboard.router)
app.include_router(api_tests.router)
app.include_router(defects.router)
app.include_router(pipelines.router)
app.include_router(test_cases.router)
app.include_router(test_runs.router)
app.include_router(test_suites.router)
