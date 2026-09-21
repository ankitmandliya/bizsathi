from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user, require_permission
from app.core.database import get_db
from app.models.domain import User
from app.schemas.crm import (
    ActivityCreate,
    ActivityResponse,
    ActivityUpdate,
    CustomerCreate,
    CustomerImportSummary,
    CustomerResponse,
    CustomerUpdate,
    DealCreate,
    DealResponse,
    DealUpdate,
    LeadCreate,
    LeadResponse,
    LeadUpdate,
    PaginatedCustomersResponse,
    PaginatedDealsResponse,
    PaginatedLeadsResponse,
    PipelineStageResponse,
)
from app.services.crm import CRMService

router = APIRouter(prefix="/crm", tags=["crm"])


def get_client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("/status")
async def get_crm_status(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
) -> dict[str, str]:
    return {
        "module": "crm",
        "status": "ready",
        "tenant_id": str(tenant_id),
    }


# --- Pipeline Stages ---
@router.get(
    "/pipeline-stages",
    response_model=list[PipelineStageResponse],
    dependencies=[Depends(require_permission("crm.stage.view"))],
)
async def list_pipeline_stages(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> list[PipelineStageResponse]:
    service = CRMService(db)
    stages = await service.list_pipeline_stages(tenant_id)
    return [PipelineStageResponse.model_validate(s) for s in stages]


# --- Leads ---
@router.get(
    "/leads",
    response_model=PaginatedLeadsResponse,
    dependencies=[Depends(require_permission("crm.lead.view"))],
)
async def list_leads(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    search: str | None = Query(None),
    status: str | None = Query(None),
    source: str | None = Query(None),
    priority: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedLeadsResponse:
    service = CRMService(db)
    skip = (page - 1) * limit
    items, total = await service.list_leads(
        tenant_id=tenant_id,
        search=search,
        lead_status=status,
        source=source,
        priority=priority,
        skip=skip,
        limit=limit,
    )
    return PaginatedLeadsResponse(
        items=[LeadResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "/leads",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("crm.lead.create"))],
)
async def create_lead(
    body: LeadCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> LeadResponse:
    service = CRMService(db)
    lead = await service.create_lead(
        tenant_id=tenant_id,
        user_id=current_user.id,
        lead_in=body,
        ip_address=get_client_ip(request),
    )
    return LeadResponse.model_validate(lead)


@router.get(
    "/leads/{lead_id}",
    response_model=LeadResponse,
    dependencies=[Depends(require_permission("crm.lead.view"))],
)
async def get_lead(
    lead_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> LeadResponse:
    service = CRMService(db)
    lead = await service.get_lead(tenant_id, lead_id)
    return LeadResponse.model_validate(lead)


@router.put(
    "/leads/{lead_id}",
    response_model=LeadResponse,
    dependencies=[Depends(require_permission("crm.lead.edit"))],
)
async def update_lead(
    lead_id: UUID,
    body: LeadUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> LeadResponse:
    service = CRMService(db)
    lead = await service.update_lead(
        tenant_id=tenant_id,
        user_id=current_user.id,
        lead_id=lead_id,
        lead_in=body,
        ip_address=get_client_ip(request),
    )
    return LeadResponse.model_validate(lead)


@router.delete(
    "/leads/{lead_id}",
    dependencies=[Depends(require_permission("crm.lead.delete"))],
)
async def delete_lead(
    lead_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    service = CRMService(db)
    await service.delete_lead(
        tenant_id=tenant_id,
        user_id=current_user.id,
        lead_id=lead_id,
        ip_address=get_client_ip(request),
    )
    return {"status": "deleted"}


@router.post(
    "/leads/{lead_id}/convert",
    response_model=CustomerResponse,
    dependencies=[Depends(require_permission("crm.lead.edit"))],
)
async def convert_lead(
    lead_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> CustomerResponse:
    service = CRMService(db)
    customer = await service.convert_lead_to_customer(
        tenant_id=tenant_id,
        user_id=current_user.id,
        lead_id=lead_id,
        ip_address=get_client_ip(request),
    )
    return CustomerResponse.model_validate(customer)


# --- Deals ---
@router.get(
    "/deals",
    response_model=PaginatedDealsResponse,
    dependencies=[Depends(require_permission("crm.deal.view"))],
)
async def list_deals(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    stage_id: UUID | None = Query(None),
    lead_id: UUID | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedDealsResponse:
    service = CRMService(db)
    skip = (page - 1) * limit
    items, total = await service.list_deals(
        tenant_id=tenant_id,
        stage_id=stage_id,
        lead_id=lead_id,
        search=search,
        skip=skip,
        limit=limit,
    )
    return PaginatedDealsResponse(
        items=[DealResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "/deals",
    response_model=DealResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("crm.deal.create"))],
)
async def create_deal(
    body: DealCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> DealResponse:
    service = CRMService(db)
    deal = await service.create_deal(
        tenant_id=tenant_id,
        user_id=current_user.id,
        deal_in=body,
        ip_address=get_client_ip(request),
    )
    return DealResponse.model_validate(deal)


@router.get(
    "/deals/{deal_id}",
    response_model=DealResponse,
    dependencies=[Depends(require_permission("crm.deal.view"))],
)
async def get_deal(
    deal_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> DealResponse:
    service = CRMService(db)
    deal = await service.get_deal(tenant_id, deal_id)
    return DealResponse.model_validate(deal)


@router.put(
    "/deals/{deal_id}",
    response_model=DealResponse,
    dependencies=[Depends(require_permission("crm.deal.edit"))],
)
async def update_deal(
    deal_id: UUID,
    body: DealUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> DealResponse:
    service = CRMService(db)
    deal = await service.update_deal(
        tenant_id=tenant_id,
        user_id=current_user.id,
        deal_id=deal_id,
        deal_in=body,
        ip_address=get_client_ip(request),
    )
    return DealResponse.model_validate(deal)


@router.delete(
    "/deals/{deal_id}",
    dependencies=[Depends(require_permission("crm.deal.delete"))],
)
async def delete_deal(
    deal_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    service = CRMService(db)
    await service.delete_deal(
        tenant_id=tenant_id,
        user_id=current_user.id,
        deal_id=deal_id,
        ip_address=get_client_ip(request),
    )
    return {"status": "deleted"}


# --- Activities ---
@router.get(
    "/activities",
    response_model=list[ActivityResponse],
    dependencies=[Depends(require_permission("crm.activity.view"))],
)
async def list_activities(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    lead_id: UUID | None = Query(None),
    deal_id: UUID | None = Query(None),
    customer_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[ActivityResponse]:
    service = CRMService(db)
    activities = await service.list_activities(
        tenant_id=tenant_id,
        lead_id=lead_id,
        deal_id=deal_id,
        customer_id=customer_id,
    )
    return [ActivityResponse.model_validate(a) for a in activities]


@router.post(
    "/activities",
    response_model=ActivityResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("crm.activity.create"))],
)
async def create_activity(
    body: ActivityCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ActivityResponse:
    service = CRMService(db)
    activity = await service.create_activity(
        tenant_id=tenant_id,
        user_id=current_user.id,
        activity_in=body,
    )
    return ActivityResponse.model_validate(activity)


@router.get(
    "/activities/{activity_id}",
    response_model=ActivityResponse,
    dependencies=[Depends(require_permission("crm.activity.view"))],
)
async def get_activity(
    activity_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ActivityResponse:
    service = CRMService(db)
    activity = await service.get_activity(tenant_id, activity_id)
    return ActivityResponse.model_validate(activity)


@router.put(
    "/activities/{activity_id}",
    response_model=ActivityResponse,
    dependencies=[Depends(require_permission("crm.activity.edit"))],
)
async def update_activity(
    activity_id: UUID,
    body: ActivityUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> ActivityResponse:
    service = CRMService(db)
    activity = await service.update_activity(
        tenant_id=tenant_id,
        activity_id=activity_id,
        activity_in=body,
    )
    return ActivityResponse.model_validate(activity)


# --- Customers ---
@router.get(
    "/customers/template",
    dependencies=[Depends(require_permission("crm.customer.view"))],
)
async def download_customer_sample_template(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = CRMService(db)
    csv_content = service.generate_sample_customer_template()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="customer_import_template.csv"'},
    )


@router.post(
    "/customers/import",
    response_model=CustomerImportSummary,
    dependencies=[Depends(require_permission("crm.customer.import"))],
)
async def import_customers(
    request: Request,
    file: UploadFile = File(...),
    current_user: Annotated[User, Depends(get_current_user)] = None,  # type: ignore[assignment]
    tenant_id: Annotated[UUID, Depends(get_current_tenant)] = None,  # type: ignore[assignment]
    db: AsyncSession = Depends(get_db),
) -> CustomerImportSummary:
    file_bytes = await file.read()
    service = CRMService(db)
    return await service.import_customers(
        tenant_id=tenant_id,
        user_id=current_user.id,
        file_bytes=file_bytes,
        ip_address=get_client_ip(request),
    )


@router.get(
    "/customers",
    response_model=PaginatedCustomersResponse,
    dependencies=[Depends(require_permission("crm.customer.view"))],
)
async def list_customers(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedCustomersResponse:
    service = CRMService(db)
    from app.services.sales import SalesService
    sales_service = SalesService(db)

    items, total = await service.list_customers(
        tenant_id=tenant_id,
        search=search,
        page=page,
        limit=limit,
    )

    response_items = []
    for c in items:
        stmt = await sales_service.get_customer_statement(tenant_id, c.id)
        resp = CustomerResponse.model_validate(c)
        resp.outstanding_balance = stmt.outstanding_balance
        response_items.append(resp)

    return PaginatedCustomersResponse(
        items=response_items,
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "/customers",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("crm.customer.create"))],
)
async def create_customer(
    body: CustomerCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> CustomerResponse:
    service = CRMService(db)
    customer = await service.create_customer(
        tenant_id=tenant_id,
        user_id=current_user.id,
        customer_in=body,
        ip_address=get_client_ip(request),
    )
    from app.services.sales import SalesService
    sales_service = SalesService(db)
    stmt = await sales_service.get_customer_statement(tenant_id, customer.id)
    resp = CustomerResponse.model_validate(customer)
    resp.outstanding_balance = stmt.outstanding_balance
    return resp


@router.get(
    "/customers/{customer_id}",
    response_model=CustomerResponse,
    dependencies=[Depends(require_permission("crm.customer.view"))],
)
async def get_customer(
    customer_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> CustomerResponse:
    service = CRMService(db)
    customer = await service.get_customer(tenant_id, customer_id)
    from app.services.sales import SalesService
    sales_service = SalesService(db)
    stmt = await sales_service.get_customer_statement(tenant_id, customer.id)
    resp = CustomerResponse.model_validate(customer)
    resp.outstanding_balance = stmt.outstanding_balance
    return resp


@router.put(
    "/customers/{customer_id}",
    response_model=CustomerResponse,
    dependencies=[Depends(require_permission("crm.customer.edit"))],
)
async def update_customer(
    customer_id: UUID,
    body: CustomerUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> CustomerResponse:
    service = CRMService(db)
    customer = await service.update_customer(
        tenant_id=tenant_id,
        user_id=current_user.id,
        customer_id=customer_id,
        customer_in=body,
        ip_address=get_client_ip(request),
    )
    from app.services.sales import SalesService
    sales_service = SalesService(db)
    stmt = await sales_service.get_customer_statement(tenant_id, customer.id)
    resp = CustomerResponse.model_validate(customer)
    resp.outstanding_balance = stmt.outstanding_balance
    return resp


@router.delete(
    "/customers/{customer_id}",
    dependencies=[Depends(require_permission("crm.customer.delete"))],
)
async def delete_customer(
    customer_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    service = CRMService(db)
    await service.delete_customer(
        tenant_id=tenant_id,
        user_id=current_user.id,
        customer_id=customer_id,
        ip_address=get_client_ip(request),
    )
    return {"status": "deleted"}
