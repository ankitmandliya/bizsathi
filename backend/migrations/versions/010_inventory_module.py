"""Create Inventory Module tables and add product_id to invoice_items

Revision ID: 010_inventory_module
Revises: 009_audit_log_fields
Create Date: 2026-09-29
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "010_inventory_module"
down_revision = "009_audit_log_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create product_categories table
    op.create_table(
        "product_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_product_categories_tenant_name", "product_categories", ["tenant_id", "name"], unique=True)
    op.create_index("ix_product_categories_tenant_active", "product_categories", ["tenant_id", "is_active"])

    # 2. Create units table
    op.create_table(
        "units",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("short_name", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_units_tenant_name", "units", ["tenant_id", "name"], unique=True)
    op.create_index("ix_units_tenant_active", "units", ["tenant_id", "is_active"])

    # 3. Create products table
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sku", sa.String(100), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("unit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("units.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("purchase_price", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("selling_price", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("minimum_stock", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_products_tenant_sku", "products", ["tenant_id", "sku"], unique=True)
    op.create_index("ix_products_tenant_active", "products", ["tenant_id", "is_active"])
    op.create_index("ix_products_tenant_category", "products", ["tenant_id", "category_id"])

    # 4. Create stock_movements table
    op.create_table(
        "stock_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("movement_type", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit_cost", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("total_cost", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("reference_id", sa.String(255), nullable=True),
        sa.Column("movement_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_stock_movements_tenant_product", "stock_movements", ["tenant_id", "product_id"])
    op.create_index("ix_stock_movements_tenant_date", "stock_movements", ["tenant_id", "movement_date"])
    op.create_index("ix_stock_movements_tenant_ref", "stock_movements", ["tenant_id", "reference_type", "reference_id"])

    # 5. Add optional product_id to invoice_items and quotation_items
    op.add_column("invoice_items", sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True))
    op.add_column("quotation_items", sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True))


def downgrade() -> None:
    op.drop_column("quotation_items", "product_id")
    op.drop_column("invoice_items", "product_id")
    op.drop_table("stock_movements")
    op.drop_table("products")
    op.drop_table("units")
    op.drop_table("product_categories")

