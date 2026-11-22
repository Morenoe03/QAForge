def create_suite(client, name="Checkout"):
    response = client.post("/api/test-suites", json={"name": name})
    assert response.status_code == 201
    return response.json()


def create_case(client, title, suite_id, status="active"):
    response = client.post(
        "/api/test-cases",
        json={
            "title": title,
            "status": status,
            "steps": ["Complete the action"],
            "expected_result": "The action succeeds.",
            "suite_ids": [suite_id],
        },
    )
    assert response.status_code == 201
    return response.json()


def test_test_run_records_results_and_exposes_failures(client):
    suite = create_suite(client)
    first_case = create_case(client, "Checkout payment", suite["id"])
    create_case(client, "Checkout confirmation", suite["id"])
    create_case(client, "Archived checkout", suite["id"], status="deprecated")

    create_response = client.post(
        "/api/test-runs",
        json={"name": "Checkout regression", "suite_id": suite["id"]},
    )
    assert create_response.status_code == 201
    run = create_response.json()
    assert run["status"] == "in_progress"
    assert len(run["results"]) == 2
    result = next(
        item for item in run["results"] if item["test_case_id"] == first_case["id"]
    )
    assert result["case_snapshot"]["steps"] == ["Complete the action"]

    failed_response = client.patch(
        f"/api/test-runs/{run['id']}/results/{result['id']}",
        json={"outcome": "failed", "notes": "Payment was declined unexpectedly."},
    )
    assert failed_response.status_code == 200
    assert failed_response.json()["status"] == "in_progress"

    failures_response = client.get("/api/failures")
    assert failures_response.status_code == 200
    failures = failures_response.json()
    assert len(failures) == 1
    assert failures[0]["id"] == result["id"]
    assert failures[0]["run_id"] == run["id"]
    assert failures[0]["run_name"] == "Checkout regression"
    assert failures[0]["case_title"] == "Checkout payment"
    assert failures[0]["notes"] == "Payment was declined unexpectedly."
    assert failures[0]["recorded_at"] is not None

    remaining_result = next(
        item for item in run["results"] if item["id"] != result["id"]
    )
    completed_response = client.patch(
        f"/api/test-runs/{run['id']}/results/{remaining_result['id']}",
        json={"outcome": "passed"},
    )
    assert completed_response.status_code == 200
    assert completed_response.json()["status"] == "completed"
    assert completed_response.json()["duration_seconds"] is not None
    dashboard = client.get("/api/dashboard/stats").json()
    assert dashboard["tests_executed"] == 2
    assert dashboard["failed_tests"] == 1
    assert dashboard["pass_rate"] == 50
    assert dashboard["recent_runs"][0]["id"] == run["id"]
    assert client.patch(
        f"/api/test-runs/{run['id']}/results/{result['id']}",
        json={"outcome": "passed"},
    ).status_code == 409


def test_test_run_rejects_missing_or_ineligible_suites(client):
    assert client.post(
        "/api/test-runs",
        json={"name": "Missing suite", "suite_id": 999},
    ).status_code == 404

    suite = create_suite(client, "Empty suite")
    empty_run_response = client.post(
        "/api/test-runs",
        json={"name": "Empty run", "suite_id": suite["id"]},
    )
    assert empty_run_response.status_code == 422
    assert empty_run_response.json()["detail"] == (
        "The selected suite has no active test cases. Link an active test case "
        "to this suite before starting a run."
    )

    archived_suite = client.patch(
        f"/api/test-suites/{suite['id']}",
        json={"status": "archived"},
    )
    assert archived_suite.status_code == 200
    assert client.post(
        "/api/test-runs",
        json={"name": "Archived run", "suite_id": suite["id"]},
    ).status_code == 409

    assert client.post(
        "/api/test-runs",
        json={"name": "   ", "suite_id": suite["id"]},
    ).status_code == 422
