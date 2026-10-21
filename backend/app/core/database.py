import os
from collections.abc import Generator
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# Load the project-level .env for local runs; environment variables already set
# by Docker Compose or the shell take precedence.
project_env = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(project_env)

password = os.getenv("POSTGRES_PASSWORD")
if not password:
    raise RuntimeError("POSTGRES_PASSWORD must be set to connect to PostgreSQL")

database_url = URL.create(
    drivername="postgresql+psycopg",
    username=os.getenv("POSTGRES_USER", "qaforge"),
    password=password,
    host=os.getenv("POSTGRES_HOST", "localhost"),
    port=int(os.getenv("POSTGRES_PORT", "5432")),
    database=os.getenv("POSTGRES_DB", "qaforge"),
)

engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    database = SessionLocal()
    try:
        yield database
    finally:
        database.close()
