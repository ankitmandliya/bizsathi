"""CRM hardening indexes and lead conversion fields

Revision ID: 002_crm_hardening
Revises: 001_initial
Create Date: 2026-09-17 15:00:00.000000

"""
from collections.abc import Sequence

import alembic.op as op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002_crm_hardening"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add converted_at and converted_customer_id to leads
    op.add_column("leads", sa.Column("converted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "leads",
        sa.Column("converted_customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=True),
    )

    # 2. Add composite indexes on leads
    op.create_index("ix_leads_tenant_status", "leads", ["tenant_id", "status"])
    op.create_index("ix_leads_tenant_assigned_user", "leads", ["tenant_id", "assigned_user_id"])
    op.create_index("ix_leads_tenant_source", "leads", ["tenant_id", "source"])
    op.create_index("ix_leads_tenant_priority", "leads", ["tenant_id", "priority"])
    op.create_index("ix_leads_tenant_follow_up_date", "leads", ["tenant_id", "follow_up_date"])
    op.create_index("ix_leads_tenant_created_at", "leads", ["tenant_id", "created_at"])

    # 3. Add composite indexes on deals
    op.create_index("ix_deals_tenant_stage", "deals", ["tenant_id", "stage_id"])
    op.create_index("ix_deals_tenant_owner", "deals", ["tenant_id", "owner_id"])
    op.create_index("ix_deals_tenant_expected_closing", "deals", ["tenant_id", "expected_closing_date"])

    # 4. Add composite indexes on activities
    op.create_index("ix_activities_tenant_lead", "activities", ["tenant_id", "lead_id"])
    op.create_index("ix_activities_tenant_deal", "activities", ["tenant_id", "deal_id"])
    op.create_index("ix_activities_tenant_customer", "activities", ["tenant_id", "customer_id"])
    op.create_index("ix_activities_tenant_due_date", "activities", ["tenant_id", "due_date"])


def downgrade() -> None:
    # Drop activity indexes
    op.drop_index("ix_activities_tenant_due_date", table_name="activities")
    op.drop_index("ix_activities_tenant_customer", table_name="activities")
    op.drop_index("ix_activities_tenant_deal", table_name="activities")
    op.drop_index("ix_activities_tenant_lead", table_name="activities")

    # Drop deal indexes
    op.drop_index("ix_deals_tenant_expected_closing", table_name="deals")
    op.drop_index("ix_deals_tenant_owner", table_name="deals")
    op.drop_index("ix_deals_tenant_stage", table_name="deals")

    # Drop lead indexes
    op.drop_index("ix_leads_tenant_created_at", table_name="leads")
    op.drop_index("ix_leads_tenant_follow_up_date", table_name="leads")
    op.drop_index("ix_leads_tenant_priority", table_name="leads")
    op.drop_index("ix_leads_tenant_source", table_name="leads")
    op.drop_index("ix_leads_tenant_assigned_user", table_name="leads")
    op.drop_index("ix_leads_tenant_status", table_name="leads")

    # Drop columns
    op.drop_column("leads", "converted_customer_id")
    op.drop_column("leads", "converted_at")
