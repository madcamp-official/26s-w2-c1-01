from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth_helper import get_current_user
from app.models.evidence import Evidence
from app.models.job_posting import JobPosting
from app.models.project import Project
from app.models.user import User

router = APIRouter(prefix="/evidences", tags=["evidences"])


def _is_owned_by_user(evidence: Evidence, user_id: int, db: Session) -> bool:
    if evidence.project_id is not None:
        project = db.scalar(
            select(Project).where(
                Project.id == evidence.project_id,
                Project.user_id == user_id,
            )
        )
        if project is not None:
            return True

    if evidence.job_posting_id is not None:
        job_posting = db.scalar(
            select(JobPosting).where(
                JobPosting.id == evidence.job_posting_id,
                JobPosting.user_id == user_id,
            )
        )
        if job_posting is not None:
            return True

    return False


@router.get("/{evidence_id}")
def get_evidence(
    evidence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    evidence = db.get(Evidence, evidence_id)
    if evidence is None or not _is_owned_by_user(evidence, current_user.id, db):
        raise HTTPException(status_code=404, detail="Evidence not found.")

    return {
        "evidenceId": evidence.id,
        "sourceType": evidence.source_type,
        "sourceUrl": evidence.source_url,
        "title": evidence.title,
        "content": evidence.content,
        "projectId": evidence.project_id,
    }
