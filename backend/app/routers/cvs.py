from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth_helper import get_current_user
from app.models.cv import CvDocument, CvSection
from app.models.evidence import Evidence
from app.models.project import Project
from app.models.user import User
from app.services.llm_pipeline import KNOWN_SKILLS, structure_cv_via_llm

router = APIRouter(prefix="/cvs", tags=["cvs"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "cvs"

SECTION_LABELS: dict[str, str] = {
    "basic_info": "기본 정보",
    "education": "학력",
    "certificates": "자격증",
    "career": "경력",
    "activities": "대외 활동",
    "projects": "프로젝트 경험",
}

SECTION_ORDER = list(SECTION_LABELS)

HEADING_ALIASES: dict[str, tuple[str, ...]] = {
    "basic_info": ("기본 정보", "인적 사항", "profile", "personal", "summary"),
    "education": ("학력", "education", "academic"),
    "certificates": ("자격증", "수상", "certification", "certificate", "license", "award"),
    "career": ("경력", "업무 경험", "experience", "career", "work"),
    "activities": ("대외 활동", "활동", "activities", "activity", "extracurricular"),
    "projects": ("프로젝트", "project", "projects", "portfolio"),
}

CV_PROJECT_SECTION_TYPES = {"career", "activities", "projects"}


class CvSectionUpdateRequest(BaseModel):
    title: str | None = None
    content: str | None = None


def _extract_pdf_text(file_path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail="PDF parsing dependency is not installed. Please install pypdf.",
        ) from exc

    reader = PdfReader(str(file_path))
    page_texts = [(page.extract_text() or "").strip() for page in reader.pages]
    return "\n\n".join(text for text in page_texts if text).strip()


def _section_type_from_heading(line: str) -> str | None:
    normalized = line.strip().lower().strip(":：-[]()")
    if not normalized or len(normalized) > 40:
        return None
    for section_type, aliases in HEADING_ALIASES.items():
        if any(normalized == alias.lower() or normalized.startswith(alias.lower()) for alias in aliases):
            return section_type
    return None


def _parse_cv_sections(raw_text: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {section_type: [] for section_type in SECTION_ORDER}
    current = "basic_info"

    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        detected = _section_type_from_heading(line)
        if detected is not None:
            current = detected
            continue
        sections[current].append(line)

    parsed = {section_type: "\n".join(lines).strip() for section_type, lines in sections.items()}
    if not any(parsed.values()) and raw_text.strip():
        parsed["basic_info"] = raw_text.strip()
    return parsed


def _extract_skills(text: str) -> list[str]:
    lowered = text.lower()
    skills: list[str] = []
    for skill in KNOWN_SKILLS:
        if skill.lower() in lowered:
            skills.append(skill)
    return sorted(set(skills), key=str.lower)


def _cv_document_response(cv_document: CvDocument, sections: list[CvSection]) -> dict[str, Any]:
    return {
        "cvId": cv_document.id,
        "fileName": cv_document.file_name,
        "status": cv_document.status,
        "createdAt": cv_document.created_at.isoformat(),
        "updatedAt": cv_document.updated_at.isoformat(),
        "sections": [
            {
                "sectionId": section.id,
                "sectionType": section.section_type,
                "title": section.title,
                "content": section.content,
                "sortOrder": section.sort_order,
            }
            for section in sorted(sections, key=lambda item: item.sort_order)
        ],
    }


def _sync_cv_projects(db: Session, cv_document: CvDocument, sections: list[CvSection]) -> None:
    db.execute(
        delete(Evidence).where(
            Evidence.source_type == "cv",
            Evidence.metadata_["cvDocumentId"].as_integer() == cv_document.id,
        ).execution_options(synchronize_session=False)
    )
    old_projects = db.scalars(
        select(Project).where(
            Project.user_id == cv_document.user_id,
            Project.source_type == "cv",
            Project.source_url == f"cv:{cv_document.id}",
        )
    ).all()
    for project in old_projects:
        db.delete(project)
    db.flush()

    for section in sections:
        if section.section_type not in CV_PROJECT_SECTION_TYPES or not section.content.strip():
            continue
        title = f"{cv_document.file_name} - {section.title}"
        content = section.content.strip()
        project = Project(
            user_id=cv_document.user_id,
            title=title,
            description=content[:4000],
            role=section.title,
            skills=_extract_skills(content),
            achievements=[],
            summary_text=content[:8000],
            source_type="cv",
            source_url=f"cv:{cv_document.id}",
        )
        db.add(project)
        db.flush()
        db.add(
            Evidence(
                project_id=project.id,
                source_type="cv",
                source_url=f"cv:{cv_document.id}",
                title=section.title,
                content=content[:8000],
                metadata_={
                    "cvDocumentId": cv_document.id,
                    "cvSectionId": section.id,
                    "sectionType": section.section_type,
                },
            )
        )


def _delete_cv_document_artifacts(db: Session, cv_document: CvDocument) -> Path | None:
    db.execute(
        delete(Evidence).where(
            Evidence.source_type == "cv",
            Evidence.metadata_["cvDocumentId"].as_integer() == cv_document.id,
        ).execution_options(synchronize_session=False)
    )
    cv_projects = db.scalars(
        select(Project).where(
            Project.user_id == cv_document.user_id,
            Project.source_type == "cv",
            Project.source_url == f"cv:{cv_document.id}",
        )
    ).all()
    for project in cv_projects:
        db.delete(project)

    file_path = Path(cv_document.file_path) if cv_document.file_path else None
    db.delete(cv_document)
    db.flush()
    return file_path


@router.get("")
def get_cvs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    documents = db.scalars(
        select(CvDocument)
        .where(CvDocument.user_id == current_user.id)
        .order_by(CvDocument.created_at.desc())
    ).all()
    document_ids = [document.id for document in documents]
    sections_by_document: dict[int, list[CvSection]] = {document_id: [] for document_id in document_ids}
    if document_ids:
        sections = db.scalars(
            select(CvSection)
            .where(CvSection.cv_document_id.in_(document_ids))
            .order_by(CvSection.sort_order.asc())
        ).all()
        for section in sections:
            sections_by_document.setdefault(section.cv_document_id, []).append(section)

    return {
        "cvs": [
            _cv_document_response(document, sections_by_document.get(document.id, []))
            for document in documents
        ]
    }


@router.post("/upload")
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or "cv.pdf").name
    storage_path = UPLOAD_DIR / f"{current_user.id}_{uuid4().hex}_{safe_name}"
    storage_path.write_bytes(await file.read())

    old_file_paths: list[Path] = []
    existing_documents = db.scalars(
        select(CvDocument).where(
            CvDocument.user_id == current_user.id,
            CvDocument.file_name == safe_name,
        )
    ).all()
    for existing_document in existing_documents:
        old_file_path = _delete_cv_document_artifacts(db, existing_document)
        if old_file_path is not None:
            old_file_paths.append(old_file_path)

    raw_text = _extract_pdf_text(storage_path)
    parsed_sections = await structure_cv_via_llm(raw_text)
    if parsed_sections is None:
        parsed_sections = _parse_cv_sections(raw_text)
    cv_document = CvDocument(
        user_id=current_user.id,
        file_name=safe_name,
        file_path=str(storage_path),
        raw_text=raw_text,
        status="ready" if raw_text else "empty",
    )
    db.add(cv_document)
    db.flush()

    sections: list[CvSection] = []
    for index, section_type in enumerate(SECTION_ORDER):
        section = CvSection(
            cv_document_id=cv_document.id,
            section_type=section_type,
            title=SECTION_LABELS[section_type],
            content=parsed_sections.get(section_type, ""),
            sort_order=index,
        )
        db.add(section)
        sections.append(section)
    db.flush()
    _sync_cv_projects(db, cv_document, sections)
    db.commit()
    db.refresh(cv_document)
    for old_file_path in old_file_paths:
        if old_file_path != storage_path and old_file_path.exists():
            old_file_path.unlink(missing_ok=True)

    return _cv_document_response(cv_document, sections)


@router.patch("/sections/{section_id}")
def update_cv_section(
    section_id: int,
    request: CvSectionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    section = db.scalar(
        select(CvSection)
        .join(CvDocument, CvDocument.id == CvSection.cv_document_id)
        .where(CvSection.id == section_id, CvDocument.user_id == current_user.id)
    )
    if section is None:
        raise HTTPException(status_code=404, detail="CV section not found.")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(section, field, value)

    cv_document = db.scalar(select(CvDocument).where(CvDocument.id == section.cv_document_id))
    sections = db.scalars(
        select(CvSection)
        .where(CvSection.cv_document_id == section.cv_document_id)
        .order_by(CvSection.sort_order.asc())
    ).all()
    if cv_document is not None:
        cv_document.content_embedding = None
        cv_document.embedding_text_hash = None
        _sync_cv_projects(db, cv_document, sections)

    db.commit()
    db.refresh(section)
    return {
        "sectionId": section.id,
        "sectionType": section.section_type,
        "title": section.title,
        "content": section.content,
        "sortOrder": section.sort_order,
    }


@router.delete("/{cv_id}")
def delete_cv(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cv_document = db.scalar(
        select(CvDocument).where(CvDocument.id == cv_id, CvDocument.user_id == current_user.id)
    )
    if cv_document is None:
        raise HTTPException(status_code=404, detail="CV not found.")

    file_path = _delete_cv_document_artifacts(db, cv_document)
    db.commit()
    if file_path is not None and file_path.exists():
        file_path.unlink(missing_ok=True)

    return {"deleted": True}
