from contextlib import contextmanager
import os
from collections.abc import Generator, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("POSTGRES_PASSWORD", "pytest-only")
os.environ.setdefault("QAFORGE_DEMO_USERNAME", "su")
os.environ.setdefault("QAFORGE_DEMO_PASSWORD", "su")
os.environ.setdefault("QAFORGE_SESSION_SECRET", "pytest-session-secret")

from app.core.database import Base, get_db
from app.main import app


@contextmanager
def _create_client(*, authenticate: bool) -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        database = testing_session()
        try:
            yield database
        finally:
            database.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            if authenticate:
                response = test_client.post(
                    "/api/auth/login",
                    json={"username": "su", "password": "su"},
                )
                if response.status_code != 200:
                    raise AssertionError("Could not sign in the test client.")
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with _create_client(authenticate=True) as test_client:
        yield test_client


@pytest.fixture
def unauthenticated_client() -> Generator[TestClient, None, None]:
    with _create_client(authenticate=False) as test_client:
        yield test_client
