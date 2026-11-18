from fastapi import APIRouter, status

from app.schemas.pipeline import PipelineDispatchRead, PipelineOverview
from app.services.github_actions import dispatch_pipeline, get_pipeline_overview

router = APIRouter(
    prefix="/api/pipelines",
    tags=["Pipelines"],
)


@router.get("", response_model=PipelineOverview)
def get_pipelines() -> dict[str, object]:
    return get_pipeline_overview()


@router.post(
    "/dispatch",
    response_model=PipelineDispatchRead,
    status_code=status.HTTP_202_ACCEPTED,
)
def trigger_pipeline() -> dict[str, str]:
    return dispatch_pipeline()
