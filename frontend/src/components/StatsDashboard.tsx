import { useEffect, useState } from "react";
import Footer from "./Footer";
import { getDashboardStats, type DashboardStats } from "../api/dashboard";

export default function MainContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recentRuns = stats?.recent_runs ?? []

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load dashboard statistics");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <main className="main-content flex-1">
      <section id="center">
        <div>
          <h1>Get started</h1>
          <p>Good evening,</p>
        </div>

        {loading && <p role="status">Loading dashboard statistics...</p>}
        {error && <p role="alert">Unable to load dashboard statistics: {error}</p>}
        {stats && (
          <div className="test-summary" aria-label="Test summary">
            <div className="summary-item">
              <strong>{stats.pass_rate}%</strong>
              <span>Pass</span>
            </div>
            <div className="summary-item">
              <strong>{stats.tests_executed.toLocaleString()}</strong>
              <span>Tests executed</span>
            </div>
            <div className="summary-item">
              <strong>{stats.failed_tests.toLocaleString()}</strong>
              <span>Failed</span>
            </div>
            <div className="summary-item">
              <strong>{stats.average_duration_seconds}</strong>
              <span>Avg (s)</span>
            </div>
          </div>
        )}

        <section className="test-executions" aria-labelledby="test-executions-title">
          <div className="section-heading">
            <h2 id="test-executions-title">Recent Test Runs</h2>
            <span>Execution history</span>
          </div>
          <div className="pipeline-runs" role="table" aria-label="Recent test runs">
            {recentRuns.length === 0 && (
              <p className="dashboard-empty-state">No test runs have been recorded.</p>
            )}
            {recentRuns.map((run) => (
              <div className="pipeline-run" role="row" key={run.id}>
                <strong role="cell">{run.name}</strong>
                <span className="pipeline-branch" role="cell">{run.suite_name}</span>
                <span
                  className={`pipeline-status ${run.status === 'completed' ? 'passed' : ''}`}
                  role="cell"
                >
                  {run.status.replace('_', ' ')}
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
