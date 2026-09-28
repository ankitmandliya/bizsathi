from datetime import date, datetime
from decimal import Decimal
import ipaddress
from math import ceil
import os
from typing import Any
from uuid import UUID

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import AuditLog, User
from app.schemas.audit import AuditLogResponse, PaginatedAuditLogsResponse

DEFAULT_TRUSTED_PROXIES = {"127.0.0.1", "::1"}

SENSITIVE_FIELDS = {
    "password",
    "password_hash",
    "token",
    "reset_token",
    "api_key",
    "secret",
    "access_token",
    "refresh_token",
}

MASKED_FIELDS = {"bank_account_number", "account_number", "card_number"}


def is_trusted_proxy(ip_str: str | None) -> bool:
    if not ip_str:
        return False

    trusted_env = os.getenv("TRUSTED_PROXIES", "").strip()
    trusted_set = set(DEFAULT_TRUSTED_PROXIES)
    if trusted_env:
        for p in trusted_env.split(","):
            if p.strip():
                trusted_set.add(p.strip())

    try:
        ip_obj = ipaddress.ip_address(ip_str)
        for t in trusted_set:
            try:
                if "/" in t:
                    if ip_obj in ipaddress.ip_network(t, strict=False):
                        return True
                elif ipaddress.ip_address(t) == ip_obj:
                    return True
            except ValueError:
                continue
    except ValueError:
        return False

    return False


def get_client_ip(request: Request | None) -> str | None:
    if not request or not request.client:
        return None

    direct_ip = request.client.host
    if is_trusted_proxy(direct_ip):
        xff = request.headers.get("X-Forwarded-For")
        if xff:
            client_ip = xff.split(",")[0].strip()
            if client_ip:
                return client_ip

    return direct_ip


def get_user_agent(request: Request | None) -> str | None:
    if not request:
        return None
    ua = request.headers.get("User-Agent")
    return ua[:512] if ua else None


def mask_value(field: str, val: Any) -> Any:
    if val is None:
        return None
    if field in SENSITIVE_FIELDS:
        return "********"
    if field in MASKED_FIELDS:
        s = str(val)
        return f"****{s[-4:]}" if len(s) >= 4 else "****"
    if isinstance(val, (date, datetime)):
        return val.isoformat()
    if isinstance(val, UUID):
        return str(val)
    if isinstance(val, Decimal):
        return float(val)
    return val


def extract_field_value(obj: Any, field: str) -> Any:
    if isinstance(obj, dict):
        return obj.get(field)
    return getattr(obj, field, None)


def compute_changes(before: Any, after: Any, tracked_fields: list[str]) -> dict[str, dict[str, Any]]:
    diffs: dict[str, dict[str, Any]] = {}
    for field in tracked_fields:
        if field in SENSITIVE_FIELDS:
            continue

        old_val = extract_field_value(before, field) if before is not None else None
        new_val = extract_field_value(after, field) if after is not None else None

        if old_val != new_val:
            diffs[field] = {
                "old": mask_value(field, old_val),
                "new": mask_value(field, new_val),
            }

    return diffs


async def log_audit_event(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    actor_name: str | None = None,
    entity_label: str | None = None,
    changes: dict[str, Any] | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    commit: bool = True,
) -> AuditLog:
    resolved_actor_name = actor_name
    if not resolved_actor_name and user_id:
        try:
            user_res = await db.execute(select(User).where(User.id == user_id))
            user = user_res.scalar_one_or_none()
            if user and hasattr(user, "full_name"):
                resolved_actor_name = getattr(user, "full_name", None) or getattr(user, "email", None)
        except Exception:
            pass

    audit_entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        actor_name=resolved_actor_name,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=entity_label,
        changes=changes,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(audit_entry)
    if commit:
        await db.commit()
        await db.refresh(audit_entry)
    else:
        await db.flush()

    return audit_entry


async def list_audit_logs(
    db: AsyncSession,
    tenant_id: UUID,
    entity_type: str | None = None,
    entity_id: str | None = None,
    user_id: UUID | None = None,
    action: str | None = None,
    date_from: date | datetime | None = None,
    date_to: date | datetime | None = None,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedAuditLogsResponse:
    page_size = max(1, min(page_size, 100))  # Sane cap max 100 per page

    stmt = select(AuditLog).where(AuditLog.tenant_id == tenant_id)

    if entity_type:
        raw_types = [t.strip().lower() for t in entity_type.split(",") if t.strip()]
        expanded_types: set[str] = set()
        for t in raw_types:
            expanded_types.add(t)
            expanded_types.add(t.replace("_", ""))
            if t == "leave":
                expanded_types.add("leaverequest")
                expanded_types.add("leave_request")
        stmt = stmt.where(func.lower(func.replace(AuditLog.entity_type, "_", "")).in_(list(expanded_types)))

    if entity_id:
        ids = [i.strip() for i in entity_id.split(",") if i.strip()]
        if len(ids) == 1:
            stmt = stmt.where(AuditLog.entity_id == ids[0])
        elif len(ids) > 1:
            stmt = stmt.where(AuditLog.entity_id.in_(ids))

    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)

    if action:
        actions = [a.strip().lower() for a in action.split(",") if a.strip()]
        if len(actions) == 1:
            stmt = stmt.where(func.lower(AuditLog.action) == actions[0])
        elif len(actions) > 1:
            stmt = stmt.where(func.lower(AuditLog.action).in_(actions))

    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Paginate
    stmt = stmt.order_by(AuditLog.created_at.desc())
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    res = await db.execute(stmt)
    logs = list(res.scalars().all())

    total_pages = ceil(total / page_size) if total > 0 else 1

    return PaginatedAuditLogsResponse(
        items=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
