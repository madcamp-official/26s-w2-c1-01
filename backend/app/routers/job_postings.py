from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/job-postings", tags=["job-postings"])


class JobPostingCreateRequest(BaseModel):
    inputType: str
    content: str


@router.post("")
def create_job_posting(request: JobPostingCreateRequest):
    return {
        "jobPostingId": 201,
        "inputType": request.inputType,
        "rawText": request.content,
        "status": "completed",
    }