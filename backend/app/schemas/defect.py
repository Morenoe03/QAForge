from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

DefectSeverity = Literal["low", "medium", "high", "critical"]
DefectStatus = Literal["open", "in_progress", "resolved", "closed"]


class DefectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    severity: DefectSeverity = "medium"
    status: DefectStatus = "open"
    test_run_result_id: int | None = Field(default=None, gt=0)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Defect title cannot be blank.")
        return value

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class DefectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    severity: DefectSeverity | None = None
    status: DefectStatus | None = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Defect title cannot be null.")
        value = value.strip()
        if not value:
            raise ValueError("Defect title cannot be blank.")
        return value

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @field_validator("severity", "status")
    @classmethod
    def reject_null_choices(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("This field cannot be null.")
        return value

    @model_validator(mode="after")
    def require_changes(self) -> "DefectUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class DefectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    severity: DefectSeverity
    status: DefectStatus
    test_run_result_id: int | None
    case_title: str | None
    run_name: str | None
    created_at: datetime
    updated_at: datetime
