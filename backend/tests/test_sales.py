from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm import Customer
from app.models.sales import Invoice, Payment, Quotation, SalesSequence
from app.schemas.sales import InvoiceCreate, LineItemCreate, PaymentCreate, QuotationCreate
from app.services.sales import SalesService, calculate_line_item, compute_invoice_status


def build_sales_mock_db():
    mock_db = AsyncMock(spec=AsyncSession)
    stored_objects: list[object] = []

    def mock_add(obj: object) -> None:
        if not hasattr(obj, "id") or getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        stored_objects.append(obj)

    async def mock_flush() -> None:
        pass

    async def mock_refresh(obj: object) -> None:
        pass

    async def mock_execute(stmt: object) -> MagicMock:
        mock_res = MagicMock()
        sql_str = str(stmt)
        params = list(stmt.compile().params.values()) if hasattr(stmt, "compile") else []

        if "sales_sequences" in sql_str:
            seqs = [o for o in stored_objects if isinstance(o, SalesSequence)]
            matched = [s for s in seqs if any(s.entity_type == p for p in params)]
            mock_res.scalar_one_or_none.return_value = matched[0] if matched else None
        elif "customers" in sql_str:
            customers = [o for o in stored_objects if isinstance(o, Customer)]
            mock_res.scalar_one_or_none.return_value = customers[0] if customers else None
        elif "quotations" in sql_str:
            quotations = [o for o in stored_objects if isinstance(o, Quotation)]
            mock_res.scalars.return_value.all.return_value = quotations
            mock_res.scalar_one.return_value = len(quotations)
            mock_res.scalar_one_or_none.return_value = quotations[0] if quotations else None
        elif "invoices" in sql_str:
            invoices = [o for o in stored_objects if isinstance(o, Invoice)]
            mock_res.scalars.return_value.all.return_value = invoices
            mock_res.scalar_one.return_value = len(invoices)
            mock_res.scalar_one_or_none.return_value = invoices[0] if invoices else None
        elif "payments" in sql_str:
            payments = [o for o in stored_objects if isinstance(o, Payment)]
            mock_res.scalars.return_value.all.return_value = payments
            mock_res.scalar_one_or_none.return_value = payments[0] if payments else None
        else:
            mock_res.scalars.return_value.all.return_value = []
            mock_res.scalar_one_or_none.return_value = None
            mock_res.scalar_one.return_value = 0

        return mock_res

    mock_db.add.side_effect = mock_add
    mock_db.flush.side_effect = mock_flush
    mock_db.refresh.side_effect = mock_refresh
    mock_db.execute.side_effect = mock_execute
    return mock_db, stored_objects


def test_line_item_server_side_calculation() -> None:
    item = LineItemCreate(
        description="Web Design Service",
        quantity=2.0,
        rate=5000.0,
        tax_rate_percent=18.0,
    )
    computed = calculate_line_item(item)
    assert computed["amount"] == 10000.0
    assert computed["tax_amount"] == 1800.0
    assert computed["total"] == 11800.0


@pytest.mark.asyncio
async def test_sales_quotation_create_and_convert_to_invoice() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored_objects = build_sales_mock_db()

    # Seed Customer
    customer = Customer(id=uuid4(), tenant_id=tenant_id, name="Test Customer Corp")
    stored_objects.append(customer)

    service = SalesService(mock_db)

    # 1. Create Quotation
    quotation_in = QuotationCreate(
        customer_id=customer.id,
        issue_date=datetime.now(UTC),
        valid_until=datetime.now(UTC) + timedelta(days=30),
        notes="First quote",
        items=[
            LineItemCreate(description="Consulting", quantity=5.0, rate=1000.0, tax_rate_percent=18.0),
        ],
    )
    quotation = await service.create_quotation(tenant_id, user_id, quotation_in)
    assert quotation.quotation_number == "QT-0001"
    assert quotation.subtotal == 5000.0
    assert quotation.tax_amount == 900.0
    assert quotation.total_amount == 5900.0

    # 2. Convert to Invoice
    invoice = await service.convert_quotation_to_invoice(tenant_id, user_id, quotation.id)
    assert invoice.invoice_number == "INV-0001"
    assert invoice.quotation_id == quotation.id
    assert invoice.total_amount == 5900.0
    assert invoice.amount_due == 5900.0
    assert invoice.amount_paid == 0.0
    assert quotation.status == "Accepted"


@pytest.mark.asyncio
async def test_sales_payment_flow_and_overpayment_rejection() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored_objects = build_sales_mock_db()

    customer = Customer(id=uuid4(), tenant_id=tenant_id, name="Payment Test Customer")
    stored_objects.append(customer)

    service = SalesService(mock_db)

    # Create Invoice directly
    invoice_in = InvoiceCreate(
        customer_id=customer.id,
        issue_date=datetime.now(UTC),
        due_date=datetime.now(UTC) + timedelta(days=15),
        items=[
            LineItemCreate(description="Software License", quantity=1.0, rate=10000.0, tax_rate_percent=18.0),
        ],
    )
    invoice = await service.create_invoice(tenant_id, user_id, invoice_in)
    assert invoice.total_amount == 11800.0
    assert invoice.amount_due == 11800.0

    # 1. Partial Payment
    payment1_in = PaymentCreate(
        invoice_id=invoice.id,
        amount=5000.0,
        payment_date=datetime.now(UTC),
        payment_mode="UPI",
    )
    p1 = await service.record_payment(tenant_id, user_id, payment1_in)
    assert p1.receipt_number == "REC-0001"
    assert invoice.amount_paid == 5000.0
    assert invoice.amount_due == 6800.0
    assert invoice.status == "Partially Paid"

    # 2. Over-payment Attempt -> should fail with 400 Bad Request
    overpay_in = PaymentCreate(
        invoice_id=invoice.id,
        amount=10000.0,  # exceeds remaining 6800.0
        payment_date=datetime.now(UTC),
        payment_mode="Cash",
    )
    with pytest.raises(HTTPException) as exc_info:
        await service.record_payment(tenant_id, user_id, overpay_in)
    assert exc_info.value.status_code == 400
    assert "cannot exceed remaining amount due" in exc_info.value.detail

    # 3. Final Full Payment
    payment2_in = PaymentCreate(
        invoice_id=invoice.id,
        amount=6800.0,
        payment_date=datetime.now(UTC),
        payment_mode="Bank Transfer",
    )
    await service.record_payment(tenant_id, user_id, payment2_in)
    assert invoice.amount_paid == 11800.0
    assert invoice.amount_due == 0.0
    assert invoice.status == "Paid"


def test_overdue_status_computation() -> None:
    past_due = datetime.now(UTC) - timedelta(days=5)
    future_due = datetime.now(UTC) + timedelta(days=5)

    inv_overdue = Invoice(
        status="Sent",
        due_date=past_due,
        total_amount=5000.0,
        amount_paid=0.0,
        amount_due=5000.0,
    )
    assert compute_invoice_status(inv_overdue) == "Overdue"

    inv_paid = Invoice(
        status="Sent",
        due_date=past_due,
        total_amount=5000.0,
        amount_paid=5000.0,
        amount_due=0.0,
    )
    assert compute_invoice_status(inv_paid) == "Paid"

    inv_future = Invoice(
        status="Sent",
        due_date=future_due,
        total_amount=5000.0,
        amount_paid=0.0,
        amount_due=5000.0,
    )
    assert compute_invoice_status(inv_future) == "Sent"
