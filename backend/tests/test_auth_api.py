from fastapi.testclient import TestClient


def test_api_requires_login(unauthenticated_client: TestClient) -> None:
    response = unauthenticated_client.get("/api/test-suites")

    assert response.status_code == 401
    assert response.json()["detail"] == "Sign in to access this resource."


def test_demo_account_login_and_logout(
    unauthenticated_client: TestClient,
) -> None:
    login_response = unauthenticated_client.post(
        "/api/auth/login",
        json={"username": "su", "password": "su"},
    )

    assert login_response.status_code == 200
    assert login_response.json() == {
        "username": "su",
        "display_name": "Emanuel Moreno",
        "email": "emanuellmorreno@gmail.com",
    }
    session_cookie = login_response.headers["set-cookie"]
    assert "httponly" in session_cookie.lower()
    assert "samesite=strict" in session_cookie.lower()
    assert unauthenticated_client.get("/api/test-suites").status_code == 200

    logout_response = unauthenticated_client.post("/api/auth/logout")

    assert logout_response.status_code == 200
    assert unauthenticated_client.get("/api/test-suites").status_code == 401


def test_invalid_credentials_do_not_create_a_session(
    unauthenticated_client: TestClient,
) -> None:
    response = unauthenticated_client.post(
        "/api/auth/login",
        json={"username": "su", "password": "incorrect"},
    )

    assert response.status_code == 401
    assert unauthenticated_client.get("/api/test-suites").status_code == 401


def test_registration_creates_a_signed_in_user_and_rejects_duplicate_usernames(
    unauthenticated_client: TestClient,
) -> None:
    registration = {
        "display_name": "New QA User",
        "email": "new-qa@example.com",
        "username": "New-QA-User",
        "password": "secure-password",
    }

    response = unauthenticated_client.post(
        "/api/auth/register",
        json=registration,
    )

    assert response.status_code == 201
    assert response.json() == {
        "username": "new-qa-user",
        "display_name": "New QA User",
        "email": "new-qa@example.com",
    }
    assert "httponly" in response.headers["set-cookie"].lower()
    assert unauthenticated_client.get("/api/auth/me").json() == response.json()

    duplicate_response = unauthenticated_client.post(
        "/api/auth/register",
        json=registration,
    )
    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["detail"] == "That username is already taken."
    assert unauthenticated_client.post("/api/auth/logout").status_code == 200
    login_response = unauthenticated_client.post(
        "/api/auth/login",
        json={"username": "NEW-QA-USER", "password": "secure-password"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["username"] == "new-qa-user"


def test_new_account_cannot_read_or_change_another_workspace(
    client: TestClient,
) -> None:
    suite = client.post(
        "/api/test-suites",
        json={"name": "Private suite"},
    ).json()
    test_case = client.post(
        "/api/test-cases",
        json={
            "title": "Private test case",
            "status": "active",
            "suite_ids": [suite["id"]],
        },
    ).json()
    run = client.post(
        "/api/test-runs",
        json={"name": "Private run", "suite_id": suite["id"]},
    ).json()
    api_test = client.post(
        "/api/api-tests",
        json={"name": "Private API test", "method": "GET", "endpoint": "/health"},
    ).json()
    failed_result = client.patch(
        f"/api/test-runs/{run['id']}/results/{run['results'][0]['id']}",
        json={"outcome": "failed"},
    ).json()["results"][0]
    defect = client.post(
        "/api/defects",
        json={
            "title": "Private defect",
            "test_run_result_id": failed_result["id"],
        },
    ).json()

    registration_response = client.post(
        "/api/auth/register",
        json={
            "display_name": "Isolated User",
            "email": "isolated@example.com",
            "username": "isolated-user",
            "password": "secure-password",
        },
    )
    assert registration_response.status_code == 201
    assert client.post(
        "/api/test-suites",
        json={"name": "Private suite"},
    ).status_code == 201

    assert client.get("/api/test-suites").json()[0]["name"] == "Private suite"
    assert client.get("/api/test-cases").json()["items"] == []
    assert client.get("/api/test-runs").json() == []
    assert client.get("/api/failures").json() == []
    assert client.get("/api/api-tests").json() == []
    assert client.get("/api/defects").json() == []
    assert client.get("/api/dashboard/stats").json()["tests_executed"] == 0

    assert client.get(f"/api/test-suites/{suite['id']}").status_code == 404
    assert client.get(f"/api/test-cases/{test_case['id']}").status_code == 404
    assert (
        client.get(f"/api/test-cases/{test_case['id']}/history").status_code
        == 404
    )
    assert client.delete(f"/api/test-runs/{run['id']}").status_code == 404
    assert client.patch(
        f"/api/test-runs/{run['id']}/results/{failed_result['id']}",
        json={"outcome": "passed"},
    ).status_code == 404
    assert client.post(
        "/api/test-runs",
        json={"name": "Cross-workspace run", "suite_id": suite["id"]},
    ).status_code == 404
    assert client.post(
        "/api/test-cases",
        json={"title": "Cross-workspace case", "suite_ids": [suite["id"]]},
    ).status_code == 404
    assert client.get(f"/api/api-tests/{api_test['id']}").status_code == 404
    assert client.get(f"/api/defects/{defect['id']}").status_code == 404
    assert client.post(
        "/api/defects",
        json={
            "title": "Cross-workspace defect",
            "test_run_result_id": failed_result["id"],
        },
    ).status_code == 404


def test_profile_settings_are_persisted(
    client: TestClient,
) -> None:
    response = client.patch(
        "/api/auth/me",
        json={
            "display_name": "QAForge Tester",
            "email": "tester@example.com",
        },
    )

    assert response.status_code == 200
    assert response.json()["display_name"] == "QAForge Tester"
    assert response.json()["email"] == "tester@example.com"
    assert client.get("/api/auth/me").json()["display_name"] == "QAForge Tester"
