from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import Product, ProductCategory, StockMovement, Unit


class ProductCategoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_categories(self, tenant_id: UUID, include_inactive: bool = True) -> list[ProductCategory]:
        stmt = select(ProductCategory).where(ProductCategory.tenant_id == tenant_id)
        if not include_inactive:
            stmt = stmt.where(ProductCategory.is_active.is_(True))
        stmt = stmt.order_by(ProductCategory.name.asc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_by_id(self, tenant_id: UUID, category_id: UUID) -> ProductCategory | None:
        stmt = select(ProductCategory).where(
            ProductCategory.id == category_id,
            ProductCategory.tenant_id == tenant_id,
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_name(self, tenant_id: UUID, name: str) -> ProductCategory | None:
        stmt = select(ProductCategory).where(
            ProductCategory.tenant_id == tenant_id,
            func.lower(ProductCategory.name) == name.strip().lower(),
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create(self, category: ProductCategory) -> ProductCategory:
        self.db.add(category)
        await self.db.flush()
        await self.db.refresh(category)
        return category

    async def delete(self, tenant_id: UUID, category_id: UUID) -> None:
        stmt = delete(ProductCategory).where(
            ProductCategory.id == category_id,
            ProductCategory.tenant_id == tenant_id,
        )
        await self.db.execute(stmt)

    async def count_products_by_category(self, tenant_id: UUID, category_id: UUID) -> int:
        stmt = select(func.count(Product.id)).where(
            Product.tenant_id == tenant_id,
            Product.category_id == category_id,
            Product.deleted_at.is_(None),
        )
        res = await self.db.execute(stmt)
        return res.scalar() or 0


class UnitRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_units(self, tenant_id: UUID, include_inactive: bool = True) -> list[Unit]:
        stmt = select(Unit).where(Unit.tenant_id == tenant_id)
        if not include_inactive:
            stmt = stmt.where(Unit.is_active.is_(True))
        stmt = stmt.order_by(Unit.name.asc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_by_id(self, tenant_id: UUID, unit_id: UUID) -> Unit | None:
        stmt = select(Unit).where(Unit.id == unit_id, Unit.tenant_id == tenant_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_name(self, tenant_id: UUID, name: str) -> Unit | None:
        stmt = select(Unit).where(
            Unit.tenant_id == tenant_id,
            func.lower(Unit.name) == name.strip().lower(),
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create(self, unit: Unit) -> Unit:
        self.db.add(unit)
        await self.db.flush()
        await self.db.refresh(unit)
        return unit

    async def delete(self, tenant_id: UUID, unit_id: UUID) -> None:
        stmt = delete(Unit).where(Unit.id == unit_id, Unit.tenant_id == tenant_id)
        await self.db.execute(stmt)

    async def count_products_by_unit(self, tenant_id: UUID, unit_id: UUID) -> int:
        stmt = select(func.count(Product.id)).where(
            Product.tenant_id == tenant_id,
            Product.unit_id == unit_id,
            Product.deleted_at.is_(None),
        )
        res = await self.db.execute(stmt)
        return res.scalar() or 0


class ProductRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_products(
        self,
        tenant_id: UUID,
        search: str | None = None,
        category_id: UUID | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Product], int]:
        stmt = select(Product).where(Product.tenant_id == tenant_id, Product.deleted_at.is_(None))

        if category_id is not None:
            stmt = stmt.where(Product.category_id == category_id)

        if is_active is not None:
            stmt = stmt.where(Product.is_active.is_(is_active))

        if search and search.strip():
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                (Product.name.ilike(term)) | (Product.sku.ilike(term)) | (Product.description.ilike(term))
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await self.db.execute(count_stmt)
        total = total_res.scalar() or 0

        stmt = stmt.order_by(Product.name.asc()).offset(skip).limit(limit)
        res = await self.db.execute(stmt)
        items = list(res.scalars().all())

        return items, total

    async def get_by_id(self, tenant_id: UUID, product_id: UUID, lock_for_update: bool = False) -> Product | None:
        stmt = select(Product).where(
            Product.id == product_id,
            Product.tenant_id == tenant_id,
            Product.deleted_at.is_(None),
        )
        if lock_for_update:
            stmt = stmt.with_for_update(of=Product)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_sku(self, tenant_id: UUID, sku: str) -> Product | None:
        stmt = select(Product).where(
            Product.tenant_id == tenant_id,
            func.lower(Product.sku) == sku.strip().lower(),
            Product.deleted_at.is_(None),
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create(self, product: Product) -> Product:
        self.db.add(product)
        await self.db.flush()
        await self.db.refresh(product)
        return product

    async def soft_delete(self, tenant_id: UUID, product_id: UUID) -> None:
        product = await self.get_by_id(tenant_id, product_id)
        if product:
            product.deleted_at = datetime.now(UTC)
            await self.db.flush()


class StockMovementRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, movement: StockMovement) -> StockMovement:
        self.db.add(movement)
        await self.db.flush()
        await self.db.refresh(movement)
        return movement

    async def get_current_stock(self, tenant_id: UUID, product_id: UUID) -> Decimal:
        stmt = select(StockMovement.movement_type, StockMovement.quantity).where(
            StockMovement.tenant_id == tenant_id,
            StockMovement.product_id == product_id,
        )
        res = await self.db.execute(stmt)
        movements = res.all()

        current = Decimal("0.00")
        for m_type, qty in movements:
            if m_type in ("OPENING", "IN"):
                current += Decimal(str(qty))
            elif m_type == "OUT":
                current -= Decimal(str(qty))
            elif m_type == "ADJUSTMENT":
                current += Decimal(str(qty))

        return current

    async def get_all_current_stocks(self, tenant_id: UUID) -> dict[UUID, Decimal]:
        stmt = (
            select(
                StockMovement.product_id,
                StockMovement.movement_type,
                func.sum(StockMovement.quantity),
            )
            .where(StockMovement.tenant_id == tenant_id)
            .group_by(StockMovement.product_id, StockMovement.movement_type)
        )
        res = await self.db.execute(stmt)
        rows = res.all()

        stock_map: dict[UUID, Decimal] = {}
        for p_id, m_type, qty in rows:
            if p_id not in stock_map:
                stock_map[p_id] = Decimal("0.00")
            val = Decimal(str(qty or 0))
            if m_type in ("OPENING", "IN"):
                stock_map[p_id] += val
            elif m_type == "OUT":
                stock_map[p_id] -= val
            elif m_type == "ADJUSTMENT":
                stock_map[p_id] += val

        return stock_map

    async def list_movements(
        self,
        tenant_id: UUID,
        product_id: UUID | None = None,
        movement_type: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        reference_type: str | None = None,
        reference_id: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[StockMovement], int]:
        stmt = select(StockMovement).where(StockMovement.tenant_id == tenant_id)

        if product_id is not None:
            stmt = stmt.where(StockMovement.product_id == product_id)

        if movement_type:
            stmt = stmt.where(StockMovement.movement_type == movement_type)

        if reference_type:
            stmt = stmt.where(StockMovement.reference_type == reference_type)

        if reference_id:
            stmt = stmt.where(StockMovement.reference_id == str(reference_id))

        if date_from:
            stmt = stmt.where(StockMovement.movement_date >= date_from)

        if date_to:
            stmt = stmt.where(StockMovement.movement_date <= date_to)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await self.db.execute(count_stmt)
        total = total_res.scalar() or 0

        stmt = stmt.order_by(StockMovement.movement_date.desc(), StockMovement.created_at.desc()).offset(skip).limit(limit)
        res = await self.db.execute(stmt)
        items = list(res.scalars().all())

        return items, total

    async def check_movement_exists(
        self,
        tenant_id: UUID,
        product_id: UUID,
        reference_type: str,
        reference_id: str,
        movement_type: str | None = None,
    ) -> bool:
        stmt = select(func.count(StockMovement.id)).where(
            StockMovement.tenant_id == tenant_id,
            StockMovement.product_id == product_id,
            StockMovement.reference_type == reference_type,
            StockMovement.reference_id == str(reference_id),
        )
        if movement_type:
            stmt = stmt.where(StockMovement.movement_type == movement_type)
        res = await self.db.execute(stmt)
        return (res.scalar() or 0) > 0
