from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Template(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "templates"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="Offer", nullable=False)  # Invoice, Sales, Stock, Offer

    whatsapp_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    whatsapp_status: Mapped[str | None] = mapped_column(String(50), nullable=True)  # DRAFT, PENDING_APPROVAL, APPROVED, REJECTED
    whatsapp_provider_template_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    email_subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_body: Mapped[str | None] = mapped_column(Text, nullable=True)


class Campaign(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "campaigns"

    template_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    template: Mapped["Template"] = relationship("Template")

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    audience_filter: Mapped[str] = mapped_column(String(50), default="ALL", nullable=False)  # ALL, CITY, CUSTOMER_TYPE
    audience_filter_value: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False)  # DRAFT, SCHEDULED, SENDING, SENT, FAILED_PARTIAL
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class CampaignRecipient(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "campaign_recipients"

    campaign_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), index=True, nullable=False)
    customer_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), index=True, nullable=False)

    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # WHATSAPP, EMAIL
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)  # PENDING, SENT, DELIVERED, FAILED
    error_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
