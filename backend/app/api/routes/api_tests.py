from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_authenticated_user
from app.core.database import get_db
from app.models.api_test import ApiTest, ApiTestExecution
from app.models.user import User
from app.schemas.api_test import (
    ApiTestCreate,
    ApiTestExecutionCreate,
    ApiTestRead,
    ApiTestUpdate,
)

router = APIRouter(
    prefix="/api/api-tests",
    tags=["API Tests"],
)


def _get_api_test_or_404(
    db: Session,
    api_test_id: int,
    user_id: int,
) -> ApiTest:
    api_test = db.scalar(
        select(ApiTest).where(
            ApiTest.id == api_test_id,
            ApiTest.user_id == user_id,
        )
    )
    if api_test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API test not found.",
        )
    return api_test


@router.get("", response_model=list[ApiTestRead])
def list_api_tests(
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> Sequence[ApiTest]:
    return db.scalars(
        select(ApiTest)
        .where(ApiTest.user_id == user.id)
        .order_by(ApiTest.created_at.desc(), ApiTest.id.desc())
    ).all()


@router.get("/{api_test_id}", response_model=ApiTestRead)
def get_api_test(
    api_test_id: int,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> ApiTest:
    return _get_api_test_or_404(db, api_test_id, user.id)


@router.post(
    "",
    response_model=ApiTestRead,
    status_code=status.HTTP_201_CREATED,
)
def create_api_test(
    payload: ApiTestCreate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> ApiTest:
    api_test = ApiTest(**payload.model_dump(), user_id=user.id)
    db.add(api_test)
    db.commit()
    db.refresh(api_test)
    return api_test


@router.patch("/{api_test_id}", response_model=ApiTestRead)
def update_api_test(
    api_test_id: int,
    payload: ApiTestUpdate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> ApiTest:
    api_test = _get_api_test_or_404(db, api_test_id, user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(api_test, field, value)
    db.commit()
    db.refresh(api_test)
    return api_test


@router.post(
    "/{api_test_id}/executions",
    response_model=ApiTestRead,
)
def record_api_test_execution(
    api_test_id: int,
    payload: ApiTestExecutionCreate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> ApiTest:
    api_test = _get_api_test_or_404(db, api_test_id, user.id)
    api_test.executions.append(
        ApiTestExecution(
            outcome=payload.outcome,
            notes=payload.notes,
        )
    )
    db.commit()
    db.refresh(api_test)
    return api_test


@router.delete(
    "/{api_test_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_api_test(
    api_test_id: int,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> Response:
    api_test = _get_api_test_or_404(db, api_test_id, user.id)
    db.delete(api_test)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
