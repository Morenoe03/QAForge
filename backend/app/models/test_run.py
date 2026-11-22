from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TestRun(Base):
    __tablename__ = "test_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150))
    suite_id: Mapped[int | None] = mapped_column(
        ForeignKey("test_suites.id", ondelete="SET NULL"),
        nullable=True,
    )
    suite_name: Mapped[str] = mapped_column(String(150))
    status: Mapped[str] = mapped_column(
        String(20),
        default="in_progress",
        server_default="in_progress",
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    results: Mapped[list[TestRunResult]] = relationship(
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="TestRunResult.id",
    )


class TestRunResult(Base):
    __tablename__ = "test_run_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("test_runs.id", ondelete="CASCADE"),
        index=True,
    )
    test_case_id: Mapped[int | None] = mapped_column(
        ForeignKey("test_cases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    case_title: Mapped[str] = mapped_column(String(200))
    case_snapshot: Mapped[dict[str, object]] = mapped_column(JSON)
    outcome: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        server_default="pending",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    run: Mapped[TestRun] = relationship(back_populates="results")
