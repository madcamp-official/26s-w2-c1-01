from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth_helper import get_current_user
from app.models.analysis import AnalysisResult, RecommendationEvidence, RecommendedProject
from app.models.async_job import AsyncJob
from app.models.evidence import Evidence
from app.models.job_posting import JobPosting
from app.models.project import Project
from app.models.user import User
from app.services.llm_pipeline import (
    build_project_recommendation_payload,
    validate_project_recommendations,
)
from app.services.recommendation_service import recommend_projects_hybrid

router = APIRouter(tags=["analysis"])


class AnalysisJobCreateRequest(BaseModel):
    recommendationLimit: int = 3


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


def _job_posting_response(job_posting: JobPosting) -> dict:
    return {
        "jobPostingId": job_posting.id,
        "companyName": job_posting.company_name,
        "role": job_posting.role,
        "requiredSkills": job_posting.required_skills,
        "preferredSkills": job_posting.preferred_skills,
        "competencies": job_posting.competencies,
    }


def _json_strings(value) -> list[str]:
    if not isinstance(value, list):
        return []

    strings: list[str] = []
    for item in value:
        if isinstance(item, str) and item.strip():
            strings.append(item.strip())
        elif isinstance(item, dict):
            name = item.get("name") or item.get("skill") or item.get("title")
            if isinstance(name, str) and name.strip():
                strings.append(name.strip())
    return list(dict.fromkeys(strings))


def _project_summary_evidence(project: Project) -> str:
    parts: list[str] = []
    if project.description:
        parts.append(project.description)
    skills = _json_strings(project.skills)
    if skills:
        parts.append(f"기술 스택: {', '.join(skills)}")
    achievements = _json_strings(project.achievements)
    if achievements:
        parts.append(f"성과/구현: {'; '.join(achievements[:3])}")
    return " ".join(parts) or f"{project.title} 프로젝트 정보"


def _match_evidence_response(
    job_posting: JobPosting,
    recommended_project: RecommendedProject,
    project: Project,
) -> list[dict]:
    evidence_items: list[dict] = []
    project_skills = _json_strings(project.skills)
    project_summary = _project_summary_evidence(project)

    for skill in _json_strings(recommended_project.matched_skills):
        if any(skill.casefold() == project_skill.casefold() for project_skill in project_skills):
            project_evidence = f"{project.title}의 기술 스택에 {skill}이 포함되어 있습니다."
            source = "프로젝트 기술 스택"
        else:
            project_evidence = project_summary
            source = "프로젝트 요약"

        evidence_items.append(
            {
                "requirement": skill,
                "matchType": "skill",
                "source": source,
                "projectEvidence": project_evidence,
                "explanation": f"공고 요구 기술인 {skill}을 이 프로젝트에서 확인할 수 있어요.",
            }
        )

    if project_summary:
        role = job_posting.role or "공고"
        evidence_items.append(
            {
                "requirement": role,
                "matchType": "semantic",
                "source": "프로젝트 설명/성과 요약",
                "projectEvidence": project_summary,
                "explanation": recommended_project.reason,
            }
        )

    for skill in _json_strings(recommended_project.missing_skills):
        evidence_items.append(
            {
                "requirement": skill,
                "matchType": "missing",
                "source": "프로젝트 기술 스택/요약",
                "projectEvidence": f"{project.title}에서 {skill} 근거는 아직 확인되지 않았습니다.",
                "explanation": "공고의 필수 요구사항 중 수집된 프로젝트 정보에서 확인되지 않은 항목이에요.",
            }
        )

    return evidence_items


def _recommended_project_response(
    job_posting: JobPosting,
    recommended_project: RecommendedProject,
    project: Project,
    evidence_ids: list[int],
) -> dict:
    return {
        "projectId": project.id,
        "title": project.title,
        "score": recommended_project.score,
        "reason": recommended_project.reason,
        "matchedSkills": recommended_project.matched_skills,
        "missingSkills": recommended_project.missing_skills,
        "matchEvidence": _match_evidence_response(job_posting, recommended_project, project),
        "evidenceIds": evidence_ids,
    }


def _evidence_by_project(project_ids: list[int], db: Session) -> dict[int, list[Evidence]]:
    evidence_by_project: dict[int, list[Evidence]] = {
        project_id: [] for project_id in project_ids
    }
    if not project_ids:
        return evidence_by_project

    evidences = db.scalars(
        select(Evidence)
        .where(Evidence.project_id.in_(project_ids))
        .order_by(Evidence.id)
    ).all()
    for evidence in evidences:
        if evidence.project_id is not None:
            evidence_by_project.setdefault(evidence.project_id, []).append(evidence)
    return evidence_by_project


@router.post("/job-postings/{job_posting_id}/analysis-jobs")
def create_analysis_job(
    job_posting_id: int,
    request: AnalysisJobCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recommendation_limit = max(1, request.recommendationLimit)

    job_posting = db.scalar(
        select(JobPosting).where(
            JobPosting.id == job_posting_id,
            JobPosting.user_id == current_user.id,
        )
    )
    if job_posting is None:
        raise HTTPException(status_code=404, detail="Job posting not found.")

    job = AsyncJob(
        user_id=current_user.id,
        job_type="job_posting_analysis",
        status="running",
        message="Analyzing job posting against projects.",
    )
    db.add(job)
    db.flush()

    analysis_result = AnalysisResult(
        user_id=current_user.id,
        job_posting_id=job_posting.id,
        recommendation_limit=recommendation_limit,
        missing_skills=[],
        missing_experiences=[],
        missing_competencies=[],
    )
    db.add(analysis_result)
    db.flush()

    projects = db.scalars(
        select(Project)
        .where(
            Project.user_id == current_user.id,
            Project.is_archived.is_(False),
        )
        .order_by(Project.created_at.desc())
    ).all()
    evidence_by_project = _evidence_by_project([project.id for project in projects], db)

    build_project_recommendation_payload(
        job_posting,
        projects,
        evidence_by_project,
        recommendation_limit,
    )
    recommendations = validate_project_recommendations(
        recommend_projects_hybrid(
            db,
            current_user.id,
            job_posting,
            projects,
            evidence_by_project,
            recommendation_limit,
        ),
        projects,
        evidence_by_project,
    )

    all_missing_skills = []
    for index, recommendation in enumerate(recommendations, start=1):
        all_missing_skills.extend(recommendation["missingSkills"])
        recommended_project = RecommendedProject(
            analysis_result_id=analysis_result.id,
            project_id=recommendation["projectId"],
            rank=index,
            score=recommendation["score"],
            reason=recommendation["reason"],
            matched_skills=recommendation["matchedSkills"],
            missing_skills=recommendation["missingSkills"],
        )
        db.add(recommended_project)
        db.flush()

        for evidence_id in recommendation["evidenceIds"]:
            db.add(
                RecommendationEvidence(
                    recommended_project_id=recommended_project.id,
                    evidence_id=evidence_id,
                )
            )

    analysis_result.missing_skills = list(dict.fromkeys(all_missing_skills))
    job.status = "completed"
    job.message = "Job posting analysis completed."
    job.result_type = "analysis_result"
    job.result_id = analysis_result.id

    db.commit()
    db.refresh(job)

    return _job_response(job)


@router.get("/analysis-jobs/{job_id}")
def get_analysis_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.scalar(
        select(AsyncJob).where(
            AsyncJob.id == job_id,
            AsyncJob.user_id == current_user.id,
            AsyncJob.job_type == "job_posting_analysis",
        )
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis job not found.")

    response = _job_response(job)
    if job.status != "completed" or job.result_id is None:
        return response

    analysis_result = db.scalar(
        select(AnalysisResult).where(
            AnalysisResult.id == job.result_id,
            AnalysisResult.user_id == current_user.id,
        )
    )
    if analysis_result is None:
        raise HTTPException(status_code=404, detail="Analysis result not found.")

    job_posting = db.scalar(
        select(JobPosting).where(
            JobPosting.id == analysis_result.job_posting_id,
            JobPosting.user_id == current_user.id,
        )
    )
    if job_posting is None:
        raise HTTPException(status_code=404, detail="Job posting not found.")

    recommended_projects = db.scalars(
        select(RecommendedProject)
        .where(RecommendedProject.analysis_result_id == analysis_result.id)
        .order_by(RecommendedProject.rank)
    ).all()

    recommended_project_responses = []
    for recommended_project in recommended_projects:
        project = db.scalar(
            select(Project).where(
                Project.id == recommended_project.project_id,
                Project.user_id == current_user.id,
            )
        )
        if project is None:
            continue

        linked_evidence_ids = db.scalars(
            select(RecommendationEvidence.evidence_id).where(
                RecommendationEvidence.recommended_project_id == recommended_project.id
            )
        ).all()

        if not linked_evidence_ids:
            linked_evidence_ids = db.scalars(
                select(Evidence.id).where(Evidence.project_id == project.id)
            ).all()

        recommended_project_responses.append(
            _recommended_project_response(
                job_posting,
                recommended_project,
                project,
                linked_evidence_ids,
            )
        )

    response.update(
        {
            "jobPosting": _job_posting_response(job_posting),
            "recommendedProjects": recommended_project_responses,
        }
    )
    return response
