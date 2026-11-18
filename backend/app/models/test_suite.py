from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


test_suite_cases = Table(
    "test_suite_cases",
    Base.metadata,
    Column(
        "test_suite_id",
        ForeignKey("test_suites.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "test_case_id",
        ForeignKey("test_cases.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class TestSuite(Base):
    __tablename__ = "test_suites"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        server_default="active",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    test_cases: Mapped[list[TestCase]] = relationship(
        secondary=test_suite_cases,
        back_populates="suites",
    )
