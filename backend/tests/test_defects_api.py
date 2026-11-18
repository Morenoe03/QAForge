def create_failed_result(client):
    suite_response = client.post(
        "/api/test-suites",
        json={"name": "Payments"},
    )
    assert suite_response.status_code == 201
    suite_id = suite_response.json()["id"]
    case_response = client.post(
        "/api/test-cases",
        json={
            "title": "Payment confirmation",
            "status": "active",
            "suite_ids": [suite_id],
        },
    )
    assert case_response.status_code == 201
    run_response = client.post(
        "/api/test-runs",
        json={"name": "Payment regression", "suite_id": suite_id},
    )
    assert run_response.status_code == 201
    run = run_response.json()
    result = run["results"][0]
    failed_response = client.patch(
        f"/api/test-runs/{run['id']}/results/{result['id']}",
        json={"outcome": "failed", "notes": "Confirmation was missing."},
    )
    assert failed_response.status_code == 200
    return result["id"]


def test_defect_crud_and_failed_result_association(client):
    failed_result_id = create_failed_result(client)
    create_response = client.post(
        "/api/defects",
        json={
            "title": "Payment confirmation missing",
            "description": "The user receives no confirmation.",
            "severity": "high",
            "test_run_result_id": failed_result_id,
        },
    )
    assert create_response.status_code == 201
    defect = create_response.json()
    defect_id = defect["id"]
    assert defect["test_run_result_id"] == failed_result_id
    assert defect["case_title"] == "Payment confirmation"
    assert defect["run_name"] == "Payment regression"
    assert defect["status"] == "open"

    update_response = client.patch(
        f"/api/defects/{defect_id}",
        json={"status": "in_progress", "severity": "critical"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "in_progress"
    assert update_response.json()["severity"] == "critical"

    list_response = client.get("/api/defects")
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [defect_id]

    assert client.delete(f"/api/defects/{defect_id}").status_code == 204
    assert client.get("/api/defects").json() == []
    assert client.get(f"/api/defects/{defect_id}").status_code == 404


def test_defect_validation_and_failure_link_requirements(client):
    assert client.post(
        "/api/defects",
        json={"title": "Missing result", "test_run_result_id": 999},
    ).status_code == 404

    suite = client.post("/api/test-suites", json={"name": "Unfinished"}).json()
    client.post(
        "/api/test-cases",
        json={
            "title": "Pending scenario",
            "status": "active",
            "suite_ids": [suite["id"]],
        },
    )
    run = client.post(
        "/api/test-runs",
        json={"name": "Pending run", "suite_id": suite["id"]},
    ).json()
    pending_result_id = run["results"][0]["id"]

    assert client.post(
        "/api/defects",
        json={"title": "Not a failure", "test_run_result_id": pending_result_id},
    ).status_code == 422
    assert client.post("/api/defects", json={"title": "  "}).status_code == 422

    defect = client.post("/api/defects", json={"title": "Valid defect"}).json()
    assert client.patch(f"/api/defects/{defect['id']}", json={}).status_code == 422
    assert client.patch(
        f"/api/defects/{defect['id']}",
        json={"status": "wontfix"},
    ).status_code == 422
