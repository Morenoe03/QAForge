"""drop redundant test suite id index

Revision ID: 0c99fe23341f
Revises: e54d825b1a90
Create Date: 2026-10-21 04:16:23.698303

"""
from typing import Sequence, Union

from alembic import op


# Alembic uses these fields to track the migration history.
revision: str = '0c99fe23341f'
down_revision: Union[str, Sequence[str], None] = 'e54d825b1a90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index(op.f('ix_test_suites_id'), table_name='test_suites')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_index(op.f('ix_test_suites_id'), 'test_suites', ['id'], unique=False)
