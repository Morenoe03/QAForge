from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import get_authenticated_user
from app.core.database import get_db
from app.models.test_run import TestRun, TestRunResult
from app.models.user import User
from app.schemas.dashboard import DashboardStats

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> DashboardStats:
    completed_outcomes = ("passed", "failed", "blocked", "skipped")
    executed = db.scalar(
        select(func.count(TestRunResult.id))
        .join(TestRun, TestRun.id == TestRunResult.run_id)
        .where(
            TestRun.user_id == user.id,
            TestRunResult.outcome.in_(completed_outcomes),
        )
    ) or 0
    passed = db.scalar(
        select(func.count(TestRunResult.id))
        .join(TestRun, TestRun.id == TestRunResult.run_id)
        .where(
            TestRun.user_id == user.id,
            TestRunResult.outcome == "passed"
        )
    ) or 0
    failed = db.scalar(
        select(func.count(TestRunResult.id))
        .join(TestRun, TestRun.id == TestRunResult.run_id)
        .where(
            TestRun.user_id == user.id,
            TestRunResult.outcome == "failed"
        )
    ) or 0
    average_duration = db.scalar(
        select(func.avg(TestRun.duration_seconds)).where(
            TestRun.status == "completed",
            TestRun.user_id == user.id,
        )
    ) or 0
    recent_runs = db.scalars(
        select(TestRun)
        .where(TestRun.user_id == user.id)
        .order_by(TestRun.created_at.desc(), TestRun.id.desc())
        .limit(5)
    ).all()

    return DashboardStats(
        pass_rate=round(passed / executed * 100, 1) if executed else 0,
        tests_executed=executed,
        failed_tests=failed,
        average_duration_seconds=round(average_duration),
        recent_runs=[
            {
                "id": run.id,
                "name": run.name,
                "suite_name": run.suite_name,
                "status": run.status,
                "created_at": run.created_at,
                "completed_at": run.completed_at,
            }
            for run in recent_runs
        ],
    )