from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import AuditLog
from app.models.vendors import Vendor
from app.repositories.vendors import VendorRepository
from app.schemas.inventory import StockInCreate
from app.schemas.vendors import VendorCreate, VendorUpdate
from app.services.inventory import InventoryService
from app.services.vendors import VendorService


def build_vendor_mock_db():
    mock_db = AsyncMock(spec=AsyncSession)
    stored_objects: list[object] = []

    def mock_add(obj: object) -> None:
        if not hasattr(obj, "id") or getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        stored_objects.append(obj)

    async def mock_flush() -> None:
        pass

    async def mock_commit() -> None:
        pass

    async def mock_refresh(obj: object) -> None:
        pass

    async def mock_delete(obj: object) -> None:
        if obj in stored_objects:
            stored_objects.remove(obj)

    async def mock_execute(stmt: object) -> MagicMock:
        mock_res = MagicMock()
        sql_str = str(stmt).lower()

        if "from vendors" in sql_str:
            v_list = [
                o for o in stored_objects
                if isinstance(o, Vendor) and getattr(o, "deleted_at", None) is None
            ]
            params = {}
            try:
                if hasattr(stmt, "compile"):
                    compiled = stmt.compile()
                    params = getattr(compiled, "params", {})
            except Exception:
                params = {}

            tenant_id_val = None
            id_val = None
            phone_val = None
            for p_k, p_v in params.items():
                if "tenant_id" in p_k:
                    tenant_id_val = p_v
                elif p_k == "id_1" or p_k == "id" or "vendors_id" in p_k:
                    id_val = p_v
                elif "phone" in p_k:
                    phone_val = p_v

            filtered = v_list
            if tenant_id_val:
                filtered = [v for v in filtered if v.tenant_id == tenant_id_val]
            if id_val:
                filtered = [v for v in filtered if v.id == id_val]
            if phone_val:
                filtered = [v for v in filtered if v.phone == phone_val]

            mock_res.scalars.return_value.all.return_value = filtered
            mock_res.scalar_one_or_none.return_value = filtered[0] if filtered else None
            mock_res.scalars.return_value.first.return_value = filtered[0] if filtered else None
            mock_res.scalar.return_value = len(filtered)
        else:
            v_list = [o for o in stored_objects if isinstance(o, Vendor)]
            mock_res.scalars.return_value.all.return_value = v_list
            mock_res.scalar_one_or_none.return_value = v_list[0] if v_list else None
            mock_res.scalars.return_value.first.return_value = v_list[0] if v_list else None
            mock_res.scalar.return_value = len(v_list)

        return mock_res

    mock_db.add = mock_add
    mock_db.flush = mock_flush
    mock_db.commit = mock_commit
    mock_db.refresh = mock_refresh
    mock_db.delete = mock_delete
    mock_db.execute = mock_execute
    mock_db._stored_objects = stored_objects  # type: ignore[attr-defined]

    return mock_db


@pytest.mark.asyncio
async def test_vendor_create_and_outstanding_calculation():
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db = build_vendor_mock_db()
    service = VendorService(mock_db)

    # Test Payable opening balance
    v_payable = await service.create_vendor(
        tenant_id,
        VendorCreate(
            name="Alpha Supplies",
            phone="9876543210",
            opening_balance=Decimal("1500.50"),
            opening_balance_type="Payable",
        ),
        user_id,
    )
    assert v_payable.name == "Alpha Supplies"
    assert v_payable.phone == "9876543210"
    assert v_payable.outstanding_payable == Decimal("1500.50")

    # Test Advance opening balance
    v_advance = await service.create_vendor(
        tenant_id,
        VendorCreate(
            name="Beta Traders",
            phone="9876543211",
            opening_balance=Decimal("500.00"),
            opening_balance_type="Advance",
        ),
        user_id,
    )
    assert v_advance.outstanding_payable == Decimal("-500.00")


@pytest.mark.asyncio
async def test_vendor_update_and_audit_logging():
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db = build_vendor_mock_db()
    service = VendorService(mock_db)

    vendor = await service.create_vendor(
        tenant_id,
        VendorCreate(name="Initial Name", phone="9900000000", opening_balance=Decimal("100.00"), opening_balance_type="Payable"),
        user_id,
    )

    # Update balance which triggers audit logging
    updated = await service.update_vendor(
        tenant_id,
        vendor.id,
        VendorUpdate(opening_balance=Decimal("250.00"), opening_balance_type="Payable"),
        user_id,
    )
    assert updated.opening_balance == Decimal("250.00")
    assert updated.outstanding_payable == Decimal("250.00")

    # Verify AuditLog recorded
    audit_logs = [o for o in mock_db._stored_objects if isinstance(o, AuditLog)]
    assert len(audit_logs) >= 1
    op_logs = [log for log in audit_logs if log.action == "vendor.opening_balance.edit"]
    assert len(op_logs) == 1
    assert op_logs[0].entity_id == str(vendor.id)


@pytest.mark.asyncio
async def test_vendor_soft_delete():
    tenant_id = uuid4()
    mock_db = build_vendor_mock_db()
    repo = VendorRepository(mock_db)

    vendor = Vendor(
        id=uuid4(),
        tenant_id=tenant_id,
        name="Delete Me Ltd",
        phone="9999999999",
    )
    mock_db._stored_objects.append(vendor)

    res = await repo.soft_delete(tenant_id, vendor.id)
    assert res is True
    assert vendor.deleted_at is not None


@pytest.mark.asyncio
async def test_vendor_import_deduplication():
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db = build_vendor_mock_db()
    service = VendorService(mock_db)

    # Create existing vendor with phone 9876543210
    await service.create_vendor(
        tenant_id,
        VendorCreate(name="Existing Vendor", phone="9876543210"),
        user_id,
    )

    csv_content = (
        "Name,Phone,Email,Company Name,GSTIN,Opening Balance,Balance Type,City,State\n"
        "Existing Vendor,9876543210,ex@test.com,Existing Co,,0,payable,Delhi,Delhi\n"
        "New Vendor,9111111111,new@test.com,New Co,07AAAAA0000A1Z5,1200,payable,Jaipur,Rajasthan\n"
        "Third Vendor,9222222222,third@test.com,Third Co,,300,advance,Mumbai,Maharashtra\n"
        ",9333333333,invalid@test.com,No Name Co,,0,payable,Delhi,Delhi\n"
    )

    res = await service.import_vendors(tenant_id, csv_content.encode("utf-8"), user_id)
    assert res.total_rows == 4
    assert res.imported == 2
    assert res.skipped_duplicates == 1
    assert res.failed == 1
    assert len(res.errors) == 1
    assert "Vendor Name" in res.errors[0]["reason"]


@pytest.mark.asyncio
async def test_cross_tenant_vendor_isolation():
    tenant1_id = uuid4()
    tenant2_id = uuid4()
    user_id = uuid4()
    mock_db = build_vendor_mock_db()
    service = VendorService(mock_db)

    # Vendor in Tenant 1
    v1 = await service.create_vendor(
        tenant1_id,
        VendorCreate(name="Tenant 1 Supplier", phone="9000000001"),
        user_id,
    )

    # Tenant 2 trying to get Tenant 1 vendor should raise HTTP 404
    with pytest.raises(HTTPException) as exc_info:
        await service.get_vendor(tenant2_id, v1.id)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_stock_in_with_vendor_validation():
    tenant1_id = uuid4()
    tenant2_id = uuid4()
    user_id = uuid4()

    mock_db = AsyncMock(spec=AsyncSession)
    stored_objects: list[object] = []

    def mock_add(obj: object) -> None:
        if not hasattr(obj, "id") or getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        stored_objects.append(obj)

    mock_db.add = mock_add
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    # Vendor belonging to tenant 1
    v1 = Vendor(id=uuid4(), tenant_id=tenant1_id, name="Test Vendor", phone="9888888888")

    async def mock_execute(stmt: object) -> MagicMock:
        mock_res = MagicMock()
        sql_str = str(stmt).lower()
        if "from vendors" in sql_str:
            mock_res.scalar_one_or_none.return_value = v1 if str(v1.id) in str(stmt) else None
        else:
            mock_res.scalar_one_or_none.return_value = None
            mock_res.scalars.return_value.all.return_value = []
        return mock_res

    mock_db.execute = mock_execute

    inv_service = InventoryService(mock_db)

    # Passing non-existent vendor_id or cross-tenant vendor_id should raise 404
    with pytest.raises(HTTPException) as exc_info:
        await inv_service.create_stock_in(
            tenant2_id,
            StockInCreate(
                product_id=uuid4(),
                quantity=Decimal("10"),
                unit_cost=Decimal("50"),
                vendor_id=v1.id,
            ),
            user_id,
        )
    assert exc_info.value.status_code == 404
