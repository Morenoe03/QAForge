from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Defect(Base):
    __tablename__ = "defects"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(
        String(20),
        default="medium",
        server_default="medium",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="open",
        server_default="open",
    )
    test_run_result_id: Mapped[int | None] = mapped_column(
        ForeignKey("test_run_results.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    case_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    run_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
