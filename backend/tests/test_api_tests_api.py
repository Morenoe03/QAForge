def test_api_test_definitions_and_manual_execution_history(client):
    create_response = client.post(
        "/api/api-tests",
        json={
            "name": "List orders",
            "description": "Check the orders endpoint.",
            "method": "GET",
            "endpoint": "/api/v1/orders",
            "expected_status": 200,
        },
    )
    assert create_response.status_code == 201
    api_test = create_response.json()
    api_test_id = api_test["id"]
    assert api_test["executions"] == []

    first_execution = client.post(
        f"/api/api-tests/{api_test_id}/executions",
        json={"outcome": "passed", "notes": "Manually verified HTTP 200."},
    )
    assert first_execution.status_code == 200
    assert first_execution.json()["executions"][0]["outcome"] == "passed"

    update_response = client.patch(
        f"/api/api-tests/{api_test_id}",
        json={"endpoint": "/api/v2/orders", "expected_status": 204},
    )
    assert update_response.status_code == 200
    assert update_response.json()["endpoint"] == "/api/v2/orders"

    second_execution = client.post(
        f"/api/api-tests/{api_test_id}/executions",
        json={"outcome": "failed", "notes": "The response status was 500."},
    )
    assert second_execution.status_code == 200
    assert [entry["outcome"] for entry in second_execution.json()["executions"]] == [
        "failed",
        "passed",
    ]

    list_response = client.get("/api/api-tests")
    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == api_test_id
    assert client.delete(f"/api/api-tests/{api_test_id}").status_code == 204
    assert client.get(f"/api/api-tests/{api_test_id}").status_code == 404


def test_api_test_definition_validation(client):
    assert client.post(
        "/api/api-tests",
        json={"name": "Bad method", "method": "TRACE", "endpoint": "/api"},
    ).status_code == 422
    assert client.post(
        "/api/api-tests",
        json={"name": "Blank endpoint", "method": "GET", "endpoint": "  "},
    ).status_code == 422
    assert client.post(
        "/api/api-tests",
        json={"name": "Invalid status", "method": "GET", "endpoint": "/api", "expected_status": 99},
    ).status_code == 422
    assert client.post(
        "/api/api-tests/999/executions",
        json={"outcome": "passed"},
    ).status_code == 404

    api_test = client.post(
        "/api/api-tests",
        json={"name": "Valid API test", "method": "GET", "endpoint": "/api"},
    ).json()
    assert client.patch(f"/api/api-tests/{api_test['id']}", json={}).status_code == 422
    assert client.post(
        f"/api/api-tests/{api_test['id']}/executions",
        json={"outcome": "unknown"},
    ).status_code == 422
