def create_suite(client, name):
    response = client.post("/api/test-suites", json={"name": name})
    assert response.status_code == 201
    return response.json()


def create_case(client, **payload):
    response = client.post("/api/test-cases", json=payload)
    assert response.status_code == 201
    return response.json()


def test_test_case_crud_and_suite_associations(client):
    first_suite = create_suite(client, "Checkout")
    second_suite = create_suite(client, "Payments")

    create_response = client.post(
        "/api/test-cases",
        json={
            "title": "Successful checkout",
            "description": "Complete a purchase.",
            "preconditions": "A product is available.",
            "steps": ["Add the product to the cart", "Complete payment"],
            "expected_result": "The order is confirmed.",
            "priority": "high",
            "test_type": "automated",
            "status": "active",
            "tags": ["checkout", "critical-path"],
            "suite_ids": [first_suite["id"], second_suite["id"]],
        },
    )
    assert create_response.status_code == 201
    created_case = create_response.json()
    case_id = created_case["id"]
    assert created_case["version"] == 1
    assert created_case["steps"] == [
        "Add the product to the cart",
        "Complete payment",
    ]
    assert created_case["suite_ids"] == [first_suite["id"], second_suite["id"]]

    list_response = client.get("/api/test-cases")
    assert list_response.status_code == 200
    assert any(
        case["id"] == case_id for case in list_response.json()["items"]
    )

    update_response = client.patch(
        f"/api/test-cases/{case_id}",
        json={
            "title": "Checkout with a saved card",
            "suite_ids": [second_suite["id"]],
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Checkout with a saved card"
    assert update_response.json()["suite_ids"] == [second_suite["id"]]
    assert update_response.json()["version"] == 2

    read_response = client.get(f"/api/test-cases/{case_id}")
    assert read_response.status_code == 200
    assert read_response.json()["suite_ids"] == [second_suite["id"]]

    delete_response = client.delete(f"/api/test-cases/{case_id}")
    assert delete_response.status_code == 204
    assert client.get(f"/api/test-cases/{case_id}").status_code == 404
    history_response = client.get(f"/api/test-cases/{case_id}/history")
    assert history_response.status_code == 200
    assert [entry["change_type"] for entry in history_response.json()] == [
        "deleted",
        "updated",
        "created",
    ]
    assert history_response.json()[1]["snapshot"]["title"] == "Checkout with a saved card"


def test_test_case_validation_and_missing_suite(client):
    blank_title_response = client.post(
        "/api/test-cases",
        json={"title": "  "},
    )
    invalid_choice_response = client.post(
        "/api/test-cases",
        json={"title": "Test", "priority": "urgent"},
    )
    missing_suite_response = client.post(
        "/api/test-cases",
        json={"title": "Test", "suite_ids": [9999]},
    )

    assert blank_title_response.status_code == 422
    assert invalid_choice_response.status_code == 422
    assert missing_suite_response.status_code == 404


def test_test_case_update_requires_changes_and_preserves_case_on_bad_suite(client):
    create_response = client.post(
        "/api/test-cases",
        json={"title": "Independent test"},
    )
    case_id = create_response.json()["id"]

    empty_update_response = client.patch(f"/api/test-cases/{case_id}", json={})
    invalid_suite_update_response = client.patch(
        f"/api/test-cases/{case_id}",
        json={"suite_ids": [9999]},
    )

    assert empty_update_response.status_code == 422
    assert invalid_suite_update_response.status_code == 404
    assert client.get(f"/api/test-cases/{case_id}").json()["suite_ids"] == []
    assert client.get(f"/api/test-cases/{case_id}/history").status_code == 200
    assert client.get("/api/test-cases/9999/history").status_code == 404


def test_deleting_suite_keeps_test_case_and_removes_link(client):
    suite = create_suite(client, "Temporary suite")
    case_response = client.post(
        "/api/test-cases",
        json={"title": "Reusable test", "suite_ids": [suite["id"]]},
    )
    case_id = case_response.json()["id"]

    assert client.delete(f"/api/test-suites/{suite['id']}").status_code == 204

    remaining_case = client.get(f"/api/test-cases/{case_id}")
    assert remaining_case.status_code == 200
    assert remaining_case.json()["suite_ids"] == []


def test_test_case_search_filters_and_pagination(client):
    checkout_suite = create_suite(client, "Checkout search")
    other_suite = create_suite(client, "Other search")
    first_case = create_case(
        client,
        title="Checkout cart with card",
        priority="high",
        status="active",
        suite_ids=[checkout_suite["id"]],
        steps=["Apply loyalty code"],
        tags=["checkout"],
    )
    second_case = create_case(
        client,
        title="Checkout cart with wallet",
        priority="high",
        status="active",
        suite_ids=[checkout_suite["id"]],
    )
    create_case(
        client,
        title="Checkout cart archived",
        priority="high",
        status="deprecated",
        suite_ids=[checkout_suite["id"]],
    )
    create_case(
        client,
        title="Checkout cart in another suite",
        priority="high",
        status="active",
        suite_ids=[other_suite["id"]],
    )

    first_page = client.get(
        "/api/test-cases",
        params={
            "search": "checkout",
            "suite_id": checkout_suite["id"],
            "priority": "high",
            "status": "active",
            "page": 1,
            "page_size": 1,
        },
    )
    second_page = client.get(
        "/api/test-cases",
        params={
            "search": "checkout",
            "suite_id": checkout_suite["id"],
            "priority": "high",
            "status": "active",
            "page": 2,
            "page_size": 1,
        },
    )
    tags_search = client.get(
        "/api/test-cases",
        params={"search": "loyalty", "suite_id": checkout_suite["id"]},
    )

    assert first_page.status_code == 200
    assert first_page.json()["total"] == 2
    assert first_page.json()["page"] == 1
    assert first_page.json()["page_size"] == 1
    assert first_page.json()["items"][0]["id"] == second_case["id"]
    assert second_page.json()["items"][0]["id"] == first_case["id"]
    assert tags_search.json()["total"] == 1
    assert tags_search.json()["items"][0]["id"] == first_case["id"]


def test_test_case_list_rejects_invalid_pagination_and_filters(client):
    invalid_requests = [
        {"page": 0},
        {"page_size": 101},
        {"suite_id": 0},
        {"priority": "urgent"},
        {"status": "paused"},
    ]

    for params in invalid_requests:
        assert client.get("/api/test-cases", params=params).status_code == 422

    oversized_search = client.get(
        "/api/test-cases",
        params={"search": "x" * 201},
    )
    assert oversized_search.status_code == 422
