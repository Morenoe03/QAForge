import json
from io import BytesIO


def clear_pipeline_config(monkeypatch):
    for key in (
        "GITHUB_ACTIONS_REPOSITORY",
        "GITHUB_ACTIONS_WORKFLOW",
        "GITHUB_ACTIONS_REF",
        "GITHUB_ACTIONS_TOKEN",
        "GITHUB_ACTIONS_ALLOW_DISPATCH",
    ):
        monkeypatch.delenv(key, raising=False)


def test_pipeline_overview_requires_configuration(client, monkeypatch):
    clear_pipeline_config(monkeypatch)

    response = client.get("/api/pipelines")

    assert response.status_code == 200
    assert response.json() == {
        "configured": False,
        "repository": None,
        "workflow": "backend-tests.yml",
        "ref": "development",
        "can_dispatch": False,
        "message": "Set GITHUB_ACTIONS_REPOSITORY to enable this workflow.",
        "runs": [],
    }
    assert client.post("/api/pipelines/dispatch").status_code == 503


def test_pipeline_lists_runs_and_dispatches_with_server_token(
    client,
    monkeypatch,
):
    monkeypatch.setenv("GITHUB_ACTIONS_REPOSITORY", "Morenoe03/QAForge")
    monkeypatch.setenv("GITHUB_ACTIONS_WORKFLOW", "backend-tests.yml")
    monkeypatch.setenv("GITHUB_ACTIONS_REF", "development")
    monkeypatch.setenv("GITHUB_ACTIONS_TOKEN", "server-only-token")
    monkeypatch.setenv("GITHUB_ACTIONS_ALLOW_DISPATCH", "true")
    calls = []

    def fake_urlopen(request, timeout):
        calls.append((request, timeout))
        if request.method == "GET":
            payload = {
                "workflow_runs": [
                    {
                        "id": 123,
                        "name": "QAForge CI",
                        "run_number": 7,
                        "status": "completed",
                        "conclusion": "success",
                        "head_branch": "development",
                        "html_url": "https://github.com/Morenoe03/QAForge/actions/runs/123",
                        "created_at": "2026-11-18T12:00:00Z",
                        "updated_at": "2026-11-18T12:05:00Z",
                    }
                ]
            }
            return BytesIO(json.dumps(payload).encode())
        return BytesIO()

    monkeypatch.setattr("app.services.github_actions.urlopen", fake_urlopen)

    overview_response = client.get("/api/pipelines")
    assert overview_response.status_code == 200
    overview = overview_response.json()
    assert overview["configured"] is True
    assert overview["can_dispatch"] is True
    assert overview["runs"][0]["id"] == 123
    assert overview["runs"][0]["conclusion"] == "success"
    assert "server-only-token" not in overview_response.text
    assert calls[0][0].full_url == (
        "https://api.github.com/repos/Morenoe03/QAForge/actions/"
        "workflows/backend-tests.yml/runs?per_page=10"
    )
    assert calls[0][0].get_header("Authorization") == "Bearer server-only-token"
    assert calls[0][1] == 10

    dispatch_response = client.post("/api/pipelines/dispatch")
    assert dispatch_response.status_code == 202
    assert dispatch_response.json() == {
        "message": "GitHub Actions workflow dispatch requested.",
        "ref": "development",
    }
    dispatch_request = calls[1][0]
    assert dispatch_request.method == "POST"
    assert json.loads(dispatch_request.data) == {"ref": "development"}


def test_pipeline_dispatch_is_disabled_without_explicit_opt_in(
    client,
    monkeypatch,
):
    monkeypatch.setenv("GITHUB_ACTIONS_REPOSITORY", "Morenoe03/QAForge")
    monkeypatch.setenv("GITHUB_ACTIONS_TOKEN", "server-only-token")
    monkeypatch.delenv("GITHUB_ACTIONS_ALLOW_DISPATCH", raising=False)
    calls = []

    def fake_urlopen(request, timeout):
        calls.append(request)
        return BytesIO(b'{"workflow_runs":[]}')

    monkeypatch.setattr("app.services.github_actions.urlopen", fake_urlopen)

    overview = client.get("/api/pipelines")
    assert overview.status_code == 200
    assert overview.json()["can_dispatch"] is False
    assert client.post("/api/pipelines/dispatch").status_code == 403
    assert len(calls) == 1
