import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)
_GITHUB_API = "https://api.github.com"
_REPOSITORY_PATTERN = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")
_WORKFLOW_PATTERN = re.compile(r"[A-Za-z0-9_.-]+\.ya?ml")
_REF_PATTERN = re.compile(r"[A-Za-z0-9._/-]{1,255}")


@dataclass(frozen=True)
class GitHubActionsConfig:
    repository: str | None
    workflow: str
    ref: str
    token: str | None
    dispatch_enabled: bool


def _configuration() -> GitHubActionsConfig:
    repository = os.getenv("GITHUB_ACTIONS_REPOSITORY", "").strip() or None
    workflow = os.getenv("GITHUB_ACTIONS_WORKFLOW", "backend-tests.yml").strip()
    ref = os.getenv("GITHUB_ACTIONS_REF", "development").strip()
    token = os.getenv("GITHUB_ACTIONS_TOKEN", "").strip() or None
    dispatch_enabled = (
        os.getenv("GITHUB_ACTIONS_ALLOW_DISPATCH", "").strip().lower() == "true"
    )

    if repository and not _REPOSITORY_PATTERN.fullmatch(repository):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GITHUB_ACTIONS_REPOSITORY must use owner/repository format.",
        )
    if not _WORKFLOW_PATTERN.fullmatch(workflow):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GITHUB_ACTIONS_WORKFLOW must be a workflow YAML filename.",
        )
    if not _REF_PATTERN.fullmatch(ref) or ".." in ref or "//" in ref:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GITHUB_ACTIONS_REF is not a valid branch or tag name.",
        )

    return GitHubActionsConfig(
        repository=repository,
        workflow=workflow,
        ref=ref,
        token=token,
        dispatch_enabled=dispatch_enabled,
    )


def _github_request(
    method: str,
    path: str,
    token: str | None,
    body: dict[str, str] | None = None,
) -> Any:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "QAForge",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        f"{_GITHUB_API}{path}",
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=10) as response:
            response_body = response.read()
    except HTTPError as error:
        logger.warning("GitHub Actions API returned HTTP %s", error.code)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub Actions API returned HTTP {error.code}.",
        ) from error
    except URLError as error:
        logger.exception("Could not reach the GitHub Actions API")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach the GitHub Actions API.",
        ) from error

    if not response_body:
        return None
    try:
        return json.loads(response_body)
    except json.JSONDecodeError as error:
        logger.exception("GitHub Actions API returned invalid JSON")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GitHub Actions API returned an invalid response.",
        ) from error


def get_pipeline_overview() -> dict[str, object]:
    config = _configuration()
    if config.repository is None:
        return {
            "configured": False,
            "repository": None,
            "workflow": config.workflow,
            "ref": config.ref,
            "can_dispatch": False,
            "message": "Set GITHUB_ACTIONS_REPOSITORY to enable this workflow.",
            "runs": [],
        }

    path = (
        f"/repos/{config.repository}/actions/workflows/{config.workflow}/runs"
        "?per_page=10"
    )
    payload = _github_request("GET", path, config.token)
    raw_runs = payload.get("workflow_runs") if isinstance(payload, dict) else None
    if not isinstance(raw_runs, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GitHub Actions API returned an invalid workflow run list.",
        )

    try:
        runs = [
            {
                "id": run["id"],
                "name": run["name"],
                "run_number": run["run_number"],
                "status": run["status"],
                "conclusion": run.get("conclusion"),
                "branch": run["head_branch"],
                "html_url": run["html_url"],
                "created_at": run["created_at"],
                "updated_at": run["updated_at"],
            }
            for run in raw_runs
            if isinstance(run, dict)
        ]
        if len(runs) != len(raw_runs):
            raise TypeError("Workflow run entry is not an object")
    except (KeyError, TypeError) as error:
        logger.exception("GitHub Actions API returned an invalid workflow run")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GitHub Actions API returned an invalid workflow run.",
        ) from error
    can_dispatch = bool(config.token and config.dispatch_enabled)
    message = None
    if not config.token:
        message = "Set GITHUB_ACTIONS_TOKEN to enable workflow dispatch."
    elif not config.dispatch_enabled:
        message = "Set GITHUB_ACTIONS_ALLOW_DISPATCH=true to enable dispatch."

    return {
        "configured": True,
        "repository": config.repository,
        "workflow": config.workflow,
        "ref": config.ref,
        "can_dispatch": can_dispatch,
        "message": message,
        "runs": runs,
    }


def dispatch_pipeline() -> dict[str, str]:
    config = _configuration()
    if config.repository is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Set GITHUB_ACTIONS_REPOSITORY before dispatching workflows.",
        )
    if not config.token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Set GITHUB_ACTIONS_TOKEN before dispatching workflows.",
        )
    if not config.dispatch_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workflow dispatch is disabled. Set GITHUB_ACTIONS_ALLOW_DISPATCH=true to enable it.",
        )

    path = (
        f"/repos/{config.repository}/actions/workflows/"
        f"{config.workflow}/dispatches"
    )
    _github_request("POST", path, config.token, {"ref": config.ref})
    return {
        "message": "GitHub Actions workflow dispatch requested.",
        "ref": config.ref,
    }
