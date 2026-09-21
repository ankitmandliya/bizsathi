"""Add missing customer fields (customer_type, city, state, pincode, pan, opening_balance, opening_balance_type, credit_limit, notes)

Revision ID: 006_add_customer_fields
Revises: 005_hrm_addendum
Create Date: 2026-09-21
"""

from alembic import op
import sqlalchemy as sa

revision = "006_add_customer_fields"
down_revision = "005_hrm_addendum"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("customers", sa.Column("customer_type", sa.String(50), nullable=False, server_default="Individual"))
    op.add_column("customers", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("customers", sa.Column("state", sa.String(100), nullable=True))
    op.add_column("customers", sa.Column("pincode", sa.String(20), nullable=True))
    op.add_column("customers", sa.Column("pan", sa.String(20), nullable=True))
    op.add_column("customers", sa.Column("opening_balance", sa.Numeric(12, 2), nullable=False, server_default="0.00"))
    op.add_column("customers", sa.Column("opening_balance_type", sa.String(20), nullable=False, server_default="Debit"))
    op.add_column("customers", sa.Column("credit_limit", sa.Numeric(12, 2), nullable=True))
    op.add_column("customers", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("customers", "notes")
    op.drop_column("customers", "credit_limit")
    op.drop_column("customers", "opening_balance_type")
    op.drop_column("customers", "opening_balance")
    op.drop_column("customers", "pan")
    op.drop_column("customers", "pincode")
    op.drop_column("customers", "state")
    op.drop_column("customers", "city")
    op.drop_column("customers", "customer_type")
