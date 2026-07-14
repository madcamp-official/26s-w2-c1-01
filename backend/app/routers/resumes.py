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
from app.services.llm_pipeline import (
    generate_gap_project_suggestions_via_llm,
    generate_resume_sections_via_llm,
    validate_resume_sections,
)
from app.services.recommendation_service import _has_skill_match

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
    project_skills = _project_skills(projects)
    return [
        skill
        for skill in required_skills
        if not _has_skill_match(skill, project_skills)
    ]


def _suggested_project_for_skill(skill: str) -> tuple[str, str]:
    skill_key = skill.casefold().replace("_", " ").replace("-", " ").strip()
    examples = {
        "aws": (
            "AWS 기반 이미지 업로드/처리 서비스",
            "S3에 이미지를 업로드하고 Lambda 또는 서버 API로 썸네일을 생성한 뒤, 배포 환경에서 접근 권한과 로그를 관리하는 작은 백엔드 서비스를 만들어 보세요.",
        ),
        "docker": (
            "Docker Compose 기반 서비스 배포 환경",
            "백엔드, 프론트엔드, 데이터베이스를 각각 컨테이너로 구성하고 Docker Compose로 한 번에 실행되는 개발/배포 환경을 만들어 보세요.",
        ),
        "kubernetes": (
            "Kubernetes 미니 배포 파이프라인",
            "간단한 API 서버를 컨테이너화하고 Deployment, Service, ConfigMap을 사용해 로컬 클러스터나 클라우드 환경에 배포해 보세요.",
        ),
        "react": (
            "React 기반 채용공고 분석 대시보드",
            "공고 목록, 추천 프로젝트 점수, 부족 역량을 카드와 차트로 보여주는 대시보드를 React 컴포넌트 구조로 구현해 보세요.",
        ),
        "typescript": (
            "TypeScript 타입 안전 API 클라이언트",
            "백엔드 응답 타입을 정의하고, 요청/응답 검증과 에러 처리를 포함한 타입 안전한 프론트엔드 API 레이어를 만들어 보세요.",
        ),
        "fastapi": (
            "FastAPI 기반 포트폴리오 분석 API",
            "프로젝트 등록, 스킬 추출, 추천 결과 조회 엔드포인트를 FastAPI로 구현하고 Pydantic 스키마와 테스트를 함께 구성해 보세요.",
        ),
        "spring": (
            "Spring Boot 기반 지원서 관리 API",
            "사용자, 채용공고, 프로젝트, 추천 결과를 관리하는 REST API를 Spring Boot와 JPA로 구현해 보세요.",
        ),
        "spring boot": (
            "Spring Boot 기반 지원서 관리 API",
            "사용자, 채용공고, 프로젝트, 추천 결과를 관리하는 REST API를 Spring Boot와 JPA로 구현해 보세요.",
        ),
        "postgresql": (
            "PostgreSQL 검색/필터링 프로젝트",
            "프로젝트와 채용공고 데이터를 PostgreSQL에 저장하고 인덱스, 필터링, 정렬, 페이지네이션을 적용한 검색 API를 만들어 보세요.",
        ),
        "redis": (
            "Redis 캐시를 적용한 추천 결과 조회 API",
            "분석 결과 조회 API에 Redis 캐시를 붙이고 캐시 만료, 재계산, 응답 속도 비교를 포함한 실험을 만들어 보세요.",
        ),
        "ci/cd": (
            "GitHub Actions 기반 자동 배포 파이프라인",
            "테스트, 빌드, Docker 이미지 생성, 배포 단계를 GitHub Actions 워크플로로 구성해 보세요.",
        ),
        "rest": (
            "REST API 기반 할 일/일정 관리 서비스",
            "사용자별 할 일과 일정을 생성, 조회, 수정, 삭제하는 REST API를 만들고 상태 코드, 요청 검증, 페이지네이션, 에러 응답 규칙까지 README에 정리해 보세요.",
        ),
        "rest api": (
            "REST API 기반 할 일/일정 관리 서비스",
            "사용자별 할 일과 일정을 생성, 조회, 수정, 삭제하는 REST API를 만들고 상태 코드, 요청 검증, 페이지네이션, 에러 응답 규칙까지 README에 정리해 보세요.",
        ),
        "graphql": (
            "GraphQL 기반 프로젝트 탐색 API",
            "프로젝트, 기술 스택, 작성자를 GraphQL schema로 모델링하고 필터링, nested query, mutation을 지원하는 탐색 API를 만들어 보세요.",
        ),
        "websocket": (
            "WebSocket 기반 실시간 알림 서비스",
            "사용자가 작업을 등록하면 진행 상태와 완료 알림을 WebSocket으로 실시간 전송하는 알림 서버와 간단한 클라이언트를 만들어 보세요.",
        ),
        "mongodb": (
            "MongoDB 기반 학습 노트 검색 서비스",
            "학습 노트를 문서 형태로 저장하고 태그, 키워드, 작성일 기준으로 검색/필터링하는 API를 MongoDB aggregation과 함께 구현해 보세요.",
        ),
        "mysql": (
            "MySQL 기반 예약 관리 서비스",
            "스터디룸 예약, 시간 중복 방지, 예약 취소, 사용자별 예약 내역 조회를 MySQL 트랜잭션과 인덱스를 활용해 구현해 보세요.",
        ),
        "django": (
            "Django 기반 팀 블로그 CMS",
            "게시글, 댓글, 태그, 관리자 페이지를 포함한 팀 블로그 CMS를 만들고 Django ORM, 인증, 권한 처리를 적용해 보세요.",
        ),
        "node.js": (
            "Node.js 기반 파일 변환 작업 큐 API",
            "파일 업로드 요청을 받아 변환 작업을 큐에 넣고, 작업 상태 조회와 완료 결과 다운로드를 제공하는 비동기 API를 만들어 보세요.",
        ),
        "express": (
            "Express 기반 URL 북마크 API",
            "사용자별 URL 북마크 저장, 태그 분류, 검색, 공개/비공개 설정을 제공하는 REST API를 Express 미들웨어 구조로 구현해 보세요.",
        ),
        "java": (
            "Java 기반 도서 대여 관리 프로그램",
            "도서 등록, 회원 관리, 대여/반납, 연체 상태 계산을 객체지향 구조로 구현하고 테스트 케이스를 함께 작성해 보세요.",
        ),
        "python": (
            "Python 기반 채용공고 키워드 분석기",
            "채용공고 텍스트에서 기술 스택과 요구 역량을 추출하고 빈도 분석 결과를 CSV나 간단한 대시보드로 보여주는 도구를 만들어 보세요.",
        ),
    }
    if skill_key in examples:
        return examples[skill_key]

    if "api" in skill_key:
        return (
            f"{skill} 기반 지원서 관리 API",
            f"채용공고, 지원 프로젝트, 추천 결과를 등록/조회/수정/삭제하는 API를 만들고 {skill}을 핵심 통신 방식으로 적용해 보세요.",
        )
    if "database" in skill_key or "db" in skill_key:
        return (
            f"{skill} 기반 데이터 조회 서비스",
            f"사용자 활동 로그나 프로젝트 데이터를 저장하고 검색, 필터링, 집계 기능을 제공하는 서비스로 {skill} 활용 경험을 보여주세요.",
        )
    if "cloud" in skill_key or "deploy" in skill_key:
        return (
            f"{skill} 기반 배포 자동화 프로젝트",
            f"간단한 웹 서비스를 만들고 빌드, 환경변수 관리, 배포, 로그 확인까지 포함한 배포 흐름을 {skill} 중심으로 구성해 보세요.",
        )

    return (
        f"{skill} 기반 기능 추적 보드",
        f"프로젝트의 작업 항목을 등록하고 상태, 담당자, 우선순위, 마감일로 관리하는 칸반 보드를 만들면서 {skill}을 핵심 구현 요소로 적용해 보세요.",
    )


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


def _existing_resume_result(
    current_user: User,
    job_posting: JobPosting,
    project_ids: list[int],
    db: Session,
) -> ResumeResult | None:
    resume_results = db.scalars(
        select(ResumeResult)
        .where(
            ResumeResult.user_id == current_user.id,
            ResumeResult.job_posting_id == job_posting.id,
        )
        .order_by(ResumeResult.created_at.desc())
    ).all()

    for resume_result in resume_results:
        rows = db.execute(
            select(ResumeResultProject.project_id)
            .where(ResumeResultProject.resume_result_id == resume_result.id)
            .order_by(ResumeResultProject.sort_order)
        ).all()
        existing_project_ids = [project_id for (project_id,) in rows]
        if existing_project_ids == project_ids:
            return resume_result

    return None


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


async def _build_resume_result(
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
    evidence_by_project = _evidences_by_project([project.id for project in projects], db)
    llm_resume = await generate_resume_sections_via_llm(
        job_posting,
        projects,
        evidence_by_project,
    )
    llm_sections = (
        validate_resume_sections(llm_resume["sections"], projects, evidence_by_project)
        if llm_resume is not None
        else []
    )
    llm_warnings = llm_resume["warnings"] if llm_resume is not None else []

    resume_result = ResumeResult(
        user_id=current_user.id,
        job_posting_id=job_posting.id,
        analysis_result_id=analysis_result.id if analysis_result is not None else None,
        title=f"{role}{company} resume draft",
        summary=(
            llm_resume["summary"]
            if llm_resume is not None and llm_resume["summary"]
            else f"Resume draft focused on {role} using selected projects: {project_titles}."
        ),
        missing_skills=missing_skills,
        warnings=llm_warnings
        or (
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

    if llm_sections:
        sections: list[tuple[ResumeSection, list[int]]] = [
            (
                ResumeSection(
                    resume_result_id=resume_result.id,
                    project_id=section.get("projectId"),
                    section_type=section.get("sectionType") or "project",
                    heading=section["heading"],
                    content=section["content"],
                    sort_order=sort_order,
                ),
                section.get("evidenceIds", []),
            )
            for sort_order, section in enumerate(llm_sections, start=1)
        ]
    else:
        sections = [
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

    llm_suggestions = await generate_gap_project_suggestions_via_llm(
        job_posting,
        projects,
        evidence_by_project,
        missing_skills,
    )
    suggestions = llm_suggestions or [
        {
            "title": title,
            "description": description,
            "targetSkills": [skill],
            "reason": f"선택한 프로젝트에서 {skill} 활용 근거가 충분히 확인되지 않았습니다.",
        }
        for skill in missing_skills
        for title, description in [_suggested_project_for_skill(skill)]
    ]

    for suggestion in suggestions:
        db.add(
            ProjectSuggestion(
                resume_result_id=resume_result.id,
                title=suggestion["title"],
                description=suggestion["description"],
                target_skills=suggestion["targetSkills"],
                estimated_duration=None,
                reason=suggestion["reason"],
            )
        )

    return resume_result


@router.post("/resume-jobs")
async def create_resume_job(
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
    existing_resume_result = _existing_resume_result(
        current_user,
        job_posting,
        project_ids,
        db,
    )
    if existing_resume_result is not None:
        existing_job = db.scalar(
            select(AsyncJob)
            .where(
                AsyncJob.user_id == current_user.id,
                AsyncJob.job_type == "resume_generation",
                AsyncJob.result_type == "resume_result",
                AsyncJob.result_id == existing_resume_result.id,
            )
            .order_by(AsyncJob.id.desc())
        )
        if existing_job is not None:
            return _job_response(existing_job)

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

    resume_result = existing_resume_result or await _build_resume_result(
        current_user,
        job_posting,
        ordered_projects,
        db,
    )

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
