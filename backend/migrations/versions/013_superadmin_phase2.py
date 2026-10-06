"""Super Admin Phase 2: Plans, Subscriptions, Billing, Modules & Coupons

Revision ID: 013_superadmin_phase2
Revises: 012_superadmin_phase1
Create Date: 2026-10-03
"""

from datetime import datetime, UTC
from uuid import uuid4
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "013_superadmin_phase2"
down_revision = "012_superadmin_phase1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create modules table
    op.create_table(
        "modules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column("key", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_modules_key", "modules", ["key"])

    # Seed canonical modules
    conn = op.get_bind()
    modules_data = [
        {"id": uuid4(), "key": "crm", "name": "CRM", "description": "Leads, Deals & Pipelines"},
        {"id": uuid4(), "key": "customers", "name": "Customers", "description": "Customer Directory & Credit Management"},
        {"id": uuid4(), "key": "vendors", "name": "Vendors", "description": "Vendor Management"},
        {"id": uuid4(), "key": "sales", "name": "Sales", "description": "Invoices & Quotations"},
        {"id": uuid4(), "key": "inventory", "name": "Inventory", "description": "Products, Stock In/Out & Adjustments"},
        {"id": uuid4(), "key": "hrm", "name": "HRM", "description": "Employees, Attendance, Leave & Payroll"},
        {"id": uuid4(), "key": "expenses", "name": "Expenses", "description": "Expense Tracking & Categories"},
        {"id": uuid4(), "key": "marketing", "name": "Marketing", "description": "WhatsApp & Email Campaigns"},
        {"id": uuid4(), "key": "reports", "name": "Reports", "description": "Analytics & Business Reports"},
    ]
    module_id_map = {}
    for mod in modules_data:
        conn.execute(
            sa.text(
                "INSERT INTO modules (id, key, name, description, is_active, created_at, updated_at) "
                "VALUES (:id, :key, :name, :description, true, NOW(), NOW())"
            ),
            mod
        )
        module_id_map[mod["key"]] = mod["id"]

    # 2. Alter plans table
    op.add_column("plans", sa.Column("slug", sa.String(100), nullable=True))
    op.add_column("plans", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("plans", sa.Column("price_monthly", sa.Numeric(10, 2), nullable=False, server_default="0.00"))
    op.add_column("plans", sa.Column("price_yearly", sa.Numeric(10, 2), nullable=False, server_default="0.00"))
    op.add_column("plans", sa.Column("user_limit", sa.Integer(), nullable=True))
    op.add_column("plans", sa.Column("trial_days", sa.Integer(), nullable=False, server_default="14"))
    op.add_column("plans", sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("plans", sa.Column("is_public", sa.Boolean(), nullable=False, server_default="true"))

    op.alter_column("plans", "code", existing_type=sa.String(50), nullable=True)

    # Seed default plans
    plans_data = [
        {
            "id": uuid4(),
            "name": "Starter",
            "slug": "starter",
            "code": "starter",
            "description": "Essential tools for small teams",
            "price_monthly": 599.00,
            "price_yearly": 5990.00,
            "user_limit": 2,
            "trial_days": 14,
            "is_active": True,
            "is_public": True,
            "modules": ["crm", "customers", "sales"],
        },
        {
            "id": uuid4(),
            "name": "Business",
            "slug": "business",
            "code": "business",
            "description": "Complete suite for growing businesses",
            "price_monthly": 1299.00,
            "price_yearly": 12990.00,
            "user_limit": 10,
            "trial_days": 14,
            "is_active": True,
            "is_public": True,
            "modules": ["crm", "customers", "sales", "inventory", "hrm", "vendors", "expenses"],
        },
        {
            "id": uuid4(),
            "name": "Growth",
            "slug": "growth",
            "code": "growth",
            "description": "Unlimited power & marketing automation",
            "price_monthly": 2999.00,
            "price_yearly": 29990.00,
            "user_limit": None,
            "trial_days": 14,
            "is_active": True,
            "is_public": True,
            "modules": ["crm", "customers", "vendors", "sales", "inventory", "hrm", "expenses", "marketing", "reports"],
        },
        {
            "id": uuid4(),
            "name": "Legacy",
            "slug": "legacy",
            "code": "legacy",
            "description": "Full access plan for existing pre-Phase 2 tenants",
            "price_monthly": 0.00,
            "price_yearly": 0.00,
            "user_limit": None,
            "trial_days": 0,
            "is_active": True,
            "is_public": False,
            "modules": ["crm", "customers", "vendors", "sales", "inventory", "hrm", "expenses", "marketing", "reports"],
        },
    ]

    plan_id_map = {}
    for p in plans_data:
        conn.execute(
            sa.text(
                "INSERT INTO plans (id, name, slug, code, description, price_monthly, price_yearly, user_limit, trial_days, is_active, is_public, created_at, updated_at) "
                "VALUES (:id, :name, :slug, :code, :description, :price_monthly, :price_yearly, :user_limit, :trial_days, :is_active, :is_public, NOW(), NOW())"
            ),
            {k: v for k, v in p.items() if k != "modules"}
        )
        plan_id_map[p["slug"]] = p["id"]

    op.alter_column("plans", "slug", existing_type=sa.String(100), nullable=False)
    op.create_index("ix_plans_slug", "plans", ["slug"], unique=True)

    # 3. Create plan_entitlements table
    op.create_table(
        "plan_entitlements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("module_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("included", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_plan_entitlements_plan_module", "plan_entitlements", ["plan_id", "module_id"], unique=True)

    # Seed entitlements
    for p in plans_data:
        p_id = plan_id_map[p["slug"]]
        included_keys = set(p["modules"])
        for mod_key, mod_id in module_id_map.items():
            inc = mod_key in included_keys
            conn.execute(
                sa.text(
                    "INSERT INTO plan_entitlements (id, plan_id, module_id, included, created_at, updated_at) "
                    "VALUES (:id, :plan_id, :module_id, :included, NOW(), NOW())"
                ),
                {"id": uuid4(), "plan_id": p_id, "module_id": mod_id, "included": inc}
            )

    # 4. Alter subscriptions table
    op.add_column("subscriptions", sa.Column("billing_cycle", sa.String(20), nullable=False, server_default="monthly"))
    op.add_column("subscriptions", sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("subscriptions", sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("subscriptions", sa.Column("pending_downgrade_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("plans.id"), nullable=True))

    op.alter_column("subscriptions", "current_period_start", existing_type=sa.DateTime(timezone=True), nullable=True)
    op.alter_column("subscriptions", "current_period_end", existing_type=sa.DateTime(timezone=True), nullable=True)

    # 5. BACKFILL EXISTING TENANTS (SECTION 2.4 - SAFETY CRITICAL)
    # Every existing tenant gets an ACTIVE subscription to the Legacy/Growth plan so NO tenant loses access!
    legacy_plan_id = plan_id_map["legacy"]
    tenants_result = conn.execute(sa.text("SELECT id FROM tenants"))
    existing_tenant_ids = [row[0] for row in tenants_result.fetchall()]

    for tid in existing_tenant_ids:
        # Check if subscription exists
        sub_res = conn.execute(sa.text("SELECT id FROM subscriptions WHERE tenant_id = :tid"), {"tid": tid})
        if not sub_res.fetchone():
            conn.execute(
                sa.text(
                    "INSERT INTO subscriptions (id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at) "
                    "VALUES (:id, :tenant_id, :plan_id, 'ACTIVE', 'yearly', NOW(), '2099-12-31 23:59:59+00', false, NOW(), NOW())"
                ),
                {"id": uuid4(), "tenant_id": tid, "plan_id": legacy_plan_id}
            )

    # 6. Create billing_payments table
    op.create_table(
        "billing_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="PENDING"),
        sa.Column("provider", sa.String(50), nullable=False, server_default="RAZORPAY"),
        sa.Column("provider_payment_id", sa.String(255), nullable=True),
        sa.Column("provider_order_id", sa.String(255), nullable=True),
        sa.Column("provider_signature", sa.String(512), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_billing_payments_tenant_id", "billing_payments", ["tenant_id"])
    op.create_index("ix_billing_payments_provider_payment", "billing_payments", ["provider_payment_id"])
    op.create_index("ix_billing_payments_provider_order", "billing_payments", ["provider_order_id"])

    # 7. Create billing_invoices table
    op.create_table(
        "billing_invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("billing_payments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("invoice_number", sa.String(100), nullable=False, unique=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("tax_rate_percent", sa.Numeric(5, 2), nullable=False, server_default="18.00"),
        sa.Column("total", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("status", sa.String(50), nullable=False, server_default="DRAFT"),
        sa.Column("pdf_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_billing_invoices_tenant_id", "billing_invoices", ["tenant_id"])
    op.create_index("ix_billing_invoices_number", "billing_invoices", ["invoice_number"])

    # 8. Create coupons table
    op.create_table(
        "coupons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("discount_type", sa.String(20), nullable=False, server_default="PERCENTAGE"),
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("used_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("applicable_plan_ids", postgresql.JSONB(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_coupons_code", "coupons", ["code"])

    # 9. Create coupon_redemptions table
    op.create_table(
        "coupon_redemptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column("coupon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_coupon_redemptions_tenant_coupon", "coupon_redemptions", ["tenant_id", "coupon_id"])


def downgrade() -> None:
    op.drop_table("coupon_redemptions")
    op.drop_table("coupons")
    op.drop_table("billing_invoices")
    op.drop_table("billing_payments")

    op.drop_column("subscriptions", "pending_downgrade_plan_id")
    op.drop_column("subscriptions", "cancel_at_period_end")
    op.drop_column("subscriptions", "trial_ends_at")
    op.drop_column("subscriptions", "billing_cycle")

    op.drop_table("plan_entitlements")

    op.drop_column("plans", "is_public")
    op.drop_column("plans", "is_active")
    op.drop_column("plans", "trial_days")
    op.drop_column("plans", "user_limit")
    op.drop_column("plans", "price_yearly")
    op.drop_column("plans", "price_monthly")
    op.drop_column("plans", "description")
    op.drop_column("plans", "slug")

    op.drop_table("modules")
