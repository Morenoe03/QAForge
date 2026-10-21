from fastapi import APIRouter
from app.schemas.dashboard import DashboardStats

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats():
    return DashboardStats(
        pass_rate=94.2,
        tests_executed=1284,
        failed_tests=26,
        average_duration_seconds=271,
    )