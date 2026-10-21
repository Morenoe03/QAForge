from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TestSuiteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    status: str = Field(default="active", min_length=1, max_length=20)

    @field_validator("name", "status")
    @classmethod
    def strip_required_strings(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class TestSuiteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    status: str | None = Field(default=None, min_length=1, max_length=20)

    @field_validator("name", "status")
    @classmethod
    def strip_optional_required_strings(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("This field cannot be null.")
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("description")
    @classmethod
    def strip_optional_description(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def require_at_least_one_change(self) -> "TestSuiteUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class TestSuiteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime
