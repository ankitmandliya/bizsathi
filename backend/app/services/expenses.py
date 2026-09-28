from datetime import date
from decimal import Decimal
from math import ceil
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import User
from app.models.expenses import Expense, ExpenseCategory
from app.services.audit import compute_changes, log_audit_event
from app.schemas.expenses import (
    CategoryBreakdownItem,
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseSummaryResponse,
    ExpenseUpdate,
)

DEFAULT_CATEGORIES = [
    ("Office Rent", "Monthly lease or rent payments for office space"),
    ("Electricity", "Electricity and utility bills"),
    ("Internet", "Broadband, WiFi, and telecom services"),
    ("Travel", "Business travel, flights, trains, lodging"),
    ("Food", "Team lunches, meals, snacks, beverages"),
    ("Office Supplies", "Stationery, paper, printer ink, desk accessories"),
    ("Software & Subscriptions", "SaaS tools, software licenses, domain hosting"),
    ("Marketing", "Advertising, campaigns, promotional materials"),
    ("Transportation", "Local cab, fuel, parking, logistics"),
    ("Maintenance", "Repairs, cleaning, office maintenance"),
    ("Other", "Miscellaneous office operational expenses"),
]

ALLOWED_PAYMENT_METHODS = {"CASH", "BANK", "UPI", "CARD", "OTHER"}


class ExpenseService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def seed_default_categories(self, tenant_id: UUID) -> list[ExpenseCategory]:
        categories = []
        for name, desc in DEFAULT_CATEGORIES:
            cat = ExpenseCategory(
                tenant_id=tenant_id,
                name=name,
                description=desc,
                is_active=True,
            )
            self.db.add(cat)
            categories.append(cat)
        await self.db.flush()
        return categories

    async def list_categories(self, tenant_id: UUID, include_inactive: bool = True) -> list[ExpenseCategory]:
        stmt = select(ExpenseCategory).where(ExpenseCategory.tenant_id == tenant_id)
        if not include_inactive:
            stmt = stmt.where(ExpenseCategory.is_active.is_(True))
        stmt = stmt.order_by(ExpenseCategory.name.asc())
        res = await self.db.execute(stmt)
        categories = list(res.scalars().all())

        if not categories:
            categories = await self.seed_default_categories(tenant_id)
            await self.db.commit()

        return categories

    async def get_category(self, tenant_id: UUID, category_id: UUID) -> ExpenseCategory | None:
        stmt = select(ExpenseCategory).where(
            ExpenseCategory.tenant_id == tenant_id,
            ExpenseCategory.id == category_id,
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_category(
        self,
        tenant_id: UUID,
        category_in: ExpenseCategoryCreate,
        user_id: UUID | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ExpenseCategory:
        # Check duplicate name within tenant
        name_check = select(ExpenseCategory).where(
            ExpenseCategory.tenant_id == tenant_id,
            func.lower(ExpenseCategory.name) == category_in.name.lower(),
        )
        existing = (await self.db.execute(name_check)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with name '{category_in.name}' already exists",
            )

        category = ExpenseCategory(
            tenant_id=tenant_id,
            name=category_in.name,
            description=category_in.description,
            is_active=True,
        )
        self.db.add(category)
        await self.db.flush()

        tracked = ["name", "description", "is_active"]
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="expense.category.create",
            entity_type="ExpenseCategory",
            entity_id=str(category.id),
            entity_label=category.name,
            changes=compute_changes(None, category, tracked),
            details={"name": category.name},
            ip_address=ip_address,
            user_agent=user_agent,
            commit=False,
        )
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def update_category(
        self,
        tenant_id: UUID,
        category_id: UUID,
        category_in: ExpenseCategoryUpdate,
        user_id: UUID | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ExpenseCategory:
        category = await self.get_category(tenant_id, category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        tracked = ["name", "description", "is_active"]
        before_dict = {f: getattr(category, f, None) for f in tracked}

        if category_in.name is not None and category_in.name.lower() != category.name.lower():
            name_check = select(ExpenseCategory).where(
                ExpenseCategory.tenant_id == tenant_id,
                func.lower(ExpenseCategory.name) == category_in.name.lower(),
                ExpenseCategory.id != category_id,
            )
            existing = (await self.db.execute(name_check)).scalar_one_or_none()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category with name '{category_in.name}' already exists",
                )
            category.name = category_in.name

        if category_in.description is not None:
            category.description = category_in.description
        if category_in.is_active is not None:
            category.is_active = category_in.is_active

        changes = compute_changes(before_dict, category, tracked)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="expense.category.update",
            entity_type="ExpenseCategory",
            entity_id=str(category.id),
            entity_label=category.name,
            changes=changes,
            details={"name": category.name, "is_active": category.is_active},
            ip_address=ip_address,
            user_agent=user_agent,
            commit=False,
        )
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete_category(
        self,
        tenant_id: UUID,
        category_id: UUID,
        user_id: UUID | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        category = await self.get_category(tenant_id, category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        exp_count_stmt = select(func.count(Expense.id)).where(
            Expense.tenant_id == tenant_id,
            Expense.category_id == category_id,
        )
        exp_count = (await self.db.execute(exp_count_stmt)).scalar() or 0

        if exp_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This category cannot be deleted because it has existing expense records associated with it.",
            )

        await self.db.delete(category)
        audit_action = "expense.category.delete"

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action=audit_action,
            entity_type="ExpenseCategory",
            entity_id=str(category_id),
            entity_label=category.name,
            details={"name": category.name},
            ip_address=ip_address,
            user_agent=user_agent,
            commit=False,
        )
        await self.db.commit()

    # --- Expenses ---

    async def create_expense(
        self,
        tenant_id: UUID,
        user_id: UUID | None,
        expense_in: ExpenseCreate,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Expense:
        category = await self.get_category(tenant_id, expense_in.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected category does not exist in this tenant",
            )
        if not category.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected category is inactive and cannot be used for new expenses",
            )

        if expense_in.amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expense amount must be greater than 0",
            )

        payment_method = expense_in.payment_method.upper()
        if payment_method not in ALLOWED_PAYMENT_METHODS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid payment method. Must be one of {sorted(ALLOWED_PAYMENT_METHODS)}",
            )

        expense = Expense(
            tenant_id=tenant_id,
            category_id=expense_in.category_id,
            title=expense_in.title,
            description=expense_in.description,
            amount=expense_in.amount,
            expense_date=expense_in.expense_date,
            payment_method=payment_method,
            vendor_name=expense_in.vendor_name,
            reference_number=expense_in.reference_number,
            receipt_url=expense_in.receipt_url,
            created_by_id=user_id,
            updated_by_id=user_id,
        )
        self.db.add(expense)
        await self.db.flush()

        tracked = ["title", "amount", "expense_date", "payment_method", "vendor_name", "reference_number", "category_id"]
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="expense.create",
            entity_type="Expense",
            entity_id=str(expense.id),
            entity_label=expense.title,
            changes=compute_changes(None, expense, tracked),
            details={"title": expense.title, "amount": str(expense.amount)},
            ip_address=ip_address,
            user_agent=user_agent,
            commit=False,
        )
        await self.db.commit()

        return await self.get_expense(tenant_id, expense.id)  # type: ignore[return-value]

    async def get_expense(self, tenant_id: UUID, expense_id: UUID) -> Expense | None:
        stmt = select(Expense).where(
            Expense.tenant_id == tenant_id,
            Expense.id == expense_id,
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def update_expense(
        self,
        tenant_id: UUID,
        user_id: UUID | None,
        expense_id: UUID,
        expense_in: ExpenseUpdate,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Expense:
        expense = await self.get_expense(tenant_id, expense_id)
        if not expense:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

        tracked = ["title", "amount", "expense_date", "payment_method", "vendor_name", "reference_number", "category_id", "description"]
        before_dict = {f: getattr(expense, f, None) for f in tracked}

        if expense_in.category_id is not None:
            category = await self.get_category(tenant_id, expense_in.category_id)
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Selected category does not exist in this tenant",
                )
            expense.category_id = expense_in.category_id

        if expense_in.title is not None:
            expense.title = expense_in.title
        if expense_in.description is not None:
            expense.description = expense_in.description
        if expense_in.amount is not None:
            if expense_in.amount <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Expense amount must be greater than 0",
                )
            expense.amount = expense_in.amount
        if expense_in.expense_date is not None:
            expense.expense_date = expense_in.expense_date
        if expense_in.payment_method is not None:
            pm = expense_in.payment_method.upper()
            if pm not in ALLOWED_PAYMENT_METHODS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid payment method. Must be one of {sorted(ALLOWED_PAYMENT_METHODS)}",
                )
            expense.payment_method = pm
        if expense_in.vendor_name is not None:
            expense.vendor_name = expense_in.vendor_name
        if expense_in.reference_number is not None:
            expense.reference_number = expense_in.reference_number
        if expense_in.receipt_url is not None:
            expense.receipt_url = expense_in.receipt_url

        expense.updated_by_id = user_id
        update_data = expense_in.model_dump(exclude_unset=True)
        changes = compute_changes(before_dict, expense, list(update_data.keys()))

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="expense.update",
            entity_type="Expense",
            entity_id=str(expense.id),
            entity_label=expense.title,
            changes=changes,
            details={"title": expense.title, "amount": str(expense.amount)},
            ip_address=ip_address,
            user_agent=user_agent,
            commit=False,
        )
        await self.db.commit()

        return await self.get_expense(tenant_id, expense.id)  # type: ignore[return-value]

    async def delete_expense(
        self,
        tenant_id: UUID,
        user_id: UUID | None,
        expense_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        expense = await self.get_expense(tenant_id, expense_id)
        if not expense:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

        title = expense.title
        await self.db.delete(expense)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="expense.delete",
            entity_type="Expense",
            entity_id=str(expense_id),
            entity_label=title,
            details={"title": title},
            ip_address=ip_address,
            user_agent=user_agent,
            commit=False,
        )
        await self.db.commit()

    async def list_expenses(
        self,
        tenant_id: UUID,
        from_date: date | None = None,
        to_date: date | None = None,
        category_id: UUID | None = None,
        payment_method: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Expense], int]:
        stmt = select(Expense).where(Expense.tenant_id == tenant_id)

        if from_date:
            stmt = stmt.where(Expense.expense_date >= from_date)
        if to_date:
            stmt = stmt.where(Expense.expense_date <= to_date)
        if category_id:
            stmt = stmt.where(Expense.category_id == category_id)
        if payment_method:
            stmt = stmt.where(Expense.payment_method == payment_method.upper())
        if search and search.strip():
            pattern = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                func.lower(Expense.title).like(pattern)
                | func.lower(Expense.vendor_name).like(pattern)
                | func.lower(Expense.reference_number).like(pattern)
                | func.lower(Expense.description).like(pattern)
            )

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Sort and paginate
        stmt = stmt.order_by(Expense.expense_date.desc(), Expense.created_at.desc())
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        res = await self.db.execute(stmt)
        items = list(res.scalars().all())
        return items, total

    async def get_summary(
        self,
        tenant_id: UUID,
        from_date: date | None = None,
        to_date: date | None = None,
        category_id: UUID | None = None,
        payment_method: str | None = None,
        search: str | None = None,
    ) -> ExpenseSummaryResponse:
        # Base filter conditions
        conditions = [Expense.tenant_id == tenant_id]
        if from_date:
            conditions.append(Expense.expense_date >= from_date)
        if to_date:
            conditions.append(Expense.expense_date <= to_date)
        if category_id:
            conditions.append(Expense.category_id == category_id)
        if payment_method:
            conditions.append(Expense.payment_method == payment_method.upper())
        if search and search.strip():
            pattern = f"%{search.strip().lower()}%"
            conditions.append(
                func.lower(Expense.title).like(pattern)
                | func.lower(Expense.vendor_name).like(pattern)
                | func.lower(Expense.reference_number).like(pattern)
                | func.lower(Expense.description).like(pattern)
            )

        # 1. Total expense & count
        total_stmt = select(
            func.coalesce(func.sum(Expense.amount), Decimal(0)),
            func.count(Expense.id),
        ).where(*conditions)

        res_total = await self.db.execute(total_stmt)
        total_amt_dec, total_count = res_total.one()
        total_expense = float(total_amt_dec or 0)

        # 2. Aggregation grouped by category
        breakdown_stmt = (
            select(
                ExpenseCategory.id.label("category_id"),
                ExpenseCategory.name.label("category_name"),
                func.sum(Expense.amount).label("category_total"),
                func.count(Expense.id).label("category_count"),
            )
            .join(ExpenseCategory, Expense.category_id == ExpenseCategory.id)
            .where(*conditions)
            .group_by(ExpenseCategory.id, ExpenseCategory.name)
            .order_by(func.sum(Expense.amount).desc())
        )

        res_breakdown = await self.db.execute(breakdown_stmt)
        rows = res_breakdown.all()

        category_breakdown = []
        for row in rows:
            cat_id = row.category_id
            cat_name = row.category_name
            cat_amt = float(row.category_total or 0)
            cat_cnt = int(row.category_count or 0)
            pct = round((cat_amt / total_expense * 100), 2) if total_expense > 0 else 0.0
            category_breakdown.append(
                CategoryBreakdownItem(
                    category_id=cat_id,
                    category_name=cat_name,
                    amount=round(cat_amt, 2),
                    percentage=pct,
                    count=cat_cnt,
                )
            )

        return ExpenseSummaryResponse(
            total_expense=round(total_expense, 2),
            expense_count=total_count,
            category_breakdown=category_breakdown,
        )


def to_expense_response(expense: Expense) -> ExpenseResponse:
    cat_name = expense.category.name if expense.category else "Uncategorized"
    creator_name = expense.creator.full_name if expense.creator else None
    return ExpenseResponse(
        id=expense.id,
        tenant_id=expense.tenant_id,
        category_id=expense.category_id,
        category_name=cat_name,
        title=expense.title,
        description=expense.description,
        amount=float(expense.amount),
        expense_date=expense.expense_date,
        payment_method=expense.payment_method,
        vendor_name=expense.vendor_name,
        reference_number=expense.reference_number,
        receipt_url=expense.receipt_url,
        created_by_id=expense.created_by_id,
        created_by_name=creator_name,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
    )
