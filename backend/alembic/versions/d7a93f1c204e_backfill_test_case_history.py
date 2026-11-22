"""backfill test case history for existing databases

Revision ID: d7a93f1c204e
Revises: c4f8a12d9b36
Create Date: 2026-11-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7a93f1c204e"
down_revision: Union[str, Sequence[str], None] = "c4f8a12d9b36"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
            WHERE NOT EXISTS (
                SELECT 1
                FROM test_case_history
                WHERE test_case_history.test_case_id = test_cases.id
            )
            """
        )
    )


def downgrade() -> None:
    pass
