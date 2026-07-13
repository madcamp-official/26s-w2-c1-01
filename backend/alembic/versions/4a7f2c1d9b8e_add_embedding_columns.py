"""add embedding columns

Revision ID: 4a7f2c1d9b8e
Revises: 9b2dc2972123
Create Date: 2026-07-13 11:45:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision: str = "4a7f2c1d9b8e"
down_revision: Union[str, None] = "9b2dc2972123"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.add_column("projects", sa.Column("summary_embedding", Vector(1536), nullable=True))
    op.add_column("job_postings", sa.Column("content_embedding", Vector(1536), nullable=True))


def downgrade() -> None:
    op.drop_column("job_postings", "content_embedding")
    op.drop_column("projects", "summary_embedding")
    op.execute("DROP EXTENSION IF EXISTS vector")
