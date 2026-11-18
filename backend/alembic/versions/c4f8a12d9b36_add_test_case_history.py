"""add test case history

Revision ID: c4f8a12d9b36
Revises: a27c8e16d3f4
Create Date: 2026-11-17 20:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4f8a12d9b36"
down_revision: Union[str, Sequence[str], None] = "a27c8e16d3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "test_cases",
        sa.Column(
            "version",
            sa.Integer(),
            server_default="1",
            nullable=False,
        ),
    )
    op.create_table(
        "test_case_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("test_case_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("change_type", sa.String(length=20), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "test_case_id",
            "version",
            name="uq_test_case_history_case_version",
        ),
    )
    op.create_index(
        op.f("ix_test_case_history_test_case_id"),
        "test_case_history",
        ["test_case_id"],
        unique=False,
    )
    op.execute(
        sa.text(
            """
            INSERT INTO test_case_history (
                test_case_id,
                version,
                change_type,
                snapshot,
                created_at
            )
            SELECT
                test_cases.id,
                test_cases.version,
                'created',
                json_build_object(
                    'id', test_cases.id,
                    'version', test_cases.version,
                    'title', test_cases.title,
                    'description', test_cases.description,
                    'preconditions', test_cases.preconditions,
                    'steps', test_cases.steps,
                    'expected_result', test_cases.expected_result,
                    'priority', test_cases.priority,
                    'test_type', test_cases.test_type,
                    'status', test_cases.status,
                    'tags', test_cases.tags,
                    'suite_ids', COALESCE(
                        (
                            SELECT json_agg(test_suite_cases.test_suite_id)
                            FROM test_suite_cases
                            WHERE test_suite_cases.test_case_id = test_cases.id
                        ),
                        '[]'::json
                    ),
                    'created_at', test_cases.created_at,
                    'updated_at', test_cases.updated_at
                ),
                test_cases.created_at
            FROM test_cases
            """
        )
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_test_case_history_test_case_id"),
        table_name="test_case_history",
    )
    op.drop_table("test_case_history")
    op.drop_column("test_cases", "version")
