from fastapi import APIRouter

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)

@router.get("/stats",)
def get_dashboard_stats():
    return {
       "pass_rate": 94.2,
       "tests_executed": 1284,
       "failed_tests": 26,
        "average_duration_time": "271",
    }