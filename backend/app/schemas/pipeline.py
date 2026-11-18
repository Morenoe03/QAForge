from datetime import datetime

from pydantic import BaseModel


class PipelineRunRead(BaseModel):
    id: int
    name: str
    run_number: int
    status: str
    conclusion: str | None
    branch: str
    html_url: str
    created_at: datetime
    updated_at: datetime


class PipelineOverview(BaseModel):
    configured: bool
    repository: str | None
    workflow: str | None
    ref: str | None
    can_dispatch: bool
    message: str | None
    runs: list[PipelineRunRead]


class PipelineDispatchRead(BaseModel):
    message: str
    ref: str
