from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.test_case import TestCase
from app.models.test_suite import TestSuite
from app.schemas.test_case import TestCaseCreate, TestCaseRead, TestCaseUpdate

router = APIRouter(
    prefix="/api/test-cases",
    tags=["Test Cases"],
)


def _get_test_case_or_404(db: Session, case_id: int) -> TestCase:
    test_case = db.get(TestCase, case_id)
    if test_case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test case not found.",
        )
    return test_case


def _get_suites_or_404(db: Session, suite_ids: list[int]) -> list[TestSuite]:
    if not suite_ids:
        return []

    suites_by_id = {
        suite.id: suite
        for suite in db.scalars(
            select(TestSuite).where(TestSuite.id.in_(suite_ids))
        ).all()
    }
    if len(suites_by_id) != len(suite_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more test suites were not found.",
        )
    return [suites_by_id[suite_id] for suite_id in suite_ids]


@router.get("", response_model=list[TestCaseRead])
def list_test_cases(db: Session = Depends(get_db)) -> Sequence[TestCase]:
    return db.scalars(select(TestCase).order_by(TestCase.id)).all()


@router.get("/{case_id}", response_model=TestCaseRead)
def get_test_case(
    case_id: int,
    db: Session = Depends(get_db),
) -> TestCase:
    return _get_test_case_or_404(db, case_id)


@router.post(
    "",
    response_model=TestCaseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_test_case(
    payload: TestCaseCreate,
    db: Session = Depends(get_db),
) -> TestCase:
    case_data = payload.model_dump(exclude={"suite_ids"})
    test_case = TestCase(**case_data)
    test_case.suites = _get_suites_or_404(db, payload.suite_ids)
    db.add(test_case)
    db.commit()
    db.refresh(test_case)
    return test_case


@router.patch("/{case_id}", response_model=TestCaseRead)
def update_test_case(
    case_id: int,
    payload: TestCaseUpdate,
    db: Session = Depends(get_db),
) -> TestCase:
    test_case = _get_test_case_or_404(db, case_id)
    changes = payload.model_dump(exclude_unset=True)
    if "suite_ids" in changes:
        test_case.suites = _get_suites_or_404(db, changes.pop("suite_ids"))
    for field, value in changes.items():
        setattr(test_case, field, value)

    db.commit()
    db.refresh(test_case)
    return test_case


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test_case(case_id: int, db: Session = Depends(get_db)) -> Response:
    test_case = _get_test_case_or_404(db, case_id)
    db.delete(test_case)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
