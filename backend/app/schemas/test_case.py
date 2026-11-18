from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Priority = Literal["low", "medium", "high", "critical"]
TestType = Literal["manual", "automated"]
TestCaseStatus = Literal["draft", "active", "deprecated"]


class TestCaseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    preconditions: str | None = None
    steps: list[str] = Field(default_factory=list)
    expected_result: str | None = None
    priority: Priority = "medium"
    test_type: TestType = "manual"
    status: TestCaseStatus = "draft"
    tags: list[str] = Field(default_factory=list)
    suite_ids: list[int] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be blank.")
        return value

    @field_validator("description", "preconditions", "expected_result")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("steps")
    @classmethod
    def strip_steps(cls, value: list[str]) -> list[str]:
        steps = [step.strip() for step in value]
        if any(not step for step in steps):
            raise ValueError("Steps cannot contain blank values.")
        return steps

    @field_validator("tags")
    @classmethod
    def strip_tags(cls, value: list[str]) -> list[str]:
        tags = [tag.strip() for tag in value]
        if any(not tag for tag in tags):
            raise ValueError("Tags cannot contain blank values.")
        if len(tags) != len(set(tags)):
            raise ValueError("Tags must be unique.")
        return tags

    @field_validator("suite_ids")
    @classmethod
    def validate_suite_ids(cls, value: list[int]) -> list[int]:
        if any(suite_id < 1 for suite_id in value):
            raise ValueError("Suite IDs must be positive integers.")
        if len(value) != len(set(value)):
            raise ValueError("Suite IDs must be unique.")
        return value


class TestCaseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    preconditions: str | None = None
    steps: list[str] | None = None
    expected_result: str | None = None
    priority: Priority | None = None
    test_type: TestType | None = None
    status: TestCaseStatus | None = None
    tags: list[str] | None = None
    suite_ids: list[int] | None = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Title cannot be null.")
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be blank.")
        return value

    @field_validator("description", "preconditions", "expected_result")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("steps")
    @classmethod
    def strip_steps(cls, value: list[str] | None) -> list[str]:
        if value is None:
            raise ValueError("Steps cannot be null.")
        steps = [step.strip() for step in value]
        if any(not step for step in steps):
            raise ValueError("Steps cannot contain blank values.")
        return steps

    @field_validator("tags")
    @classmethod
    def strip_tags(cls, value: list[str] | None) -> list[str]:
        if value is None:
            raise ValueError("Tags cannot be null.")
        tags = [tag.strip() for tag in value]
        if any(not tag for tag in tags):
            raise ValueError("Tags cannot contain blank values.")
        if len(tags) != len(set(tags)):
            raise ValueError("Tags must be unique.")
        return tags

    @field_validator("suite_ids")
    @classmethod
    def validate_suite_ids(cls, value: list[int] | None) -> list[int]:
        if value is None:
            raise ValueError("Suite IDs cannot be null.")
        if any(suite_id < 1 for suite_id in value):
            raise ValueError("Suite IDs must be positive integers.")
        if len(value) != len(set(value)):
            raise ValueError("Suite IDs must be unique.")
        return value

    @field_validator("priority", "test_type", "status")
    @classmethod
    def validate_optional_choices(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("This field cannot be null.")
        return value

    @model_validator(mode="after")
    def require_at_least_one_change(self) -> "TestCaseUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class TestCaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    preconditions: str | None
    steps: list[str]
    expected_result: str | None
    priority: Priority
    test_type: TestType
    status: TestCaseStatus
    tags: list[str]
    suite_ids: list[int]
    created_at: datetime
    updated_at: datetime


class TestCasePage(BaseModel):
    items: list[TestCaseRead]
    total: int
    page: int
    page_size: int
