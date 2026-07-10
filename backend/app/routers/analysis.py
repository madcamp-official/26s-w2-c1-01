from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["analysis"])

class AnalysisJobCreateRequest(BaseModel):
    recommendationLimit: int = 3

@router.post("/job-postings/{job_posting_id}/analysis-jobs")
def create_analysis_job(
    job_posting_id: int,
    request: AnalysisJobCreateRequest,
):
    return {
        "jobId": 301,
        "status": "pending",
        "message": "채용공고 분석 작업이 생성되었습니다.",
        "resultId": None,
        "error": None,
    }
    

@router.get("/analysis-jobs/{job_id}")
def get_analysis_job(job_id: int):
    return {
        "jobId": job_id,
        "status": "completed",
        "message": "채용공고 분석이 완료되었습니다",
        "resultId": 401,
        "error": None,
        "jobPosting": {
            "jobPostingId": 201,
            "companyName": "예시회사",
            "role": "Backend Developer",
            "requiredSkills": ["Spring Boot", "MySQL"],
            "preferredSkills": ["docker", "AWS"],
            "competencies": ["문제 해결", "협업"],
        },
        "recommendedProjects": [
            {
                "projectId": 1,
                "title": "백엔드 프로젝트",
                "score": 91,
                "reason": "잘 맞습니다.",
                "matchedSkills": ["Spring Boot", "MySQL"],
                "missingSkills": ["AWS"],
                "evidenceIds": [1001, 1002],
            },
            {
                "projectId": 2,
                "title": "실시간 채팅 서버",
                "score": 84,
                "reason": "백엔드 API 설계와 서버 운영 경험을 보여줄 수 있습니다.",
                "matchedSkills": ["WebSocket", "Redis"],
                "missingSkills": ["Spring Boot"],
                "evidenceIds": [1003],
            },
            {
                "projectId": 3,
                "title": "게시판 REST API",
                "score": 78,
                "reason": "REST API 설계 경험이 직무 요구사항과 일부 연결됩니다.",
                "matchedSkills": ["REST API", "MySQL"],
                "missingSkills": ["Docker", "AWS"],
                "evidenceIds": [1004],
            },
        ],
    }