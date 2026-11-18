from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.test_suite import test_suite_cases


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    preconditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    steps: Mapped[list[str]] = mapped_column(JSON, default=list)
    expected_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(
        String(20),
        default="medium",
        server_default="medium",
    )
    test_type: Mapped[str] = mapped_column(
        String(20),
        default="manual",
        server_default="manual",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="draft",
        server_default="draft",
    )
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    suites: Mapped[list[TestSuite]] = relationship(
        secondary=test_suite_cases,
        back_populates="test_cases",
    )

    @property
    def suite_ids(self) -> list[int]:
        return [suite.id for suite in self.suites]
