from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TestRunOutcome = Literal["passed", "failed", "blocked", "skipped"]
TestRunState = Literal["in_progress", "completed"]


class TestRunCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    suite_id: int = Field(gt=0)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Run name cannot be blank.")
        return value


class TestRunResultUpdate(BaseModel):
    outcome: TestRunOutcome
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class TestRunResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    test_case_id: int | None
    case_title: str
    case_snapshot: dict[str, object]
    outcome: Literal["pending", "passed", "failed", "blocked", "skipped"]
    notes: str | None
    recorded_at: datetime | None


class TestRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    suite_id: int | None
    suite_name: str
    status: TestRunState
    duration_seconds: int | None
    created_at: datetime
    completed_at: datetime | None
    results: list[TestRunResultRead]


class FailureRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: int
    run_name: str
    suite_name: str
    test_case_id: int | None
    case_title: str
    case_snapshot: dict[str, object]
    notes: str | None
    recorded_at: datetime
