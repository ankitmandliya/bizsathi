"""Add email_deliveries table for email tracking and setup invitations

Revision ID: 014_email_deliveries
Revises: 013_superadmin_phase2
Create Date: 2026-10-05
"""

from uuid import uuid4
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "014_email_deliveries"
down_revision = "013_superadmin_phase2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("recipient_email", sa.String(255), nullable=False),
        sa.Column("email_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("provider", sa.String(50), nullable=False, server_default="SMTP"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_email_deliveries_recipient_email", "email_deliveries", ["recipient_email"])
    op.create_index("ix_email_deliveries_tenant_id", "email_deliveries", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_email_deliveries_tenant_id", table_name="email_deliveries")
    op.drop_index("ix_email_deliveries_recipient_email", table_name="email_deliveries")
    op.drop_table("email_deliveries")
