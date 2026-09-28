"""Add WhatsApp & Email Campaigns tables and Tenant communication settings

Revision ID: 007_whatsapp_email_campaigns
Revises: 006_add_customer_fields
Create Date: 2026-09-22
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "007_whatsapp_email_campaigns"
down_revision = "006_add_customer_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Extend tenants table
    op.add_column("tenants", sa.Column("logo_url", sa.String(512), nullable=True))
    op.add_column("tenants", sa.Column("whatsapp_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("tenants", sa.Column("whatsapp_business_number", sa.String(50), nullable=True))
    op.add_column("tenants", sa.Column("whatsapp_api_key", sa.String(255), nullable=True))
    op.add_column("tenants", sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("tenants", sa.Column("email_sender_name", sa.String(255), nullable=True))

    # 2. Create templates table
    op.create_table(
        "templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(50), nullable=False, server_default="Offer"),
        sa.Column("whatsapp_body", sa.Text(), nullable=True),
        sa.Column("whatsapp_status", sa.String(50), nullable=True),
        sa.Column("whatsapp_provider_template_id", sa.String(255), nullable=True),
        sa.Column("email_subject", sa.String(255), nullable=True),
        sa.Column("email_body", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # 3. Create campaigns table
    op.create_table(
        "campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("audience_filter", sa.String(50), nullable=False, server_default="ALL"),
        sa.Column("audience_filter_value", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="DRAFT"),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # 4. Create campaign_recipients table
    op.create_table(
        "campaign_recipients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("error_reason", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("campaign_recipients")
    op.drop_table("campaigns")
    op.drop_table("templates")
    op.drop_column("tenants", "email_sender_name")
    op.drop_column("tenants", "email_enabled")
    op.drop_column("tenants", "whatsapp_api_key")
    op.drop_column("tenants", "whatsapp_business_number")
    op.drop_column("tenants", "whatsapp_enabled")
    op.drop_column("tenants", "logo_url")
