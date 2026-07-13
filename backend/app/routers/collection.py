import base64
import hashlib
import os
import re
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

import httpx
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth_helper import get_current_user
from app.models.async_job import AsyncJob
from app.models.evidence import Evidence
from app.models.portfolio import PortfolioSource, ProjectSourceLink, SourceDocument
from app.models.project import Project
from app.models.user import OAuthAccount, User
from app.services.embedding_service import create_embedding
from app.services.llm_pipeline import enrich_project_via_llm

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

router = APIRouter(prefix="/github", tags=["github"])

GITHUB_API_URL = "https://api.github.com"
MAX_REPOSITORIES = 20
MAX_README_CHARS = 12000
MAX_EVIDENCE_CHARS = 8000


FULL_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")


class GithubCollectionJobCreateRequest(BaseModel):
    agreedToAnalyze: bool


class GithubManualRepositoryCreateRequest(BaseModel):
    fullName: str

    @field_validator("fullName")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if not FULL_NAME_PATTERN.match(value):
            raise ValueError("fullName must look like 'owner/repo'.")
        return value


def _job_response(job: AsyncJob) -> dict:
    return {
        "jobId": job.id,
        "status": job.status,
        "message": job.message,
        "resultId": job.result_id,
        "error": (
            {
                "code": job.error_code,
                "detail": job.error_detail,
            }
            if job.error_code or job.error_detail
            else None
        ),
    }


def _error_detail(code: str, detail: str) -> dict:
    return {
        "status": "failed",
        "message": detail,
        "error": {
            "code": code,
            "detail": detail,
        },
    }


def _decrypt_oauth_token(encrypted_token: str) -> str:
    secret = os.getenv("BACKEND_ACCESS_TOKEN_SECRET", "dev-secret-change-me")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())
    try:
        return Fernet(key).decrypt(encrypted_token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise HTTPException(
            status_code=401,
            detail=_error_detail(
                "GITHUB_TOKEN_EXPIRED",
                "Stored GitHub token could not be decrypted. Please sign in again.",
            ),
        ) from exc


def _github_headers(access_token: str) -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {access_token}",
        "User-Agent": "madcamp-resume-matcher",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _project_response(project: Project) -> dict:
    return {
        "projectId": project.id,
        "title": project.title,
        "description": project.description,
        "skills": project.skills,
        "sourceType": project.source_type,
        "sourceUrl": project.source_url,
    }


def _github_account(current_user: User, db: Session) -> OAuthAccount:
    account = db.scalar(
        select(OAuthAccount).where(
            OAuthAccount.user_id == current_user.id,
            OAuthAccount.provider == "github",
        )
    )
    if account is None or not account.access_token_encrypted:
        raise HTTPException(
            status_code=401,
            detail=_error_detail(
                "GITHUB_TOKEN_EXPIRED",
                "GitHub account is not connected. Please sign in with GitHub again.",
            ),
        )
    return account


async def _fetch_repositories(access_token: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{GITHUB_API_URL}/user/repos",
            headers=_github_headers(access_token),
            params={
                "affiliation": "owner,collaborator,organization_member",
                "sort": "updated",
                "direction": "desc",
                "per_page": MAX_REPOSITORIES,
            },
        )

    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=401,
            detail=_error_detail(
                "GITHUB_TOKEN_EXPIRED",
                "GitHub token is invalid or no longer has repository access.",
            ),
        )
    if response.is_error:
        raise HTTPException(
            status_code=502,
            detail=_error_detail(
                "GITHUB_REPOSITORY_FETCH_FAILED",
                "Failed to fetch repositories from GitHub.",
            ),
        )

    body = response.json()
    if not isinstance(body, list):
        raise HTTPException(
            status_code=502,
            detail=_error_detail(
                "GITHUB_REPOSITORY_FETCH_FAILED",
                "GitHub repository response was not a list.",
            ),
        )
    return body


async def _fetch_repository(access_token: str, full_name: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{GITHUB_API_URL}/repos/{full_name}",
            headers=_github_headers(access_token),
        )

    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=401,
            detail=_error_detail(
                "GITHUB_TOKEN_EXPIRED",
                "GitHub token is invalid or no longer has repository access.",
            ),
        )
    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail=_error_detail(
                "GITHUB_REPOSITORY_NOT_FOUND",
                f"Repository '{full_name}' was not found or is not accessible with your GitHub account.",
            ),
        )
    if response.is_error:
        raise HTTPException(
            status_code=502,
            detail=_error_detail(
                "GITHUB_REPOSITORY_FETCH_FAILED",
                "Failed to fetch repository from GitHub.",
            ),
        )

    body = response.json()
    if not isinstance(body, dict):
        raise HTTPException(
            status_code=502,
            detail=_error_detail(
                "GITHUB_REPOSITORY_FETCH_FAILED",
                "GitHub repository response was not an object.",
            ),
        )
    return body


async def _fetch_readme(access_token: str, full_name: str) -> str:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{GITHUB_API_URL}/repos/{full_name}/readme",
            headers={
                **_github_headers(access_token),
                "Accept": "application/vnd.github.raw",
            },
        )

    if response.status_code == 404:
        return ""
    if response.is_error:
        return ""
    return response.text[:MAX_README_CHARS]


def _skills_from_repo(repo: dict[str, Any]) -> list[str]:
    skills: list[str] = []
    language = repo.get("language")
    if isinstance(language, str) and language:
        skills.append(language)

    topics = repo.get("topics")
    if isinstance(topics, list):
        for topic in topics:
            if isinstance(topic, str) and topic:
                skills.append(topic)

    deduped: list[str] = []
    seen: set[str] = set()
    for skill in skills:
        key = skill.casefold()
        if key not in seen:
            deduped.append(skill)
            seen.add(key)
    return deduped


def _evidence_content(repo: dict[str, Any], readme_text: str) -> str:
    description = repo.get("description")
    if readme_text.strip():
        return readme_text.strip()[:MAX_EVIDENCE_CHARS]
    if isinstance(description, str) and description.strip():
        return description.strip()
    return f"GitHub repository: {repo.get('full_name') or repo.get('name')}"


def _project_summary_text(repo: dict[str, Any], readme_text: str) -> str:
    name = repo.get("name") or repo.get("full_name") or "GitHub repository"
    description = repo.get("description")
    language = repo.get("language")
    topics = repo.get("topics")

    parts = [f"Project: {name}"]
    if isinstance(description, str) and description.strip():
        parts.append(f"Description: {description.strip()}")
    if isinstance(language, str) and language.strip():
        parts.append(f"Primary language: {language.strip()}")
    if isinstance(topics, list):
        topic_values = [topic for topic in topics if isinstance(topic, str) and topic.strip()]
        if topic_values:
            parts.append(f"Topics: {', '.join(topic_values)}")
    if readme_text.strip():
        parts.append(f"README excerpt: {readme_text.strip()[:2000]}")

    return "\n".join(parts)


def _project_embedding_text(project: Project) -> str:
    parts = [f"Project: {project.title}"]
    if project.role:
        parts.append(f"Role: {project.role}")
    if project.description:
        parts.append(f"Description: {project.description}")
    if project.skills:
        parts.append(f"Skills: {', '.join(project.skills)}")
    if project.achievements:
        parts.append(f"Achievements: {'; '.join(project.achievements)}")
    return "\n".join(parts)


def _try_create_embedding(text: str) -> list[float] | None:
    if not os.getenv("OPENROUTER_API_KEY"):
        return None
    try:
        return create_embedding(text)
    except Exception:
        return None


def _upsert_project(current_user: User, repo: dict[str, Any], readme_text: str, db: Session) -> Project:
    source_url = repo.get("html_url")
    project = db.scalar(
        select(Project).where(
            Project.user_id == current_user.id,
            Project.source_type == "github",
            Project.source_url == source_url,
        )
    )

    name = repo.get("name") or repo.get("full_name") or "GitHub repository"
    description = repo.get("description")
    skills = _skills_from_repo(repo)
    summary_text = _project_summary_text(repo, readme_text)
    summary_embedding = _try_create_embedding(summary_text)

    if project is None:
        project = Project(
            user_id=current_user.id,
            title=str(name),
            description=description if isinstance(description, str) else None,
            role=None,
            skills=skills,
            achievements=[],
            summary_text=summary_text,
            summary_embedding=summary_embedding,
            source_type="github",
            source_url=source_url if isinstance(source_url, str) else None,
        )
        db.add(project)
        db.flush()
        return project

    project.title = str(name)
    project.description = description if isinstance(description, str) else project.description
    project.skills = skills
    project.summary_text = summary_text
    if summary_embedding is not None:
        project.summary_embedding = summary_embedding
    project.source_type = "github"
    project.source_url = source_url if isinstance(source_url, str) else project.source_url
    project.is_archived = False
    db.flush()
    return project


def _create_source_records(
    portfolio_source: PortfolioSource,
    project: Project,
    repo: dict[str, Any],
    readme_text: str,
    db: Session,
) -> None:
    source_document = SourceDocument(
        portfolio_source_id=portfolio_source.id,
        document_type="readme",
        title=f"{repo.get('full_name') or repo.get('name')} README",
        url=repo.get("html_url"),
        raw_text=readme_text,
        metadata_={
            "githubRepoId": repo.get("id"),
            "fullName": repo.get("full_name"),
            "defaultBranch": repo.get("default_branch"),
            "language": repo.get("language"),
            "topics": repo.get("topics") or [],
        },
        collected_at=datetime.now(timezone.utc),
    )
    db.add(source_document)
    db.flush()

    db.add(
        ProjectSourceLink(
            project_id=project.id,
            source_document_id=source_document.id,
            merge_confidence=Decimal("1.0000"),
            is_primary=True,
        )
    )

    db.add(
        Evidence(
            source_document_id=source_document.id,
            project_id=project.id,
            source_type="github",
            source_url=repo.get("html_url"),
            title=source_document.title,
            content=_evidence_content(repo, readme_text),
            metadata_={
                "githubRepoId": repo.get("id"),
                "fullName": repo.get("full_name"),
            },
        )
    )


async def _apply_llm_enrichment(project: Project, db: Session) -> None:
    db.flush()
    evidences = list(
        db.scalars(select(Evidence).where(Evidence.project_id == project.id))
    )
    enrichment = await enrich_project_via_llm(project, evidences)
    if enrichment is None:
        return

    if enrichment["role"] is not None:
        project.role = enrichment["role"]
    if enrichment["description"] is not None:
        project.description = enrichment["description"]
    if enrichment["skills"]:
        project.skills = enrichment["skills"]
    project.achievements = enrichment["achievements"]

    project.summary_text = _project_embedding_text(project)
    embedding = _try_create_embedding(project.summary_text)
    if embedding is not None:
        project.summary_embedding = embedding

    db.flush()


async def _collect_github_projects(
    current_user: User,
    access_token: str,
    job: AsyncJob,
    db: Session,
) -> list[Project]:
    account = _github_account(current_user, db)
    username = account.provider_username or current_user.name
    portfolio_source = PortfolioSource(
        user_id=current_user.id,
        source_type="github",
        source_url=f"https://github.com/{username}" if username else "https://github.com",
        status="collecting",
        metadata_={"jobId": job.id},
    )
    db.add(portfolio_source)
    db.flush()

    repos = await _fetch_repositories(access_token)
    collected_projects: list[Project] = []
    for repo in repos:
        if not isinstance(repo, dict):
            continue

        full_name = repo.get("full_name")
        if not isinstance(full_name, str) or not full_name:
            continue

        source_url = repo.get("html_url")
        existing_project = db.scalar(
            select(Project).where(
                Project.user_id == current_user.id,
                Project.source_type == "github",
                Project.source_url == source_url,
            )
        )
        if existing_project is not None:
            # Already collected and possibly hand-edited by the user — leave it untouched.
            collected_projects.append(existing_project)
            continue

        readme_text = await _fetch_readme(access_token, full_name)
        project = _upsert_project(current_user, repo, readme_text, db)
        _create_source_records(portfolio_source, project, repo, readme_text, db)
        await _apply_llm_enrichment(project, db)
        collected_projects.append(project)

    portfolio_source.status = "completed"
    portfolio_source.metadata_ = {
        **(portfolio_source.metadata_ or {}),
        "repositoryCount": len(repos),
        "projectCount": len(collected_projects),
    }
    job.metadata_ = {
        **(job.metadata_ or {}),
        "portfolioSourceId": portfolio_source.id,
        "projectIds": [project.id for project in collected_projects],
    }
    return collected_projects


@router.post("/collection-jobs")
async def create_github_collection_job(
    request: GithubCollectionJobCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not request.agreedToAnalyze:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "ANALYSIS_CONSENT_REQUIRED",
                "agreedToAnalyze must be true.",
            ),
        )

    account = _github_account(current_user, db)
    access_token = _decrypt_oauth_token(account.access_token_encrypted or "")

    job = AsyncJob(
        user_id=current_user.id,
        job_type="github_collection",
        status="running",
        message="Collecting GitHub repositories and README files.",
        metadata_={},
    )
    db.add(job)
    db.flush()

    try:
        await _collect_github_projects(current_user, access_token, job, db)
    except HTTPException as exc:
        job.status = "failed"
        job.message = "GitHub project collection failed."
        if isinstance(exc.detail, dict):
            error = exc.detail.get("error") or {}
            job.error_code = error.get("code")
            job.error_detail = error.get("detail")
        db.commit()
        raise
    except Exception as exc:
        job.status = "failed"
        job.message = "GitHub project collection failed."
        job.error_code = "GITHUB_REPOSITORY_FETCH_FAILED"
        job.error_detail = str(exc)
        db.commit()
        raise HTTPException(
            status_code=502,
            detail=_error_detail(
                "GITHUB_REPOSITORY_FETCH_FAILED",
                "Failed to collect GitHub repositories.",
            ),
        ) from exc

    job.status = "completed"
    job.message = "GitHub project collection completed."
    db.commit()
    db.refresh(job)

    return _job_response(job)


@router.get("/collection-jobs/{job_id}")
def get_github_collection_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.scalar(
        select(AsyncJob).where(
            AsyncJob.id == job_id,
            AsyncJob.user_id == current_user.id,
            AsyncJob.job_type == "github_collection",
        )
    )
    if job is None:
        raise HTTPException(status_code=404, detail="GitHub collection job not found.")

    response = _job_response(job)
    if job.status != "completed":
        return response

    project_ids = (job.metadata_ or {}).get("projectIds") or []
    projects = []
    if project_ids:
        project_rows = db.scalars(
            select(Project).where(
                Project.id.in_(project_ids),
                Project.user_id == current_user.id,
                Project.is_archived.is_(False),
            )
        ).all()
        projects_by_id = {project.id: project for project in project_rows}
        projects = [
            _project_response(projects_by_id[project_id])
            for project_id in project_ids
            if project_id in projects_by_id
        ]

    response["projects"] = projects
    return response


@router.post("/repositories")
async def add_github_repository(
    request: GithubManualRepositoryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _github_account(current_user, db)
    access_token = _decrypt_oauth_token(account.access_token_encrypted or "")

    repo = await _fetch_repository(access_token, request.fullName)
    full_name = repo.get("full_name") or request.fullName
    source_url = repo.get("html_url") or f"https://github.com/{full_name}"

    existing_project = db.scalar(
        select(Project).where(
            Project.user_id == current_user.id,
            Project.source_type.in_(["github", "github_manual"]),
            Project.source_url == source_url,
        )
    )
    if existing_project is not None:
        # Already collected and possibly hand-edited by the user — leave it untouched.
        evidence_ids = list(
            db.scalars(select(Evidence.id).where(Evidence.project_id == existing_project.id))
        )
        return {
            "projectId": existing_project.id,
            "title": existing_project.title,
            "description": existing_project.description,
            "role": existing_project.role,
            "skills": existing_project.skills,
            "achievements": existing_project.achievements,
            "sourceType": existing_project.source_type,
            "sourceUrl": existing_project.source_url,
            "evidenceIds": evidence_ids,
        }

    readme_text = await _fetch_readme(access_token, full_name)

    portfolio_source = PortfolioSource(
        user_id=current_user.id,
        source_type="github_manual",
        source_url=source_url,
        status="collecting",
        metadata_={"fullName": full_name},
    )
    db.add(portfolio_source)
    db.flush()

    project = _upsert_project(current_user, repo, readme_text, db)
    _create_source_records(portfolio_source, project, repo, readme_text, db)
    await _apply_llm_enrichment(project, db)

    portfolio_source.status = "completed"
    portfolio_source.metadata_ = {
        **(portfolio_source.metadata_ or {}),
        "projectId": project.id,
    }

    db.commit()
    db.refresh(project)

    evidence_ids = list(
        db.scalars(select(Evidence.id).where(Evidence.project_id == project.id))
    )

    return {
        "projectId": project.id,
        "title": project.title,
        "description": project.description,
        "role": project.role,
        "skills": project.skills,
        "achievements": project.achievements,
        "sourceType": project.source_type,
        "sourceUrl": project.source_url,
        "evidenceIds": evidence_ids,
    }
