from datetime import date
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user, require_permission
from app.core.database import get_db
from app.models.domain import User
from app.permissions.constants import REPORT_EXPORT, REPORT_VIEW
from app.schemas.reports import (
    CampaignsReportResponse,
    CRMReportResponse,
    CustomersReportResponse,
    DashboardMetricsResponse,
    ExpensesReportResponse,
    HRMReportResponse,
    InventoryReportResponse,
    SalesReportResponse,
    VendorsReportResponse,
)
from app.services.reports import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/status")
async def get_reports_status(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
) -> dict[str, str]:
    return {
        "module": "reports",
        "status": "ready",
        "tenant_id": str(tenant_id),
    }


@router.get(
    "/dashboard",
    response_model=DashboardMetricsResponse,
    dependencies=[Depends(require_permission(REPORT_VIEW))],
)
async def get_dashboard_metrics(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> DashboardMetricsResponse:
    return await ReportService.get_dashboard_metrics(db, tenant_id)


@router.get(
    "/sales",
    response_model=SalesReportResponse,
    dependencies=[Depends(require_permission(REPORT_VIEW))],
)
async def get_sales_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> SalesReportResponse:
    return await ReportService.get_sales_report(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        status=status,
        customer_id=customer_id,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/sales/export",
    dependencies=[Depends(require_permission(REPORT_EXPORT))],
)
async def export_sales_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[UUID] = Query(None),
) -> Response:
    csv_bytes = await ReportService.export_sales_csv(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        status=status,
        customer_id=customer_id,
    )
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="sales_report.csv"'},
    )


@router.get(
    "/expenses",
    response_model=ExpensesReportResponse,
    dependencies=[Depends(require_permission(REPORT_VIEW))],
)
async def get_expenses_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    vendor_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> ExpensesReportResponse:
    return await ReportService.get_expenses_report(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        category=category,
        vendor_id=vendor_id,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/expenses/export",
    dependencies=[Depends(require_permission(REPORT_EXPORT))],
)
async def export_expenses_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    vendor_id: Optional[UUID] = Query(None),
) -> Response:
    csv_bytes = await ReportService.export_expenses_csv(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        category=category,
        vendor_id=vendor_id,
    )
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="expenses_report.csv"'},
    )


@router.get(
    "/customers",
    response_model=CustomersReportResponse,
    dependencies=[Depends(require_permission(REPORT_VIEW))],
)
async def get_customers_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CustomersReportResponse:
    return await ReportService.get_customers_report(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        customer_id=customer_id,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/customers/export",
    dependencies=[Depends(require_permission(REPORT_EXPORT))],
)
async def export_customers_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    customer_id: Optional[UUID] = Query(None),
) -> Response:
    csv_bytes = await ReportService.export_customers_csv(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        customer_id=customer_id,
    )
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="customers_report.csv"'},
    )


@router.get(
    "/vendors",
    response_model=VendorsReportResponse,
    dependencies=[Depends(require_permission(REPORT_VIEW))],
)
async def get_vendors_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    vendor_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> VendorsReportResponse:
    return await ReportService.get_vendors_report(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        vendor_id=vendor_id,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/vendors/export",
    dependencies=[Depends(require_permission(REPORT_EXPORT))],
)
async def export_vendors_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    vendor_id: Optional[UUID] = Query(None),
) -> Response:
    csv_bytes = await ReportService.export_vendors_csv(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        vendor_id=vendor_id,
    )
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="vendors_report.csv"'},
    )


@router.get(
    "/inventory",
    response_model=InventoryReportResponse,
    dependencies=[Depends(require_permission(REPORT_VIEW))],
)
async def get_inventory_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    low_stock_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> InventoryReportResponse:
    return await ReportService.get_inventory_report(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        category=category,
        low_stock_only=low_stock_only,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/inventory/export",
    dependencies=[Depends(require_permission(REPORT_EXPORT))],
)
async def export_inventory_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    low_stock_only: bool = Query(False),
) -> Response:
    csv_bytes = await ReportService.export_inventory_csv(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        category=category,
        low_stock_only=low_stock_only,
    )
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="inventory_report.csv"'},
    )


@router.get(
    "/hrm",
    response_model=HRMReportResponse,
    dependencies=[Depends(require_permission(REPORT_VIEW))],
)
async def get_hrm_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    department: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> HRMReportResponse:
    return await ReportService.get_hrm_report(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        department=department,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/hrm/export",
    dependencies=[Depends(require_permission(REPORT_EXPORT))],
)
async def export_hrm_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    department: Optional[str] = Query(None),
) -> Response:
    csv_bytes = await ReportService.export_hrm_csv(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        department=department,
    )
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="hrm_report.csv"'},
    )


@router.get(
    "/crm",
    response_model=CRMReportResponse,
    dependencies=[Depends(require_permission(REPORT_VIEW))],
)
async def get_crm_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    stage_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CRMReportResponse:
    return await ReportService.get_crm_report(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        stage_id=stage_id,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/crm/export",
    dependencies=[Depends(require_permission(REPORT_EXPORT))],
)
async def export_crm_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    stage_id: Optional[UUID] = Query(None),
) -> Response:
    csv_bytes = await ReportService.export_crm_csv(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        stage_id=stage_id,
    )
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="crm_report.csv"'},
    )


@router.get(
    "/campaigns",
    response_model=CampaignsReportResponse,
    dependencies=[Depends(require_permission(REPORT_VIEW))],
)
async def get_campaigns_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CampaignsReportResponse:
    return await ReportService.get_campaigns_report(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/campaigns/export",
    dependencies=[Depends(require_permission(REPORT_EXPORT))],
)
async def export_campaigns_report(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
    preset: str = Query("current_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
) -> Response:
    csv_bytes = await ReportService.export_campaigns_csv(
        db=db,
        tenant_id=tenant_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        status=status,
    )
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="campaigns_report.csv"'},
    )
