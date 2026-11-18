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
