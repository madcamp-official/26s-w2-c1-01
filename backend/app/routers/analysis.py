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
from app.models.portfolio import ProjectSourceLink, SourceDocument
from app.models.project import Project
from app.models.user import User
from app.services.llm_pipeline import (
    build_project_recommendation_payload,
    generate_recommendation_reason_via_llm,
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


def _source_documents_by_project(
    project_ids: list[int],
    db: Session,
) -> dict[int, list[SourceDocument]]:
    source_documents_by_project: dict[int, list[SourceDocument]] = {
        project_id: [] for project_id in project_ids
    }
    if not project_ids:
        return source_documents_by_project

    rows = db.execute(
        select(ProjectSourceLink.project_id, SourceDocument)
        .join(SourceDocument, SourceDocument.id == ProjectSourceLink.source_document_id)
        .where(ProjectSourceLink.project_id.in_(project_ids))
        .order_by(ProjectSourceLink.is_primary.desc(), SourceDocument.id)
    ).all()
    for project_id, source_document in rows:
        source_documents_by_project.setdefault(project_id, []).append(source_document)
    return source_documents_by_project


def _source_document_for_requirement(
    source_documents: list[SourceDocument],
    requirement: str,
) -> SourceDocument | None:
    requirement_key = requirement.casefold()
    for source_document in source_documents:
        if requirement_key and requirement_key in source_document.raw_text.casefold():
            return source_document
    return source_documents[0] if source_documents else None


def _source_snippet(source_document: SourceDocument | None, requirement: str) -> str:
    if source_document is None or not source_document.raw_text.strip():
        return ""

    raw_text = " ".join(source_document.raw_text.split())
    if not raw_text:
        return ""

    requirement_key = requirement.casefold()
    raw_text_key = raw_text.casefold()
    index = raw_text_key.find(requirement_key) if requirement_key else -1
    if index == -1:
        return raw_text[:700]

    start = max(0, index - 250)
    end = min(len(raw_text), index + len(requirement) + 450)
    prefix = "... " if start > 0 else ""
    suffix = " ..." if end < len(raw_text) else ""
    return f"{prefix}{raw_text[start:end].strip()}{suffix}"


def _match_evidence_item_from_evidence(evidence: Evidence) -> dict | None:
    metadata = evidence.metadata_ or {}
    requirement = metadata.get("requirement")
    match_type = metadata.get("matchType")
    source = metadata.get("source")
    explanation = metadata.get("explanation")

    if not all(
        isinstance(value, str) and value
        for value in [requirement, match_type, source, explanation]
    ):
        return None
    if match_type not in {"skill", "semantic", "missing"}:
        return None

    return {
        "requirement": requirement,
        "matchType": match_type,
        "source": source,
        "projectEvidence": evidence.content,
        "explanation": explanation,
    }


def _match_evidence_response_from_evidences(evidences: list[Evidence]) -> list[dict]:
    items = []
    for evidence in evidences:
        if evidence.source_type != "recommendation_match":
            continue
        item = _match_evidence_item_from_evidence(evidence)
        if item is not None:
            items.append(item)
    return items


def _match_evidence_response(
    job_posting: JobPosting,
    recommended_project: RecommendedProject,
    project: Project,
    evidences: list[Evidence] | None = None,
) -> list[dict]:
    if evidences:
        persisted_items = _match_evidence_response_from_evidences(evidences)
        if persisted_items:
            return persisted_items

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
    evidences: list[Evidence],
) -> dict:
    evidence_ids = [evidence.id for evidence in evidences]
    return {
        "projectId": project.id,
        "title": project.title,
        "score": recommended_project.score,
        "reason": recommended_project.reason,
        "matchedSkills": recommended_project.matched_skills,
        "missingSkills": recommended_project.missing_skills,
        "matchEvidence": _match_evidence_response(
            job_posting,
            recommended_project,
            project,
            evidences,
        ),
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
        .where(
            Evidence.project_id.in_(project_ids),
            Evidence.source_type != "recommendation_match",
        )
        .order_by(Evidence.id)
    ).all()
    for evidence in evidences:
        if evidence.project_id is not None:
            evidence_by_project.setdefault(evidence.project_id, []).append(evidence)
    return evidence_by_project


def _create_match_evidence(
    db: Session,
    job_posting: JobPosting,
    project: Project,
    requirement: str,
    match_type: str,
    content: str,
    explanation: str,
    source: str,
    source_document: SourceDocument | None = None,
) -> Evidence:
    evidence = Evidence(
        source_document_id=source_document.id if source_document is not None else None,
        project_id=project.id,
        job_posting_id=job_posting.id,
        source_type="recommendation_match",
        source_url=source_document.url if source_document is not None else project.source_url,
        title=f"{project.title} - {requirement}",
        content=content,
        metadata_={
            "requirement": requirement,
            "matchType": match_type,
            "source": source,
            "explanation": explanation,
        },
    )
    db.add(evidence)
    db.flush()
    return evidence


def _create_recommendation_match_evidences(
    db: Session,
    job_posting: JobPosting,
    recommended_project: RecommendedProject,
    project: Project,
    source_documents: list[SourceDocument],
) -> list[Evidence]:
    evidences: list[Evidence] = []
    project_summary = _project_summary_evidence(project)

    for skill in _json_strings(recommended_project.matched_skills):
        source_document = _source_document_for_requirement(source_documents, skill)
        has_source_match = (
            source_document is not None
            and skill.casefold() in source_document.raw_text.casefold()
        )
        snippet = _source_snippet(source_document, skill) if has_source_match else ""
        content = snippet or project_summary
        source = (
            source_document.title
            if has_source_match and source_document is not None and source_document.title
            else "Project summary"
        )
        evidences.append(
            _create_match_evidence(
                db,
                job_posting,
                project,
                skill,
                "skill",
                content,
                f"The job posting requires {skill}, and this project provides matching evidence.",
                source,
                source_document if has_source_match else None,
            )
        )

    role_requirement = job_posting.role or "Job posting"
    semantic_source_document = source_documents[0] if source_documents else None
    semantic_content = _source_snippet(semantic_source_document, "") or project_summary
    evidences.append(
        _create_match_evidence(
            db,
            job_posting,
            project,
            role_requirement,
            "semantic",
            semantic_content,
            recommended_project.reason,
            (
                semantic_source_document.title
                if semantic_source_document is not None and semantic_source_document.title
                else "Project summary"
            ),
            semantic_source_document,
        )
    )

    for skill in _json_strings(recommended_project.missing_skills):
        evidences.append(
            _create_match_evidence(
                db,
                job_posting,
                project,
                skill,
                "missing",
                f"No source document or project field currently confirms {skill} for {project.title}.",
                (
                    f"{skill} is listed as required in the job posting, but it was not found "
                    "in this project's structured skills."
                ),
                "Project skills/source documents",
                None,
            )
        )

    return evidences


def _create_llm_recommendation_match_evidences(
    db: Session,
    job_posting: JobPosting,
    project: Project,
    llm_evidences: list[dict],
    source_documents: list[SourceDocument],
) -> list[Evidence]:
    source_documents_by_id = {source_document.id: source_document for source_document in source_documents}
    evidences: list[Evidence] = []

    for llm_evidence in llm_evidences:
        source_document_id = llm_evidence.get("sourceDocumentId")
        source_document = (
            source_documents_by_id.get(source_document_id)
            if isinstance(source_document_id, int)
            else None
        )
        evidences.append(
            _create_match_evidence(
                db,
                job_posting,
                project,
                llm_evidence["requirement"],
                llm_evidence["matchType"],
                llm_evidence["content"],
                llm_evidence["explanation"],
                llm_evidence["source"],
                source_document,
            )
        )

    return evidences


@router.post("/job-postings/{job_posting_id}/analysis-jobs")
async def create_analysis_job(
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
    source_documents_by_project = _source_documents_by_project(
        [project.id for project in projects],
        db,
    )
    projects_by_id = {project.id: project for project in projects}

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
        project = projects_by_id.get(recommendation["projectId"])
        if project is None:
            continue

        source_documents = source_documents_by_project.get(project.id, [])
        llm_reason_result = await generate_recommendation_reason_via_llm(
            job_posting,
            project,
            recommendation,
            source_documents,
        )
        reason = (
            llm_reason_result["reason"]
            if llm_reason_result is not None and llm_reason_result["reason"]
            else recommendation["reason"]
        )
        recommended_project = RecommendedProject(
            analysis_result_id=analysis_result.id,
            project_id=recommendation["projectId"],
            rank=index,
            score=recommendation["score"],
            reason=reason,
            matched_skills=recommendation["matchedSkills"],
            missing_skills=recommendation["missingSkills"],
        )
        db.add(recommended_project)
        db.flush()

        if llm_reason_result is not None and llm_reason_result["evidences"]:
            match_evidences = _create_llm_recommendation_match_evidences(
                db,
                job_posting,
                project,
                llm_reason_result["evidences"],
                source_documents,
            )
        else:
            match_evidences = _create_recommendation_match_evidences(
                db,
                job_posting,
                recommended_project,
                project,
                source_documents,
            )

        for evidence in match_evidences:
            db.add(
                RecommendationEvidence(
                    recommended_project_id=recommended_project.id,
                    evidence_id=evidence.id,
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

        linked_evidences = db.scalars(
            select(Evidence)
            .join(RecommendationEvidence, RecommendationEvidence.evidence_id == Evidence.id)
            .where(RecommendationEvidence.recommended_project_id == recommended_project.id)
            .order_by(Evidence.id)
        ).all()

        if not linked_evidences:
            linked_evidences = db.scalars(
                select(Evidence)
                .where(
                    Evidence.project_id == project.id,
                    Evidence.source_type != "recommendation_match",
                )
                .order_by(Evidence.id)
            ).all()

        recommended_project_responses.append(
            _recommended_project_response(
                job_posting,
                recommended_project,
                project,
                linked_evidences,
            )
        )

    response.update(
        {
            "jobPosting": _job_posting_response(job_posting),
            "recommendedProjects": recommended_project_responses,
        }
    )
    return response
