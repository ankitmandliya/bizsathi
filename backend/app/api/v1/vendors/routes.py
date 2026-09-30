from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user, require_permission
from app.core.database import get_db
from app.models.domain import User
from app.schemas.vendors import (
    PaginatedVendorsResponse,
    VendorCreate,
    VendorImportSummaryResponse,
    VendorResponse,
    VendorUpdate,
)
from app.services.audit import get_client_ip, get_user_agent
from app.services.vendors import VendorService

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get(
    "/import-template",
    dependencies=[Depends(require_permission("vendor.import"))],
)
async def get_vendors_import_template(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
) -> Response:
    csv_content = (
        "Vendor Name *,Phone *,Contact Person,Email,Vendor Type,Company Name,Billing Address,City,State,Pincode,GSTIN,PAN,Payment Terms,Opening Balance,Balance Type,Notes\n"
        "Rajesh Electricals & Supplies,+91 98765 43210,Rajesh Kumar,rajesh@rajesthelectricals.com,Business,Rajesh Electricals Pvt Ltd,123 Industrial Area Phase 1,Jaipur,Rajasthan,302013,08ABCDE1234F1Z5,ABCDE1234F,Net 30,15000.00,Payable,Primary electrical component supplier\n"
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vendors_import_template.csv"},
    )


@router.post(
    "/import",
    response_model=VendorImportSummaryResponse,
    dependencies=[Depends(require_permission("vendor.import"))],
)
async def import_vendors(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
) -> VendorImportSummaryResponse:
    content = await file.read()
    service = VendorService(db)
    return await service.import_vendors(
        tenant_id=tenant_id,
        file_content=content,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@router.get(
    "",
    response_model=PaginatedVendorsResponse,
    dependencies=[Depends(require_permission("vendor.view"))],
)
async def list_vendors(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> PaginatedVendorsResponse:
    service = VendorService(db)
    return await service.list_vendors(
        tenant_id=tenant_id,
        search=search,
        page=page,
        limit=limit,
    )


@router.post(
    "",
    response_model=VendorResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("vendor.create"))],
)
async def create_vendor(
    body: VendorCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> VendorResponse:
    service = VendorService(db)
    return await service.create_vendor(
        tenant_id=tenant_id,
        vendor_in=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@router.get(
    "/{vendor_id}",
    response_model=VendorResponse,
    dependencies=[Depends(require_permission("vendor.view"))],
)
async def get_vendor(
    vendor_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> VendorResponse:
    service = VendorService(db)
    return await service.get_vendor(tenant_id, vendor_id)


@router.put(
    "/{vendor_id}",
    response_model=VendorResponse,
    dependencies=[Depends(require_permission("vendor.edit"))],
)
async def update_vendor(
    vendor_id: UUID,
    body: VendorUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> VendorResponse:
    service = VendorService(db)
    return await service.update_vendor(
        tenant_id=tenant_id,
        vendor_id=vendor_id,
        vendor_in=body,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@router.delete(
    "/{vendor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("vendor.delete"))],
)
async def delete_vendor(
    vendor_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    service = VendorService(db)
    await service.delete_vendor(
        tenant_id=tenant_id,
        vendor_id=vendor_id,
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
