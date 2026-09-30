from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.entitlements import has_module_access
from app.models.inventory import StockMovement
from app.repositories.inventory import ProductRepository, StockMovementRepository

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
    CreditLimitWarningResponse,
    CustomerStatementResponse,
    InvoiceCreate,
    LineItemCreate,
    PaymentCreate,
    QuotationCreate,
    QuotationUpdate,
)
from app.services.audit import compute_changes, log_audit_event


def calculate_line_item(item_in: LineItemCreate) -> dict[str, Any]:
    amount = round(item_in.quantity * item_in.rate, 2)
    tax_amount = round(amount * (item_in.tax_rate_percent / 100.0), 2)
    total = round(amount + tax_amount, 2)
    return {
        "product_id": getattr(item_in, "product_id", None),
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
        user_agent: str | None = None,
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
        tracked = ["quotation_number", "customer_id", "total_amount", "valid_until", "status", "notes"]
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.quotation.create",
            entity_type="quotation",
            entity_id=str(created.id),
            entity_label=created.quotation_number,
            changes=compute_changes(None, created, tracked),
            details={"quotation_number": created.quotation_number, "total_amount": float(created.total_amount)},
            ip_address=ip_address,
            user_agent=user_agent,
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
        user_agent: str | None = None,
    ) -> Quotation:
        quotation = await self.get_quotation(tenant_id, quotation_id)
        update_data = quotation_in.model_dump(exclude_unset=True)
        tracked = ["quotation_number", "customer_id", "total_amount", "valid_until", "status", "notes"]
        before_dict = {f: getattr(quotation, f, None) for f in tracked}

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
        changes = compute_changes(before_dict, quotation, list(update_data.keys()))
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.quotation.update",
            entity_type="quotation",
            entity_id=str(quotation.id),
            entity_label=quotation.quotation_number,
            changes=changes,
            details={"quotation_number": quotation.quotation_number, "status": quotation.status},
            ip_address=ip_address,
            user_agent=user_agent,
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
        user_agent: str | None = None,
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
                    product_id=getattr(item, "product_id", None),
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
        await self._process_invoice_stock_deduction(tenant_id, user_id, created_invoice, ip_address, user_agent)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.quotation.convert",
            entity_type="quotation",
            entity_id=str(quotation.id),
            entity_label=quotation.quotation_number,
            details={"invoice_id": str(created_invoice.id), "invoice_number": created_invoice.invoice_number},
            ip_address=ip_address,
            user_agent=user_agent,
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
        user_agent: str | None = None,
    ) -> tuple[Invoice | None, CreditLimitWarningResponse | None]:
        customer = await self.customer_repo.get_by_id(tenant_id, invoice_in.customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found",
            )

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

        # Check Credit Limit (Section 4)
        if customer.credit_limit is not None:
            statement = await self.get_customer_statement(tenant_id, invoice_in.customer_id)
            current_outstanding = statement.outstanding_balance
            inv_amount = round(total_amount, 2)
            projected = round(current_outstanding + inv_amount, 2)
            credit_limit = float(customer.credit_limit)

            if projected > credit_limit and not invoice_in.confirm:
                warning = CreditLimitWarningResponse(
                    warning=True,
                    current_outstanding=current_outstanding,
                    invoice_amount=inv_amount,
                    credit_limit=credit_limit,
                    projected_outstanding=projected,
                    message=(
                        f"Creating this invoice (₹{inv_amount:,.2f}) will cause customer's "
                        f"outstanding (₹{projected:,.2f}) to exceed their credit limit (₹{credit_limit:,.2f})."
                    ),
                )
                return None, warning

        number = await self.seq_repo.get_next_number(tenant_id, "invoice", "INV")

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

        await self._process_invoice_stock_deduction(tenant_id, user_id, created, ip_address, user_agent)

        tracked = ["invoice_number", "customer_id", "total_amount", "due_date", "status", "notes"]
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.invoice.create",
            entity_type="invoice",
            entity_id=str(created.id),
            entity_label=created.invoice_number,
            changes=compute_changes(None, created, tracked),
            details={"invoice_number": created.invoice_number, "total_amount": float(created.total_amount)},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        return created, None

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
        user_agent: str | None = None,
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
        tracked = ["receipt_number", "amount", "payment_mode", "payment_date"]

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.payment.create",
            entity_type="payment",
            entity_id=str(created_payment.id),
            entity_label=created_payment.receipt_number,
            changes=compute_changes(None, created_payment, tracked),
            details={
                "receipt_number": created_payment.receipt_number,
                "amount": float(created_payment.amount),
                "invoice_id": str(invoice.id),
            },
            ip_address=ip_address,
            user_agent=user_agent,
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

        op_bal = 0.0
        if customer.opening_balance:
            op_bal = float(customer.opening_balance) if customer.opening_balance_type == "Debit" else -float(customer.opening_balance)

        total_invoiced = sum(float(inv.total_amount) for inv in invoices if inv.status != "Cancelled")
        total_paid = sum(float(p.amount) for p in payments)
        outstanding = op_bal + sum(float(inv.amount_due) for inv in invoices if inv.status != "Cancelled")

        for inv in invoices:
            inv.status = compute_invoice_status(inv)

        return CustomerStatementResponse(
            customer_id=customer.id,
            customer_name=customer.name,
            opening_balance=round(op_bal, 2),
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
        user_agent: str | None = None,
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
            entity_label=quotation.quotation_number,
            details={"quotation_number": quotation.quotation_number},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()

    async def delete_invoice(
        self,
        tenant_id: UUID,
        user_id: UUID,
        invoice_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        invoice = await self.get_invoice(tenant_id, invoice_id)
        await self._process_invoice_stock_reversal(tenant_id, user_id, invoice, ip_address, user_agent)
        await self.invoice_repo.soft_delete(tenant_id, invoice_id)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="sales.invoice.delete",
            entity_type="invoice",
            entity_id=str(invoice.id),
            entity_label=invoice.invoice_number,
            details={"invoice_number": invoice.invoice_number},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()

    async def _process_invoice_stock_deduction(
        self,
        tenant_id: UUID,
        user_id: UUID,
        invoice: Invoice,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        if not await has_module_access(self.db, tenant_id, "inventory"):
            return

        items_with_products = [item for item in invoice.items if getattr(item, "product_id", None) is not None]
        if not items_with_products:
            return

        prod_repo = ProductRepository(self.db)
        move_repo = StockMovementRepository(self.db)

        # 1. Validate stock for all items first
        for item in items_with_products:
            if item.product_id is None:
                continue
            product = await prod_repo.get_by_id(tenant_id, item.product_id, lock_for_update=True)
            if not product:
                continue
            current_stock = await move_repo.get_current_stock(tenant_id, product.id)
            req_qty = Decimal(str(item.quantity))
            if current_stock < req_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f'Insufficient stock for "{product.name}". '
                        f'Available stock: {float(current_stock):g}, Requested quantity: {float(req_qty):g}. '
                        f'Please reduce the quantity or add more stock.'
                    ),
                )

        # 2. Create stock OUT movements idempotently
        now = datetime.now(UTC)
        for item in items_with_products:
            if item.product_id is None:
                continue
            product = await prod_repo.get_by_id(tenant_id, item.product_id)
            if not product:
                continue
            exists = await move_repo.check_movement_exists(
                tenant_id, product.id, "INVOICE", str(invoice.id), movement_type="OUT"
            )
            if exists:
                continue

            req_qty = Decimal(str(item.quantity))
            unit_cost = Decimal(str(product.purchase_price))
            tot_cost = round(req_qty * unit_cost, 2)

            movement = StockMovement(
                tenant_id=tenant_id,
                product_id=product.id,
                movement_type="OUT",
                quantity=req_qty,
                unit_cost=unit_cost,
                total_cost=tot_cost,
                reference_type="INVOICE",
                reference_id=str(invoice.id),
                movement_date=now,
                reason="Sale",
                notes=f"Deducted for invoice {invoice.invoice_number}",
                created_by_id=user_id,
            )
            await move_repo.create(movement)
            await log_audit_event(
                self.db,
                tenant_id=tenant_id,
                user_id=user_id,
                action="inventory.invoice_deduction",
                entity_type="stock_movement",
                entity_id=str(movement.id),
                entity_label=f"Deducted {float(req_qty):g} of {product.name}",
                details={"invoice_id": str(invoice.id), "invoice_number": invoice.invoice_number, "product_id": str(product.id)},
                ip_address=ip_address,
                user_agent=user_agent,
                commit=False,
            )

    async def _process_invoice_stock_reversal(
        self,
        tenant_id: UUID,
        user_id: UUID,
        invoice: Invoice,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        if not await has_module_access(self.db, tenant_id, "inventory"):
            return

        move_repo = StockMovementRepository(self.db)
        movements, _ = await move_repo.list_movements(
            tenant_id=tenant_id,
            reference_type="INVOICE",
            reference_id=str(invoice.id),
            movement_type="OUT",
            limit=1000,
        )
        if not movements:
            return

        now = datetime.now(UTC)
        for m in movements:
            exists = await move_repo.check_movement_exists(
                tenant_id, m.product_id, "INVOICE_CANCEL", str(invoice.id)
            )
            if exists:
                continue

            reversal = StockMovement(
                tenant_id=tenant_id,
                product_id=m.product_id,
                movement_type="IN",
                quantity=m.quantity,
                unit_cost=m.unit_cost,
                total_cost=m.total_cost,
                reference_type="INVOICE_CANCEL",
                reference_id=str(invoice.id),
                movement_date=now,
                reason="Invoice Cancellation",
                notes=f"Restored stock for cancelled invoice {invoice.invoice_number}",
                created_by_id=user_id,
            )
            await move_repo.create(reversal)
            await log_audit_event(
                self.db,
                tenant_id=tenant_id,
                user_id=user_id,
                action="inventory.invoice_reversal",
                entity_type="stock_movement",
                entity_id=str(reversal.id),
                entity_label=f"Restored {float(m.quantity):g} for invoice {invoice.invoice_number}",
                details={"invoice_id": str(invoice.id), "invoice_number": invoice.invoice_number, "product_id": str(m.product_id)},
                ip_address=ip_address,
                user_agent=user_agent,
                commit=False,
            )

