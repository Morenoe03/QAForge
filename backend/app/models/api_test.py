from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ApiTest(Base):
    __tablename__ = "api_tests"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    method: Mapped[str] = mapped_column(String(10))
    endpoint: Mapped[str] = mapped_column(String(2048))
    request_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    executions: Mapped[list[ApiTestExecution]] = relationship(
        back_populates="api_test",
        cascade="all, delete-orphan",
        order_by="ApiTestExecution.recorded_at.desc(), ApiTestExecution.id.desc()",
    )


class ApiTestExecution(Base):
    __tablename__ = "api_test_executions"

    id: Mapped[int] = mapped_column(primary_key=True)
    api_test_id: Mapped[int] = mapped_column(
        ForeignKey("api_tests.id", ondelete="CASCADE"),
        index=True,
    )
    outcome: Mapped[str] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    api_test: Mapped[ApiTest] = relationship(back_populates="executions")
