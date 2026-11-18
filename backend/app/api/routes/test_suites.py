from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_authenticated_user
from app.core.database import get_db
from app.models.test_suite import TestSuite
from app.models.user import User
from app.schemas.test_suite import TestSuiteCreate, TestSuiteRead, TestSuiteUpdate

router = APIRouter(
    prefix="/api/test-suites",
    tags=["Test Suites"],
)


def _raise_for_duplicate_name(error: IntegrityError) -> None:
    if (
        getattr(error.orig, "sqlstate", None) == "23505"
        or "uq_test_suites_user_name" in str(error.orig)
        or "test_suites.user_id, test_suites.name" in str(error.orig)
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A test suite with this name already exists.",
        ) from error
    raise error


def _get_test_suite_or_404(
    db: Session,
    suite_id: int,
    user_id: int,
) -> TestSuite:
    test_suite = db.scalar(
        select(TestSuite).where(
            TestSuite.id == suite_id,
            TestSuite.user_id == user_id,
        )
    )
    if test_suite is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test suite not found.",
        )
    return test_suite


@router.get("", response_model=list[TestSuiteRead])
def list_test_suites(
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> Sequence[TestSuite]:
    return db.scalars(
        select(TestSuite)
        .where(TestSuite.user_id == user.id)
        .order_by(TestSuite.id)
    ).all()


@router.get("/{suite_id}", response_model=TestSuiteRead)
def get_test_suite(
    suite_id: int,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> TestSuite:
    return _get_test_suite_or_404(db, suite_id, user.id)


@router.post(
    "",
    response_model=TestSuiteRead,
    status_code=status.HTTP_201_CREATED,
)
def create_test_suite(
    payload: TestSuiteCreate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> TestSuite:
    test_suite = TestSuite(**payload.model_dump(), user_id=user.id)
    db.add(test_suite)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        _raise_for_duplicate_name(error)
    db.refresh(test_suite)
    return test_suite


@router.patch("/{suite_id}", response_model=TestSuiteRead)
def update_test_suite(
    suite_id: int,
    payload: TestSuiteUpdate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> TestSuite:
    test_suite = _get_test_suite_or_404(db, suite_id, user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(test_suite, field, value)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        _raise_for_duplicate_name(error)
    db.refresh(test_suite)
    return test_suite


@router.delete("/{suite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test_suite(
    suite_id: int,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> Response:
    test_suite = _get_test_suite_or_404(db, suite_id, user.id)
    db.delete(test_suite)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
