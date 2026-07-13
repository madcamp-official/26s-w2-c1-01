import base64
import binascii
import re
import os
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth_helper import get_current_user
from app.models.job_posting import JobPosting
from app.models.user import User
from app.services.embedding_service import create_embedding
from app.services.llm_pipeline import (
    structure_job_posting_from_image,
    structure_job_posting_via_llm,
    structure_job_posting_without_llm,
)

router = APIRouter(prefix="/job-postings", tags=["job-postings"])

JOB_POSTING_FETCH_TIMEOUT_SECONDS = 10.0
MIN_EXTRACTED_TEXT_LENGTH = 80
MAX_RAW_TEXT_LENGTH = 50000
MAX_IMAGE_CANDIDATES = 6
MIN_IMAGE_BYTES = 15_000
MAX_IMAGE_BYTES = 8_000_000
IMAGE_SRC_PATTERN = re.compile(
    r'<img[^>]*(?:data-src|data-original|src)="([^"]+)"', re.IGNORECASE
)
IMAGE_DATA_URL_PATTERN = re.compile(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$", re.DOTALL)
_NON_CONTENT_IMAGE_HINTS = (
    "logo", "icon", "sprite", "banner", "gtm", "adserver", "button", "btn_",
    "favicon", "blank.gif", "spacer", "profile", "avatar", "share_default",
)


class JobPostingCreateRequest(BaseModel):
    inputType: str
    content: str | list[str]


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


def _validate_image_data_url(data_url: str) -> None:
    match = IMAGE_DATA_URL_PATTERN.match(data_url)
    if match is None:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_IMAGE_INVALID",
                "The uploaded job posting image is not a valid image data URL.",
            ),
        )

    content_type, encoded = match.groups()
    if content_type not in {"image/png", "image/jpeg", "image/jpg", "image/webp"}:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_IMAGE_INVALID",
                "The uploaded job posting image type is not supported.",
            ),
        )

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_IMAGE_INVALID",
                "The uploaded job posting image could not be decoded.",
            ),
        ) from exc

    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_IMAGE_INVALID",
                "The uploaded job posting image must be 8MB or smaller.",
            ),
        )


def _image_contents_from_request(content: str | list[str]) -> list[str]:
    image_data_urls = [content] if isinstance(content, str) else content
    image_data_urls = [image_data_url.strip() for image_data_url in image_data_urls if image_data_url.strip()]
    if not image_data_urls:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_TEXT_REQUIRED",
                "content must not be empty.",
            ),
        )
    if len(image_data_urls) > MAX_IMAGE_CANDIDATES:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_IMAGE_INVALID",
                f"The uploaded job posting images must be {MAX_IMAGE_CANDIDATES} or fewer.",
            ),
        )
    for image_data_url in image_data_urls:
        _validate_image_data_url(image_data_url)
    return image_data_urls


def _text_content_from_request(content: str | list[str]) -> str:
    if not isinstance(content, str):
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_TEXT_REQUIRED",
                "content must be text for this input type.",
            ),
        )
    content = content.strip()
    if not content:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_TEXT_REQUIRED",
                "content must not be empty.",
            ),
        )
    return content


def _extract_visible_text(html: str) -> str:
    parser = _VisibleTextParser()
    parser.feed(html)
    parser.close()

    text = unescape(parser.text())
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_RAW_TEXT_LENGTH]


def _job_posting_summary_text(raw_text: str, structured_job_posting: dict) -> str:
    parts: list[str] = []
    role = structured_job_posting.get("role")
    if isinstance(role, str) and role:
        parts.append(f"Role: {role}")

    required_skills = structured_job_posting.get("requiredSkills") or []
    if required_skills:
        parts.append(f"Required skills: {', '.join(required_skills)}")

    preferred_skills = structured_job_posting.get("preferredSkills") or []
    if preferred_skills:
        parts.append(f"Preferred skills: {', '.join(preferred_skills)}")

    competencies = structured_job_posting.get("competencies") or []
    if competencies:
        parts.append(f"Competencies: {', '.join(competencies)}")

    parts.append(f"Job posting excerpt: {raw_text[:3000]}")
    return "\n".join(parts)


def _has_enough_structured_job_posting_signal(structured_job_posting: dict) -> bool:
    required_skills = structured_job_posting.get("requiredSkills") or []
    preferred_skills = structured_job_posting.get("preferredSkills") or []
    return bool(required_skills or preferred_skills)


def _raise_insufficient_url_content() -> None:
    raise HTTPException(
        status_code=400,
        detail=_error_detail(
            "JOB_POSTING_URL_INSUFFICIENT",
            "The server could not extract enough job posting requirements from the URL.",
        ),
    )


def _try_create_embedding(text: str) -> list[float] | None:
    if not os.getenv("OPENROUTER_API_KEY"):
        return None
    try:
        return create_embedding(text)
    except Exception:
        return None


def _extract_image_candidates(html: str, base_url: str) -> list[str]:
    candidates: list[str] = []
    seen: set[str] = set()
    for src in IMAGE_SRC_PATTERN.findall(html):
        src = unescape(src.strip())
        if not src or src.startswith("data:"):
            continue
        lowered = src.lower()
        if any(hint in lowered for hint in _NON_CONTENT_IMAGE_HINTS):
            continue
        resolved = urljoin(base_url, src)
        if resolved in seen:
            continue
        seen.add(resolved)
        candidates.append(resolved)
        if len(candidates) >= MAX_IMAGE_CANDIDATES:
            break
    return candidates


async def _fetch_image_as_data_url(client: httpx.AsyncClient, image_url: str) -> str | None:
    try:
        response = await client.get(image_url)
        response.raise_for_status()
    except httpx.HTTPError:
        return None

    content_type = response.headers.get("content-type", "")
    if not content_type.startswith("image/"):
        return None
    if not (MIN_IMAGE_BYTES <= len(response.content) <= MAX_IMAGE_BYTES):
        return None

    encoded = base64.b64encode(response.content).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


async def _fetch_job_posting_content(url: str) -> tuple[str, dict | None]:
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

            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
                raise HTTPException(
                    status_code=400,
                    detail=_error_detail(
                        "JOB_POSTING_URL_FETCH_FAILED",
                        "The given URL did not return an HTML page.",
                    ),
                )

            html = response.text
            extracted_text = _extract_visible_text(html)
            if len(extracted_text) >= MIN_EXTRACTED_TEXT_LENGTH:
                return extracted_text, None

            # Little/no visible text — this page likely renders the posting as an image
            # (a recruiting poster/flyer), so fall back to reading candidate images with a
            # vision-capable LLM instead of failing outright.
            image_candidates = _extract_image_candidates(html, str(response.url))
            image_data_urls = []
            for image_url in image_candidates:
                data_url = await _fetch_image_as_data_url(client, image_url)
                if data_url is not None:
                    image_data_urls.append(data_url)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=400,
            detail=_error_detail(
                "JOB_POSTING_URL_FETCH_FAILED",
                "The server could not extract text from the given URL.",
            ),
        ) from exc

    if image_data_urls:
        image_result = await structure_job_posting_from_image(image_data_urls)
        if image_result is not None:
            return image_result["rawText"], image_result

    raise HTTPException(
        status_code=400,
        detail=_error_detail(
            "JOB_POSTING_URL_FETCH_FAILED",
            "The server could not extract enough text from the given URL.",
        ),
    )


@router.post("")
async def create_job_posting(
    request: JobPostingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    input_type = request.inputType.strip().lower()

    if input_type not in {"url", "text", "image"}:
        raise HTTPException(
            status_code=400,
            detail="inputType must be either 'url', 'text', or 'image'.",
        )

    structured_job_posting: dict | None = None
    if input_type == "url":
        content = _text_content_from_request(request.content)
        raw_text, structured_job_posting = await _fetch_job_posting_content(content)
    elif input_type == "image":
        image_data_urls = _image_contents_from_request(request.content)
        structured_job_posting = await structure_job_posting_from_image(image_data_urls)
        if structured_job_posting is None:
            raise HTTPException(
                status_code=400,
                detail=_error_detail(
                    "JOB_POSTING_IMAGE_OCR_FAILED",
                    "The server could not extract readable job posting text from the image.",
                ),
            )
        raw_text = structured_job_posting["rawText"]
        content = None
    else:
        content = _text_content_from_request(request.content)
        raw_text = content

    if structured_job_posting is None:
        structured_job_posting = await structure_job_posting_via_llm(raw_text)
    if structured_job_posting is None:
        structured_job_posting = structure_job_posting_without_llm(raw_text)
    if input_type == "url" and not _has_enough_structured_job_posting_signal(structured_job_posting):
        _raise_insufficient_url_content()
    content_summary = _job_posting_summary_text(raw_text, structured_job_posting)
    content_embedding = _try_create_embedding(content_summary)

    job_posting = JobPosting(
        user_id=current_user.id,
        input_type=input_type,
        input_url=content if input_type == "url" else None,
        raw_text=raw_text,
        role=structured_job_posting["role"],
        required_skills=structured_job_posting["requiredSkills"],
        preferred_skills=structured_job_posting["preferredSkills"],
        competencies=structured_job_posting["competencies"],
        content_summary=content_summary,
        content_embedding=content_embedding,
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
