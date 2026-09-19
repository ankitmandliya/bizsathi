"""HRM End-of-Day evaluation task.

Callable from workers/scheduler or manually via API.
Marks ABSENT/LEAVE for all tenants for a given date.
"""

from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Tenant
from app.services.hrm import HRMService


async def run_eod_evaluation_all_tenants(db: AsyncSession, eval_date: date | None = None) -> dict:
    """Run EOD evaluation for all active tenants for the given date (defaults to today)."""
    target_date = eval_date or datetime.now(UTC).date()
    result = await db.scalars(select(Tenant).where(Tenant.is_active.is_(True)))
    tenants = result.all()

    summary: dict = {"date": str(target_date), "tenants": []}
    service = HRMService(db)

    for tenant in tenants:
        tenant_result = await service.run_eod_evaluation(tenant.id, target_date)
        summary["tenants"].append({"tenant_id": str(tenant.id), **tenant_result})

    return summary
