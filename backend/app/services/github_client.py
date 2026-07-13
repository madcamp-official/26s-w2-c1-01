import asyncio
from collections import Counter
from typing import Any

import httpx

GITHUB_API_URL = "https://api.github.com"
DEFAULT_TIMEOUT = 15.0
MAX_README_CHARS = 12000
MAX_PATCH_CHARS_PER_FILE = 2000
MAX_FILES_PER_PR = 10


class GitHubAPIError(Exception):
    def __init__(self, code: str, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _headers(access_token: str) -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {access_token}",
        "User-Agent": "madcamp-resume-matcher",
        "X-GitHub-Api-Version": "2022-11-28",
    }


class GitHubClient:
    def __init__(self, access_token: str, timeout: float = DEFAULT_TIMEOUT) -> None:
        self._client = httpx.AsyncClient(
            base_url=GITHUB_API_URL,
            headers=_headers(access_token),
            timeout=timeout,
        )

    async def __aenter__(self) -> "GitHubClient":
        return self

    async def __aexit__(self, *_exc_info: object) -> None:
        await self._client.aclose()

    async def diagnose_repository_access(self, full_name: str) -> dict[str, Any]:
        response = await self._client.get(f"/repos/{full_name}")
        try:
            body: Any = response.json()
        except ValueError:
            body = response.text
        return {
            "statusCode": response.status_code,
            "ssoAuthorizationUrl": response.headers.get("X-GitHub-SSO"),
            "body": body,
        }

    async def list_visible_organizations(self) -> list[str]:
        response = await self._client.get("/user/orgs", params={"per_page": 100})
        if response.is_error:
            return []
        body = response.json()
        return [org.get("login") for org in body if isinstance(org, dict)]

    async def get_readme(self, full_name: str) -> str:
        response = await self._client.get(
            f"/repos/{full_name}/readme",
            headers={"Accept": "application/vnd.github.raw"},
        )
        if response.status_code == 404:
            return ""
        if response.is_error:
            raise GitHubAPIError(
                "GITHUB_README_FETCH_FAILED",
                f"Failed to fetch README for {full_name}.",
                response.status_code,
            )
        return response.text[:MAX_README_CHARS]

    async def list_user_pull_requests(
        self,
        full_name: str,
        username: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        response = await self._client.get(
            "/search/issues",
            params={
                "q": f"repo:{full_name} type:pr author:{username}",
                "sort": "updated",
                "order": "desc",
                "per_page": limit,
            },
        )
        if response.status_code in {401, 403}:
            raise GitHubAPIError(
                "GITHUB_TOKEN_EXPIRED",
                "GitHub token is invalid or lacks search access.",
                response.status_code,
            )
        if response.is_error:
            raise GitHubAPIError(
                "GITHUB_PR_SEARCH_FAILED",
                f"Failed to search pull requests for {full_name}.",
                response.status_code,
            )

        body = response.json()
        items = body.get("items")
        return items if isinstance(items, list) else []

    async def get_pull_request_files(
        self,
        full_name: str,
        pr_number: int,
    ) -> list[dict[str, Any]]:
        response = await self._client.get(
            f"/repos/{full_name}/pulls/{pr_number}/files",
            params={"per_page": MAX_FILES_PER_PR},
        )
        if response.is_error:
            raise GitHubAPIError(
                "GITHUB_PR_FILES_FETCH_FAILED",
                f"Failed to fetch changed files for PR #{pr_number} in {full_name}.",
                response.status_code,
            )

        body = response.json()
        return body if isinstance(body, list) else []

    async def summarize_pull_request(
        self,
        full_name: str,
        pr: dict[str, Any],
    ) -> dict[str, Any]:
        pr_number = pr.get("number")
        files = await self.get_pull_request_files(full_name, pr_number)

        changed_files = [
            {
                "path": file.get("filename"),
                "status": file.get("status"),
                "additions": file.get("additions"),
                "deletions": file.get("deletions"),
                "patch": (file.get("patch") or "")[:MAX_PATCH_CHARS_PER_FILE],
            }
            for file in files
        ]

        return {
            "number": pr_number,
            "title": pr.get("title"),
            "body": pr.get("body") or "",
            "url": pr.get("html_url"),
            "createdAt": pr.get("created_at"),
            "updatedAt": pr.get("updated_at"),
            "changedFiles": changed_files,
        }

    async def collect_pull_request_summaries(
        self,
        full_name: str,
        username: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        pull_requests = await self.list_user_pull_requests(full_name, username, limit)
        summaries = await asyncio.gather(
            *(self.summarize_pull_request(full_name, pr) for pr in pull_requests)
        )
        return list(summaries)


def compute_file_extension_stats(file_paths: list[str]) -> dict[str, float]:
    extensions = []
    for path in file_paths:
        if not path or "." not in path.rsplit("/", 1)[-1]:
            extensions.append("(no extension)")
            continue
        extensions.append("." + path.rsplit(".", 1)[-1].lower())

    if not extensions:
        return {}

    counts = Counter(extensions)
    total = len(extensions)
    return {
        extension: round(100 * count / total, 1)
        for extension, count in counts.most_common()
    }


async def collect_repository_snapshot(
    access_token: str,
    full_name: str,
    username: str,
    pr_limit: int = 10,
) -> dict[str, Any]:
    async with GitHubClient(access_token) as client:
        readme_text, pull_request_summaries = await asyncio.gather(
            client.get_readme(full_name),
            client.collect_pull_request_summaries(full_name, username, pr_limit),
        )

    changed_paths = [
        file["path"]
        for summary in pull_request_summaries
        for file in summary["changedFiles"]
        if file.get("path")
    ]

    return {
        "fullName": full_name,
        "readme": readme_text,
        "pullRequests": pull_request_summaries,
        "fileExtensionStats": compute_file_extension_stats(changed_paths),
    }
