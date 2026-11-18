from datetime import datetime

from sqlalchemy import DateTime, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TestCaseHistory(Base):
    __tablename__ = "test_case_history"
    __table_args__ = (
        UniqueConstraint(
            "test_case_id",
            "version",
            name="uq_test_case_history_case_version",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # Keep snapshots after a test case is deleted; this intentionally has no FK.
    test_case_id: Mapped[int] = mapped_column(Integer, index=True)
    version: Mapped[int] = mapped_column(Integer)
    change_type: Mapped[str] = mapped_column(String(20))
    snapshot: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
