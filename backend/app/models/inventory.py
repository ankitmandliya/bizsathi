from typing import TYPE_CHECKING
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.domain import User
    from app.models.vendors import Vendor


class ProductCategory(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "product_categories"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("ix_product_categories_tenant_name", "tenant_id", "name", unique=True),
        Index("ix_product_categories_tenant_active", "tenant_id", "is_active"),
    )


class Unit(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "units"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("ix_units_tenant_name", "tenant_id", "name", unique=True),
        Index("ix_units_tenant_active", "tenant_id", "is_active"),
    )


class Product(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    category_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("product_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    unit_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("units.id", ondelete="RESTRICT"),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    selling_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    minimum_stock: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    category: Mapped["ProductCategory | None"] = relationship("ProductCategory", lazy="joined")
    unit: Mapped["Unit"] = relationship("Unit", lazy="joined")

    __table_args__ = (
        Index("ix_products_tenant_sku", "tenant_id", "sku", unique=True),
        Index("ix_products_tenant_active", "tenant_id", "is_active"),
        Index("ix_products_tenant_category", "tenant_id", "category_id"),
    )


class StockMovement(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "stock_movements"

    product_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)  # OPENING, IN, OUT, ADJUSTMENT
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    movement_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    vendor_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    product: Mapped["Product"] = relationship("Product", lazy="joined")
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by_id], lazy="joined")
    vendor: Mapped["Vendor | None"] = relationship("Vendor", foreign_keys=[vendor_id], lazy="joined")

    __table_args__ = (
        Index("ix_stock_movements_tenant_product", "tenant_id", "product_id"),
        Index("ix_stock_movements_tenant_date", "tenant_id", "movement_date"),
        Index("ix_stock_movements_tenant_ref", "tenant_id", "reference_type", "reference_id"),
        Index("ix_stock_movements_tenant_vendor", "tenant_id", "vendor_id"),
    )
