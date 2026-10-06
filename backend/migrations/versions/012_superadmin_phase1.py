"""Add Super Admin Phase 1 fields to User and Tenant models

Revision ID: 012_superadmin_phase1
Revises: 011_vendor_module
Create Date: 2026-10-02
"""

from alembic import op
import sqlalchemy as sa


revision = "012_superadmin_phase1"
down_revision = "011_vendor_module"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add is_platform_admin to users table
    op.add_column(
        "users",
        sa.Column("is_platform_admin", sa.Boolean(), nullable=False, server_default="false"),
    )

    # 2. Add status, created_via, suspended_at, suspended_reason to tenants table
    op.add_column(
        "tenants",
        sa.Column("status", sa.String(50), nullable=False, server_default="Active"),
    )
    op.add_column(
        "tenants",
        sa.Column("created_via", sa.String(50), nullable=False, server_default="SELF_SIGNUP"),
    )
    op.add_column(
        "tenants",
        sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "tenants",
        sa.Column("suspended_reason", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tenants", "suspended_reason")
    op.drop_column("tenants", "suspended_at")
    op.drop_column("tenants", "created_via")
    op.drop_column("tenants", "status")
    op.drop_column("users", "is_platform_admin")
