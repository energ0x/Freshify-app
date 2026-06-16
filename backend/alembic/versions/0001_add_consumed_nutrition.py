"""add nutrition snapshot columns to consumed_products

Revision ID: 0001_consumed_nutrition
Revises:
Create Date: 2026-06-16
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_consumed_nutrition"
down_revision = None
branch_labels = None
depends_on = None

# Idempotent so it is safe on databases where Base.metadata.create_all already
# created these columns (the project's default bootstrap path).
_COLUMNS = ("calories_consumed", "proteins_consumed", "fats_consumed", "carbohydrates_consumed")


def upgrade() -> None:
    for col in _COLUMNS:
        op.execute(f"ALTER TABLE consumed_products ADD COLUMN IF NOT EXISTS {col} DOUBLE PRECISION")


def downgrade() -> None:
    for col in _COLUMNS:
        op.execute(f"ALTER TABLE consumed_products DROP COLUMN IF EXISTS {col}")
