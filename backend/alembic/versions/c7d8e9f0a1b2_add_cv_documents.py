"""add cv documents

Revision ID: c7d8e9f0a1b2
Revises: b1f2e8d4c9a1
Create Date: 2026-07-14 10:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, None] = "b1f2e8d4c9a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cv_documents",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cv_documents_user_id"), "cv_documents", ["user_id"], unique=False)

    op.create_table(
        "cv_sections",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("cv_document_id", sa.BigInteger(), nullable=False),
        sa.Column("section_type", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["cv_document_id"], ["cv_documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cv_sections_cv_document_id"), "cv_sections", ["cv_document_id"], unique=False)
    op.create_index(op.f("ix_cv_sections_section_type"), "cv_sections", ["section_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_cv_sections_section_type"), table_name="cv_sections")
    op.drop_index(op.f("ix_cv_sections_cv_document_id"), table_name="cv_sections")
    op.drop_table("cv_sections")
    op.drop_index(op.f("ix_cv_documents_user_id"), table_name="cv_documents")
    op.drop_table("cv_documents")
