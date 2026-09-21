from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Lead(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "leads"
    __table_args__ = (
        Index("ix_leads_tenant_status", "tenant_id", "status"),
        Index("ix_leads_tenant_assigned_user", "tenant_id", "assigned_user_id"),
        Index("ix_leads_tenant_source", "tenant_id", "source"),
        Index("ix_leads_tenant_priority", "tenant_id", "priority"),
        Index("ix_leads_tenant_follow_up_date", "tenant_id", "follow_up_date"),
        Index("ix_leads_tenant_created_at", "tenant_id", "created_at"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(50), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)

    source: Mapped[str] = mapped_column(String(100), default="Website", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="New", index=True, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estimated_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    assigned_user_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    follow_up_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    lost_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    converted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    converted_customer_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)

    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PipelineStage(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "pipeline_stages"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    probability: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    is_won: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_lost: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Deal(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "deals"
    __table_args__ = (
        Index("ix_deals_tenant_stage", "tenant_id", "stage_id"),
        Index("ix_deals_tenant_owner", "tenant_id", "owner_id"),
        Index("ix_deals_tenant_expected_closing", "tenant_id", "expected_closing_date"),
    )

    lead_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("leads.id"), nullable=True)
    customer_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)

    stage_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("pipeline_stages.id"), nullable=False)
    stage: Mapped["PipelineStage"] = relationship("PipelineStage")
    probability: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expected_closing_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_closing_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    won_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    lost_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Activity(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "activities"
    __table_args__ = (
        Index("ix_activities_tenant_lead", "tenant_id", "lead_id"),
        Index("ix_activities_tenant_deal", "tenant_id", "deal_id"),
        Index("ix_activities_tenant_customer", "tenant_id", "customer_id"),
        Index("ix_activities_tenant_due_date", "tenant_id", "due_date"),
    )

    type: Mapped[str] = mapped_column(String(50), default="Note", nullable=False)  # Call, Meeting, Email, WhatsApp, Note, Task
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False)

    assigned_user_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    lead_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("leads.id"), nullable=True)
    deal_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    customer_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)


class Customer(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(50), nullable=True)

    customer_type: Mapped[str] = mapped_column(String(50), default="Individual", nullable=False)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pan: Mapped[str | None] = mapped_column(String(20), nullable=True)

    opening_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    opening_balance_type: Mapped[str] = mapped_column(String(20), default="Debit", nullable=False)
    credit_limit: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    converted_from_lead_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("leads.id"), nullable=True)
    assigned_user_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    gstin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    billing_address: Mapped[str | None] = mapped_column(Text, nullable=True)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
