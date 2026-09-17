from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sales import (
    Invoice,
    InvoiceItem,
    Payment,
    Quotation,
    QuotationItem,
)
from app.repositories.crm import CustomerRepository
from app.repositories.sales import (
    InvoiceRepository,
    PaymentRepository,
    QuotationRepository,
    SalesSequenceRepository,
)
from app.schemas.sales import (
    CustomerStatementResponse,
    InvoiceCreate,
    LineItemCreate,
    PaymentCreate,
    QuotationCreate,
    QuotationUpdate,
)
from app.services.audit import log_audit_event


def calculate_line_item(item_in: LineItemCreate) -> dict[str, Any]:
    amount = round(item_in.quantity * item_in.rate, 2)
    tax_amount = round(amount * (item_in.tax_rate_percent / 100.0), 2)
    total = round(amount + tax_amount, 2)
    return {
        "description": item_in.description,
        "quantity": item_in.quantity,
        "rate": item_in.rate,
        "tax_rate_percent": item_in.tax_rate_percent,
        "amount": amount,
        "tax_amount": tax_amount,
        "total": total,
    }


def compute_invoice_status(invoice: Invoice) -> str:
    if invoice.status == "Cancelled":
        return "Cancelled"
    if invoice.amount_due <= 0:
        return "Paid"
    now = datetime.now(UTC)
    due = invoice.due_date
    if due.tzinfo is None:
        due = due.replace(tzinfo=UTC)
    if due < now:
        return "Overdue"
    if invoice.amount_paid > 0:
        return "Partially Paid"
    return invoice.status if invoice.status in ("Sent", "Draft") else "Sent"


class SalesService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.seq_repo = SalesSequenceRepository(db)
        self.quotation_repo = QuotationRepository(db)
        self.invoice_repo = InvoiceRepository(db)
        self.payment_repo = PaymentRepository(db)
        self.customer_repo = CustomerRepository(db)

    # --- Quotations ---
    async def create_quotation(
        self,
        tenant_id: UUID,
        user_id: UUID,
        quotation_in: QuotationCreate,
        ip_address: str | None = None,
    ) -> Quotation:
        customer = await self.customer_repo.get_by_id(tenant_id, quotation_in.customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found",
            )

        number = await self.seq_repo.get_next_number(tenant_id, "quotation", "QT")

        items: list[QuotationItem] = []
        subtotal = 0.0
        tax_amount = 0.0
        total_amount = 0.0

        for item_data in quotation_in.items:
            computed = calculate_line_item(item_data)
            subtotal += computed["amount"]
            tax_amount += computed["tax_amount"]
            total_amount += computed["total"]
            items.append(QuotationItem(**computed))

        quotation = Quotation(
            tenant_id=tenant_id,
            customer_id=quotation_in.customer_id,
            quotation_number=number,
            status="Draft",
            issue_date=quotation_in.issue_date,
            valid_until=quotation_in.valid_until,
            notes=quotation_in.notes,
            subtotal=round(subtotal, 2),
            tax_amount=round(tax_amount, 2),
            total_amount=round(total_amount, 2),
            items=items,
        )

        created = await self.quotation_repo.create(quotation)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.quotation.create",
            entity_type="quotation",
            entity_id=str(created.id),
            details={"quotation_number": created.quotation_number, "total_amount": float(created.total_amount)},
            ip_address=ip_address,
        )
        await self.db.commit()
        return created

    async def get_quotation(self, tenant_id: UUID, quotation_id: UUID) -> Quotation:
        quotation = await self.quotation_repo.get_by_id(tenant_id, quotation_id)
        if not quotation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quotation not found",
            )
        return quotation

    async def list_quotations(
        self,
        tenant_id: UUID,
        customer_id: UUID | None = None,
        status_filter: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Quotation], int]:
        items, total = await self.quotation_repo.list_quotations(
            tenant_id=tenant_id,
            customer_id=customer_id,
            status=status_filter,
            skip=skip,
            limit=limit,
        )
        return list(items), total

    async def update_quotation(
        self,
        tenant_id: UUID,
        user_id: UUID,
        quotation_id: UUID,
        quotation_in: QuotationUpdate,
        ip_address: str | None = None,
    ) -> Quotation:
        quotation = await self.get_quotation(tenant_id, quotation_id)
        update_data = quotation_in.model_dump(exclude_unset=True)

        if "customer_id" in update_data:
            customer = await self.customer_repo.get_by_id(tenant_id, update_data["customer_id"])
            if not customer:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
            quotation.customer_id = update_data["customer_id"]

        if "status" in update_data:
            quotation.status = update_data["status"]
        if "issue_date" in update_data:
            quotation.issue_date = update_data["issue_date"]
        if "valid_until" in update_data:
            quotation.valid_until = update_data["valid_until"]
        if "notes" in update_data:
            quotation.notes = update_data["notes"]

        if "items" in update_data and update_data["items"] is not None:
            quotation.items.clear()
            subtotal = 0.0
            tax_amount = 0.0
            total_amount = 0.0
            for item_data in quotation_in.items or []:
                computed = calculate_line_item(item_data)
                subtotal += computed["amount"]
                tax_amount += computed["tax_amount"]
                total_amount += computed["total"]
                quotation.items.append(QuotationItem(**computed))
            quotation.subtotal = round(subtotal, 2)
            quotation.tax_amount = round(tax_amount, 2)
            quotation.total_amount = round(total_amount, 2)

        await self.db.flush()
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.quotation.update",
            entity_type="quotation",
            entity_id=str(quotation.id),
            details={"quotation_number": quotation.quotation_number, "status": quotation.status},
            ip_address=ip_address,
        )
        await self.db.commit()
        await self.db.refresh(quotation)
        return quotation

    async def convert_quotation_to_invoice(
        self,
        tenant_id: UUID,
        user_id: UUID,
        quotation_id: UUID,
        ip_address: str | None = None,
    ) -> Invoice:
        quotation = await self.get_quotation(tenant_id, quotation_id)
        if quotation.status == "Accepted":
            # Check if invoice already exists
            invoices, _ = await self.invoice_repo.list_invoices(tenant_id, customer_id=quotation.customer_id)
            for inv in invoices:
                if inv.quotation_id == quotation.id:
                    return inv

        invoice_number = await self.seq_repo.get_next_number(tenant_id, "invoice", "INV")

        items: list[InvoiceItem] = []
        for item in quotation.items:
            items.append(
                InvoiceItem(
                    description=item.description,
                    quantity=item.quantity,
                    rate=item.rate,
                    tax_rate_percent=item.tax_rate_percent,
                    amount=item.amount,
                    tax_amount=item.tax_amount,
                    total=item.total,
                )
            )

        now = datetime.now(UTC)
        due_date = quotation.valid_until if quotation.valid_until else now

        invoice = Invoice(
            tenant_id=tenant_id,
            customer_id=quotation.customer_id,
            quotation_id=quotation.id,
            invoice_number=invoice_number,
            status="Sent",
            issue_date=now,
            due_date=due_date,
            subtotal=quotation.subtotal,
            tax_amount=quotation.tax_amount,
            total_amount=quotation.total_amount,
            amount_paid=0.0,
            amount_due=quotation.total_amount,
            notes=quotation.notes,
            items=items,
        )

        quotation.status = "Accepted"
        created_invoice = await self.invoice_repo.create(invoice)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.quotation.convert",
            entity_type="quotation",
            entity_id=str(quotation.id),
            details={"invoice_id": str(created_invoice.id), "invoice_number": created_invoice.invoice_number},
            ip_address=ip_address,
        )
        await self.db.commit()
        return created_invoice

    # --- Invoices ---
    async def create_invoice(
        self,
        tenant_id: UUID,
        user_id: UUID,
        invoice_in: InvoiceCreate,
        ip_address: str | None = None,
    ) -> Invoice:
        customer = await self.customer_repo.get_by_id(tenant_id, invoice_in.customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found",
            )

        number = await self.seq_repo.get_next_number(tenant_id, "invoice", "INV")

        items: list[InvoiceItem] = []
        subtotal = 0.0
        tax_amount = 0.0
        total_amount = 0.0

        for item_data in invoice_in.items:
            computed = calculate_line_item(item_data)
            subtotal += computed["amount"]
            tax_amount += computed["tax_amount"]
            total_amount += computed["total"]
            items.append(InvoiceItem(**computed))

        invoice = Invoice(
            tenant_id=tenant_id,
            customer_id=invoice_in.customer_id,
            quotation_id=invoice_in.quotation_id,
            invoice_number=number,
            status="Draft",
            issue_date=invoice_in.issue_date,
            due_date=invoice_in.due_date,
            notes=invoice_in.notes,
            subtotal=round(subtotal, 2),
            tax_amount=round(tax_amount, 2),
            total_amount=round(total_amount, 2),
            amount_paid=0.0,
            amount_due=round(total_amount, 2),
            items=items,
        )

        created = await self.invoice_repo.create(invoice)
        created.status = compute_invoice_status(created)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.invoice.create",
            entity_type="invoice",
            entity_id=str(created.id),
            details={"invoice_number": created.invoice_number, "total_amount": float(created.total_amount)},
            ip_address=ip_address,
        )
        await self.db.commit()
        return created

    async def get_invoice(self, tenant_id: UUID, invoice_id: UUID) -> Invoice:
        invoice = await self.invoice_repo.get_by_id(tenant_id, invoice_id)
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found",
            )
        invoice.status = compute_invoice_status(invoice)
        return invoice

    async def list_invoices(
        self,
        tenant_id: UUID,
        customer_id: UUID | None = None,
        status_filter: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Invoice], int]:
        items, total = await self.invoice_repo.list_invoices(
            tenant_id=tenant_id,
            customer_id=customer_id,
            status=status_filter,
            skip=skip,
            limit=limit,
        )
        for inv in items:
            inv.status = compute_invoice_status(inv)
        return list(items), total

    # --- Payments ---
    async def record_payment(
        self,
        tenant_id: UUID,
        user_id: UUID,
        payment_in: PaymentCreate,
        ip_address: str | None = None,
    ) -> Payment:
        invoice = await self.get_invoice(tenant_id, payment_in.invoice_id)

        pay_amount = round(payment_in.amount, 2)
        current_due = round(float(invoice.amount_due), 2)

        if pay_amount > current_due + 0.01:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount ({pay_amount}) cannot exceed remaining amount due ({current_due})",
            )

        receipt_number = await self.seq_repo.get_next_number(tenant_id, "payment", "REC")

        payment = Payment(
            tenant_id=tenant_id,
            invoice_id=invoice.id,
            customer_id=invoice.customer_id,
            amount=pay_amount,
            payment_date=payment_in.payment_date,
            payment_mode=payment_in.payment_mode,
            receipt_number=receipt_number,
            notes=payment_in.notes,
        )

        new_paid = round(float(invoice.amount_paid) + pay_amount, 2)
        new_due = round(max(0.0, float(invoice.total_amount) - new_paid), 2)

        invoice.amount_paid = new_paid
        invoice.amount_due = new_due
        invoice.status = compute_invoice_status(invoice)

        created_payment = await self.payment_repo.create(payment)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.payment.create",
            entity_type="payment",
            entity_id=str(created_payment.id),
            details={
                "receipt_number": created_payment.receipt_number,
                "amount": float(created_payment.amount),
                "invoice_id": str(invoice.id),
            },
            ip_address=ip_address,
        )
        await self.db.commit()
        return created_payment

    async def list_payments(
        self,
        tenant_id: UUID,
        invoice_id: UUID | None = None,
        customer_id: UUID | None = None,
    ) -> list[Payment]:
        items = await self.payment_repo.list_payments(tenant_id, invoice_id, customer_id)
        return list(items)

    async def get_customer_statement(
        self,
        tenant_id: UUID,
        customer_id: UUID,
    ) -> CustomerStatementResponse:
        customer = await self.customer_repo.get_by_id(tenant_id, customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found",
            )

        invoices, _ = await self.invoice_repo.list_invoices(tenant_id, customer_id=customer_id, limit=200)
        payments = await self.payment_repo.list_payments(tenant_id, customer_id=customer_id)

        total_invoiced = sum(float(inv.total_amount) for inv in invoices if inv.status != "Cancelled")
        total_paid = sum(float(p.amount) for p in payments)
        outstanding = sum(float(inv.amount_due) for inv in invoices if inv.status != "Cancelled")

        for inv in invoices:
            inv.status = compute_invoice_status(inv)

        return CustomerStatementResponse(
            customer_id=customer.id,
            customer_name=customer.name,
            total_invoiced=round(total_invoiced, 2),
            total_paid=round(total_paid, 2),
            outstanding_balance=round(outstanding, 2),
            invoices=[inv for inv in invoices],
            payments=[p for p in payments],
        )

    async def delete_quotation(
        self,
        tenant_id: UUID,
        user_id: UUID,
        quotation_id: UUID,
        ip_address: str | None = None,
    ) -> None:
        quotation = await self.get_quotation(tenant_id, quotation_id)
        await self.quotation_repo.soft_delete(tenant_id, quotation_id)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.quotation.delete",
            entity_type="quotation",
            entity_id=str(quotation.id),
            details={"quotation_number": quotation.quotation_number},
            ip_address=ip_address,
        )
        await self.db.commit()

    async def delete_invoice(
        self,
        tenant_id: UUID,
        user_id: UUID,
        invoice_id: UUID,
        ip_address: str | None = None,
    ) -> None:
        invoice = await self.get_invoice(tenant_id, invoice_id)
        await self.invoice_repo.soft_delete(tenant_id, invoice_id)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.invoice.delete",
            entity_type="invoice",
            entity_id=str(invoice.id),
            details={"invoice_number": invoice.invoice_number},
            ip_address=ip_address,
        )
        await self.db.commit()
