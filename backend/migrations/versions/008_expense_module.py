"""Create Expense Category and Office Expense tables

Revision ID: 008_expense_module
Revises: 007_whatsapp_email_campaigns
Create Date: 2026-09-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "008_expense_module"
down_revision = "007_whatsapp_email_campaigns"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create expense_categories table
    op.create_table(
        "expense_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_expense_categories_tenant_name", "expense_categories", ["tenant_id", "name"], unique=True)
    op.create_index("ix_expense_categories_tenant_active", "expense_categories", ["tenant_id", "is_active"])

    # 2. Create expenses table
    op.create_table(
        "expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False, index=True),
        sa.Column("payment_method", sa.String(50), nullable=False, server_default="CASH", index=True),
        sa.Column("vendor_name", sa.String(255), nullable=True),
        sa.Column("reference_number", sa.String(255), nullable=True),
        sa.Column("receipt_url", sa.String(512), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_expenses_tenant_date", "expenses", ["tenant_id", "expense_date"])
    op.create_index("ix_expenses_tenant_category", "expenses", ["tenant_id", "category_id"])
    op.create_index("ix_expenses_tenant_payment_method", "expenses", ["tenant_id", "payment_method"])
    op.create_index("ix_expenses_tenant_created", "expenses", ["tenant_id", "created_at"])


def downgrade() -> None:
    op.drop_table("expenses")
    op.drop_table("expense_categories")
