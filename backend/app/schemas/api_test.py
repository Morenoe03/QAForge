from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

HttpMethod = Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
ApiTestOutcome = Literal["passed", "failed", "blocked"]


class ApiTestCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=4000)
    method: HttpMethod
    endpoint: str = Field(min_length=1, max_length=2048)
    request_body: str | None = Field(default=None, max_length=20000)
    expected_status: int | None = Field(default=None, ge=100, le=599)

    @field_validator("name", "endpoint")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("description", "request_body")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class ApiTestUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=4000)
    method: HttpMethod | None = None
    endpoint: str | None = Field(default=None, min_length=1, max_length=2048)
    request_body: str | None = Field(default=None, max_length=20000)
    expected_status: int | None = Field(default=None, ge=100, le=599)

    @field_validator("name", "endpoint")
    @classmethod
    def strip_required_text(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("This field cannot be null.")
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("description", "request_body")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @field_validator("method")
    @classmethod
    def reject_null_method(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("HTTP method cannot be null.")
        return value

    @model_validator(mode="after")
    def require_changes(self) -> "ApiTestUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class ApiTestExecutionCreate(BaseModel):
    outcome: ApiTestOutcome
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class ApiTestExecutionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    api_test_id: int
    outcome: ApiTestOutcome
    notes: str | None
    recorded_at: datetime


class ApiTestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    method: HttpMethod
    endpoint: str
    request_body: str | None
    expected_status: int | None
    created_at: datetime
    updated_at: datetime
    executions: list[ApiTestExecutionRead]
