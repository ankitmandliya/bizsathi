from fastapi import APIRouter, Depends
from app.api.deps import require_module_access

from app.api.v1.auth.routes import router as auth_router
from app.api.v1.communication.routes import router as communication_router
from app.api.v1.crm.routes import router as crm_router
from app.api.v1.customers.routes import router as customers_router
from app.api.v1.health.routes import router as health_router
from app.api.v1.hrm.routes import router as hrm_router
from app.api.v1.payroll.routes import router as payroll_router
from app.api.v1.reports.routes import router as reports_router
from app.api.v1.subscriptions.routes import router as subscriptions_router
from app.api.v1.tenants.routes import router as tenants_router
from app.api.v1.users.routes import router as users_router
from app.api.v1.vendors.routes import router as vendors_router

from app.api.v1.sales.routes import router as sales_router
from app.api.v1.marketing.routes import router as marketing_router
from app.api.v1.expenses.routes import categories_router, expenses_router
from app.api.v1.admin.routes import router as admin_router
from app.api.v1.audit_logs.routes import router as audit_logs_router
from app.api.v1.inventory.routes import router as inventory_router

from app.api.deps import get_current_tenant, get_current_user
from app.core.database import get_db
from app.models.domain import User
from app.services.usage_service import UsageService
from typing import Annotated, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1")

tenant_usage_router = APIRouter(prefix="/tenant", tags=["tenant-usage"])


@tenant_usage_router.get("/usage")
async def get_singular_tenant_usage(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await UsageService.get_tenant_usage_metrics(db, tenant_id)


router.include_router(tenant_usage_router)
router.include_router(auth_router)
router.include_router(admin_router)
router.include_router(health_router)
router.include_router(tenants_router)
router.include_router(users_router)
router.include_router(subscriptions_router)
router.include_router(audit_logs_router)

# Entitlement-gated modules
router.include_router(crm_router, dependencies=[Depends(require_module_access("crm"))])
router.include_router(sales_router, dependencies=[Depends(require_module_access("sales"))])
router.include_router(customers_router, dependencies=[Depends(require_module_access("customers"))])
router.include_router(vendors_router, dependencies=[Depends(require_module_access("vendors"))])
router.include_router(hrm_router, dependencies=[Depends(require_module_access("hrm"))])
router.include_router(payroll_router, dependencies=[Depends(require_module_access("hrm"))])
router.include_router(reports_router, dependencies=[Depends(require_module_access("reports"))])
router.include_router(communication_router, dependencies=[Depends(require_module_access("marketing"))])
router.include_router(marketing_router, dependencies=[Depends(require_module_access("marketing"))])
router.include_router(categories_router, dependencies=[Depends(require_module_access("expenses"))])
router.include_router(expenses_router, dependencies=[Depends(require_module_access("expenses"))])
router.include_router(inventory_router, dependencies=[Depends(require_module_access("inventory"))])



