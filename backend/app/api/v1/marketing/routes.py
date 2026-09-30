from typing import Annotated
from uuid import UUID
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import distinct, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user
from app.core.database import get_db
from app.models.crm import Customer
from app.models.domain import Tenant, User
from app.models.marketing import Campaign, CampaignRecipient, Template
from app.services.audit import compute_changes, get_client_ip, get_user_agent, log_audit_event
from app.schemas.marketing import (
    AudienceCountRequest,
    AudienceCountResponse,
    CampaignCreate,
    CampaignDetailResponse,
    CampaignRecipientResponse,
    CampaignResponse,
    TemplateCreate,
    TemplateResponse,
    TemplateUpdate,
)
from app.services.campaign_service import (
    determine_active_channels,
    execute_campaign_send,
    resolve_target_customers,
)

router = APIRouter(prefix="/marketing", tags=["marketing"])


# ==================== TEMPLATES ====================

@router.get("/templates", response_model=list[TemplateResponse])
async def list_templates(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> list[TemplateResponse]:
    stmt = select(Template).where(Template.tenant_id == tenant_id).order_by(Template.created_at.desc())
    res = await db.execute(stmt)
    templates = list(res.scalars().all())
    return [TemplateResponse.model_validate(t) for t in templates]


@router.post("/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    body: TemplateCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> TemplateResponse:
    wa_status = "DRAFT" if body.whatsapp_body and body.whatsapp_body.strip() else None

    tmpl = Template(
        tenant_id=tenant_id,
        name=body.name,
        category=body.category,
        whatsapp_body=body.whatsapp_body,
        whatsapp_status=wa_status,
        email_subject=body.email_subject,
        email_body=body.email_body,
    )
    db.add(tmpl)
    await db.flush()

    tracked = ["name", "category", "whatsapp_body", "email_subject", "email_body"]
    await log_audit_event(
        db,
        tenant_id=tenant_id,
        user_id=current_user.id,
        action="marketing.template.create",
        entity_type="Template",
        entity_id=str(tmpl.id),
        entity_label=tmpl.name,
        changes=compute_changes(None, tmpl, tracked),
        details={"name": tmpl.name, "category": tmpl.category},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        commit=False,
    )

    await db.commit()
    await db.refresh(tmpl)
    return TemplateResponse.model_validate(tmpl)


@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> TemplateResponse:
    stmt = select(Template).where(Template.id == template_id, Template.tenant_id == tenant_id)
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return TemplateResponse.model_validate(tmpl)


@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: UUID,
    body: TemplateUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> TemplateResponse:
    stmt = select(Template).where(Template.id == template_id, Template.tenant_id == tenant_id)
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    tracked = ["name", "category", "whatsapp_body", "email_subject", "email_body"]
    before_dict = {f: getattr(tmpl, f, None) for f in tracked}

    if body.name is not None:
        tmpl.name = body.name
    if body.category is not None:
        tmpl.category = body.category
    if body.whatsapp_body is not None:
        tmpl.whatsapp_body = body.whatsapp_body
        if body.whatsapp_body and body.whatsapp_body.strip():
            if tmpl.whatsapp_status not in ("PENDING_APPROVAL", "APPROVED"):
                tmpl.whatsapp_status = "DRAFT"
        else:
            tmpl.whatsapp_status = None
    if body.email_subject is not None:
        tmpl.email_subject = body.email_subject
    if body.email_body is not None:
        tmpl.email_body = body.email_body

    tmpl.updated_at = datetime.now(UTC)
    changes = compute_changes(before_dict, tmpl, tracked)

    await log_audit_event(
        db,
        tenant_id=tenant_id,
        user_id=current_user.id,
        action="marketing.template.update",
        entity_type="Template",
        entity_id=str(tmpl.id),
        entity_label=tmpl.name,
        changes=changes,
        details={"name": tmpl.name},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        commit=False,
    )

    await db.commit()
    await db.refresh(tmpl)
    return TemplateResponse.model_validate(tmpl)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    stmt = select(Template).where(Template.id == template_id, Template.tenant_id == tenant_id)
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    await db.delete(tmpl)
    await db.commit()


@router.post("/templates/{template_id}/submit-approval", response_model=TemplateResponse)
async def submit_template_approval(
    template_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> TemplateResponse:
    stmt = select(Template).where(Template.id == template_id, Template.tenant_id == tenant_id)
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    if not tmpl.whatsapp_body or not tmpl.whatsapp_body.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Template does not have WhatsApp body content")

    tmpl.whatsapp_status = "PENDING_APPROVAL"
    tmpl.whatsapp_provider_template_id = f"wpt_{str(tmpl.id)[:8]}"
    tmpl.updated_at = datetime.now(UTC)

    await log_audit_event(
        db,
        tenant_id=tenant_id,
        user_id=current_user.id,
        action="marketing.template.submit_approval",
        entity_type="template",
        entity_id=str(tmpl.id),
        entity_label=tmpl.name,
        details={"provider_template_id": tmpl.whatsapp_provider_template_id},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        commit=False,
    )

    await db.commit()
    await db.refresh(tmpl)
    return TemplateResponse.model_validate(tmpl)


@router.post("/templates/{template_id}/check-approval", response_model=TemplateResponse)
async def check_template_approval(
    template_id: UUID,
    status_override: str | None = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,  # type: ignore
    tenant_id: Annotated[UUID, Depends(get_current_tenant)] = None,  # type: ignore
    db: AsyncSession = Depends(get_db),
) -> TemplateResponse:

    stmt = select(Template).where(Template.id == template_id, Template.tenant_id == tenant_id)
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    # In production, polls Gupshup/Interakt API. Here, automatically approves if status_override is provided or defaults to APPROVED
    new_status = status_override if status_override in ("APPROVED", "REJECTED") else "APPROVED"
    tmpl.whatsapp_status = new_status
    tmpl.updated_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(tmpl)
    return TemplateResponse.model_validate(tmpl)


@router.post("/templates/webhook")
async def whatsapp_template_webhook(
    payload: dict[str, str],
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    provider_id = payload.get("provider_template_id")
    new_status = payload.get("status")
    if provider_id and new_status in ("APPROVED", "REJECTED", "PENDING_APPROVAL"):
        stmt = select(Template).where(Template.whatsapp_provider_template_id == provider_id)
        res = await db.execute(stmt)
        tmpl = res.scalar_one_or_none()
        if tmpl:
            tmpl.whatsapp_status = new_status
            tmpl.updated_at = datetime.now(UTC)
            await db.commit()
    return {"status": "received"}


# ==================== AUDIENCE COUNT ====================

@router.post("/audience-count", response_model=AudienceCountResponse)
async def calculate_audience_count(
    body: AudienceCountRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> AudienceCountResponse:
    customers = await resolve_target_customers(
        db, tenant_id, body.audience_filter, body.audience_filter_value
    )

    total = len(customers)
    wa_eligible = sum(1 for c in customers if c.whatsapp or c.phone)
    email_eligible = sum(1 for c in customers if c.email)

    # Fetch distinct cities and customer types across all non-deleted tenant customers
    cities_stmt = select(distinct(Customer.city)).where(
        Customer.tenant_id == tenant_id, Customer.deleted_at.is_(None), Customer.city.isnot(None), Customer.city != ""
    )
    cities_res = await db.execute(cities_stmt)
    cities = [c for c in cities_res.scalars().all() if c]

    types_stmt = select(distinct(Customer.customer_type)).where(
        Customer.tenant_id == tenant_id, Customer.deleted_at.is_(None)
    )
    types_res = await db.execute(types_stmt)
    customer_types = [t for t in types_res.scalars().all() if t]

    return AudienceCountResponse(
        total_customers=total,
        whatsapp_eligible=wa_eligible,
        email_eligible=email_eligible,
        distinct_cities=sorted(cities),
        customer_types=sorted(customer_types),
    )


# ==================== CAMPAIGNS ====================

@router.get("/campaigns", response_model=list[CampaignResponse])
async def list_campaigns(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> list[CampaignResponse]:
    stmt = (
        select(Campaign, Template.name.label("template_name"))
        .join(Template, Campaign.template_id == Template.id)
        .where(Campaign.tenant_id == tenant_id)
        .order_by(Campaign.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    items: list[CampaignResponse] = []
    for campaign, tmpl_name in rows:
        dto = CampaignResponse.model_validate(campaign)
        dto.template_name = tmpl_name
        items.append(dto)
    return items


@router.post("/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> CampaignResponse:
    tmpl_stmt = select(Template).where(Template.id == body.template_id, Template.tenant_id == tenant_id)
    tmpl_res = await db.execute(tmpl_stmt)
    tmpl = tmpl_res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    init_status = "SCHEDULED" if body.scheduled_at else "DRAFT"

    campaign = Campaign(
        tenant_id=tenant_id,
        template_id=body.template_id,
        name=body.name,
        audience_filter=body.audience_filter,
        audience_filter_value=body.audience_filter_value,
        status=init_status,
        scheduled_at=body.scheduled_at,
        created_by_id=current_user.id,
    )
    db.add(campaign)
    await db.flush()

    tracked = ["name", "status", "audience_filter", "scheduled_at", "template_id"]
    await log_audit_event(
        db,
        tenant_id=tenant_id,
        user_id=current_user.id,
        action="marketing.campaign.create",
        entity_type="Campaign",
        entity_id=str(campaign.id),
        entity_label=campaign.name,
        changes=compute_changes(None, campaign, tracked),
        details={"name": campaign.name, "status": init_status},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        commit=False,
    )

    await db.commit()
    await db.refresh(campaign)

    res_dto = CampaignResponse.model_validate(campaign)
    res_dto.template_name = tmpl.name
    return res_dto


@router.get("/campaigns/{campaign_id}", response_model=CampaignDetailResponse)
async def get_campaign_detail(
    campaign_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> CampaignDetailResponse:
    stmt = (
        select(Campaign, Template, Tenant)
        .join(Template, Campaign.template_id == Template.id)
        .join(Tenant, Campaign.tenant_id == Tenant.id)
        .where(Campaign.id == campaign_id, Campaign.tenant_id == tenant_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    campaign, template, tenant = row

    # Fetch recipients
    recip_stmt = (
        select(CampaignRecipient, Customer.name.label("customer_name"))
        .join(Customer, CampaignRecipient.customer_id == Customer.id)
        .where(CampaignRecipient.campaign_id == campaign_id, CampaignRecipient.tenant_id == tenant_id)
    )
    recip_res = await db.execute(recip_stmt)
    recip_rows = recip_res.all()

    recipients_list: list[CampaignRecipientResponse] = []
    sent_count = 0
    delivered_count = 0
    failed_count = 0

    for recip, cust_name in recip_rows:
        dto = CampaignRecipientResponse.model_validate(recip)
        dto.customer_name = cust_name
        recipients_list.append(dto)

        if recip.status == "SENT":
            sent_count += 1
        elif recip.status == "DELIVERED":
            delivered_count += 1
        elif recip.status == "FAILED":
            failed_count += 1

    channels_used = determine_active_channels(tenant, template)

    detail = CampaignDetailResponse.model_validate(campaign)
    detail.template_name = template.name
    detail.total_recipients = len(recipients_list)
    detail.sent_count = sent_count
    detail.delivered_count = delivered_count
    detail.failed_count = failed_count
    detail.actual_channels_used = channels_used
    detail.recipients = recipients_list
    return detail


@router.post("/campaigns/{campaign_id}/send", response_model=CampaignResponse)
async def send_campaign(
    campaign_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> CampaignResponse:
    campaign = await execute_campaign_send(db, campaign_id, tenant_id, current_user.id)

    # Fetch template name
    tmpl_stmt = select(Template.name).where(Template.id == campaign.template_id)
    tmpl_res = await db.execute(tmpl_stmt)
    tmpl_name = tmpl_res.scalar_one_or_none()

    res_dto = CampaignResponse.model_validate(campaign)
    res_dto.template_name = tmpl_name
    return res_dto
