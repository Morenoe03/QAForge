"""add API test definitions

Revision ID: a7c3e9f2d10b
Revises: f2c5e1a8b7d4
Create Date: 2026-11-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7c3e9f2d10b"
down_revision: Union[str, Sequence[str], None] = "f2c5e1a8b7d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "api_tests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("method", sa.String(length=10), nullable=False),
        sa.Column("endpoint", sa.String(length=2048), nullable=False),
        sa.Column("request_body", sa.Text(), nullable=True),
        sa.Column("expected_status", sa.Integer(), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "api_test_executions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("api_test_id", sa.Integer(), nullable=False),
        sa.Column("outcome", sa.String(length=20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["api_test_id"],
            ["api_tests.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_api_test_executions_api_test_id"),
        "api_test_executions",
        ["api_test_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_api_test_executions_api_test_id"),
        table_name="api_test_executions",
    )
    op.drop_table("api_test_executions")
    op.drop_table("api_tests")
