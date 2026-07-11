from collections import OrderedDict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth_helper import get_current_user
from app.models.analysis import AnalysisResult
from app.models.async_job import AsyncJob
from app.models.evidence import Evidence
from app.models.job_posting import JobPosting
from app.models.project import Project
from app.models.resume import (
    ProjectSuggestion,
    ResumeResult,
    ResumeResultProject,
    ResumeSection,
    ResumeSectionEvidence,
)
from app.models.user import User
from app.services.llm_pipeline import build_resume_generation_payload

router = APIRouter(tags=["resumes"])


class ResumeJobCreateRequest(BaseModel):
    jobPostingId: int
    projectIds: list[int]


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


def _unique_ints(values: list[int]) -> list[int]:
    return list(OrderedDict.fromkeys(values))


def _string_items(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    items: list[str] = []
    for item in value:
        if isinstance(item, str):
            items.append(item)
        elif isinstance(item, dict):
            name = item.get("name") or item.get("skill") or item.get("title")
            if isinstance(name, str):
                items.append(name)
    return items


def _project_skills(projects: list[Project]) -> list[str]:
    skills: list[str] = []
    for project in projects:
        skills.extend(_string_items(project.skills))
    return list(OrderedDict.fromkeys(skills))


def _missing_skills(job_posting: JobPosting, projects: list[Project]) -> list[str]:
    required_skills = _string_items(job_posting.required_skills)
    project_skill_lookup = {skill.casefold() for skill in _project_skills(projects)}
    return [
        skill
        for skill in required_skills
        if skill.casefold() not in project_skill_lookup
    ]


def _latest_analysis_result(
    user_id: int,
    job_posting_id: int,
    db: Session,
) -> AnalysisResult | None:
    return db.scalar(
        select(AnalysisResult)
        .where(
            AnalysisResult.user_id == user_id,
            AnalysisResult.job_posting_id == job_posting_id,
        )
        .order_by(AnalysisResult.created_at.desc())
    )


def _evidence_ids_by_project(project_ids: list[int], db: Session) -> dict[int, list[int]]:
    evidence_ids_by_project: dict[int, list[int]] = {project_id: [] for project_id in project_ids}
    if not project_ids:
        return evidence_ids_by_project

    rows = db.execute(
        select(Evidence.project_id, Evidence.id)
        .where(Evidence.project_id.in_(project_ids))
        .order_by(Evidence.id)
    ).all()
    for project_id, evidence_id in rows:
        if project_id is not None:
            evidence_ids_by_project.setdefault(project_id, []).append(evidence_id)
    return evidence_ids_by_project


def _evidences_by_project(project_ids: list[int], db: Session) -> dict[int, list[Evidence]]:
    evidences_by_project: dict[int, list[Evidence]] = {
        project_id: [] for project_id in project_ids
    }
    if not project_ids:
        return evidences_by_project

    evidences = db.scalars(
        select(Evidence)
        .where(Evidence.project_id.in_(project_ids))
        .order_by(Evidence.id)
    ).all()
    for evidence in evidences:
        if evidence.project_id is not None:
            evidences_by_project.setdefault(evidence.project_id, []).append(evidence)
    return evidences_by_project


def _section_response(section: ResumeSection, evidence_ids: list[int]) -> dict:
    response = {
        "sectionType": section.section_type,
        "heading": section.heading,
        "content": section.content,
        "evidenceIds": evidence_ids,
    }
    if section.project_id is not None:
        response["projectId"] = section.project_id
    return response


def _suggested_project_response(suggestion: ProjectSuggestion) -> dict:
    return {
        "title": suggestion.title,
        "description": suggestion.description,
        "targetSkills": suggestion.target_skills,
        "estimatedDuration": suggestion.estimated_duration,
        "reason": suggestion.reason,
    }


def _build_resume_result(
    current_user: User,
    job_posting: JobPosting,
    projects: list[Project],
    db: Session,
) -> ResumeResult:
    missing_skills = _missing_skills(job_posting, projects)
    analysis_result = _latest_analysis_result(current_user.id, job_posting.id, db)

    role = job_posting.role or "Target Role"
    company = f" - {job_posting.company_name}" if job_posting.company_name else ""
    project_titles = ", ".join(project.title for project in projects)
    skill_text = ", ".join(_project_skills(projects)) or "Selected project experience"
    build_resume_generation_payload(
        job_posting,
        projects,
        _evidences_by_project([project.id for project in projects], db),
    )

    resume_result = ResumeResult(
        user_id=current_user.id,
        job_posting_id=job_posting.id,
        analysis_result_id=analysis_result.id if analysis_result is not None else None,
        title=f"{role}{company} resume draft",
        summary=f"Resume draft focused on {role} using selected projects: {project_titles}.",
        missing_skills=missing_skills,
        warnings=(
            []
            if not missing_skills
            else ["Some required skills were not found in the selected projects."]
        ),
    )
    db.add(resume_result)
    db.flush()

    for sort_order, project in enumerate(projects, start=1):
        db.add(
            ResumeResultProject(
                resume_result_id=resume_result.id,
                project_id=project.id,
                sort_order=sort_order,
            )
        )

    evidence_ids_by_project = _evidence_ids_by_project([project.id for project in projects], db)
    all_evidence_ids = _unique_ints(
        [
            evidence_id
            for project in projects
            for evidence_id in evidence_ids_by_project.get(project.id, [])
        ]
    )

    sections: list[tuple[ResumeSection, list[int]]] = [
        (
            ResumeSection(
                resume_result_id=resume_result.id,
                section_type="profile_summary",
                heading="Summary",
                content=resume_result.summary or "",
                sort_order=1,
            ),
            all_evidence_ids,
        ),
        (
            ResumeSection(
                resume_result_id=resume_result.id,
                section_type="skills",
                heading="Skills",
                content=skill_text,
                sort_order=2,
            ),
            all_evidence_ids,
        ),
    ]

    for sort_order, project in enumerate(projects, start=3):
        achievements = _string_items(project.achievements)
        achievement_text = " ".join(achievements[:2])
        project_content = project.description or f"{project.title} project experience."
        if achievement_text:
            project_content = f"{project_content} {achievement_text}"

        sections.append(
            (
                ResumeSection(
                    resume_result_id=resume_result.id,
                    project_id=project.id,
                    section_type="project",
                    heading=project.title,
                    content=project_content,
                    sort_order=sort_order,
                ),
                evidence_ids_by_project.get(project.id, []),
            )
        )

    for section, evidence_ids in sections:
        db.add(section)
        db.flush()
        for evidence_id in _unique_ints(evidence_ids):
            db.add(
                ResumeSectionEvidence(
                    resume_section_id=section.id,
                    evidence_id=evidence_id,
                )
            )

    for skill in missing_skills:
        db.add(
            ProjectSuggestion(
                resume_result_id=resume_result.id,
                title=f"Build a project demonstrating {skill}",
                description=f"Create a focused project that shows practical experience with {skill}.",
                target_skills=[skill],
                estimated_duration="3-5 days",
                reason=f"The selected projects do not currently provide clear evidence for {skill}.",
            )
        )

    return resume_result


@router.post("/resume-jobs")
def create_resume_job(
    request: ResumeJobCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project_ids = _unique_ints(request.projectIds)
    if not project_ids:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "PROJECT_SELECTION_REQUIRED",
                "projectIds must contain at least one project id.",
            ),
        )

    job_posting = db.scalar(
        select(JobPosting).where(
            JobPosting.id == request.jobPostingId,
            JobPosting.user_id == current_user.id,
        )
    )
    if job_posting is None:
        raise HTTPException(status_code=404, detail="Job posting not found.")

    projects = db.scalars(
        select(Project).where(
            Project.id.in_(project_ids),
            Project.user_id == current_user.id,
            Project.is_archived.is_(False),
        )
    ).all()
    projects_by_id = {project.id: project for project in projects}

    missing_project_ids = [
        project_id for project_id in project_ids if project_id not in projects_by_id
    ]
    if missing_project_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Projects not found: {missing_project_ids}",
        )

    ordered_projects = [projects_by_id[project_id] for project_id in project_ids]

    job = AsyncJob(
        user_id=current_user.id,
        job_type="resume_generation",
        status="running",
        message="Generating resume draft from selected projects.",
        metadata_={
            "jobPostingId": request.jobPostingId,
            "projectIds": project_ids,
        },
    )
    db.add(job)
    db.flush()

    resume_result = _build_resume_result(current_user, job_posting, ordered_projects, db)

    job.status = "completed"
    job.message = "Resume draft generation completed."
    job.result_type = "resume_result"
    job.result_id = resume_result.id

    db.commit()
    db.refresh(job)

    return _job_response(job)


@router.get("/resume-jobs/{job_id}")
def get_resume_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.scalar(
        select(AsyncJob).where(
            AsyncJob.id == job_id,
            AsyncJob.user_id == current_user.id,
            AsyncJob.job_type == "resume_generation",
        )
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Resume job not found.")

    return _job_response(job)


@router.get("/resume-results/{resume_result_id}")
def get_resume_result(
    resume_result_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume_result = db.scalar(
        select(ResumeResult).where(
            ResumeResult.id == resume_result_id,
            ResumeResult.user_id == current_user.id,
        )
    )
    if resume_result is None:
        raise HTTPException(status_code=404, detail="Resume result not found.")

    sections = db.scalars(
        select(ResumeSection)
        .where(ResumeSection.resume_result_id == resume_result.id)
        .order_by(ResumeSection.sort_order, ResumeSection.id)
    ).all()

    section_ids = [section.id for section in sections]
    evidence_ids_by_section: dict[int, list[int]] = {
        section_id: [] for section_id in section_ids
    }
    if section_ids:
        rows = db.execute(
            select(
                ResumeSectionEvidence.resume_section_id,
                ResumeSectionEvidence.evidence_id,
            )
            .where(ResumeSectionEvidence.resume_section_id.in_(section_ids))
            .order_by(ResumeSectionEvidence.id)
        ).all()
        for section_id, evidence_id in rows:
            evidence_ids_by_section.setdefault(section_id, []).append(evidence_id)

    suggestions = db.scalars(
        select(ProjectSuggestion)
        .where(ProjectSuggestion.resume_result_id == resume_result.id)
        .order_by(ProjectSuggestion.id)
    ).all()

    return {
        "resumeResultId": resume_result.id,
        "jobPostingId": resume_result.job_posting_id,
        "title": resume_result.title,
        "summary": resume_result.summary,
        "sections": [
            _section_response(
                section,
                evidence_ids_by_section.get(section.id, []),
            )
            for section in sections
        ],
        "missingSkills": resume_result.missing_skills,
        "suggestedProjects": [
            _suggested_project_response(suggestion) for suggestion in suggestions
        ],
        "warnings": resume_result.warnings,
        "createdAt": resume_result.created_at.isoformat(),
    }
