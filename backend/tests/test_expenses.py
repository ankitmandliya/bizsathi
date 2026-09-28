from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import AuditLog, Tenant, User
from app.models.expenses import Expense, ExpenseCategory
from app.schemas.expenses import ExpenseCategoryCreate, ExpenseCategoryUpdate, ExpenseCreate, ExpenseUpdate
from app.services.expenses import ExpenseService


def build_mock_db():
    mock_db = AsyncMock(spec=AsyncSession)
    stored_objects: list[object] = []

    def mock_add(obj: object) -> None:
        if not hasattr(obj, "id") or getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        stored_objects.append(obj)

    async def mock_flush() -> None:
        pass

    async def mock_commit() -> None:
        pass

    async def mock_refresh(obj: object) -> None:
        pass

    async def mock_delete(obj: object) -> None:
        if obj in stored_objects:
            stored_objects.remove(obj)

    async def mock_execute(stmt: object) -> MagicMock:
        mock_res = MagicMock()
        sql_str = str(stmt).lower()

        if "from expenses" in sql_str:
            exps = [o for o in stored_objects if isinstance(o, Expense)]
            mock_res.scalars.return_value.all.return_value = exps
            mock_res.scalar_one_or_none.return_value = exps[0] if exps else None
            mock_res.scalars.return_value.first.return_value = exps[0] if exps else None
            mock_res.scalar.return_value = len(exps)
        elif "expense_categories" in sql_str:
            cats = [o for o in stored_objects if isinstance(o, ExpenseCategory)]
            mock_res.scalars.return_value.all.return_value = cats
            mock_res.scalar_one_or_none.return_value = cats[0] if cats else None
            mock_res.scalars.return_value.first.return_value = cats[0] if cats else None
            mock_res.scalar.return_value = len(cats)
            mock_res.scalar_one.return_value = len(cats)
        else:
            exps = [o for o in stored_objects if isinstance(o, Expense)]
            cats = [o for o in stored_objects if isinstance(o, ExpenseCategory)]
            mock_res.scalars.return_value.all.return_value = exps or cats
            mock_res.scalar_one_or_none.return_value = exps[0] if exps else (cats[0] if cats else None)

        return mock_res

    mock_db.add = mock_add
    mock_db.flush = mock_flush
    mock_db.commit = mock_commit
    mock_db.refresh = mock_refresh
    mock_db.delete = mock_delete
    mock_db.execute = mock_execute
    mock_db._stored_objects = stored_objects  # type: ignore[attr-defined]

    return mock_db


@pytest.mark.asyncio
async def test_auto_seed_default_categories():
    tenant_id = uuid4()
    mock_db = build_mock_db()
    service = ExpenseService(mock_db)

    categories = await service.list_categories(tenant_id)
    assert len(categories) == 11
    names = [c.name for c in categories]
    assert "Office Rent" in names
    assert "Electricity" in names
    assert "Internet" in names


@pytest.mark.asyncio
async def test_create_category_duplicate_name_rejected():
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db = build_mock_db()
    service = ExpenseService(mock_db)

    # First category
    cat1 = await service.create_category(tenant_id, ExpenseCategoryCreate(name="Travel"), user_id)
    assert cat1.name == "Travel"

    # Duplicate in same tenant should raise HTTP 400
    with pytest.raises(HTTPException) as exc_info:
        await service.create_category(tenant_id, ExpenseCategoryCreate(name="travel"), user_id)
    assert exc_info.value.status_code == 400
    assert "already exists" in exc_info.value.detail


@pytest.mark.asyncio
async def test_create_expense_inactive_category_rejected():
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db = build_mock_db()
    service = ExpenseService(mock_db)

    # Create active category then deactivate
    cat = await service.create_category(tenant_id, ExpenseCategoryCreate(name="Software"), user_id)
    await service.update_category(tenant_id, cat.id, ExpenseCategoryUpdate(is_active=False), user_id)

    # Creating expense with inactive category must fail
    expense_in = ExpenseCreate(
        category_id=cat.id,
        title="Adobe Creative Cloud",
        amount=Decimal("2500.00"),
        expense_date=date.today(),
        payment_method="UPI",
    )
    with pytest.raises(HTTPException) as exc_info:
        await service.create_expense(tenant_id, user_id, expense_in)
    assert exc_info.value.status_code == 400
    assert "inactive" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_create_expense_invalid_amount_rejected():
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db = build_mock_db()
    service = ExpenseService(mock_db)

    cat = await service.create_category(tenant_id, ExpenseCategoryCreate(name="Supplies"), user_id)

    # Amount <= 0 is rejected by schema validator
    with pytest.raises(ValueError):
        ExpenseCreate(
            category_id=cat.id,
            title="Printer Ink",
            amount=Decimal("0.00"),
            expense_date=date.today(),
            payment_method="CASH",
        )


@pytest.mark.asyncio
async def test_create_and_list_expense():
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db = build_mock_db()
    service = ExpenseService(mock_db)

    cat = await service.create_category(tenant_id, ExpenseCategoryCreate(name="Office Rent"), user_id)

    exp_in = ExpenseCreate(
        category_id=cat.id,
        title="October Office Rent",
        amount=Decimal("45000.00"),
        expense_date=date(2026, 10, 1),
        payment_method="BANK",
        vendor_name="Commercial Properties Ltd",
    )

    expense = await service.create_expense(tenant_id, user_id, exp_in)
    assert expense.title == "October Office Rent"
    assert expense.amount == Decimal("45000.00")
    assert expense.payment_method == "BANK"

    # Audit log created
    audits = [o for o in mock_db._stored_objects if isinstance(o, AuditLog)]  # type: ignore[attr-defined]
    assert any(a.action == "expense.create" for a in audits)


@pytest.mark.asyncio
async def test_search_expenses():
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db = build_mock_db()
    service = ExpenseService(mock_db)

    cat = await service.create_category(tenant_id, ExpenseCategoryCreate(name="Electricity"), user_id)

    exp_in = ExpenseCreate(
        category_id=cat.id,
        title="September Power Bill",
        amount=Decimal("12450.00"),
        expense_date=date(2026, 9, 15),
        payment_method="UPI",
        vendor_name="State Electricity Board",
        reference_number="BESCOM-9912",
    )
    await service.create_expense(tenant_id, user_id, exp_in)

    # Search with matching title term
    items, total = await service.list_expenses(tenant_id, search="Power")
    assert total >= 1
    assert any("Power" in e.title for e in items)

