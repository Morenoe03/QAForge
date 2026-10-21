from pydantic import BaseModel


class DashboardStats(BaseModel):
    pass_rate: float
    tests_executed: int
    failed_tests: int
    average_duration_seconds: int
