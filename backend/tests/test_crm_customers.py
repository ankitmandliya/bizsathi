from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.crm import Customer
from app.schemas.crm import CustomerCreate, CustomerUpdate
from app.schemas.sales import InvoiceCreate, LineItemCreate
from app.services.crm import CRMService
from app.services.sales import SalesService
from tests.test_crm import build_mock_db_session
from tests.test_sales import build_sales_mock_db


@pytest.mark.asyncio
async def test_direct_customer_creation_valid_and_invalid() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, _ = build_mock_db_session()
    service = CRMService(mock_db)

    # 1. Valid Creation with required Name & Phone
    cust_in = CustomerCreate(
        name="Sunil Kumar",
        phone="9876543210",
        email="sunil@example.com",
        customer_type="Individual",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        opening_balance=1500.0,
        opening_balance_type="Debit",
        credit_limit=25000.0,
    )
    cust = await service.create_customer(tenant_id, user_id, cust_in)
    assert cust.id is not None
    assert cust.name == "Sunil Kumar"
    assert cust.phone == "9876543210"
    assert float(cust.opening_balance) == 1500.0
    assert float(cust.credit_limit) == 25000.0

    # 2. Invalid Creation missing phone -> should raise 400
    invalid_in = CustomerCreate(
        name="No Phone Customer",
        phone="   ",
    )
    with pytest.raises(HTTPException) as exc_info:
        await service.create_customer(tenant_id, user_id, invalid_in)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_customer_opening_balance_in_outstanding() -> None:
    tenant_id = uuid4()
    mock_db, stored_objects = build_sales_mock_db()

    # Customer with Debit Opening Balance (customer owes business)
    cust1 = Customer(
        id=uuid4(),
        tenant_id=tenant_id,
        name="Debit Customer",
        opening_balance=5000.0,
        opening_balance_type="Debit",
    )
    stored_objects.append(cust1)

    sales_service = SalesService(mock_db)
    stmt1 = await sales_service.get_customer_statement(tenant_id, cust1.id)
    assert stmt1.outstanding_balance == 5000.0

    # Customer with Credit Opening Balance (business owes customer advance)
    cust2 = Customer(
        id=uuid4(),
        tenant_id=tenant_id,
        name="Credit Customer",
        opening_balance=2000.0,
        opening_balance_type="Credit",
    )
    stored_objects.append(cust2)

    stmt2 = await sales_service.get_customer_statement(tenant_id, cust2.id)
    assert stmt2.outstanding_balance == -2000.0


@pytest.mark.asyncio
async def test_credit_limit_warning_flow_on_invoice() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored_objects = build_sales_mock_db()

    # Customer with Credit Limit = 10,000 and Opening Balance = 8,000 Debit
    cust = Customer(
        id=uuid4(),
        tenant_id=tenant_id,
        name="Limited Credit Customer",
        opening_balance=8000.0,
        opening_balance_type="Debit",
        credit_limit=10000.0,
    )
    stored_objects.append(cust)

    sales_service = SalesService(mock_db)

    # 1. Invoice of 5,000 without confirm -> total projected = 8,000 + 5,000 = 13,000 (> 10,000) -> returns warning
    inv_in_unconfirmed = InvoiceCreate(
        customer_id=cust.id,
        issue_date=datetime.now(UTC),
        due_date=datetime.now(UTC) + timedelta(days=7),
        items=[LineItemCreate(description="Services", quantity=1.0, rate=5000.0, tax_rate_percent=0.0)],
        confirm=False,
    )

    created_inv, warning = await sales_service.create_invoice(tenant_id, user_id, inv_in_unconfirmed)
    assert created_inv is None
    assert warning is not None
    assert warning.warning is True
    assert warning.projected_outstanding == 13000.0

    # 2. Same invoice with confirm=True -> creates invoice
    inv_in_confirmed = InvoiceCreate(
        customer_id=cust.id,
        issue_date=datetime.now(UTC),
        due_date=datetime.now(UTC) + timedelta(days=7),
        items=[LineItemCreate(description="Services", quantity=1.0, rate=5000.0, tax_rate_percent=0.0)],
        confirm=True,
    )

    created_inv, warning = await sales_service.create_invoice(tenant_id, user_id, inv_in_confirmed)
    assert created_inv is not None
    assert warning is None
    assert created_inv.total_amount == 5000.0


@pytest.mark.asyncio
async def test_customer_import_valid_duplicates_and_errors() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, _ = build_mock_db_session()
    service = CRMService(mock_db)

    csv_data = (
        "Customer Name *,Mobile Number *,Email,Customer Type,Company Name,Billing Address,City,State,Pincode,GSTIN,PAN,Opening Balance,Balance Type,Credit Limit,Notes\n"
        "Ramesh Shah,9876543210,ramesh@shah.com,Business,Shah Traders,10 Main St,Mumbai,Maharashtra,400001,27AAAAA0000A1Z5,ABCDE1234F,5000,Debit,50000,Good customer\n"
        "Invalid Email Customer,9123456789,invalid-email,Individual,,,,,,,,,,\n"
        "Duplicate Mobile Customer,9876543210,other@shah.com,Individual,,,,,,,,,,\n"
        "Missing Mobile Customer,,test@test.com,Individual,,,,,,,,,,\n"
    )
    summary = await service.import_customers(tenant_id, user_id, csv_data.encode("utf-8"))

    assert summary.imported_count == 1
    assert summary.skipped_count == 1  # 9876543210 duplicate skipped
    assert summary.failed_count == 2   # invalid email + missing mobile
    assert len(summary.errors) == 2


@pytest.mark.asyncio
async def test_sample_customer_template_generation() -> None:
    mock_db, _ = build_mock_db_session()
    service = CRMService(mock_db)
    csv_str = service.generate_sample_customer_template()
    assert "Customer Name *" in csv_str
    assert "Mobile Number *" in csv_str
    assert "Ramesh Traders" in csv_str
