from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth_helper import get_current_user
from app.models.user import User
from app.routers.collection import _decrypt_oauth_token, _github_account
from app.services.github_client import GitHubAPIError, GitHubClient, collect_repository_snapshot

router = APIRouter(prefix="/debug/github", tags=["debug"])


@router.get("/repo-access")
async def diagnose_repo_access(
    full_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    account = _github_account(current_user, db)
    access_token = _decrypt_oauth_token(account.access_token_encrypted or "")

    async with GitHubClient(access_token) as client:
        repo_access = await client.diagnose_repository_access(full_name)
        visible_orgs = await client.list_visible_organizations()

    return {"repoAccess": repo_access, "visibleOrganizations": visible_orgs}


@router.post("/snapshot")
async def test_github_snapshot(
    full_name: str,
    pr_limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    account = _github_account(current_user, db)
    access_token = _decrypt_oauth_token(account.access_token_encrypted or "")

    try:
        return await collect_repository_snapshot(
            access_token=access_token,
            full_name=full_name,
            username=account.provider_username,
            pr_limit=pr_limit,
        )
    except GitHubAPIError as exc:
        return {
            "error": {
                "code": exc.code,
                "message": exc.message,
                "statusCode": exc.status_code,
            }
        }
