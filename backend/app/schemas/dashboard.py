from datetime import datetime

from pydantic import BaseModel


class RecentTestRun(BaseModel):
    id: int
    name: str
    suite_name: str
    status: str
    created_at: datetime
    completed_at: datetime | None


class DashboardStats(BaseModel):
    pass_rate: float
    tests_executed: int
    failed_tests: int
    average_duration_seconds: int
    recent_runs: list[RecentTestRun]
