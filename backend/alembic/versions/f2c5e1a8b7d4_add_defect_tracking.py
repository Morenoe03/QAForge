"""add defect tracking

Revision ID: f2c5e1a8b7d4
Revises: e14b7a3c95d1
Create Date: 2026-11-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2c5e1a8b7d4"
down_revision: Union[str, Sequence[str], None] = "e14b7a3c95d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "defects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "severity",
            sa.String(length=20),
            server_default="medium",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="open",
            nullable=False,
        ),
        sa.Column("test_run_result_id", sa.Integer(), nullable=True),
        sa.Column("case_title", sa.String(length=200), nullable=True),
        sa.Column("run_name", sa.String(length=150), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["test_run_result_id"],
            ["test_run_results.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_defects_test_run_result_id"),
        "defects",
        ["test_run_result_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_defects_test_run_result_id"),
        table_name="defects",
    )
    op.drop_table("defects")
