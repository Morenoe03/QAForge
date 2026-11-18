from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.test_case import TestCase
from app.models.test_case_history import TestCaseHistory
from app.models.test_suite import TestSuite
from app.schemas.test_case import (
    Priority,
    TestCaseCreate,
    TestCaseHistoryRead,
    TestCasePage,
    TestCaseRead,
    TestCaseStatus,
    TestCaseUpdate,
)

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


def _record_history(
    db: Session,
    test_case: TestCase,
    change_type: str,
) -> None:
    snapshot = TestCaseRead.model_validate(test_case).model_dump(mode="json")
    db.add(
        TestCaseHistory(
            test_case_id=test_case.id,
            version=test_case.version,
            change_type=change_type,
            snapshot=snapshot,
        )
    )


@router.get("", response_model=TestCasePage)
def list_test_cases(
    search: str | None = Query(default=None, max_length=200),
    suite_id: int | None = Query(default=None, gt=0),
    priority: Priority | None = None,
    status: TestCaseStatus | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> TestCasePage:
    statement = select(TestCase)
    search_term = search.strip() if search else ""
    if search_term:
        pattern = f"%{search_term}%"
        statement = statement.where(
            or_(
                TestCase.title.ilike(pattern),
                TestCase.description.ilike(pattern),
                TestCase.preconditions.ilike(pattern),
                TestCase.expected_result.ilike(pattern),
                cast(TestCase.steps, String).ilike(pattern),
                cast(TestCase.tags, String).ilike(pattern),
            )
        )
    if suite_id is not None:
        statement = statement.where(
            TestCase.suites.any(TestSuite.id == suite_id)
        )
    if priority is not None:
        statement = statement.where(TestCase.priority == priority)
    if status is not None:
        statement = statement.where(TestCase.status == status)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    test_cases = db.scalars(
        statement.order_by(TestCase.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return TestCasePage(
        items=test_cases,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{case_id}/history", response_model=list[TestCaseHistoryRead])
def list_test_case_history(
    case_id: int,
    db: Session = Depends(get_db),
) -> list[TestCaseHistory]:
    history = db.scalars(
        select(TestCaseHistory)
        .where(TestCaseHistory.test_case_id == case_id)
        .order_by(TestCaseHistory.version.desc())
    ).all()
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test case history not found.",
        )
    return history


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
    db.flush()
    db.refresh(test_case)
    _record_history(db, test_case, "created")
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

    test_case.version += 1
    db.flush()
    db.refresh(test_case)
    _record_history(db, test_case, "updated")
    db.commit()
    db.refresh(test_case)
    return test_case


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test_case(case_id: int, db: Session = Depends(get_db)) -> Response:
    test_case = _get_test_case_or_404(db, case_id)
    test_case.version += 1
    db.flush()
    db.refresh(test_case)
    _record_history(db, test_case, "deleted")
    db.delete(test_case)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
