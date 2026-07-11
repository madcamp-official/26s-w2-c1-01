from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ResumeResult(Base):
    __tablename__ = "resume_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_posting_id: Mapped[int] = mapped_column(
        ForeignKey("job_postings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    analysis_result_id: Mapped[int | None] = mapped_column(
        ForeignKey("analysis_results.id", ondelete="SET NULL"),
        index=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    missing_skills: Mapped[list[Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    warnings: Mapped[list[Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ResumeResultProject(Base):
    __tablename__ = "resume_result_projects"
    __table_args__ = (
        UniqueConstraint("resume_result_id", "project_id", name="uq_resume_result_projects_pair"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    resume_result_id: Mapped[int] = mapped_column(
        ForeignKey("resume_results.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )


class ResumeSection(Base):
    __tablename__ = "resume_sections"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    resume_result_id: Mapped[int] = mapped_column(
        ForeignKey("resume_results.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"),
        index=True,
    )
    section_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    heading: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ResumeSectionEvidence(Base):
    __tablename__ = "resume_section_evidences"
    __table_args__ = (
        UniqueConstraint("resume_section_id", "evidence_id", name="uq_resume_section_evidences_pair"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    resume_section_id: Mapped[int] = mapped_column(
        ForeignKey("resume_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_id: Mapped[int] = mapped_column(
        ForeignKey("evidences.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )


class ProjectSuggestion(Base):
    __tablename__ = "project_suggestions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    resume_result_id: Mapped[int] = mapped_column(
        ForeignKey("resume_results.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    target_skills: Mapped[list[Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    estimated_duration: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
