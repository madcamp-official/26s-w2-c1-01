import re
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth_helper import get_current_user
from app.models.job_posting import JobPosting
from app.models.user import User
from app.services.llm_pipeline import (
    build_job_posting_structure_payload,
    structure_job_posting_without_llm,
)

router = APIRouter(prefix="/job-postings", tags=["job-postings"])

JOB_POSTING_FETCH_TIMEOUT_SECONDS = 10.0
MIN_EXTRACTED_TEXT_LENGTH = 80
MAX_RAW_TEXT_LENGTH = 50000


class JobPostingCreateRequest(BaseModel):
    inputType: str
    content: str


class _VisibleTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._ignored_tags: list[str] = []
        self._chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag.lower() in {"script", "style", "noscript", "svg"}:
            self._ignored_tags.append(tag.lower())

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if self._ignored_tags and self._ignored_tags[-1] == tag:
            self._ignored_tags.pop()

    def handle_data(self, data: str) -> None:
        if self._ignored_tags:
            return
        text = data.strip()
        if text:
            self._chunks.append(text)

    def text(self) -> str:
        return " ".join(self._chunks)


def _error_detail(code: str, detail: str) -> dict:
    return {
        "status": "failed",
        "message": detail,
        "error": {
            "code": code,
            "detail": detail,
        },
    }


def _validate_url(url: str) -> None:
    parsed_url = urlparse(url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_URL_FETCH_FAILED",
                "The server could not extract text from the given URL.",
            ),
        )


def _extract_visible_text(html: str) -> str:
    parser = _VisibleTextParser()
    parser.feed(html)
    parser.close()

    text = unescape(parser.text())
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_RAW_TEXT_LENGTH]


async def _fetch_job_posting_text(url: str) -> str:
    _validate_url(url)
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=JOB_POSTING_FETCH_TIMEOUT_SECONDS,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "User-Agent": "madcamp-resume-matcher/1.0",
            },
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_URL_FETCH_FAILED",
                "The server could not extract text from the given URL.",
            ),
        ) from exc

    content_type = response.headers.get("content-type", "")
    if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_URL_FETCH_FAILED",
                "The given URL did not return an HTML page.",
            ),
        )

    extracted_text = _extract_visible_text(response.text)
    if len(extracted_text) < MIN_EXTRACTED_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_URL_FETCH_FAILED",
                "The server could not extract enough text from the given URL.",
            ),
        )

    return extracted_text


@router.post("")
async def create_job_posting(
    request: JobPostingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    input_type = request.inputType.strip().lower()
    content = request.content.strip()

    if input_type not in {"url", "text"}:
        raise HTTPException(
            status_code=400,
            detail="inputType must be either 'url' or 'text'.",
        )
    if not content:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_TEXT_REQUIRED",
                "content must not be empty.",
            ),
        )

    raw_text = await _fetch_job_posting_text(content) if input_type == "url" else content
    build_job_posting_structure_payload(raw_text)
    structured_job_posting = structure_job_posting_without_llm(raw_text)

    job_posting = JobPosting(
        user_id=current_user.id,
        input_type=input_type,
        input_url=content if input_type == "url" else None,
        raw_text=raw_text,
        role=structured_job_posting["role"],
        required_skills=structured_job_posting["requiredSkills"],
        preferred_skills=structured_job_posting["preferredSkills"],
        competencies=structured_job_posting["competencies"],
        status="completed",
    )
    db.add(job_posting)
    db.commit()
    db.refresh(job_posting)

    return {
        "jobPostingId": job_posting.id,
        "inputType": job_posting.input_type,
        "rawText": job_posting.raw_text,
        "status": job_posting.status,
    }
