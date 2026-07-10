from fastapi import APIRouter

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("")
def get_projects():
    return {
        "projects": [
            {
                "projectId": 1,
                "title": "백엔드 프로젝트",
                "description": "백엔드 프로젝트입니다.",
                "role": "백엔드 개발",
                "skills": ["Spring Boot", "MySQL", "JPA"],
                "achievements": ["API 구현", "프론트와 연동"],
                "sourceType": "github",
                "sourceUrl": "https://github.com/example/server",
                "evidenceIds": [1001, 1002],
            }
        ]
    }

@router.patch("/{project_id}")
def update_project(project_id: int):
    return {
        "projectId": project_id,
        "title": "백엔드 api 서버",
        "description": "프로젝트 수정",
        "role": "백엔드 개발",
        "skills": ["Spring Boot", "MySQL", "Docker"],
        "achievements": ["API 구현", "Docker 기반 실행 환경 구성"],
        "updatedAt": "2026-07-10T16:00:00+09:00",
    }
