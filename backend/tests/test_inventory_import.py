from uuid import uuid4

import pytest

from app.services.inventory import InventoryService
from tests.test_inventory import build_inventory_mock_db



@pytest.mark.asyncio
async def test_import_products_valid_csv() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored = build_inventory_mock_db()
    service = InventoryService(mock_db)

    csv_data = (
        "Product Name *,SKU,Category,Unit *,Purchase Price,Selling Price,Minimum Stock,Opening Stock\n"
        "Bulk Smart Watch,SKU-BULK-01,Electronics,Piece,5000,7999,2,10\n"
        "Bulk Bluetooth Speaker,SKU-BULK-02,Electronics,Piece,2500,3499,3,5\n"
        "Bulk Smart Watch,SKU-BULK-01,Electronics,Piece,5000,7999,2,0\n"  # Duplicate SKU, should skip
    )

    summary = await service.import_products(
        tenant_id=tenant_id,
        file_content=csv_data.encode("utf-8"),
        user_id=user_id,
    )

    assert summary.total_rows == 3
    assert summary.imported == 2
    assert summary.skipped_duplicates == 1
    assert summary.failed == 0
    assert len(summary.errors) == 0


@pytest.mark.asyncio
async def test_import_products_missing_product_name() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored = build_inventory_mock_db()
    service = InventoryService(mock_db)

    csv_data = (
        "Product Name *,SKU,Category,Unit *,Purchase Price,Selling Price,Minimum Stock,Opening Stock\n"
        ",SKU-FAIL-01,Electronics,Piece,5000,7999,2,10\n"
    )

    summary = await service.import_products(
        tenant_id=tenant_id,
        file_content=csv_data.encode("utf-8"),
        user_id=user_id,
    )

    assert summary.total_rows == 1
    assert summary.imported == 0
    assert summary.failed == 1
    assert len(summary.errors) == 1
    assert summary.errors[0].reason == "Missing Product Name"



