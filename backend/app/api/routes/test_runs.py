from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_authenticated_user
from app.core.database import get_db
from app.models.test_case import TestCase
from app.models.test_run import TestRun, TestRunResult
from app.models.test_suite import TestSuite
from app.models.user import User
from app.schemas.test_run import (
    FailureRead,
    TestRunCreate,
    TestRunRead,
    TestRunResultUpdate,
)

router = APIRouter(tags=["Test Runs"])


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _current_time() -> datetime:
    return datetime.now(timezone.utc)


def _elapsed_seconds(started_at: datetime, completed_at: datetime) -> int:
    if started_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=None)
    return max(0, int((completed_at - started_at).total_seconds()))


@router.get("/api/test-runs", response_model=list[TestRunRead])
def list_test_runs(
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> list[TestRun]:
    return list(
        db.scalars(
            select(TestRun)
            .where(TestRun.user_id == user.id)
            .order_by(TestRun.created_at.desc(), TestRun.id.desc())
        ).all()
    )


@router.post(
    "/api/test-runs",
    response_model=TestRunRead,
    status_code=status.HTTP_201_CREATED,
)
def create_test_run(
    payload: TestRunCreate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> TestRun:
    suite = db.scalar(
        select(TestSuite).where(
            TestSuite.id == payload.suite_id,
            TestSuite.user_id == user.id,
        )
    )
    if suite is None:
        raise _not_found("Test suite not found.")
    if suite.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active test suites can be run.",
        )

    test_cases = db.scalars(
        select(TestCase)
        .where(
            TestCase.user_id == user.id,
            TestCase.suites.any(TestSuite.id == suite.id),
            TestCase.status == "active",
        )
        .order_by(TestCase.id)
    ).all()
    if not test_cases:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                "The selected suite has no active test cases. Link an active "
                "test case to this suite before starting a run."
            ),
        )

    run = TestRun(
        user_id=user.id,
        name=payload.name,
        suite_id=suite.id,
        suite_name=suite.name,
    )
    run.results = [
        TestRunResult(
            test_case_id=test_case.id,
            case_title=test_case.title,
            case_snapshot={
                "version": test_case.version,
                "steps": test_case.steps,
                "expected_result": test_case.expected_result,
                "preconditions": test_case.preconditions,
                "priority": test_case.priority,
                "test_type": test_case.test_type,
            },
        )
        for test_case in test_cases
    ]
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.patch(
    "/api/test-runs/{run_id}/results/{result_id}",
    response_model=TestRunRead,
)
def record_test_run_result(
    run_id: int,
    result_id: int,
    payload: TestRunResultUpdate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> TestRun:
    run = db.scalar(
        select(TestRun).where(
            TestRun.id == run_id,
            TestRun.user_id == user.id,
        )
    )
    if run is None:
        raise _not_found("Test run not found.")
    if run.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Completed test runs cannot be changed.",
        )

    result = db.get(TestRunResult, result_id)
    if result is None or result.run_id != run_id:
        raise _not_found("Test run result not found.")

    now = _current_time()
    result.outcome = payload.outcome
    result.notes = payload.notes
    result.recorded_at = now

    if all(item.outcome != "pending" for item in run.results):
        run.status = "completed"
        run.completed_at = now
        run.duration_seconds = _elapsed_seconds(run.created_at, now)

    db.commit()
    db.refresh(run)
    return run


@router.delete("/api/test-runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test_run(
    run_id: int,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> Response:
    run = db.scalar(
        select(TestRun).where(
            TestRun.id == run_id,
            TestRun.user_id == user.id,
        )
    )
    if run is None:
        raise _not_found("Test run not found.")
    db.delete(run)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/api/failures", response_model=list[FailureRead])
def list_failures(
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> list[dict[str, object]]:
    failures = db.execute(
        select(TestRunResult, TestRun)
        .join(TestRun, TestRun.id == TestRunResult.run_id)
        .where(
            TestRunResult.outcome == "failed",
            TestRun.user_id == user.id,
        )
        .order_by(TestRunResult.recorded_at.desc(), TestRunResult.id.desc())
    ).all()
    return [
        {
            "id": result.id,
            "run_id": run.id,
            "run_name": run.name,
            "suite_name": run.suite_name,
            "test_case_id": result.test_case_id,
            "case_title": result.case_title,
            "case_snapshot": result.case_snapshot,
            "notes": result.notes,
            "recorded_at": result.recorded_at,
        }
        for result, run in failures
        if result.recorded_at is not None
    ]
