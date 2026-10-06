from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm import Customer
from app.models.domain import Plan, Subscription, Tenant, TenantMember
from app.models.hrm import Employee
from app.models.sales import Invoice


class UsageService:
    @staticmethod
    async def get_tenant_user_ids(db: AsyncSession, tenant_id: UUID) -> set[UUID]:
        """Calculates active login-capable user IDs for a tenant.

        Combines active TenantMembers and linked Employee user_ids,
        deduplicated.
        """
        # Active TenantMembers
        tm_stmt = select(TenantMember.user_id).where(
            TenantMember.tenant_id == tenant_id,
            TenantMember.status == "active",
            TenantMember.user_id.is_not(None),
        )
        tm_res = await db.execute(tm_stmt)
        tm_user_ids = {u for u in tm_res.scalars().all() if u is not None}

        # Employees with user_id linked
        emp_stmt = select(Employee.user_id).where(
            Employee.tenant_id == tenant_id,
            Employee.user_id.is_not(None),
        )
        emp_res = await db.execute(emp_stmt)
        emp_user_ids = {u for u in emp_res.scalars().all() if u is not None}

        return tm_user_ids | emp_user_ids

    @staticmethod
    async def get_tenant_plan_and_sub(
        db: AsyncSession, tenant_id: UUID
    ) -> tuple[Plan | None, Subscription | None]:
        sub_stmt = (
            select(Subscription, Plan)
            .join(Plan, Plan.id == Subscription.plan_id)
            .where(Subscription.tenant_id == tenant_id)
            .order_by(Subscription.created_at.desc())
        )
        sub_res = await db.execute(sub_stmt)
        row = sub_res.first()
        if row:
            return row[1], row[0]

        # Default fallback to first plan if no explicit subscription
        plan_stmt = select(Plan).order_by(Plan.created_at.asc())
        plan_res = await db.execute(plan_stmt)
        first_plan = plan_res.scalars().first()
        return first_plan, None

    @classmethod
    async def get_tenant_usage_metrics(
        cls, db: AsyncSession, tenant_id: UUID
    ) -> dict[str, dict[str, int | None]]:
        # 1. Users
        user_ids = await cls.get_tenant_user_ids(db, tenant_id)
        user_count = len(user_ids)

        # 2. Customers
        cust_stmt = select(func.count(Customer.id)).where(
            Customer.tenant_id == tenant_id
        )
        cust_res = await db.execute(cust_stmt)
        customer_count = cust_res.scalar() or 0

        # 3. Employees
        emp_stmt = select(func.count(Employee.id)).where(
            Employee.tenant_id == tenant_id
        )
        emp_res = await db.execute(emp_stmt)
        employee_count = emp_res.scalar() or 0

        # 4. Invoices this month
        now = datetime.now(UTC)
        month_start = datetime(now.year, now.month, 1, 0, 0, 0, tzinfo=UTC)
        inv_stmt = select(func.count(Invoice.id)).where(
            Invoice.tenant_id == tenant_id, Invoice.created_at >= month_start
        )
        inv_res = await db.execute(inv_stmt)
        invoices_this_month = inv_res.scalar() or 0

        # Plan limit
        plan, _ = await cls.get_tenant_plan_and_sub(db, tenant_id)
        user_limit = plan.user_limit if plan else None

        return {
            "users": {"used": user_count, "limit": user_limit},
            "customers": {"used": customer_count, "limit": None},
            "employees": {"used": employee_count, "limit": None},
            "invoices_this_month": {
                "used": invoices_this_month,
                "limit": None,
            },
        }

    @classmethod
    async def check_tenant_user_limit(
        cls, db: AsyncSession, tenant_id: UUID, target_user_id: UUID | None = None
    ) -> None:
        """Shared enforcement check.

        Blocks action if user_count >= Plan.user_limit.
        If target_user_id is already an active member/user of the tenant, allow it.
        """
        plan, _ = await cls.get_tenant_plan_and_sub(db, tenant_id)
        if not plan or plan.user_limit is None:
            return  # Unlimited plan (e.g. Growth or Legacy)

        user_ids = await cls.get_tenant_user_ids(db, tenant_id)
        if target_user_id and target_user_id in user_ids:
            return  # Already has access

        user_count = len(user_ids)

        if user_count >= plan.user_limit:
            plan_name = plan.name or "Current"
            limit = plan.user_limit
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Your {plan_name} plan includes up to {limit} users —"
                    f" you're at {user_count}/{limit}. Upgrade to Growth for"
                    " unlimited users."
                ),
            )

    @classmethod
    async def get_all_tenants_usage(
        cls,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        sort_by: str = "user_count",
    ) -> dict[str, Any]:
        """Platform-facing paginated list of all tenants' usage metrics."""
        query = select(Tenant)

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query = query.where(
                func.lower(Tenant.name).like(term)
                | func.lower(Tenant.slug).like(term)
            )

        total_stmt = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(total_stmt)
        total = total_res.scalar() or 0

        # Execute base list query
        tenants_res = await db.execute(query.order_by(Tenant.created_at.desc()))
        tenants = tenants_res.scalars().all()

        now = datetime.now(UTC)
        month_start = datetime(now.year, now.month, 1, 0, 0, 0, tzinfo=UTC)

        items = []
        for t in tenants:
            user_ids = await cls.get_tenant_user_ids(db, t.id)
            user_count = len(user_ids)

            cust_res = await db.execute(
                select(func.count(Customer.id)).where(Customer.tenant_id == t.id)
            )
            customer_count = cust_res.scalar() or 0

            emp_res = await db.execute(
                select(func.count(Employee.id)).where(Employee.tenant_id == t.id)
            )
            employee_count = emp_res.scalar() or 0

            inv_res = await db.execute(
                select(func.count(Invoice.id)).where(
                    Invoice.tenant_id == t.id, Invoice.created_at >= month_start
                )
            )
            invoices_this_month = inv_res.scalar() or 0

            plan, sub = await cls.get_tenant_plan_and_sub(db, t.id)

            items.append(
                {
                    "tenant_id": str(t.id),
                    "business_name": t.name,
                    "slug": t.slug,
                    "plan_name": plan.name if plan else "Growth",
                    "plan_slug": plan.slug if plan else "growth",
                    "user_count": user_count,
                    "user_limit": plan.user_limit if plan else None,
                    "customer_count": customer_count,
                    "employee_count": employee_count,
                    "invoices_this_month": invoices_this_month,
                    "status": getattr(t, "status", "Active"),
                    "subscription_status": sub.status if sub else "ACTIVE",
                }
            )

        # In-memory sort by sort_by
        if sort_by in (
            "user_count",
            "customer_count",
            "employee_count",
            "invoices_this_month",
        ):
            items.sort(key=lambda x: int(str(x.get(sort_by) or 0)), reverse=True)

        # Pagination slice
        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = items[start:end]

        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1

        return {
            "items": paginated_items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
