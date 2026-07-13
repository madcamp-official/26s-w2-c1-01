"""add summary text columns

Revision ID: b1f2e8d4c9a1
Revises: 4a7f2c1d9b8e
Create Date: 2026-07-13 12:05:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1f2e8d4c9a1"
down_revision: Union[str, None] = "4a7f2c1d9b8e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("summary_text", sa.Text(), nullable=True))
    op.add_column("job_postings", sa.Column("content_summary", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("job_postings", "content_summary")
    op.drop_column("projects", "summary_text")
