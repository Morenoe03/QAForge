export interface DashboardStats {
  pass_rate: number;
    tests_executed: number;
    failed_tests: number;
    average_duration_time: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(
        "http://127.0.0.1:8000/api/dashboard/stats"
    );

    if (!response.ok) {
        throw new Error("Failed to fetch dashboard statistics");
    }

    return response.json();
}