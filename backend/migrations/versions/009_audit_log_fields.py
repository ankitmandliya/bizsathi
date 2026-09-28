"""Extend AuditLog with actor_name, entity_label, changes, user_agent and performance indexes

Revision ID: 009_audit_log_fields
Revises: 008_expense_module
Create Date: 2026-09-29
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "009_audit_log_fields"
down_revision = "008_expense_module"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("actor_name", sa.String(255), nullable=True))
    op.add_column("audit_logs", sa.Column("entity_label", sa.String(255), nullable=True))
    op.add_column("audit_logs", sa.Column("changes", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("audit_logs", sa.Column("user_agent", sa.String(512), nullable=True))

    op.create_index("ix_audit_logs_tenant_created", "audit_logs", ["tenant_id", "created_at"])
    op.create_index("ix_audit_logs_tenant_entity_created", "audit_logs", ["tenant_id", "entity_type", "entity_id", "created_at"])
    op.create_index("ix_audit_logs_tenant_user_created", "audit_logs", ["tenant_id", "user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_tenant_user_created", table_name="audit_logs")
    op.drop_index("ix_audit_logs_tenant_entity_created", table_name="audit_logs")
    op.drop_index("ix_audit_logs_tenant_created", table_name="audit_logs")

    op.drop_column("audit_logs", "user_agent")
    op.drop_column("audit_logs", "changes")
    op.drop_column("audit_logs", "entity_label")
    op.drop_column("audit_logs", "actor_name")
