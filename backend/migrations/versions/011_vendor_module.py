"""Create Vendor Module table and add vendor_id to stock_movements

Revision ID: 011_vendor_module
Revises: 010_inventory_module
Create Date: 2026-09-30
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "011_vendor_module"
down_revision = "010_inventory_module"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create vendors table
    op.create_table(
        "vendors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("contact_person", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=False, index=True),
        sa.Column("email", sa.String(255), nullable=True, index=True),
        sa.Column("vendor_type", sa.String(50), nullable=False, server_default="Business"),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("billing_address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("pincode", sa.String(20), nullable=True),
        sa.Column("gstin", sa.String(50), nullable=True),
        sa.Column("pan", sa.String(50), nullable=True),
        sa.Column("payment_terms", sa.String(255), nullable=True),
        sa.Column("opening_balance", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("opening_balance_type", sa.String(50), nullable=False, server_default="Payable"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_vendors_tenant_phone", "vendors", ["tenant_id", "phone"])
    op.create_index("ix_vendors_tenant_name", "vendors", ["tenant_id", "name"])
    op.create_index("ix_vendors_tenant_deleted", "vendors", ["tenant_id", "deleted_at"])

    # 2. Add vendor_id FK column to stock_movements table
    op.add_column(
        "stock_movements",
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_stock_movements_tenant_vendor", "stock_movements", ["tenant_id", "vendor_id"])


def downgrade() -> None:
    op.drop_index("ix_stock_movements_tenant_vendor", table_name="stock_movements")
    op.drop_column("stock_movements", "vendor_id")

    op.drop_index("ix_vendors_tenant_deleted", table_name="vendors")
    op.drop_index("ix_vendors_tenant_name", table_name="vendors")
    op.drop_index("ix_vendors_tenant_phone", table_name="vendors")
    op.drop_table("vendors")
