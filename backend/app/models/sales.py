from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class SalesSequence(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "sales_sequences"
    __table_args__ = (
        Index("ix_sales_sequences_tenant_entity", "tenant_id", "entity_type", unique=True),
    )

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # invoice, quotation, payment
    last_number: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Quotation(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "quotations"
    __table_args__ = (
        Index("ix_quotations_tenant_customer", "tenant_id", "customer_id"),
        Index("ix_quotations_tenant_status", "tenant_id", "status"),
        Index("ix_quotations_tenant_number", "tenant_id", "quotation_number", unique=True),
    )

    customer_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    quotation_number: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Draft", nullable=False)  # Draft, Sent, Accepted, Rejected, Expired
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["QuotationItem"]] = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")


class QuotationItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "quotation_items"

    quotation_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("quotations.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), default=1.00, nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    tax_rate_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="items")


class Invoice(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "invoices"
    __table_args__ = (
        Index("ix_invoices_tenant_customer", "tenant_id", "customer_id"),
        Index("ix_invoices_tenant_status", "tenant_id", "status"),
        Index("ix_invoices_tenant_number", "tenant_id", "invoice_number", unique=True),
        Index("ix_invoices_tenant_due_date", "tenant_id", "due_date"),
    )

    customer_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    quotation_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("quotations.id"), nullable=True)
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Draft", nullable=False)  # Draft, Sent, Paid, Partially Paid, Overdue, Cancelled
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    amount_paid: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    amount_due: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["InvoiceItem"]] = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="invoice")


class InvoiceItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "invoice_items"

    invoice_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), default=1.00, nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    tax_rate_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")


class Payment(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_tenant_invoice", "tenant_id", "invoice_id"),
        Index("ix_payments_tenant_customer", "tenant_id", "customer_id"),
        Index("ix_payments_tenant_receipt", "tenant_id", "receipt_number", unique=True),
    )

    invoice_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    customer_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(50), default="UPI", nullable=False)  # Cash, Bank Transfer, UPI, Cheque, Other
    receipt_number: Mapped[str] = mapped_column(String(100), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="payments")
