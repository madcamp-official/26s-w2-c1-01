from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["resumes"])


class ResumeJobCreateRequest(BaseModel):
    jobPostingId: int
    projectIds: list[int]


@router.post("/resume-jobs")
def create_resume_job(request: ResumeJobCreateRequest):
    return {
        "jobId": 501,
        "status": "pending",
        "message": "이력서 초안 생성 작업이 생성되었습니다.",
        "resultId": None,
        "error": None,
    }


@router.get("/resume-jobs/{job_id}")
def get_resume_job(job_id: int):
    return {
        "jobId": job_id,
        "status": "completed",
        "message": "이력서 초안 생성이 완료되었습니다.",
        "resultId": 601,
        "error": None,
    }


@router.get("/resume-results/{resume_result_id}")
def get_resume_result(resume_result_id: int):
    return {
        "resumeResultId": resume_result_id,
        "jobPostingId": 201,
        "title": "Backend Developer 지원 이력서 초안",
        "summary": "Spring Boot와 MySQL 기반 백엔드 API 개발 경험을 중심으로 구성한 이력서 초안입니다.",
        "sections": [
            {
                "sectionType": "profile_summary",
                "heading": "요약",
                "content": "Spring Boot 기반 API 서버 개발과 MySQL 데이터 모델링 경험을 보유한 백엔드 개발자입니다.",
                "evidenceIds": [1001, 1002],
            },
            {
                "sectionType": "skills",
                "heading": "기술 스택",
                "content": "Spring Boot, MySQL, JPA, Docker",
                "evidenceIds": [1001, 1002],
            },
            {
                "sectionType": "project",
                "heading": "쇼핑몰 백엔드 API 서버",
                "content": "Spring Boot와 MySQL을 사용해 주문, 상품, 회원 API를 구현했습니다.",
                "projectId": 1,
                "evidenceIds": [1001, 1002],
            },
        ],
        "missingSkills": ["AWS"],
        "suggestedProjects": [
            {
                "title": "Spring Boot 애플리케이션 AWS 배포 프로젝트",
                "description": "기존 Spring Boot 프로젝트를 Docker 이미지로 만들고 AWS EC2에 배포하는 프로젝트입니다.",
                "targetSkills": ["AWS", "Docker"],
                "estimatedDuration": "3~5일",
                "reason": "공고에서 AWS 경험을 우대하지만 기존 프로젝트 근거에서 AWS 사용 경험이 확인되지 않았습니다.",
            }
        ],
        "warnings": [
            "성과 수치가 확인되지 않아 정량적 성과 문장은 생성하지 않았습니다."
        ],
        "createdAt": "2026-07-10T16:30:00+09:00",
    }