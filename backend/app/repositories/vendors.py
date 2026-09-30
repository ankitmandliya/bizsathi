from datetime import datetime, UTC
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import StockMovement
from app.models.vendors import Vendor


class VendorRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, vendor: Vendor) -> Vendor:
        self.db.add(vendor)
        await self.db.flush()
        return vendor

    async def get_by_id(self, tenant_id: UUID, vendor_id: UUID) -> Vendor | None:
        stmt = select(Vendor).where(
            Vendor.tenant_id == tenant_id,
            Vendor.id == vendor_id,
            Vendor.deleted_at.is_(None),
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_phone(self, tenant_id: UUID, phone: str) -> Vendor | None:
        stmt = select(Vendor).where(
            Vendor.tenant_id == tenant_id,
            Vendor.phone == phone.strip(),
            Vendor.deleted_at.is_(None),
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_vendors(
        self,
        tenant_id: UUID,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Vendor], int]:
        base_query = select(Vendor).where(
            Vendor.tenant_id == tenant_id,
            Vendor.deleted_at.is_(None),
        )

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            base_query = base_query.where(
                or_(
                    func.lower(Vendor.name).like(term),
                    func.lower(Vendor.company_name).like(term),
                    func.lower(Vendor.phone).like(term),
                    func.lower(Vendor.email).like(term),
                    func.lower(Vendor.gstin).like(term),
                    func.lower(Vendor.contact_person).like(term),
                )
            )

        # Count total
        count_stmt = select(func.count()).select_from(base_query.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar_one() or 0

        # Items paginated
        items_stmt = base_query.order_by(Vendor.created_at.desc()).offset(skip).limit(limit)
        items_res = await self.db.execute(items_stmt)
        items = list(items_res.scalars().all())

        return items, total

    async def update(self, tenant_id: UUID, vendor_id: UUID, update_data: dict) -> Vendor | None:
        vendor = await self.get_by_id(tenant_id, vendor_id)
        if not vendor:
            return None

        for field, value in update_data.items():
            if hasattr(vendor, field):
                setattr(vendor, field, value)

        vendor.updated_at = datetime.now(UTC)
        await self.db.flush()
        return vendor

    async def soft_delete(self, tenant_id: UUID, vendor_id: UUID) -> bool:
        vendor = await self.get_by_id(tenant_id, vendor_id)
        if not vendor:
            return False

        vendor.deleted_at = datetime.now(UTC)
        await self.db.flush()
        return True

    async def count_stock_movements_by_vendor(self, tenant_id: UUID, vendor_id: UUID) -> int:
        stmt = select(func.count(StockMovement.id)).where(
            StockMovement.tenant_id == tenant_id,
            StockMovement.vendor_id == vendor_id,
        )
        res = await self.db.execute(stmt)
        return res.scalar_one() or 0
