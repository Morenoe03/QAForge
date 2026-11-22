"""add test runs and results

Revision ID: e14b7a3c95d1
Revises: d7a93f1c204e
Create Date: 2026-11-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e14b7a3c95d1"
down_revision: Union[str, Sequence[str], None] = "d7a93f1c204e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "test_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("suite_id", sa.Integer(), nullable=True),
        sa.Column("suite_name", sa.String(length=150), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="in_progress",
            nullable=False,
        ),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["suite_id"],
            ["test_suites.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "test_run_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("test_case_id", sa.Integer(), nullable=True),
        sa.Column("case_title", sa.String(length=200), nullable=False),
        sa.Column("case_snapshot", sa.JSON(), nullable=False),
        sa.Column(
            "outcome",
            sa.String(length=20),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["test_runs.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["test_case_id"],
            ["test_cases.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_test_run_results_run_id"),
        "test_run_results",
        ["run_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_test_run_results_test_case_id"),
        "test_run_results",
        ["test_case_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_test_run_results_test_case_id"),
        table_name="test_run_results",
    )
    op.drop_index(
        op.f("ix_test_run_results_run_id"),
        table_name="test_run_results",
    )
    op.drop_table("test_run_results")
    op.drop_table("test_runs")
