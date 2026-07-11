from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth_helper import get_current_user
from app.models.evidence import Evidence
from app.models.project import Project
from app.models.user import User

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    role: str | None = None
    skills: list[str] | None = None
    achievements: list[str] | None = None


def _project_response(project: Project, evidence_ids: list[int]) -> dict:
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


@router.get("")
def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projects = db.scalars(
        select(Project)
        .where(
            Project.user_id == current_user.id,
            Project.is_archived.is_(False),
        )
        .order_by(Project.created_at.desc())
    ).all()

    project_ids = [project.id for project in projects]
    evidence_ids_by_project: dict[int, list[int]] = {project_id: [] for project_id in project_ids}

    if project_ids:
        evidence_rows = db.execute(
            select(Evidence.project_id, Evidence.id).where(Evidence.project_id.in_(project_ids))
        ).all()
        for project_id, evidence_id in evidence_rows:
            if project_id is not None:
                evidence_ids_by_project.setdefault(project_id, []).append(evidence_id)

    return {
        "projects": [
            _project_response(project, evidence_ids_by_project.get(project.id, []))
            for project in projects
        ]
    }


@router.patch("/{project_id}")
def update_project(
    project_id: int,
    request: ProjectUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
            Project.is_archived.is_(False),
        )
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    return {
        "projectId": project.id,
        "title": project.title,
        "description": project.description,
        "role": project.role,
        "skills": project.skills,
        "achievements": project.achievements,
        "updatedAt": project.updated_at.isoformat(),
    }
