from typing import Annotated, Any, Callable
from uuid import UUID

from fastapi import Depends, HTTPException, Header, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.domain import Role, Tenant, TenantMember, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
    token_query: str | None = Query(None, alias="token"),
    db: AsyncSession = Depends(get_db),
) -> User:
    auth_token = token or token_query
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(auth_token)
        user_id_str: str = payload.get("sub", "")
        if not user_id_str:
            raise ValueError("Token missing sub claim")
        user_id = UUID(user_id_str)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


async def get_current_platform_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )
    return current_user


async def get_current_tenant(
    current_user: Annotated[User, Depends(get_current_user)],
    x_tenant_id: Annotated[str | None, Header(alias="X-Tenant-ID")] = None,
    db: AsyncSession = Depends(get_db),
) -> UUID:
    # 1. If explicit X-Tenant-ID header is provided, verify active membership
    if x_tenant_id:
        try:
            requested_tenant_id = UUID(x_tenant_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Tenant-ID format",
            ) from exc

        stmt = select(TenantMember).where(
            TenantMember.user_id == current_user.id,
            TenantMember.tenant_id == requested_tenant_id,
            TenantMember.status == "active",
        )
        res = await db.execute(stmt)
        member = res.scalar_one_or_none()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this tenant",
            )
        resolved_tenant_id = member.tenant_id
    else:
        # 2. If no header provided, resolve default active tenant membership for current user
        stmt = select(TenantMember).where(
            TenantMember.user_id == current_user.id,
            TenantMember.status == "active",
        ).order_by(TenantMember.created_at.desc())
        res = await db.execute(stmt)
        active_member = res.scalars().first()
        if active_member:
            resolved_tenant_id = active_member.tenant_id
        elif current_user.is_superuser or current_user.is_platform_admin:
            return UUID("00000000-0000-0000-0000-000000000000")
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of any tenant",
            )

    # Check business suspension status
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == resolved_tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if tenant and getattr(tenant, "status", "Active") == "Suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business account is suspended",
        )

    return resolved_tenant_id


async def check_has_hr_access(current_user: User, tenant_id: UUID, db: AsyncSession) -> bool:
    """Return True if user is superuser, platform admin, owner, admin, or has HR role in this tenant."""
    if current_user.is_superuser or current_user.is_platform_admin:
        return True

    stmt = select(TenantMember).where(
        TenantMember.user_id == current_user.id,
        TenantMember.tenant_id == tenant_id,
        TenantMember.status == "active",
    ).order_by(TenantMember.created_at.desc())
    res = await db.execute(stmt)
    member = res.scalars().first()
    if not member:
        return False
    if member.is_owner:
        return True

    if member.role_id:
        role_res = await db.execute(select(Role).where(Role.id == member.role_id))
        role = role_res.scalars().first()
        if role and role.name.lower() in ("admin", "administrator", "owner", "hr", "hr manager", "hr_manager"):
            return True

    return False


def require_permission(permission_name: str) -> Callable[..., Any]:
    async def permission_dependency(
        current_user: Annotated[User, Depends(get_current_user)],
        tenant_id: Annotated[UUID, Depends(get_current_tenant)],
        db: AsyncSession = Depends(get_db),
    ) -> None:
        if current_user.is_superuser or current_user.is_platform_admin:
            return

        stmt = select(TenantMember).where(
            TenantMember.user_id == current_user.id,
            TenantMember.tenant_id == tenant_id,
            TenantMember.status == "active",
        )
        res = await db.execute(stmt)
        member = res.scalar_one_or_none()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this tenant",
            )
        if member.is_owner:
            return

        # Non-owner members must have valid role or permission
        if member.role_id:
            role_res = await db.execute(select(Role).where(Role.id == member.role_id))
            role = role_res.scalar_one_or_none()
            if role:
                rname = role.name.lower()
                if rname in ("admin", "administrator", "owner"):
                    return
                if permission_name.startswith("hrm.") and rname in ("hr", "hr manager", "hr_manager"):
                    return
                if permission_name.startswith("expense.") and rname in ("finance", "accountant", "manager", "accountant manager"):
                    return
                if permission_name.startswith("inventory.") and rname in ("inventory manager", "store manager", "inventory_manager", "store_manager", "manager"):
                    return


        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {permission_name} required",
        )

    return permission_dependency


def require_module_access(module_key: str) -> Callable[..., Any]:
    """Dependency that enforces Plan Entitlements & Subscription lifecycle status access for a module."""
    async def module_access_dependency(
        current_user: Annotated[User, Depends(get_current_user)],
        tenant_id: Annotated[UUID, Depends(get_current_tenant)],
        db: AsyncSession = Depends(get_db),
    ) -> None:
        if current_user.is_superuser or current_user.is_platform_admin:
            return

        from app.services.subscription_service import SubscriptionService
        sub_service = SubscriptionService(db)
        has_access = await sub_service.has_module_access(tenant_id, module_key)
        if not has_access:
            display_name = module_key.upper() if module_key.isupper() else module_key.title()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your plan doesn't include {display_name} — upgrade to access this.",
            )

    return module_access_dependency


async def require_user_limit(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    """Dependency that verifies active user count against plan's user_limit."""
    if current_user.is_superuser or current_user.is_platform_admin:
        return

    from app.services.subscription_service import SubscriptionService
    sub_service = SubscriptionService(db)
    is_allowed, current_count, user_limit = await sub_service.check_user_limit(tenant_id)
    if not is_allowed and user_limit is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User limit reached for your current plan (limit: {user_limit}). Upgrade to add more users.",
        )

