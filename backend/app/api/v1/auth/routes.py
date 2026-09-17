from datetime import UTC, datetime, timedelta
import logging
import secrets
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.domain import Session, Tenant, TenantMember, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserProfileResponse,
)
from app.services.audit import log_audit_event
from app.services.crm import seed_default_pipeline_stages

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000"

try:
    from workers.tasks.email import send_email_task  # type: ignore[import-not-found]
except ImportError:
    def send_email_task(to_email: str, subject: str, body: str) -> dict[str, Any]:
        logger.info("[Email Fallback] To: %s | Subject: %s | Body: %s", to_email, subject, body)
        return {"status": "sent", "to": to_email, "subject": subject}


def get_client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    ip_addr = get_client_ip(request)
    stmt = select(User).where(User.email == body.email.lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        await log_audit_event(
            db,
            tenant_id=user.id if False else DEFAULT_TENANT_ID,  # type: ignore[arg-type]
            user_id=user.id if user else None,
            action="user.login.failure",
            entity_type="user",
            details={"email": body.email.lower(), "reason": "invalid_credentials"},
            ip_address=ip_addr,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        await log_audit_event(
            db,
            tenant_id=DEFAULT_TENANT_ID,  # type: ignore[arg-type]
            user_id=user.id,
            action="user.login.failure",
            entity_type="user",
            details={"email": body.email.lower(), "reason": "user_inactive"},
            ip_address=ip_addr,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Resolve active tenant for audit record
    tenant_stmt = select(TenantMember.tenant_id).where(
        TenantMember.user_id == user.id, TenantMember.status == "active"
    )
    tenant_res = await db.execute(tenant_stmt)
    active_tenant_id = tenant_res.scalar_one_or_none() or DEFAULT_TENANT_ID

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    await log_audit_event(
        db,
        tenant_id=active_tenant_id,  # type: ignore[arg-type]
        user_id=user.id,
        action="user.login.success",
        entity_type="user",
        details={"email": user.email},
        ip_address=ip_addr,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/register", response_model=UserProfileResponse)
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    ip_addr = get_client_ip(request)
    stmt = select(User).where(User.email == body.email.lower())
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered",
        )

    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    tenant_name = body.tenant_name or f"{body.full_name}'s Workspace"
    slug = tenant_name.lower().replace(" ", "-") + f"-{str(user.id)[:4]}"
    tenant = Tenant(name=tenant_name, slug=slug, is_active=True)
    db.add(tenant)
    await db.flush()

    await seed_default_pipeline_stages(db, tenant.id)

    member = TenantMember(
        tenant_id=tenant.id,
        user_id=user.id,
        is_owner=True,
        status="active",
    )
    db.add(member)

    # Generate email verification token
    verify_token = secrets.token_urlsafe(32)
    verify_session = Session(
        user_id=user.id,
        token=f"verify_{verify_token}",
        user_agent=request.headers.get("User-Agent"),
        ip_address=ip_addr,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db.add(verify_session)

    await db.commit()
    await db.refresh(user)

    send_email_task(
        user.email,
        "Verify Your BizSathi Account",
        f"Use link: http://localhost:5173/verify-email?token={verify_token}",
    )
    logger.info("Verification token generated for %s: %s", user.email, verify_token)

    await log_audit_event(
        db,
        tenant_id=tenant.id,
        user_id=user.id,
        action="user.register",
        entity_type="user",
        details={"email": user.email, "tenant_name": tenant.name},
        ip_address=ip_addr,
    )

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified=user.is_verified,
        tenant_id=tenant.id,
        roles=["owner"],
        permissions=["*"],
    )


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    ip_addr = get_client_ip(request)
    stmt = select(User).where(User.email == body.email.lower(), User.is_active.is_(True))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if user:
        reset_token = secrets.token_urlsafe(32)
        session_entry = Session(
            user_id=user.id,
            token=f"reset_{reset_token}",
            user_agent=request.headers.get("User-Agent"),
            ip_address=ip_addr,
            expires_at=datetime.now(UTC) + timedelta(minutes=30),
        )
        db.add(session_entry)
        await db.commit()

        send_email_task(
            user.email,
            "Reset Your BizSathi Password",
            f"Use reset token: {reset_token}",
        )
        logger.info("Password reset token generated for %s: %s", user.email, reset_token)

        await log_audit_event(
            db,
            tenant_id=DEFAULT_TENANT_ID,  # type: ignore[arg-type]
            user_id=user.id,
            action="user.forgot_password.request",
            entity_type="user",
            details={"email": user.email},
            ip_address=ip_addr,
        )

    return {"message": "If email is registered, a password reset token has been sent."}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    ip_addr = get_client_ip(request)
    token_key = f"reset_{body.token}"
    stmt = select(Session).where(
        Session.token == token_key, Session.expires_at > datetime.now(UTC)
    )
    res = await db.execute(stmt)
    sess = res.scalar_one_or_none()

    if not sess:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token",
        )

    user_stmt = select(User).where(User.id == sess.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User associated with token not found",
        )

    user.password_hash = hash_password(body.new_password)
    await db.execute(delete(Session).where(Session.token == token_key))
    await db.commit()

    await log_audit_event(
        db,
        tenant_id=DEFAULT_TENANT_ID,  # type: ignore[arg-type]
        user_id=user.id,
        action="user.reset_password.success",
        entity_type="user",
        details={"email": user.email},
        ip_address=ip_addr,
    )

    return {"message": "Password successfully reset"}


@router.get("/verify-email")
async def verify_email(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    ip_addr = get_client_ip(request)
    token_key = f"verify_{token}"
    stmt = select(Session).where(
        Session.token == token_key, Session.expires_at > datetime.now(UTC)
    )
    res = await db.execute(stmt)
    sess = res.scalar_one_or_none()

    if not sess:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    user_stmt = select(User).where(User.id == sess.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User associated with token not found",
        )

    user.is_verified = True
    await db.execute(delete(Session).where(Session.token == token_key))
    await db.commit()

    await log_audit_event(
        db,
        tenant_id=DEFAULT_TENANT_ID,  # type: ignore[arg-type]
        user_id=user.id,
        action="user.verify_email.success",
        entity_type="user",
        details={"email": user.email},
        ip_address=ip_addr,
    )

    return {"message": "Email successfully verified"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(body: RefreshTokenRequest) -> TokenResponse:
    try:
        payload = decode_token(body.refresh_token)
        user_id_str = payload.get("sub", "")
        if not user_id_str:
            raise ValueError("Invalid refresh payload")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from exc

    new_access = create_access_token(subject=user_id_str)
    new_refresh = create_refresh_token(subject=user_id_str)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant_id: Annotated[Any, Depends(get_current_tenant)],
) -> UserProfileResponse:
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        tenant_id=current_tenant_id,
        roles=["member"],
        permissions=["*"],
    )


@router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant_id: Annotated[Any, Depends(get_current_tenant)],
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    await log_audit_event(
        db,
        tenant_id=current_tenant_id,
        user_id=current_user.id,
        action="user.logout",
        entity_type="user",
        details={"email": current_user.email},
        ip_address=get_client_ip(request),
    )
    return {"status": "logged_out"}
