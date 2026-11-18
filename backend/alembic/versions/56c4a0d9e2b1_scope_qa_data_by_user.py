"""scope QA data to individual users

Revision ID: 56c4a0d9e2b1
Revises: 8d74b9c201af
Create Date: 2026-11-18 00:00:00.000000

"""

import hashlib
import os
import secrets
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "56c4a0d9e2b1"
down_revision: Union[str, Sequence[str], None] = "8d74b9c201af"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_OWNER_TABLES = (
    "api_tests",
    "defects",
    "test_cases",
    "test_case_history",
    "test_runs",
    "test_suites",
)


def _ensure_demo_user(connection: sa.Connection) -> int:
    username = (os.getenv("QAFORGE_DEMO_USERNAME") or "su").strip().lower() or "su"
    password = os.getenv("QAFORGE_DEMO_PASSWORD") or "su"
    user_id = connection.execute(
        sa.text("SELECT id FROM users WHERE username = :username"),
        {"username": username},
    ).scalar_one_or_none()
    if user_id is not None:
        return user_id

    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        310_000,
    ).hex()
    result = connection.execute(
        sa.text(
            """
            INSERT INTO users (username, password_hash, display_name, email)
            VALUES (:username, :password_hash, :display_name, :email)
            RETURNING id
            """
        ),
        {
            "username": username,
            "password_hash": f"pbkdf2_sha256$310000${salt}${digest}",
            "display_name": "Emanuel Moreno",
            "email": "emanuellmorreno@gmail.com",
        },
    )
    return result.scalar_one()


def upgrade() -> None:
    connection = op.get_bind()
    demo_user_id = _ensure_demo_user(connection)

    for table in _OWNER_TABLES:
        op.add_column(
            table,
            sa.Column("user_id", sa.Integer(), nullable=True),
        )
        connection.execute(
            sa.text(f"UPDATE {table} SET user_id = :user_id"),
            {"user_id": demo_user_id},
        )
        op.alter_column(table, "user_id", nullable=False)
        op.create_foreign_key(
            f"fk_{table}_user_id_users",
            table,
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.create_index(
            f"ix_{table}_user_id",
            table,
            ["user_id"],
            unique=False,
        )

    op.drop_index("ix_test_suites_name", table_name="test_suites")
    op.create_index(
        "ix_test_suites_name",
        "test_suites",
        ["name"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_test_suites_user_name",
        "test_suites",
        ["user_id", "name"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_test_suites_user_name",
        "test_suites",
        type_="unique",
    )
    op.drop_index("ix_test_suites_name", table_name="test_suites")
    op.create_index(
        "ix_test_suites_name",
        "test_suites",
        ["name"],
        unique=True,
    )

    for table in reversed(_OWNER_TABLES):
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_constraint(
            f"fk_{table}_user_id_users",
            table,
            type_="foreignkey",
        )
        op.drop_column(table, "user_id")
