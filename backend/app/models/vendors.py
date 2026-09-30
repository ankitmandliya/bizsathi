from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Vendor(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "vendors"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    vendor_type: Mapped[str] = mapped_column(String(50), default="Business", nullable=False)  # Individual / Business
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pan: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(255), nullable=True)
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    opening_balance_type: Mapped[str] = mapped_column(String(50), default="Payable", nullable=False)  # Payable / Advance
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_vendors_tenant_phone", "tenant_id", "phone"),
        Index("ix_vendors_tenant_name", "tenant_id", "name"),
        Index("ix_vendors_tenant_deleted", "tenant_id", "deleted_at"),
    )
