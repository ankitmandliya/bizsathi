from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user, require_permission
from app.core.database import get_db
from app.models.domain import User
from app.schemas.inventory import (
    InventoryDashboardResponse,
    LowStockReportResponse,
    OpeningStockCreate,
    PaginatedProductsResponse,
    PaginatedStockMovementsResponse,
    ProductCategoryCreate,
    ProductCategoryResponse,
    ProductCategoryUpdate,
    ProductCreate,
    ProductImportSummaryResponse,
    ProductResponse,
    ProductUpdate,
    StockAdjustmentCreate,
    StockInCreate,
    StockMovementResponse,
    StockOutCreate,
    StockSummaryReportResponse,
    UnitCreate,
    UnitResponse,
    UnitUpdate,
)
from app.services.audit import get_client_ip, get_user_agent
from app.services.inventory import InventoryService

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/status")
async def get_inventory_status(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
) -> dict[str, str]:
    return {
        "module": "inventory",
        "status": "ready",
        "tenant_id": str(tenant_id),
    }


# --- Dashboard ---

@router.get(
    "/dashboard",
    response_model=InventoryDashboardResponse,
    dependencies=[Depends(require_permission("inventory.dashboard.view"))],
)
async def get_inventory_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> InventoryDashboardResponse:
    service = InventoryService(db)
    return await service.get_dashboard(tenant_id)


# --- Product Categories ---

@router.get(
    "/categories",
    response_model=list[ProductCategoryResponse],
    dependencies=[Depends(require_permission("inventory.category.view"))],
)
async def list_categories(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    include_inactive: bool = Query(True),
    db: AsyncSession = Depends(get_db),
) -> list[ProductCategoryResponse]:
    service = InventoryService(db)
    cats = await service.list_categories(tenant_id, include_inactive)
    return [ProductCategoryResponse.model_validate(c) for c in cats]


@router.post(
    "/categories",
    response_model=ProductCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("inventory.category.create"))],
)
async def create_category(
    body: ProductCategoryCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ProductCategoryResponse:
    service = InventoryService(db)
    cat = await service.create_category(
        tenant_id=tenant_id,
        category_in=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return ProductCategoryResponse.model_validate(cat)


@router.get(
    "/categories/{category_id}",
    response_model=ProductCategoryResponse,
    dependencies=[Depends(require_permission("inventory.category.view"))],
)
async def get_category(
    category_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ProductCategoryResponse:
    service = InventoryService(db)
    cat = await service.get_category(tenant_id, category_id)
    return ProductCategoryResponse.model_validate(cat)


@router.put(
    "/categories/{category_id}",
    response_model=ProductCategoryResponse,
    dependencies=[Depends(require_permission("inventory.category.edit"))],
)
async def update_category(
    category_id: UUID,
    body: ProductCategoryUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ProductCategoryResponse:
    service = InventoryService(db)
    cat = await service.update_category(
        tenant_id=tenant_id,
        category_id=category_id,
        category_in=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return ProductCategoryResponse.model_validate(cat)


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("inventory.category.delete"))],
)
async def delete_category(
    category_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    service = InventoryService(db)
    await service.delete_category(
        tenant_id=tenant_id,
        category_id=category_id,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


# --- Units ---

@router.get(
    "/units",
    response_model=list[UnitResponse],
    dependencies=[Depends(require_permission("inventory.unit.view"))],
)
async def list_units(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    include_inactive: bool = Query(True),
    db: AsyncSession = Depends(get_db),
) -> list[UnitResponse]:
    service = InventoryService(db)
    units = await service.list_units(tenant_id, include_inactive)
    return [UnitResponse.model_validate(u) for u in units]


@router.post(
    "/units",
    response_model=UnitResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("inventory.unit.create"))],
)
async def create_unit(
    body: UnitCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> UnitResponse:
    service = InventoryService(db)
    unit = await service.create_unit(
        tenant_id=tenant_id,
        unit_in=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return UnitResponse.model_validate(unit)


@router.get(
    "/units/{unit_id}",
    response_model=UnitResponse,
    dependencies=[Depends(require_permission("inventory.unit.view"))],
)
async def get_unit(
    unit_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> UnitResponse:
    service = InventoryService(db)
    unit = await service.get_unit(tenant_id, unit_id)
    return UnitResponse.model_validate(unit)


@router.put(
    "/units/{unit_id}",
    response_model=UnitResponse,
    dependencies=[Depends(require_permission("inventory.unit.edit"))],
)
async def update_unit(
    unit_id: UUID,
    body: UnitUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> UnitResponse:
    service = InventoryService(db)
    unit = await service.update_unit(
        tenant_id=tenant_id,
        unit_id=unit_id,
        unit_in=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return UnitResponse.model_validate(unit)


@router.delete(
    "/units/{unit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("inventory.unit.delete"))],
)
async def delete_unit(
    unit_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    service = InventoryService(db)
    await service.delete_unit(
        tenant_id=tenant_id,
        unit_id=unit_id,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


# --- Products ---

@router.get(
    "/products/import-template",
    dependencies=[Depends(require_permission("inventory.product.import"))],
)
async def get_products_import_template(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
) -> Response:
    csv_content = (
        "Product Name *,SKU,Category,Unit *,Purchase Price,Selling Price,Minimum Stock,Opening Stock\n"
        "Samsung 55 Inch 4K TV,HA-TV-55,Home Entertainment,Piece,45000,59990,2,10\n"
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products_import_template.csv"},
    )


@router.post(
    "/products/import",
    response_model=ProductImportSummaryResponse,
    dependencies=[Depends(require_permission("inventory.product.import"))],
)
async def import_products(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
) -> ProductImportSummaryResponse:

    content = await file.read()
    service = InventoryService(db)
    return await service.import_products(
        tenant_id=tenant_id,
        file_content=content,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@router.get(
    "/products",
    response_model=PaginatedProductsResponse,
    dependencies=[Depends(require_permission("inventory.product.view"))],
)
async def list_products(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    search: str | None = Query(None),
    category_id: UUID | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> PaginatedProductsResponse:
    service = InventoryService(db)
    return await service.list_products(
        tenant_id=tenant_id,
        search=search,
        category_id=category_id,
        is_active=is_active,
        page=page,
        limit=limit,
    )


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("inventory.product.create"))],
)
async def create_product(
    body: ProductCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ProductResponse:
    service = InventoryService(db)
    return await service.create_product(
        tenant_id=tenant_id,
        product_in=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    dependencies=[Depends(require_permission("inventory.product.view"))],
)
async def get_product(
    product_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ProductResponse:
    service = InventoryService(db)
    return await service.get_product(tenant_id, product_id)


@router.put(
    "/products/{product_id}",
    response_model=ProductResponse,
    dependencies=[Depends(require_permission("inventory.product.edit"))],
)
async def update_product(
    product_id: UUID,
    body: ProductUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ProductResponse:
    service = InventoryService(db)
    return await service.update_product(
        tenant_id=tenant_id,
        product_id=product_id,
        product_in=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("inventory.product.delete"))],
)
async def delete_product(
    product_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    service = InventoryService(db)
    await service.delete_product(
        tenant_id=tenant_id,
        product_id=product_id,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


# --- Stock Movements ---

@router.post(
    "/stock/opening",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("inventory.stock_in.create"))],
)
async def create_opening_stock(
    body: OpeningStockCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> StockMovementResponse:
    service = InventoryService(db)
    return await service.create_opening_stock(
        tenant_id=tenant_id,
        data=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@router.post(
    "/stock/in",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("inventory.stock_in.create"))],
)
async def create_stock_in(
    body: StockInCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> StockMovementResponse:
    service = InventoryService(db)
    return await service.create_stock_in(
        tenant_id=tenant_id,
        data=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@router.post(
    "/stock/out",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("inventory.stock_out.create"))],
)
async def create_stock_out(
    body: StockOutCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> StockMovementResponse:
    service = InventoryService(db)
    return await service.create_stock_out(
        tenant_id=tenant_id,
        data=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@router.post(
    "/stock/adjustment",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("inventory.adjustment.create"))],
)
async def create_stock_adjustment(
    body: StockAdjustmentCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> StockMovementResponse:
    service = InventoryService(db)
    return await service.create_stock_adjustment(
        tenant_id=tenant_id,
        data=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@router.get(
    "/stock/history",
    response_model=PaginatedStockMovementsResponse,
    dependencies=[Depends(require_permission("inventory.ledger.view"))],
)
async def list_stock_history(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    product_id: UUID | None = Query(None),
    movement_type: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> PaginatedStockMovementsResponse:
    service = InventoryService(db)
    return await service.list_stock_history(
        tenant_id=tenant_id,
        product_id=product_id,
        movement_type=movement_type,
        date_from=date_from,
        date_to=date_to,
        page=page,
        limit=limit,
    )


# --- Reports ---

@router.get(
    "/reports/summary",
    response_model=StockSummaryReportResponse,
    dependencies=[Depends(require_permission("inventory.report.view"))],
)
@router.get(
    "/reports/stock-value",
    response_model=StockSummaryReportResponse,
    dependencies=[Depends(require_permission("inventory.report.view"))],
)
async def get_summary_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> StockSummaryReportResponse:
    service = InventoryService(db)
    return await service.get_summary_report(tenant_id)


@router.get(
    "/reports/low-stock",
    response_model=LowStockReportResponse,
    dependencies=[Depends(require_permission("inventory.report.view"))],
)
async def get_low_stock_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> LowStockReportResponse:
    service = InventoryService(db)
    return await service.get_low_stock_report(tenant_id)


@router.get(
    "/reports/movements",
    response_model=PaginatedStockMovementsResponse,
    dependencies=[Depends(require_permission("inventory.report.view"))],
)
async def get_movements_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> PaginatedStockMovementsResponse:
    service = InventoryService(db)
    return await service.get_movements_report(tenant_id, date_from, date_to)


@router.get(
    "/reports/stock-ledger",
    response_model=PaginatedStockMovementsResponse,
    dependencies=[Depends(require_permission("inventory.report.view"))],
)
async def get_stock_ledger_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    product_id: UUID | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> PaginatedStockMovementsResponse:
    service = InventoryService(db)
    return await service.list_stock_history(
        tenant_id=tenant_id,
        product_id=product_id,
        date_from=date_from,
        date_to=date_to,
        page=1,
        limit=100,
    )
