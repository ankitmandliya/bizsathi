from datetime import date
from math import ceil
import os
from uuid import UUID, uuid4
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user, require_permission
from app.core.database import get_db
from app.models.domain import User
from app.schemas.expenses import (
    ExpenseCategoryCreate,
    ExpenseCategoryResponse,
    ExpenseCategoryUpdate,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseSummaryResponse,
    ExpenseUpdate,
    PaginatedExpensesResponse,
)
from app.services.expenses import ExpenseService, to_expense_response

router = APIRouter(tags=["expenses"])
categories_router = APIRouter(prefix="/expense-categories", tags=["expense-categories"])
expenses_router = APIRouter(prefix="/expenses", tags=["expenses"])


from app.services.audit import get_client_ip, get_user_agent


# ---------------------------------------------------------------------------
# Expense Categories Endpoints
# ---------------------------------------------------------------------------

@categories_router.get(
    "",
    response_model=list[ExpenseCategoryResponse],
    dependencies=[Depends(require_permission("expense.category.view"))],
)
async def list_expense_categories(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    include_inactive: bool = Query(True, description="Include inactive categories"),
    db: AsyncSession = Depends(get_db),
) -> list[ExpenseCategoryResponse]:
    service = ExpenseService(db)
    categories = await service.list_categories(tenant_id, include_inactive=include_inactive)
    return [ExpenseCategoryResponse.model_validate(c) for c in categories]


@categories_router.post(
    "",
    response_model=ExpenseCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("expense.category.create"))],
)
async def create_expense_category(
    body: ExpenseCategoryCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ExpenseCategoryResponse:
    service = ExpenseService(db)
    category = await service.create_category(
        tenant_id=tenant_id,
        category_in=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return ExpenseCategoryResponse.model_validate(category)


@categories_router.get(
    "/{category_id}",
    response_model=ExpenseCategoryResponse,
    dependencies=[Depends(require_permission("expense.category.view"))],
)
async def get_expense_category(
    category_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ExpenseCategoryResponse:
    service = ExpenseService(db)
    category = await service.get_category(tenant_id, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return ExpenseCategoryResponse.model_validate(category)


@categories_router.put(
    "/{category_id}",
    response_model=ExpenseCategoryResponse,
    dependencies=[Depends(require_permission("expense.category.update"))],
)
async def update_expense_category(
    category_id: UUID,
    body: ExpenseCategoryUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ExpenseCategoryResponse:
    service = ExpenseService(db)
    category = await service.update_category(
        tenant_id=tenant_id,
        category_id=category_id,
        category_in=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return ExpenseCategoryResponse.model_validate(category)


@categories_router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("expense.category.delete"))],
)
async def delete_expense_category(
    category_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    service = ExpenseService(db)
    await service.delete_category(
        tenant_id=tenant_id,
        category_id=category_id,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


# ---------------------------------------------------------------------------
# Office Expenses Endpoints
# ---------------------------------------------------------------------------

@expenses_router.get(
    "",
    response_model=PaginatedExpensesResponse,
    dependencies=[Depends(require_permission("expense.view"))],
)
async def list_expenses(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    category_id: UUID | None = Query(None),
    payment_method: str | None = Query(None),
    search: str | None = Query(None, description="Search by title, vendor, ref no, or notes"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedExpensesResponse:
    service = ExpenseService(db)
    items, total = await service.list_expenses(
        tenant_id=tenant_id,
        from_date=from_date,
        to_date=to_date,
        category_id=category_id,
        payment_method=payment_method,
        search=search,
        page=page,
        page_size=page_size,
    )
    total_pages = ceil(total / page_size) if total > 0 else 1
    return PaginatedExpensesResponse(
        items=[to_expense_response(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@expenses_router.get(
    "/summary",
    response_model=ExpenseSummaryResponse,
    dependencies=[Depends(require_permission("expense.view"))],
)
async def get_expense_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    category_id: UUID | None = Query(None),
    payment_method: str | None = Query(None),
    search: str | None = Query(None, description="Search query filter for summary"),
    db: AsyncSession = Depends(get_db),
) -> ExpenseSummaryResponse:
    service = ExpenseService(db)
    return await service.get_summary(
        tenant_id=tenant_id,
        from_date=from_date,
        to_date=to_date,
        category_id=category_id,
        payment_method=payment_method,
        search=search,
    )


@expenses_router.post(
    "/upload-receipt",
    dependencies=[Depends(require_permission("expense.create"))],
)
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: Annotated[User, Depends(get_current_user)] = None,  # type: ignore[assignment]
    tenant_id: Annotated[UUID, Depends(get_current_tenant)] = None,  # type: ignore[assignment]
) -> dict[str, str]:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected")

    ext = file.filename.split(".")[-1].lower()
    if ext not in ("pdf", "jpg", "jpeg", "png"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not supported. Allowed formats: PDF, JPG, JPEG, PNG",
        )

    upload_dir = os.path.join("uploads", "receipts")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"receipt_{tenant_id}_{uuid4().hex[:10]}.{ext}"
    filepath = os.path.join(upload_dir, filename)

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Receipt file exceeds 10MB limit")

    with open(filepath, "wb") as f:
        f.write(contents)

    receipt_url = f"/uploads/receipts/{filename}"
    return {"receipt_url": receipt_url}


@expenses_router.post(
    "",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("expense.create"))],
)
async def create_expense(
    body: ExpenseCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ExpenseResponse:
    service = ExpenseService(db)
    expense = await service.create_expense(
        tenant_id=tenant_id,
        user_id=current_user.id,
        expense_in=body,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return to_expense_response(expense)


@expenses_router.get(
    "/{expense_id}",
    response_model=ExpenseResponse,
    dependencies=[Depends(require_permission("expense.view"))],
)
async def get_expense(
    expense_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ExpenseResponse:
    service = ExpenseService(db)
    expense = await service.get_expense(tenant_id, expense_id)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return to_expense_response(expense)


@expenses_router.put(
    "/{expense_id}",
    response_model=ExpenseResponse,
    dependencies=[Depends(require_permission("expense.update"))],
)
async def update_expense(
    expense_id: UUID,
    body: ExpenseUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ExpenseResponse:
    service = ExpenseService(db)
    expense = await service.update_expense(
        tenant_id=tenant_id,
        user_id=current_user.id,
        expense_id=expense_id,
        expense_in=body,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return to_expense_response(expense)


@expenses_router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("expense.delete"))],
)
async def delete_expense(
    expense_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    service = ExpenseService(db)
    await service.delete_expense(
        tenant_id=tenant_id,
        user_id=current_user.id,
        expense_id=expense_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
