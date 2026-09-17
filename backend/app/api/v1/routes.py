from fastapi import APIRouter

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

router = APIRouter(prefix="/api/v1")

router.include_router(auth_router)
router.include_router(health_router)
router.include_router(tenants_router)
router.include_router(users_router)
router.include_router(crm_router)
router.include_router(sales_router)
router.include_router(customers_router)
router.include_router(vendors_router)
router.include_router(hrm_router)
router.include_router(payroll_router)
router.include_router(subscriptions_router)
router.include_router(reports_router)
router.include_router(communication_router)
