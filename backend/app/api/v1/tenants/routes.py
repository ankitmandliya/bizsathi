from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user
from app.core.database import get_db
from app.models.domain import Tenant, TenantMember, User
from app.schemas.tenant import TenantResponse, TenantSettingsUpdate
from app.services.audit import compute_changes, get_client_ip, get_user_agent, log_audit_event

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


@router.get("/current", response_model=TenantResponse)
async def get_current_tenant_info(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> TenantResponse:
    stmt = select(Tenant).where(Tenant.id == tenant_id)
    res = await db.execute(stmt)
    tenant = res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return TenantResponse.model_validate(tenant)


@router.put("/settings/channels", response_model=TenantResponse)
async def update_tenant_channels_settings(
    body: TenantSettingsUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> TenantResponse:
    stmt = select(Tenant).where(Tenant.id == tenant_id)
    res = await db.execute(stmt)
    tenant = res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    tracked = ["name", "logo_url", "whatsapp_enabled", "whatsapp_business_number", "email_enabled", "email_sender_name"]
    before_dict = {f: getattr(tenant, f, None) for f in tracked}

    if body.name and body.name.strip():
        tenant.name = body.name.strip()
    tenant.logo_url = body.logo_url
    tenant.whatsapp_enabled = body.whatsapp_enabled
    tenant.whatsapp_business_number = body.whatsapp_business_number
    if body.whatsapp_api_key:
        tenant.whatsapp_api_key = body.whatsapp_api_key
    tenant.email_enabled = body.email_enabled
    tenant.email_sender_name = body.email_sender_name

    changes = compute_changes(before_dict, tenant, tracked)

    await log_audit_event(
        db,
        tenant_id=tenant_id,
        user_id=current_user.id,
        action="tenant.settings.update_channels",
        entity_type="Tenant",
        entity_id=str(tenant.id),
        entity_label=tenant.name,
        changes=changes,
        details={
            "whatsapp_enabled": tenant.whatsapp_enabled,
            "email_enabled": tenant.email_enabled,
        },
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        commit=False,
    )

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


@router.get("/usage/metrics")
@router.get("/usage")
async def get_tenant_usage(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    from app.services.usage_service import UsageService

    metrics = await UsageService.get_tenant_usage_metrics(db, tenant_id)
    return metrics


@router.post("/members")
async def add_tenant_member(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    from app.core.security import hash_password
    from app.services.usage_service import UsageService

    body = await request.json()
    email = body.get("email", "").strip().lower()
    full_name = body.get("full_name", email)

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    stmt = select(User).where(User.email == email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    # Enforce user limit check before adding new user
    await UsageService.check_tenant_user_limit(db, tenant_id, target_user_id=user.id if user else None)

    if not user:
        user = User(
            email=email,
            password_hash=hash_password("Password123!"),
            full_name=full_name,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()

    tm_stmt = select(TenantMember).where(
        TenantMember.tenant_id == tenant_id, TenantMember.user_id == user.id
    )
    tm_res = await db.execute(tm_stmt)
    member = tm_res.scalar_one_or_none()

    if not member:
        member = TenantMember(
            tenant_id=tenant_id,
            user_id=user.id,
            is_owner=False,
            status="active",
        )
        db.add(member)
        await db.commit()

    return {
        "status": "success",
        "member_id": str(member.id),
        "user_id": str(user.id),
        "email": user.email,
    }

