"""add cv embedding cache

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-07-14 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, None] = "d2e3f4a5b6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("cv_documents", sa.Column("embedding_text_hash", sa.Text(), nullable=True))
    op.add_column("cv_documents", sa.Column("content_embedding", Vector(1536), nullable=True))


def downgrade() -> None:
    op.drop_column("cv_documents", "content_embedding")
    op.drop_column("cv_documents", "embedding_text_hash")
