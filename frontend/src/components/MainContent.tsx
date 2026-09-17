import { useEffect, useState } from "react";
import Footer from "./Footer";

// These types mirror the data needed by the dashboard cards and pipeline list.
type SummaryMetric = {
  value: string;
  label: string;
};

type PipelineRun = {
  suite: string;
  branch: string;
  status: "Passed" | "Failed";
};

type DashboardData = {
  summaryMetrics: SummaryMetric[];
  pipelineRuns: PipelineRun[];
};

type DashboardApiResponse = {
  passRate: number;
  totalRuns: number;
  failedRuns: number;
  averageDuration: string;
  recentPipelineRuns: PipelineRun[];
};

const fallbackDashboardData: DashboardData = {
  summaryMetrics: [
  { value: "94.2%", label: "Pass" },
  { value: "1,284", label: "Runs" },
  { value: "27", label: "Failed" },
  { value: "4m31s", label: "Avg" },
  ],
  pipelineRuns: [
    { suite: "Regression", branch: "main", status: "Passed" },
    { suite: "API Tests", branch: "develop", status: "Passed" },
    { suite: "Smoke Tests", branch: "feature", status: "Failed" },
  ],
};

const dashboardApiUrl = import.meta.env.VITE_DASHBOARD_API_URL;

// Use local demo data until the backend endpoint is configured.
async function loadDashboardData(): Promise<DashboardData> {
  if (!dashboardApiUrl) {
    return fallbackDashboardData;
  }

  const response = await fetch(dashboardApiUrl);
  if (!response.ok) {
    throw new Error(`Dashboard request failed: ${response.status}`);
  }

  const data = (await response.json()) as DashboardApiResponse;
  return {
    summaryMetrics: [
      { value: `${data.passRate}%`, label: "Pass" },
      { value: data.totalRuns.toLocaleString(), label: "Runs" },
      { value: data.failedRuns.toLocaleString(), label: "Failed" },
      { value: data.averageDuration, label: "Avg" },
    ],
    pipelineRuns: data.recentPipelineRuns,
  };
}

export default function MainContent() {
  const [dashboardData, setDashboardData] = useState(fallbackDashboardData);

  // Refresh the dashboard from the configured API without blocking the first render.
  useEffect(() => {
    if (!dashboardApiUrl) {
      return;
    }

    loadDashboardData()
      .then(setDashboardData)
      .catch((error: unknown) => {
        console.error("Unable to load dashboard data", error);
      });
  }, []);

  return (
    <main className="main-content flex-1">
      {/* Dashboard overview and recent execution activity. */}
      <section id="center">
        <div>
          <h1>Get started</h1>
          <p>
            Good evening,
          </p>
        </div>

        <div className="test-summary" aria-label="Test summary">
          {dashboardData.summaryMetrics.map((metric) => (
            <div className="summary-item" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>

        <section className="test-executions" aria-labelledby="test-executions-title">
          <div className="section-heading">
            <h2 id="test-executions-title">Test Executions</h2>
            <span>Recent Pipeline Runs</span>
          </div>
          <div className="pipeline-runs" role="table" aria-label="Recent pipeline runs">
            {dashboardData.pipelineRuns.map((run) => (
              <div className="pipeline-run" role="row" key={`${run.suite}-${run.branch}`}>
                <strong role="cell">{run.suite}</strong>
                <span className="pipeline-branch" role="cell">{run.branch}</span>
                <span className={`pipeline-status ${run.status.toLowerCase()}`} role="cell">
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </section>
		





      </section>

      <Footer />
    </main>
  );
}
