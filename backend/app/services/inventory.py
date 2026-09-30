from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID


from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import Product, ProductCategory, StockMovement, Unit
from app.repositories.inventory import (
    ProductCategoryRepository,
    ProductRepository,
    StockMovementRepository,
    UnitRepository,
)
from app.schemas.inventory import (
    InventoryDashboardResponse,
    LowStockReportItem,
    LowStockReportResponse,
    OpeningStockCreate,
    PaginatedProductsResponse,
    PaginatedStockMovementsResponse,
    ProductCategoryCreate,
    ProductCategoryUpdate,
    ProductCreate,
    ProductImportRowError,
    ProductImportSummaryResponse,
    ProductResponse,
    ProductUpdate,
    StockAdjustmentCreate,
    StockInCreate,
    StockMovementResponse,
    StockOutCreate,
    StockSummaryItem,
    StockSummaryReportResponse,
    UnitCreate,
    UnitUpdate,
)
from app.services.audit import log_audit_event

DEFAULT_UNITS = [
    ("Piece", "pc"),
    ("Box", "box"),
    ("Pack", "pack"),
    ("Kg", "kg"),
    ("Gram", "g"),
    ("Liter", "l"),
    ("Meter", "m"),
    ("Dozen", "dz"),
]


class InventoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.category_repo = ProductCategoryRepository(db)
        self.unit_repo = UnitRepository(db)
        self.product_repo = ProductRepository(db)
        self.movement_repo = StockMovementRepository(db)

    # --- Categories ---

    async def list_categories(self, tenant_id: UUID, include_inactive: bool = True) -> list[ProductCategory]:
        return await self.category_repo.list_categories(tenant_id, include_inactive)

    async def get_category(self, tenant_id: UUID, category_id: UUID) -> ProductCategory:
        cat = await self.category_repo.get_by_id(tenant_id, category_id)
        if not cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        return cat

    async def create_category(
        self,
        tenant_id: UUID,
        category_in: ProductCategoryCreate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ProductCategory:
        existing = await self.category_repo.get_by_name(tenant_id, category_in.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{category_in.name}' already exists for this business.",
            )

        cat = ProductCategory(
            tenant_id=tenant_id,
            name=category_in.name.strip(),
            description=category_in.description,
            is_active=category_in.is_active,
        )
        created = await self.category_repo.create(cat)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.category.create",
            entity_type="product_category",
            entity_id=str(created.id),
            entity_label=created.name,
            details={"name": created.name},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        return created

    async def update_category(
        self,
        tenant_id: UUID,
        category_id: UUID,
        category_in: ProductCategoryUpdate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ProductCategory:
        cat = await self.get_category(tenant_id, category_id)
        update_data = category_in.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"]:
            name = update_data["name"].strip()
            existing = await self.category_repo.get_by_name(tenant_id, name)
            if existing and existing.id != category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category '{name}' already exists for this business.",
                )
            cat.name = name

        if "description" in update_data:
            cat.description = update_data["description"]
        if "is_active" in update_data and update_data["is_active"] is not None:
            cat.is_active = update_data["is_active"]

        cat.updated_at = datetime.now(UTC)
        await self.db.flush()

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.category.update",
            entity_type="product_category",
            entity_id=str(cat.id),
            entity_label=cat.name,
            details={"name": cat.name, "is_active": cat.is_active},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        await self.db.refresh(cat)
        return cat

    async def delete_category(
        self,
        tenant_id: UUID,
        category_id: UUID,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        cat = await self.get_category(tenant_id, category_id)
        p_count = await self.category_repo.count_products_by_category(tenant_id, category_id)
        if p_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This category is being used by products and cannot be deleted. Deactivate it instead.",
            )

        await self.category_repo.delete(tenant_id, category_id)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.category.delete",
            entity_type="product_category",
            entity_id=str(category_id),
            entity_label=cat.name,
            details={"name": cat.name},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()

    # --- Units ---

    async def seed_default_units_if_empty(self, tenant_id: UUID) -> list[Unit]:
        units = await self.unit_repo.list_units(tenant_id, include_inactive=True)
        if not units:
            for name, short in DEFAULT_UNITS:
                u = Unit(tenant_id=tenant_id, name=name, short_name=short, is_active=True)
                self.db.add(u)
            await self.db.flush()
            units = await self.unit_repo.list_units(tenant_id, include_inactive=True)
            await self.db.commit()
        return units

    async def list_units(self, tenant_id: UUID, include_inactive: bool = True) -> list[Unit]:
        return await self.seed_default_units_if_empty(tenant_id)

    async def get_unit(self, tenant_id: UUID, unit_id: UUID) -> Unit:
        unit = await self.unit_repo.get_by_id(tenant_id, unit_id)
        if not unit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")
        return unit

    async def create_unit(
        self,
        tenant_id: UUID,
        unit_in: UnitCreate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Unit:
        existing = await self.unit_repo.get_by_name(tenant_id, unit_in.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unit '{unit_in.name}' already exists for this business.",
            )

        unit = Unit(
            tenant_id=tenant_id,
            name=unit_in.name.strip(),
            short_name=unit_in.short_name,
            is_active=unit_in.is_active,
        )
        created = await self.unit_repo.create(unit)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.unit.create",
            entity_type="unit",
            entity_id=str(created.id),
            entity_label=created.name,
            details={"name": created.name},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        return created

    async def update_unit(
        self,
        tenant_id: UUID,
        unit_id: UUID,
        unit_in: UnitUpdate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Unit:
        unit = await self.get_unit(tenant_id, unit_id)
        update_data = unit_in.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"]:
            name = update_data["name"].strip()
            existing = await self.unit_repo.get_by_name(tenant_id, name)
            if existing and existing.id != unit_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unit '{name}' already exists for this business.",
                )
            unit.name = name

        if "short_name" in update_data:
            unit.short_name = update_data["short_name"]
        if "is_active" in update_data and update_data["is_active"] is not None:
            unit.is_active = update_data["is_active"]

        unit.updated_at = datetime.now(UTC)
        await self.db.flush()

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.unit.update",
            entity_type="unit",
            entity_id=str(unit.id),
            entity_label=unit.name,
            details={"name": unit.name},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        await self.db.refresh(unit)
        return unit

    async def delete_unit(
        self,
        tenant_id: UUID,
        unit_id: UUID,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        unit = await self.get_unit(tenant_id, unit_id)
        p_count = await self.unit_repo.count_products_by_unit(tenant_id, unit_id)
        if p_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This unit is being used by products and cannot be deleted. Deactivate it instead.",
            )

        await self.unit_repo.delete(tenant_id, unit_id)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.unit.delete",
            entity_type="unit",
            entity_id=str(unit_id),
            entity_label=unit.name,
            details={"name": unit.name},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()

    # --- Products ---

    async def _to_product_response(
        self, tenant_id: UUID, product: Product, stock_override: Decimal | None = None
    ) -> ProductResponse:
        stock = stock_override if stock_override is not None else await self.movement_repo.get_current_stock(tenant_id, product.id)
        min_s = Decimal(str(product.minimum_stock))

        status_str: Literal["Normal", "Low Stock", "Out of Stock"]
        if stock == 0:
            status_str = "Out of Stock"
        elif stock <= min_s:
            status_str = "Low Stock"
        else:
            status_str = "Normal"


        return ProductResponse(
            id=product.id,
            tenant_id=product.tenant_id,
            name=product.name,
            sku=product.sku,
            category_id=product.category_id,
            unit_id=product.unit_id,
            description=product.description,
            purchase_price=product.purchase_price,
            selling_price=product.selling_price,
            minimum_stock=product.minimum_stock,
            is_active=product.is_active if product.is_active is not None else True,
            current_stock=stock,
            stock_status=status_str,
            category_name=product.category.name if product.category else None,
            unit_name=product.unit.name if product.unit else None,
            created_at=product.created_at or datetime.now(UTC),
            updated_at=product.updated_at or datetime.now(UTC),
        )

    async def list_products(
        self,
        tenant_id: UUID,
        search: str | None = None,
        category_id: UUID | None = None,
        is_active: bool | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> PaginatedProductsResponse:
        skip = (page - 1) * limit
        items, total = await self.product_repo.list_products(
            tenant_id=tenant_id,
            search=search,
            category_id=category_id,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )
        stock_map = await self.movement_repo.get_all_current_stocks(tenant_id)
        res_items = [
            await self._to_product_response(tenant_id, p, stock_override=stock_map.get(p.id, Decimal("0.00")))
            for p in items
        ]
        return PaginatedProductsResponse(items=res_items, total=total, page=page, limit=limit)

    async def get_product(self, tenant_id: UUID, product_id: UUID) -> ProductResponse:
        p = await self.product_repo.get_by_id(tenant_id, product_id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return await self._to_product_response(tenant_id, p)

    async def create_product(
        self,
        tenant_id: UUID,
        product_in: ProductCreate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ProductResponse:
        # Check SKU uniqueness
        sku = product_in.sku.strip()
        existing_sku = await self.product_repo.get_by_sku(tenant_id, sku)
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU '{sku}' already exists for this business.",
            )

        # Validate Unit
        unit = await self.unit_repo.get_by_id(tenant_id, product_in.unit_id)
        if not unit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")

        # Validate Category if provided
        if product_in.category_id:
            cat = await self.category_repo.get_by_id(tenant_id, product_in.category_id)
            if not cat:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        product = Product(
            tenant_id=tenant_id,
            name=product_in.name.strip(),
            sku=sku,
            category_id=product_in.category_id,
            unit_id=product_in.unit_id,
            description=product_in.description,
            purchase_price=product_in.purchase_price,
            selling_price=product_in.selling_price,
            minimum_stock=product_in.minimum_stock,
            is_active=product_in.is_active,
        )
        created = await self.product_repo.create(product)

        # Handle Opening Stock if provided
        if product_in.opening_stock is not None and product_in.opening_stock > 0:
            open_qty = Decimal(str(product_in.opening_stock))
            unit_c = Decimal(str(created.purchase_price))
            tot_c = round(open_qty * unit_c, 2)
            movement = StockMovement(
                tenant_id=tenant_id,
                product_id=created.id,
                movement_type="OPENING",
                quantity=open_qty,
                unit_cost=unit_c,
                total_cost=tot_c,
                reference_type="OPENING_STOCK",
                reference_id=str(created.id),
                movement_date=datetime.now(UTC),
                reason="Opening Stock",
                notes="Initial stock set upon product creation",
                created_by_id=user_id,
            )
            await self.movement_repo.create(movement)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.product.create",
            entity_type="product",
            entity_id=str(created.id),
            entity_label=f"{created.name} ({created.sku})",
            details={"name": created.name, "sku": created.sku, "selling_price": float(created.selling_price)},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        await self.db.refresh(created)

        return await self._to_product_response(tenant_id, created)

    async def update_product(
        self,
        tenant_id: UUID,
        product_id: UUID,
        product_in: ProductUpdate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ProductResponse:
        p = await self.product_repo.get_by_id(tenant_id, product_id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        update_data = product_in.model_dump(exclude_unset=True)

        if "sku" in update_data and update_data["sku"]:
            sku = update_data["sku"].strip()
            existing = await self.product_repo.get_by_sku(tenant_id, sku)
            if existing and existing.id != product_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"SKU '{sku}' already exists for this business.",
                )
            p.sku = sku

        if "unit_id" in update_data and update_data["unit_id"]:
            unit = await self.unit_repo.get_by_id(tenant_id, update_data["unit_id"])
            if not unit:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")
            p.unit_id = update_data["unit_id"]

        if "category_id" in update_data:
            if update_data["category_id"]:
                cat = await self.category_repo.get_by_id(tenant_id, update_data["category_id"])
                if not cat:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
            p.category_id = update_data["category_id"]

        for field in ("name", "description", "purchase_price", "selling_price", "minimum_stock", "is_active"):
            if field in update_data and update_data[field] is not None:
                setattr(p, field, update_data[field])

        p.updated_at = datetime.now(UTC)
        await self.db.flush()

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.product.update",
            entity_type="product",
            entity_id=str(p.id),
            entity_label=f"{p.name} ({p.sku})",
            details={"name": p.name, "sku": p.sku},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        await self.db.refresh(p)

        return await self._to_product_response(tenant_id, p)

    async def delete_product(
        self,
        tenant_id: UUID,
        product_id: UUID,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        p = await self.product_repo.get_by_id(tenant_id, product_id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        await self.product_repo.soft_delete(tenant_id, product_id)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.product.delete",
            entity_type="product",
            entity_id=str(product_id),
            entity_label=f"{p.name} ({p.sku})",
            details={"name": p.name, "sku": p.sku},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()

    # --- Stock Movements ---

    async def create_opening_stock(
        self,
        tenant_id: UUID,
        data: OpeningStockCreate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> StockMovementResponse:
        p = await self.product_repo.get_by_id(tenant_id, data.product_id, lock_for_update=True)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        qty = Decimal(str(data.quantity))
        unit_cost = Decimal(str(p.purchase_price))
        tot_cost = round(qty * unit_cost, 2)

        movement = StockMovement(
            tenant_id=tenant_id,
            product_id=p.id,
            movement_type="OPENING",
            quantity=qty,
            unit_cost=unit_cost,
            total_cost=tot_cost,
            reference_type="OPENING_STOCK",
            reference_id=str(p.id),
            movement_date=datetime.now(UTC),
            reason="Opening Stock",
            notes=data.notes,
            created_by_id=user_id,
        )
        created = await self.movement_repo.create(movement)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.opening_stock.create",
            entity_type="stock_movement",
            entity_id=str(created.id),
            entity_label=f"Opening Stock for {p.name}",
            details={"product_id": str(p.id), "quantity": float(qty)},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        return await self._to_movement_response(tenant_id, created)

    async def create_stock_in(
        self,
        tenant_id: UUID,
        data: StockInCreate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> StockMovementResponse:
        p = await self.product_repo.get_by_id(tenant_id, data.product_id, lock_for_update=True)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        qty = Decimal(str(data.quantity))
        unit_c = data.unit_cost if data.unit_cost is not None else Decimal(str(p.purchase_price))
        tot_c = round(qty * unit_c, 2)
        m_date = data.movement_date or datetime.now(UTC)

        movement = StockMovement(
            tenant_id=tenant_id,
            product_id=p.id,
            movement_type="IN",
            quantity=qty,
            unit_cost=unit_c,
            total_cost=tot_c,
            reference_type="MANUAL_IN",
            reference_id=data.reference_number,
            movement_date=m_date,
            reason=data.reason,
            notes=data.notes,
            created_by_id=user_id,
        )
        created = await self.movement_repo.create(movement)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.stock_in.create",
            entity_type="stock_movement",
            entity_id=str(created.id),
            entity_label=f"Stock In for {p.name}",
            details={"product_id": str(p.id), "quantity": float(qty), "reason": data.reason},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        return await self._to_movement_response(tenant_id, created)

    async def create_stock_out(
        self,
        tenant_id: UUID,
        data: StockOutCreate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> StockMovementResponse:
        p = await self.product_repo.get_by_id(tenant_id, data.product_id, lock_for_update=True)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        qty = Decimal(str(data.quantity))
        avail = await self.movement_repo.get_current_stock(tenant_id, p.id)

        if avail < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f'Insufficient stock for "{p.name}". '
                    f'Available stock: {float(avail):g}, Requested quantity: {float(qty):g}. '
                    f'Please reduce the quantity or add more stock.'
                ),
            )

        unit_c = Decimal(str(p.purchase_price))
        tot_c = round(qty * unit_c, 2)
        m_date = data.movement_date or datetime.now(UTC)

        movement = StockMovement(
            tenant_id=tenant_id,
            product_id=p.id,
            movement_type="OUT",
            quantity=qty,
            unit_cost=unit_c,
            total_cost=tot_c,
            reference_type="MANUAL_OUT",
            reference_id=data.reference_number,
            movement_date=m_date,
            reason=data.reason,
            notes=data.notes,
            created_by_id=user_id,
        )
        created = await self.movement_repo.create(movement)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.stock_out.create",
            entity_type="stock_movement",
            entity_id=str(created.id),
            entity_label=f"Stock Out for {p.name}",
            details={"product_id": str(p.id), "quantity": float(qty), "reason": data.reason},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        return await self._to_movement_response(tenant_id, created)

    async def create_stock_adjustment(
        self,
        tenant_id: UUID,
        data: StockAdjustmentCreate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> StockMovementResponse:
        p = await self.product_repo.get_by_id(tenant_id, data.product_id, lock_for_update=True)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        physical = Decimal(str(data.physical_count))
        current = await self.movement_repo.get_current_stock(tenant_id, p.id)
        diff = physical - current

        if diff == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Physical count ({float(physical):g}) matches current system stock. No adjustment needed.',
            )

        if physical < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Physical count cannot be negative.',
            )

        unit_c = Decimal(str(p.purchase_price))
        tot_c = round(abs(diff) * unit_c, 2)

        movement = StockMovement(
            tenant_id=tenant_id,
            product_id=p.id,
            movement_type="ADJUSTMENT",
            quantity=diff,
            unit_cost=unit_c,
            total_cost=tot_c,
            reference_type="PHYSICAL_COUNT",
            reference_id=f"phys_{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
            movement_date=datetime.now(UTC),
            reason=data.reason,
            notes=data.notes or f"Adjusted system stock ({float(current):g}) to physical count ({float(physical):g})",
            created_by_id=user_id,
        )
        created = await self.movement_repo.create(movement)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.stock_adjustment.create",
            entity_type="stock_movement",
            entity_id=str(created.id),
            entity_label=f"Adjustment for {p.name}",
            details={
                "product_id": str(p.id),
                "previous_stock": float(current),
                "physical_count": float(physical),
                "adjustment_diff": float(diff),
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        return await self._to_movement_response(tenant_id, created)

    async def list_stock_history(
        self,
        tenant_id: UUID,
        product_id: UUID | None = None,
        movement_type: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> PaginatedStockMovementsResponse:
        skip = (page - 1) * limit
        items, total = await self.movement_repo.list_movements(
            tenant_id=tenant_id,
            product_id=product_id,
            movement_type=movement_type,
            date_from=date_from,
            date_to=date_to,
            skip=skip,
            limit=limit,
        )
        res_items = [await self._to_movement_response(tenant_id, m) for m in items]
        return PaginatedStockMovementsResponse(items=res_items, total=total, page=page, limit=limit)

    async def _to_movement_response(self, tenant_id: UUID, m: StockMovement) -> StockMovementResponse:
        p = m.product
        unit_name = p.unit.name if p and p.unit else None
        running_bal = await self.movement_repo.get_current_stock(tenant_id, m.product_id) if p else Decimal("0.00")

        return StockMovementResponse(
            id=m.id,
            tenant_id=m.tenant_id,
            product_id=m.product_id,
            product_name=p.name if p else None,
            product_sku=p.sku if p else None,
            unit_name=unit_name,
            movement_type=m.movement_type,
            quantity=m.quantity,
            unit_cost=m.unit_cost,
            total_cost=m.total_cost,
            reference_type=m.reference_type,
            reference_id=m.reference_id,
            movement_date=m.movement_date,
            reason=m.reason,
            notes=m.notes,
            created_by_id=m.created_by_id,
            created_by_name=m.creator.full_name if m.creator else None,
            running_balance=running_bal,
            created_at=m.created_at,
        )

    # --- Dashboard & Reports ---

    async def get_dashboard(self, tenant_id: UUID) -> InventoryDashboardResponse:
        products, _ = await self.product_repo.list_products(tenant_id, limit=5000)
        stock_map = await self.movement_repo.get_all_current_stocks(tenant_id)

        total_prods = len(products)
        total_qty = Decimal("0.00")
        total_stock_val = Decimal("0.00")
        low_count = 0
        out_count = 0
        low_stock_prods: list[ProductResponse] = []

        for p in products:
            stock = stock_map.get(p.id, Decimal("0.00"))
            total_qty += stock
            total_stock_val += round(stock * Decimal(str(p.purchase_price)), 2)
            min_s = Decimal(str(p.minimum_stock))
            if stock <= min_s:
                if stock == 0:
                    out_count += 1
                else:
                    low_count += 1
                low_stock_prods.append(await self._to_product_response(tenant_id, p, stock_override=stock))

        recent_m, _ = await self.movement_repo.list_movements(tenant_id, limit=5)
        recent_dtos = [await self._to_movement_response(tenant_id, m) for m in recent_m]

        return InventoryDashboardResponse(
            total_products=total_prods,
            total_stock_quantity=total_qty,
            total_stock_value=total_stock_val,
            low_stock_count=low_count,
            out_of_stock_count=out_count,
            low_stock_products=low_stock_prods,
            recent_movements=recent_dtos,
        )



    async def get_summary_report(self, tenant_id: UUID) -> StockSummaryReportResponse:
        products, _ = await self.product_repo.list_products(tenant_id, limit=5000)
        stock_map = await self.movement_repo.get_all_current_stocks(tenant_id)
        items: list[StockSummaryItem] = []
        tot_val = Decimal("0.00")

        for p in products:
            stock = stock_map.get(p.id, Decimal("0.00"))
            min_s = Decimal(str(p.minimum_stock))
            summary_status: Literal["Normal", "Low Stock", "Out of Stock"]
            if stock == 0:
                summary_status = "Out of Stock"
            elif stock <= min_s:
                summary_status = "Low Stock"
            else:
                summary_status = "Normal"

            item_val = round(stock * Decimal(str(p.purchase_price)), 2)
            tot_val += item_val

            items.append(
                StockSummaryItem(
                    product_id=p.id,
                    product_name=p.name,
                    sku=p.sku,
                    category_name=p.category.name if p.category else None,
                    unit_name=p.unit.name if p.unit else "pc",
                    current_stock=stock,
                    minimum_stock=p.minimum_stock,
                    stock_status=summary_status,
                    purchase_price=p.purchase_price,
                    selling_price=p.selling_price,
                    total_value=item_val,
                )
            )

        return StockSummaryReportResponse(
            items=items,
            total_products=len(items),
            total_stock_value=tot_val,
        )

    async def get_low_stock_report(self, tenant_id: UUID) -> LowStockReportResponse:
        products, _ = await self.product_repo.list_products(tenant_id, limit=5000)
        stock_map = await self.movement_repo.get_all_current_stocks(tenant_id)
        items: list[LowStockReportItem] = []

        for p in products:
            stock = stock_map.get(p.id, Decimal("0.00"))
            min_s = Decimal(str(p.minimum_stock))
            if stock <= min_s:
                low_status: Literal["Low Stock", "Out of Stock"] = "Out of Stock" if stock == 0 else "Low Stock"
                items.append(
                    LowStockReportItem(
                        product_id=p.id,
                        product_name=p.name,
                        sku=p.sku,
                        category_name=p.category.name if p.category else None,
                        unit_name=p.unit.name if p.unit else "pc",
                        current_stock=stock,
                        minimum_stock=p.minimum_stock,
                        difference=min_s - stock,
                        stock_status=low_status,
                    )
                )

        return LowStockReportResponse(items=items, total_low_stock=len(items))

    async def get_movements_report(
        self,
        tenant_id: UUID,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> PaginatedStockMovementsResponse:
        return await self.list_stock_history(
            tenant_id=tenant_id,
            date_from=from_date,
            date_to=to_date,
            page=1,
            limit=500,
        )

    async def import_products(
        self,
        tenant_id: UUID,
        file_content: bytes,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ProductImportSummaryResponse:
        import csv
        import io

        text_content = file_content.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(text_content))

        total_rows = 0
        imported_count = 0
        skipped_count = 0
        failed_count = 0
        errors: list[ProductImportRowError] = []

        units = await self.unit_repo.list_units(tenant_id, include_inactive=True)
        categories = await self.category_repo.list_categories(tenant_id, include_inactive=True)

        unit_map = {u.name.strip().lower(): u for u in units}
        cat_map = {c.name.strip().lower(): c for c in categories}
        default_unit = units[0] if units else None

        for idx, row in enumerate(reader, start=2):
            total_rows += 1
            normalized_row = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items() if k}

            prod_name = (
                normalized_row.get("product name *")
                or normalized_row.get("product name")
                or normalized_row.get("name")
                or ""
            )
            sku = normalized_row.get("sku") or ""
            cat_name = normalized_row.get("category") or ""
            unit_name = normalized_row.get("unit *") or normalized_row.get("unit") or ""
            purchase_price_str = normalized_row.get("purchase price") or "0"
            selling_price_str = normalized_row.get("selling price") or "0"
            minimum_stock_str = normalized_row.get("minimum stock") or "0"
            opening_stock_str = normalized_row.get("opening stock") or "0"

            if not prod_name:
                failed_count += 1
                errors.append(ProductImportRowError(row_number=idx, sku=sku, reason="Missing Product Name"))
                continue

            # SKU uniqueness check (skip duplicates if SKU exists)
            if sku:
                existing = await self.product_repo.get_by_sku(tenant_id, sku)
                if existing:
                    skipped_count += 1
                    continue

            # Category lookup or auto-creation
            category_id = None
            if cat_name:
                cat_key = cat_name.lower()
                if cat_key in cat_map:
                    category_id = cat_map[cat_key].id
                else:
                    new_cat = await self.category_repo.create(
                        ProductCategory(tenant_id=tenant_id, name=cat_name, is_active=True)
                    )
                    cat_map[cat_key] = new_cat
                    category_id = new_cat.id

            # Unit lookup or auto-creation
            unit_id = None
            if unit_name:
                unit_key = unit_name.lower()
                if unit_key in unit_map:
                    unit_id = unit_map[unit_key].id
                else:
                    new_unit = await self.unit_repo.create(
                        Unit(tenant_id=tenant_id, name=unit_name, short_name=unit_name[:20], is_active=True)
                    )
                    unit_map[unit_key] = new_unit
                    unit_id = new_unit.id
            elif default_unit:
                unit_id = default_unit.id
            else:
                new_unit = await self.unit_repo.create(
                    Unit(tenant_id=tenant_id, name="Piece", short_name="pc", is_active=True)
                )
                unit_map["piece"] = new_unit
                default_unit = new_unit
                unit_id = new_unit.id

            try:
                p_price = Decimal(purchase_price_str)
                s_price = Decimal(selling_price_str)
                m_stock = Decimal(minimum_stock_str)
                o_stock = Decimal(opening_stock_str)
            except Exception:
                failed_count += 1
                errors.append(
                    ProductImportRowError(
                        row_number=idx,
                        product_name=prod_name,
                        sku=sku,
                        reason="Invalid numeric price or stock value",
                    )
                )
                continue

            if not sku:
                sku = f"SKU-IMP-{idx}-{datetime.now(UTC).strftime('%M%S')}"

            product = Product(
                tenant_id=tenant_id,
                name=prod_name,
                sku=sku,
                category_id=category_id,
                unit_id=unit_id,
                purchase_price=p_price,
                selling_price=s_price,
                minimum_stock=m_stock,
                is_active=True,
            )
            created = await self.product_repo.create(product)

            # Record Opening Stock movement if provided
            if o_stock > 0:
                tot_c = round(o_stock * p_price, 2)
                movement = StockMovement(
                    tenant_id=tenant_id,
                    product_id=created.id,
                    movement_type="OPENING",
                    quantity=o_stock,
                    unit_cost=p_price,
                    total_cost=tot_c,
                    reference_type="OPENING_STOCK",
                    reference_id=str(created.id),
                    movement_date=datetime.now(UTC),
                    reason="Opening Stock",
                    notes="Created via Bulk Product Import",
                    created_by_id=user_id,
                )
                await self.movement_repo.create(movement)

            imported_count += 1

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="inventory.product.import",
            entity_type="product_import",
            entity_id=str(tenant_id),
            entity_label=f"Bulk Product Import ({imported_count} imported)",
            details={
                "total_rows": total_rows,
                "imported": imported_count,
                "skipped": skipped_count,
                "failed": failed_count,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()

        return ProductImportSummaryResponse(
            total_rows=total_rows,
            imported=imported_count,
            skipped_duplicates=skipped_count,
            failed=failed_count,
            errors=errors,
        )
