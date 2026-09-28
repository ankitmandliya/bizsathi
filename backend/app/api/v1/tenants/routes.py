from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user
from app.core.database import get_db
from app.models.domain import AuditLog, Tenant, TenantMember, User
from app.schemas.tenant import TenantResponse, TenantSettingsUpdate

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("", response_model=list[TenantResponse])
async def list_user_tenants(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[TenantResponse]:
    stmt = (
        select(Tenant)
        .join(TenantMember, Tenant.id == TenantMember.tenant_id)
        .where(TenantMember.user_id == current_user.id, TenantMember.status == "active")
    )
    res = await db.execute(stmt)
    tenants = list(res.scalars().all())
    return [TenantResponse.model_validate(t) for t in tenants]


@router.put("/settings/channels", response_model=TenantResponse)
async def update_tenant_channels_settings(
    body: TenantSettingsUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> TenantResponse:
    stmt = select(Tenant).where(Tenant.id == tenant_id)
    res = await db.execute(stmt)
    tenant = res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    tenant.logo_url = body.logo_url
    tenant.whatsapp_enabled = body.whatsapp_enabled
    tenant.whatsapp_business_number = body.whatsapp_business_number
    if body.whatsapp_api_key:
        tenant.whatsapp_api_key = body.whatsapp_api_key
    tenant.email_enabled = body.email_enabled
    tenant.email_sender_name = body.email_sender_name

    audit = AuditLog(
        tenant_id=tenant_id,
        user_id=current_user.id,
        action="tenant.settings.update_channels",
        entity_type="Tenant",
        entity_id=str(tenant.id),
        details={
            "whatsapp_enabled": tenant.whatsapp_enabled,
            "email_enabled": tenant.email_enabled,
        },
    )
    db.add(audit)

    await db.commit()
    await db.refresh(tenant)
    return TenantResponse.model_validate(tenant)


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant_by_id(
    tenant_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> TenantResponse:
    stmt = (
        select(Tenant)
        .join(TenantMember, Tenant.id == TenantMember.tenant_id)
        .where(
            Tenant.id == tenant_id,
            TenantMember.user_id == current_user.id,
            TenantMember.status == "active",
        )
    )
    res = await db.execute(stmt)
    tenant = res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or access denied",
        )
    return TenantResponse.model_validate(tenant)

