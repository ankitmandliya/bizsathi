from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.entitlements import set_module_access
from app.models.crm import Customer
from app.models.inventory import Product, ProductCategory, StockMovement, Unit
from app.models.sales import Invoice, SalesSequence
from app.schemas.inventory import (
    OpeningStockCreate,
    ProductCategoryCreate,
    ProductCreate,
    StockAdjustmentCreate,
    StockInCreate,
    StockOutCreate,
    UnitCreate,
)
from app.schemas.sales import InvoiceCreate, LineItemCreate
from app.services.inventory import InventoryService
from app.services.sales import SalesService


def build_inventory_mock_db():
    mock_db = AsyncMock(spec=AsyncSession)
    stored_objects: list[object] = []

    def mock_add(obj: object) -> None:
        if not hasattr(obj, "id") or getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        if not hasattr(obj, "created_at") or getattr(obj, "created_at", None) is None:
            setattr(obj, "created_at", datetime.now(UTC))
        if not hasattr(obj, "updated_at") or getattr(obj, "updated_at", None) is None:
            setattr(obj, "updated_at", datetime.now(UTC))
        stored_objects.append(obj)

    async def mock_flush() -> None:
        pass

    async def mock_refresh(obj: object) -> None:
        pass

    async def mock_execute(stmt: object) -> MagicMock:
        mock_res = MagicMock()
        sql_str = str(stmt).lower()
        params = list(stmt.compile().params.values()) if hasattr(stmt, "compile") else []
        where_crits = getattr(stmt, "_where_criteria", ())

        col_vals: dict[str, list[object]] = {}
        for crit in where_crits:
            left_str = str(getattr(crit, "left", "")).lower()
            right = getattr(crit, "right", None)
            val = getattr(right, "value", None)
            if val is not None:
                col_vals.setdefault(left_str, []).append(val)

        if "from product_categories" in sql_str:
            cats = [o for o in stored_objects if isinstance(o, ProductCategory)]
            matched = []
            for cat in cats:
                if any(k.split(".")[-1] == "tenant_id" for k in col_vals):
                    t_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "tenant_id" for v in vs]
                    if cat.tenant_id not in t_vals:
                        continue
                if any(k.split(".")[-1] == "id" for k in col_vals):
                    id_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "id" for v in vs]
                    if cat.id not in id_vals:
                        continue
                if any(k.split(".")[-1] == "name" or "name" in k for k in col_vals):
                    n_vals = [str(v).lower() for k, vs in col_vals.items() if k.split(".")[-1] == "name" or "name" in k for v in vs]
                    if cat.name.lower() not in n_vals:
                        continue
                matched.append(cat)

            mock_res.scalars.return_value.all.return_value = matched
            mock_res.scalar_one_or_none.return_value = matched[0] if matched else None
            mock_res.scalar.return_value = len(matched)

        elif "from units" in sql_str:
            units = [o for o in stored_objects if isinstance(o, Unit)]
            matched = []
            for unit in units:
                if any(k.split(".")[-1] == "tenant_id" for k in col_vals):
                    t_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "tenant_id" for v in vs]
                    if unit.tenant_id not in t_vals:
                        continue
                if any(k.split(".")[-1] == "id" for k in col_vals):
                    id_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "id" for v in vs]
                    if unit.id not in id_vals:
                        continue
                if any(k.split(".")[-1] == "name" or "name" in k for k in col_vals):
                    n_vals = [str(v).lower() for k, vs in col_vals.items() if k.split(".")[-1] == "name" or "name" in k for v in vs]
                    if unit.name.lower() not in n_vals:
                        continue
                matched.append(unit)

            mock_res.scalars.return_value.all.return_value = matched
            mock_res.scalar_one_or_none.return_value = matched[0] if matched else None
            mock_res.scalar.return_value = len(matched)

        elif "from products" in sql_str:
            products = [o for o in stored_objects if isinstance(o, Product) and getattr(o, "deleted_at", None) is None]
            matched = []
            for prod in products:
                if any(k.split(".")[-1] == "tenant_id" for k in col_vals):
                    t_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "tenant_id" for v in vs]
                    if prod.tenant_id not in t_vals:
                        continue
                if any(k.split(".")[-1] == "id" for k in col_vals):
                    id_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "id" for v in vs]
                    if prod.id not in id_vals:
                        continue
                if any(k.split(".")[-1] == "sku" or "sku" in k for k in col_vals):
                    s_vals = [str(v).lower() for k, vs in col_vals.items() if k.split(".")[-1] == "sku" or "sku" in k for v in vs]
                    if prod.sku.lower() not in s_vals:
                        continue
                matched.append(prod)

            mock_res.scalars.return_value.all.return_value = matched
            mock_res.scalar_one_or_none.return_value = matched[0] if matched else None
            mock_res.scalar.return_value = len(matched)

        elif "stock_movements" in sql_str:
            movements = [o for o in stored_objects if isinstance(o, StockMovement)]
            matched = []
            for m in movements:
                if any(k.split(".")[-1] == "tenant_id" for k in col_vals):
                    t_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "tenant_id" for v in vs]
                    if m.tenant_id not in t_vals:
                        continue
                if any(k.split(".")[-1] == "product_id" for k in col_vals):
                    p_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "product_id" for v in vs]
                    if m.product_id not in p_vals:
                        continue
                if any(k.split(".")[-1] == "movement_type" for k in col_vals):
                    mt_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "movement_type" for v in vs]
                    if m.movement_type not in mt_vals:
                        continue
                if any(k.split(".")[-1] == "reference_type" for k in col_vals):
                    rt_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "reference_type" for v in vs]
                    if m.reference_type not in rt_vals:
                        continue
                if any(k.split(".")[-1] == "reference_id" for k in col_vals):
                    ri_vals = [v for k, vs in col_vals.items() if k.split(".")[-1] == "reference_id" for v in vs]
                    if str(m.reference_id) not in [str(x) for x in ri_vals]:
                        continue
                matched.append(m)

            if "count" in sql_str:
                mock_res.scalar.return_value = len(matched)
            else:
                rows = [(m.movement_type, m.quantity) for m in matched]
                mock_res.all.return_value = rows
                mock_res.scalars.return_value.all.return_value = matched
                mock_res.scalar_one_or_none.return_value = matched[0] if matched else None

        elif "sales_sequences" in sql_str:
            seqs = [o for o in stored_objects if isinstance(o, SalesSequence)]
            matched = [s for s in seqs if any(s.entity_type == p for p in params)]
            mock_res.scalar_one_or_none.return_value = matched[0] if matched else None

        elif "customers" in sql_str:
            customers = [o for o in stored_objects if isinstance(o, Customer)]
            mock_res.scalar_one_or_none.return_value = customers[0] if customers else None

        elif "invoices" in sql_str:
            invoices = [o for o in stored_objects if isinstance(o, Invoice)]
            mock_res.scalars.return_value.all.return_value = invoices
            mock_res.scalar_one_or_none.return_value = invoices[0] if invoices else None
            mock_res.scalar_one.return_value = len(invoices)

        else:
            mock_res.scalars.return_value.all.return_value = []
            mock_res.scalar_one_or_none.return_value = None
            mock_res.scalar.return_value = 0

        return mock_res

    mock_db.add.side_effect = mock_add
    mock_db.flush.side_effect = mock_flush
    mock_db.refresh.side_effect = mock_refresh
    mock_db.execute.side_effect = mock_execute
    return mock_db, stored_objects


@pytest.mark.asyncio
async def test_category_and_unit_crud() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored = build_inventory_mock_db()
    service = InventoryService(mock_db)

    # 1. Create Category
    cat_in = ProductCategoryCreate(name="Electronics", description="Gadgets and devices")
    cat = await service.create_category(tenant_id, cat_in, user_id)
    assert cat.name == "Electronics"

    # 2. Duplicate Category -> Error
    with pytest.raises(HTTPException) as exc:
        await service.create_category(tenant_id, cat_in, user_id)
    assert exc.value.status_code == 400
    assert "already exists" in exc.value.detail

    # 3. Seed Default Units
    units = await service.list_units(tenant_id)
    assert len(units) >= 8

    # 4. Create Custom Unit
    unit_in = UnitCreate(name="Bundle", short_name="bdl")
    unit = await service.create_unit(tenant_id, unit_in, user_id)
    assert unit.name == "Bundle"


@pytest.mark.asyncio
async def test_product_crud_and_sku_uniqueness() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored = build_inventory_mock_db()

    # Seed Unit
    unit = Unit(id=uuid4(), tenant_id=tenant_id, name="Piece", short_name="pc")
    stored.append(unit)

    service = InventoryService(mock_db)

    # 1. Create Product with Opening Stock
    prod_in = ProductCreate(
        name="Wireless Ergonomic Mouse",
        sku="MOUSE-001",
        unit_id=unit.id,
        purchase_price=Decimal("450.00"),
        selling_price=Decimal("899.00"),
        minimum_stock=Decimal("10.00"),
        opening_stock=Decimal("50.00"),
    )
    product = await service.create_product(tenant_id, prod_in, user_id)
    assert product.name == "Wireless Ergonomic Mouse"
    assert product.sku == "MOUSE-001"
    assert product.current_stock == Decimal("50.00")
    assert product.stock_status == "Normal"

    # 2. Duplicate SKU -> Reject
    with pytest.raises(HTTPException) as exc:
        await service.create_product(tenant_id, prod_in, user_id)
    assert exc.value.status_code == 400
    assert "already exists" in exc.value.detail

    # 3. Soft Delete Product
    await service.delete_product(tenant_id, product.id, user_id)
    target_p = next(o for o in stored if isinstance(o, Product) and o.id == product.id)
    assert target_p.deleted_at is not None  # type: ignore


@pytest.mark.asyncio
async def test_stock_in_out_and_negative_stock_rejection() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored = build_inventory_mock_db()

    unit = Unit(id=uuid4(), tenant_id=tenant_id, name="Piece", short_name="pc")
    stored.append(unit)

    product = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        name="Mechanical Keyboard",
        sku="KEYBOARD-001",
        unit_id=unit.id,
        purchase_price=Decimal("1500.00"),
        selling_price=Decimal("2999.00"),
        minimum_stock=Decimal("5.00"),
        unit=unit,
    )
    stored.append(product)

    service = InventoryService(mock_db)

    # Initial stock is 0
    p_res = await service.get_product(tenant_id, product.id)
    assert p_res.current_stock == Decimal("0.00")
    assert p_res.stock_status == "Out of Stock"

    # 1. Stock In 20 units
    sin = StockInCreate(product_id=product.id, quantity=Decimal("20.00"), reason="Purchase Order #101")
    m_in = await service.create_stock_in(tenant_id, sin, user_id)
    assert m_in.movement_type == "IN"

    p_res = await service.get_product(tenant_id, product.id)
    assert p_res.current_stock == Decimal("20.00")
    assert p_res.stock_status == "Normal"

    # 2. Stock Out 15 units
    sout = StockOutCreate(product_id=product.id, quantity=Decimal("15.00"), reason="Manual Sale")
    m_out = await service.create_stock_out(tenant_id, sout, user_id)
    assert m_out.movement_type == "OUT"

    p_res = await service.get_product(tenant_id, product.id)
    assert p_res.current_stock == Decimal("5.00")
    assert p_res.stock_status == "Low Stock"

    # 3. Stock Out 10 units (Available = 5) -> Insufficient stock error!
    sout_excess = StockOutCreate(product_id=product.id, quantity=Decimal("10.00"), reason="Excess Sale")
    with pytest.raises(HTTPException) as exc:
        await service.create_stock_out(tenant_id, sout_excess, user_id)
    assert exc.value.status_code == 400
    assert "Insufficient stock for \"Mechanical Keyboard\"" in exc.value.detail


@pytest.mark.asyncio
async def test_stock_adjustment() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored = build_inventory_mock_db()

    unit = Unit(id=uuid4(), tenant_id=tenant_id, name="Piece", short_name="pc")
    stored.append(unit)

    product = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        name="USB Cable",
        sku="CABLE-001",
        unit_id=unit.id,
        purchase_price=Decimal("50.00"),
        selling_price=Decimal("199.00"),
        minimum_stock=Decimal("10.00"),
        unit=unit,
    )
    stored.append(product)

    service = InventoryService(mock_db)

    # Seed Opening stock 20
    await service.create_opening_stock(tenant_id, OpeningStockCreate(product_id=product.id, quantity=Decimal("20.00")), user_id)

    # Physical count is 18 -> System creates -2 ADJUSTMENT
    adj = StockAdjustmentCreate(product_id=product.id, physical_count=Decimal("18.00"), reason="Monthly Audit Loss")
    m_adj = await service.create_stock_adjustment(tenant_id, adj, user_id)
    assert m_adj.movement_type == "ADJUSTMENT"
    assert m_adj.quantity == Decimal("-2.00")

    p_res = await service.get_product(tenant_id, product.id)
    assert p_res.current_stock == Decimal("18.00")


@pytest.mark.asyncio
async def test_sales_invoice_inventory_integration_and_cancellation_reversal() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored = build_inventory_mock_db()

    customer = Customer(id=uuid4(), tenant_id=tenant_id, name="Inventory Sales Customer")
    stored.append(customer)

    unit = Unit(id=uuid4(), tenant_id=tenant_id, name="Piece", short_name="pc")
    stored.append(unit)

    product = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        name="Monitor 27-inch",
        sku="MON-27",
        unit_id=unit.id,
        purchase_price=Decimal("12000.00"),
        selling_price=Decimal("18000.00"),
        minimum_stock=Decimal("2.00"),
        unit=unit,
    )
    stored.append(product)

    inv_service = InventoryService(mock_db)
    sales_service = SalesService(mock_db)

    # Add 10 units stock
    await inv_service.create_stock_in(tenant_id, StockInCreate(product_id=product.id, quantity=Decimal("10.00")), user_id)

    # Enable Inventory module access for this tenant
    set_module_access(tenant_id, "inventory", True)

    # 1. Create Invoice for 3 Monitors
    inv_in = InvoiceCreate(
        customer_id=customer.id,
        issue_date=datetime.now(UTC),
        due_date=datetime.now(UTC) + timedelta(days=15),
        items=[
            LineItemCreate(product_id=product.id, description="Monitor 27-inch", quantity=3.0, rate=18000.0, tax_rate_percent=18.0),
        ],
    )
    invoice, _ = await sales_service.create_invoice(tenant_id, user_id, inv_in)
    assert invoice is not None

    # Stock should be reduced to 7
    p_res = await inv_service.get_product(tenant_id, product.id)
    assert p_res.current_stock == Decimal("7.00")

    # 2. Cancel / Delete Invoice -> Stock reversed to 10
    await sales_service.delete_invoice(tenant_id, user_id, invoice.id)
    p_res_after = await inv_service.get_product(tenant_id, product.id)
    assert p_res_after.current_stock == Decimal("10.00")


@pytest.mark.asyncio
async def test_sales_invoice_when_inventory_is_disabled() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored = build_inventory_mock_db()

    customer = Customer(id=uuid4(), tenant_id=tenant_id, name="No Inventory Customer")
    stored.append(customer)

    sales_service = SalesService(mock_db)

    # Disable Inventory module access for this tenant
    set_module_access(tenant_id, "inventory", False)

    # Create Invoice without inventory check
    inv_in = InvoiceCreate(
        customer_id=customer.id,
        issue_date=datetime.now(UTC),
        due_date=datetime.now(UTC) + timedelta(days=15),
        items=[
            LineItemCreate(description="Consulting Service", quantity=100.0, rate=1000.0, tax_rate_percent=18.0),
        ],
    )
    invoice, _ = await sales_service.create_invoice(tenant_id, user_id, inv_in)
    assert invoice is not None
    assert invoice.total_amount == 118000.0
