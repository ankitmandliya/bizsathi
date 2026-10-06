from datetime import UTC, datetime, timedelta
import logging
import secrets
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.domain import EmailDelivery, Session, Tenant, TenantMember, User
from app.services.audit import log_audit_event
from app.services.crm import seed_default_pipeline_stages
from app.services.email import EmailService

logger = logging.getLogger(__name__)

UNSET_PASSWORD_SENTINEL = "!UNSET_INVITE_PENDING!"


async def create_tenant_and_owner(
    db: AsyncSession,
    business_name: str,
    owner_name: str,
    owner_email: str,
    created_via: str = "SELF_SIGNUP",
    password: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    actor_id: UUID | None = None,
    actor_name: str | None = None,
) -> tuple[Tenant, User, str | None]:
    """Unified service for creating a new Tenant and its Owner User.
    Supports both Self-Service Signup (created_via="SELF_SIGNUP") and
    Super-Admin Provisioning (created_via="SUPER_ADMIN").
    """
    clean_email = owner_email.lower().strip()

    # Check if user email already exists
    user_stmt = select(User).where(User.email == clean_email)
    user_res = await db.execute(user_stmt)
    existing_user = user_res.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered",
        )

    # 1. Create User
    if password:
        password_hash = hash_password(password)
    else:
        # Sentinel value indicating setup pending via invite link
        password_hash = UNSET_PASSWORD_SENTINEL

    user = User(
        email=clean_email,
        password_hash=password_hash,
        full_name=owner_name.strip(),
        is_active=True,
        is_verified=False,
        is_platform_admin=False,
    )
    db.add(user)
    await db.flush()

    # 2. Create Tenant
    slug_base = business_name.lower().replace(" ", "-")
    slug = f"{slug_base}-{str(user.id)[:6]}"
    tenant = Tenant(
        name=business_name.strip(),
        slug=slug,
        is_active=True,
        status="Active",
        created_via=created_via,
    )
    db.add(tenant)
    await db.flush()

    # 3. Create TenantMember (Owner)
    member = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        is_owner=True,
        status="active",
    )
    db.add(member)

    # 4. Seed default pipeline stages
    await seed_default_pipeline_stages(db, tenant.id)

    # 5. Handle Invite Token & Invitation Email if SUPER_ADMIN provisioned
    invite_token: str | None = None
    if created_via == "SUPER_ADMIN":
        invite_token = secrets.token_urlsafe(32)
        session_entry = Session(
            user_id=user.id,
            token=f"invite_{invite_token}",
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=datetime.now(UTC) + timedelta(days=7),
        )
        db.add(session_entry)

        setup_url = f"http://localhost:5173/complete-setup?token={invite_token}"
        email_service = EmailService()
        email_sent, err_msg = email_service.send_business_invitation(
            to_email=user.email,
            owner_name=user.full_name,
            business_name=tenant.name,
            setup_url=setup_url,
        )

        delivery = EmailDelivery(
            id=uuid4(),
            tenant_id=tenant.id,
            recipient_email=user.email,
            email_type="BUSINESS_INVITATION",
            status="SENT" if email_sent else "FAILED",
            provider="SMTP",
            error_message=err_msg,
            sent_at=datetime.now(UTC) if email_sent else None,
        )
        db.add(delivery)
        logger.info(
            "Provisioned invitation token generated for %s. Email delivery status: %s",
            user.email,
            "SENT" if email_sent else f"FAILED ({err_msg})",
        )

    # Audit log
    audit_action = "tenant.create_provisioned" if created_via == "SUPER_ADMIN" else "tenant.create_self_signup"
    await log_audit_event(
        db,
        tenant_id=tenant.id,
        user_id=actor_id or user.id,
        actor_name=actor_name or user.full_name or user.email,
        action=audit_action,
        entity_type="tenant",
        entity_id=str(tenant.id),
        entity_label=tenant.name,
        details={"created_via": created_via, "owner_email": user.email},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    await db.commit()
    await db.refresh(tenant)
    await db.refresh(user)

    return tenant, user, invite_token


async def get_tenant_invitation_status(db: AsyncSession, tenant_id: UUID) -> tuple[str, datetime | None]:
    """Retrieve the latest invitation email delivery status and sent timestamp for a tenant."""
    try:
        async with db.begin_nested():
            stmt = (
                select(EmailDelivery)
                .where(EmailDelivery.tenant_id == tenant_id, EmailDelivery.email_type == "BUSINESS_INVITATION")
                .order_by(EmailDelivery.created_at.desc())
            )
            res = await db.execute(stmt)
            latest = res.scalars().first()
            if not latest:
                return "PENDING", None
            return latest.status, latest.sent_at or latest.created_at
    except Exception as err:
        logger.warning("Could not query invitation email status for tenant %s: %s", tenant_id, err)
        return "PENDING", None


async def resend_business_invitation(
    db: AsyncSession,
    tenant_id: UUID,
    actor_id: UUID,
    actor_name: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[bool, str]:
    """Resend business account setup invitation email to the business owner."""
    # Find tenant
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    # Find owner user
    owner_stmt = (
        select(User)
        .join(TenantMember, TenantMember.user_id == User.id)
        .where(TenantMember.tenant_id == tenant_id, TenantMember.is_owner.is_(True))
    )
    owner_res = await db.execute(owner_stmt)
    owner = owner_res.scalar_one_or_none()
    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business owner not found")

    if owner.password_hash != UNSET_PASSWORD_SENTINEL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account setup has already been completed by the business owner.",
        )

    # Check for existing unexpired invite token or generate a new token
    now = datetime.now(UTC)
    session_stmt = (
        select(Session)
        .where(
            Session.user_id == owner.id,
            Session.token.like("invite_%"),
            Session.expires_at > now,
        )
        .order_by(Session.created_at.desc())
    )
    session_res = await db.execute(session_stmt)
    existing_session = session_res.scalars().first()

    if existing_session:
        raw_token = existing_session.token.replace("invite_", "", 1)
    else:
        raw_token = secrets.token_urlsafe(32)
        new_session = Session(
            user_id=owner.id,
            token=f"invite_{raw_token}",
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=now + timedelta(days=7),
        )
        db.add(new_session)

    setup_url = f"http://localhost:5173/complete-setup?token={raw_token}"
    email_service = EmailService()
    email_sent, err_msg = email_service.send_business_invitation(
        to_email=owner.email,
        owner_name=owner.full_name,
        business_name=tenant.name,
        setup_url=setup_url,
    )

    delivery = EmailDelivery(
        id=uuid4(),
        tenant_id=tenant.id,
        recipient_email=owner.email,
        email_type="BUSINESS_INVITATION",
        status="SENT" if email_sent else "FAILED",
        provider="SMTP",
        error_message=err_msg,
        sent_at=now if email_sent else None,
    )
    db.add(delivery)

    await log_audit_event(
        db,
        tenant_id=tenant.id,
        user_id=actor_id,
        actor_name=actor_name,
        action="tenant.resend_invitation",
        entity_type="tenant",
        entity_id=str(tenant.id),
        entity_label=tenant.name,
        details={"recipient_email": owner.email, "status": "SENT" if email_sent else "FAILED"},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    await db.commit()

    if email_sent:
        return True, "Invitation email resent successfully."
    return False, f"Failed to send invitation email: {err_msg}"


async def get_or_create_tenant_setup_link(
    db: AsyncSession,
    tenant_id: UUID,
) -> dict[str, Any]:
    """Super Admin utility to fetch active setup link for setup-pending tenant owner."""
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    owner_stmt = (
        select(User)
        .join(TenantMember, TenantMember.user_id == User.id)
        .where(TenantMember.tenant_id == tenant_id, TenantMember.is_owner.is_(True))
    )
    owner_res = await db.execute(owner_stmt)
    owner = owner_res.scalar_one_or_none()
    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business owner not found")

    if owner.password_hash != UNSET_PASSWORD_SENTINEL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account setup has already been completed by the business owner.",
        )

    now = datetime.now(UTC)
    session_stmt = (
        select(Session)
        .where(
            Session.user_id == owner.id,
            Session.token.like("invite_%"),
            Session.expires_at > now,
        )
        .order_by(Session.created_at.desc())
    )
    session_res = await db.execute(session_stmt)
    existing_session = session_res.scalars().first()

    if existing_session:
        raw_token = existing_session.token.replace("invite_", "", 1)
        expires_at = existing_session.expires_at
    else:
        raw_token = secrets.token_urlsafe(32)
        expires_at = now + timedelta(days=7)
        new_session = Session(
            user_id=owner.id,
            token=f"invite_{raw_token}",
            user_agent=None,
            ip_address=None,
            expires_at=expires_at,
        )
        db.add(new_session)
        await db.commit()

    setup_url = f"http://localhost:5173/complete-setup?token={raw_token}"
    return {
        "tenant_id": str(tenant.id),
        "owner_email": owner.email,
        "owner_name": owner.full_name,
        "setup_url": setup_url,
        "expires_at": expires_at,
    }


async def manual_verify_tenant_setup(
    db: AsyncSession,
    tenant_id: UUID,
    password: str | None,
    actor_id: UUID,
    actor_name: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, str]:
    """Super Admin action to manually set owner password and verify account setup."""
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    owner_stmt = (
        select(User)
        .join(TenantMember, TenantMember.user_id == User.id)
        .where(TenantMember.tenant_id == tenant_id, TenantMember.is_owner.is_(True))
    )
    owner_res = await db.execute(owner_stmt)
    owner = owner_res.scalar_one_or_none()
    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business owner not found")

    final_password = password.strip() if password and password.strip() else "BizSathi@2026"
    owner.password_hash = hash_password(final_password)
    owner.is_verified = True
    owner.is_active = True

    # Delete any invitation session tokens for this user
    del_stmt = select(Session).where(Session.user_id == owner.id, Session.token.like("invite_%"))
    del_res = await db.execute(del_stmt)
    for s in del_res.scalars().all():
        await db.delete(s)

    await log_audit_event(
        db,
        tenant_id=tenant.id,
        user_id=actor_id,
        actor_name=actor_name,
        action="tenant.manual_verify_setup",
        entity_type="tenant",
        entity_id=str(tenant.id),
        entity_label=tenant.name,
        details={"owner_email": owner.email, "verified_by_admin": True},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    await db.commit()
    await db.refresh(owner)
    return owner, final_password
