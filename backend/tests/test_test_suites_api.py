def test_test_suite_crud_lifecycle(client):
    create_response = client.post(
        "/api/test-suites",
        json={
            "name": "Checkout regression",
            "description": "Covers the checkout flow.",
        },
    )

    assert create_response.status_code == 201
    created_suite = create_response.json()
    suite_id = created_suite["id"]
    assert created_suite["name"] == "Checkout regression"
    assert created_suite["description"] == "Covers the checkout flow."
    assert created_suite["status"] == "active"

    list_response = client.get("/api/test-suites")
    assert list_response.status_code == 200
    assert any(suite["id"] == suite_id for suite in list_response.json())

    update_response = client.patch(
        f"/api/test-suites/{suite_id}",
        json={"name": "Checkout smoke", "status": "paused"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Checkout smoke"
    assert update_response.json()["status"] == "paused"

    read_response = client.get(f"/api/test-suites/{suite_id}")
    assert read_response.status_code == 200
    assert read_response.json()["name"] == "Checkout smoke"

    delete_response = client.delete(f"/api/test-suites/{suite_id}")
    assert delete_response.status_code == 204
    assert client.get(f"/api/test-suites/{suite_id}").status_code == 404


def test_create_rejects_invalid_test_suite_payloads(client):
    missing_name_response = client.post(
        "/api/test-suites",
        json={"description": "A suite without a name."},
    )
    blank_name_response = client.post(
        "/api/test-suites",
        json={"name": "   "},
    )

    assert missing_name_response.status_code == 422
    assert blank_name_response.status_code == 422


def test_suite_names_are_unique_within_a_workspace(client):
    assert client.post(
        "/api/test-suites",
        json={"name": "Workspace suite"},
    ).status_code == 201

    duplicate_response = client.post(
        "/api/test-suites",
        json={"name": "Workspace suite"},
    )

    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["detail"] == (
        "A test suite with this name already exists."
    )


def test_update_rejects_empty_payload(client):
    create_response = client.post(
        "/api/test-suites",
        json={"name": "API validation"},
    )
    suite_id = create_response.json()["id"]

    update_response = client.patch(f"/api/test-suites/{suite_id}", json={})

    assert update_response.status_code == 422


def test_missing_test_suite_returns_not_found(client):
    missing_id = 9999

    assert client.get(f"/api/test-suites/{missing_id}").status_code == 404
    assert client.patch(
        f"/api/test-suites/{missing_id}",
        json={"name": "Missing"},
    ).status_code == 404
    assert client.delete(f"/api/test-suites/{missing_id}").status_code == 404
