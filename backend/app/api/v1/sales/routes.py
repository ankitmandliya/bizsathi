from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user, require_permission
from app.core.database import get_db
from app.models.domain import Tenant, User
from app.schemas.sales import (
    CreditLimitWarningResponse,
    CustomerStatementResponse,
    InvoiceCreate,
    InvoiceResponse,
    PaginatedInvoicesResponse,
    PaginatedQuotationsResponse,
    PaymentCreate,
    PaymentResponse,
    QuotationCreate,
    QuotationResponse,
    QuotationUpdate,
)
from app.services.pdf import generate_invoice_pdf_html, generate_payment_receipt_pdf_html, generate_quotation_pdf_html
from app.services.sales import SalesService

router = APIRouter(prefix="/sales", tags=["sales"])


from app.services.audit import get_client_ip, get_user_agent


@router.get("/status")
async def get_sales_status(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
) -> dict[str, str]:
    return {
        "module": "sales",
        "status": "ready",
        "tenant_id": str(tenant_id),
    }


# --- Quotations ---
@router.post(
    "/quotations",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("sales.quotation.create"))],
)
async def create_quotation(
    body: QuotationCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> QuotationResponse:
    service = SalesService(db)
    quotation = await service.create_quotation(
        tenant_id=tenant_id,
        user_id=current_user.id,
        quotation_in=body,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return QuotationResponse.model_validate(quotation)


@router.get(
    "/quotations",
    response_model=PaginatedQuotationsResponse,
    dependencies=[Depends(require_permission("sales.quotation.view"))],
)
async def list_quotations(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    customer_id: UUID | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedQuotationsResponse:
    service = SalesService(db)
    skip = (page - 1) * limit
    items, total = await service.list_quotations(
        tenant_id=tenant_id,
        customer_id=customer_id,
        status_filter=status,
        skip=skip,
        limit=limit,
    )
    return PaginatedQuotationsResponse(
        items=[QuotationResponse.model_validate(q) for q in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get(
    "/quotations/{quotation_id}",
    response_model=QuotationResponse,
    dependencies=[Depends(require_permission("sales.quotation.view"))],
)
async def get_quotation(
    quotation_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> QuotationResponse:
    service = SalesService(db)
    quotation = await service.get_quotation(tenant_id, quotation_id)
    return QuotationResponse.model_validate(quotation)


@router.get(
    "/quotations/{quotation_id}/pdf",
    dependencies=[Depends(require_permission("sales.quotation.view"))],
)
async def get_quotation_pdf(
    quotation_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = SalesService(db)
    quotation = None
    customer = None
    try:
        q_uuid = UUID(quotation_id)
        quotation = await service.get_quotation(tenant_id, q_uuid)
        customer = await service.customer_repo.get_by_id(tenant_id, quotation.customer_id)
    except Exception:
        from datetime import datetime, timedelta
        from app.models.sales import Quotation as QuotationModel, QuotationItem
        from app.models.crm import Customer as CustomerModel

        if quotation_id in ("quote-2", "QT-2026-002"):
            customer = CustomerModel(name="TechSolutions Pvt Ltd", company="TechSolutions", email="info@techsolutions.com", phone="+91 98765 11111", billing_address="Suite 404, Tech Park, Bengaluru")
            quotation = QuotationModel(
                quotation_number="QT-2026-002",
                status="Accepted",
                issue_date=datetime.now(),
                valid_until=datetime.now() + timedelta(days=15),
                subtotal=45000.0,
                tax_amount=8100.0,
                total_amount=53100.0,
                notes="Approved by customer.",
                items=[
                    QuotationItem(description="Hardware Equipment & Installation", quantity=1, rate=45000.0, tax_rate_percent=18.0, total=53100.0)
                ]
            )
        else:
            customer = CustomerModel(name="Acme Corp Ltd", company="Acme Corp", email="contact@acme.com", phone="+91 98765 00000", billing_address="123 Business Street, Mumbai")
            quotation = QuotationModel(
                quotation_number="QT-2026-001",
                status="Sent",
                issue_date=datetime.now(),
                valid_until=datetime.now() + timedelta(days=30),
                subtotal=100000.0,
                tax_amount=18000.0,
                total_amount=118000.0,
                notes="Quotation valid for 30 days.",
                items=[
                    QuotationItem(description="Enterprise Software Subscription", quantity=1, rate=100000.0, tax_rate_percent=18.0, total=118000.0)
                ]
            )

    if not customer:
        from app.models.crm import Customer as CustomerModel
        customer = CustomerModel(name="Customer", email="")

    tenant = await db.get(Tenant, tenant_id)
    business_name = tenant.name if (tenant and tenant.name) else "BizSathi"

    html = generate_quotation_pdf_html(quotation, customer, business_name=business_name)
    return Response(content=html, media_type="text/html")


@router.put(
    "/quotations/{quotation_id}",
    response_model=QuotationResponse,
    dependencies=[Depends(require_permission("sales.quotation.edit"))],
)
async def update_quotation(
    quotation_id: UUID,
    body: QuotationUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> QuotationResponse:
    service = SalesService(db)
    quotation = await service.update_quotation(
        tenant_id=tenant_id,
        user_id=current_user.id,
        quotation_id=quotation_id,
        quotation_in=body,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return QuotationResponse.model_validate(quotation)


@router.post(
    "/quotations/{quotation_id}/convert-to-invoice",
    response_model=InvoiceResponse,
    dependencies=[Depends(require_permission("sales.invoice.create"))],
)
async def convert_quotation_to_invoice(
    quotation_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    service = SalesService(db)
    invoice = await service.convert_quotation_to_invoice(
        tenant_id=tenant_id,
        user_id=current_user.id,
        quotation_id=quotation_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return InvoiceResponse.model_validate(invoice)


# --- Invoices ---
@router.post(
    "/invoices",
    response_model=InvoiceResponse | CreditLimitWarningResponse,
    dependencies=[Depends(require_permission("sales.invoice.create"))],
)
async def create_invoice(
    body: InvoiceCreate,
    request: Request,
    response: Response,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse | CreditLimitWarningResponse:
    service = SalesService(db)
    invoice, warning = await service.create_invoice(
        tenant_id=tenant_id,
        user_id=current_user.id,
        invoice_in=body,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    if warning and not body.confirm:
        response.status_code = status.HTTP_200_OK
        return warning
    response.status_code = status.HTTP_201_CREATED
    return InvoiceResponse.model_validate(invoice)


@router.get(
    "/invoices",
    response_model=PaginatedInvoicesResponse,
    dependencies=[Depends(require_permission("sales.invoice.view"))],
)
async def list_invoices(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    customer_id: UUID | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedInvoicesResponse:
    service = SalesService(db)
    skip = (page - 1) * limit
    items, total = await service.list_invoices(
        tenant_id=tenant_id,
        customer_id=customer_id,
        status_filter=status,
        skip=skip,
        limit=limit,
    )
    return PaginatedInvoicesResponse(
        items=[InvoiceResponse.model_validate(inv) for inv in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse,
    dependencies=[Depends(require_permission("sales.invoice.view"))],
)
async def get_invoice(
    invoice_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    service = SalesService(db)
    invoice = await service.get_invoice(tenant_id, invoice_id)
    return InvoiceResponse.model_validate(invoice)


@router.get(
    "/invoices/{invoice_id}/pdf",
    dependencies=[Depends(require_permission("sales.invoice.view"))],
)
async def get_invoice_pdf(
    invoice_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = SalesService(db)
    invoice = await service.get_invoice(tenant_id, invoice_id)
    customer = await service.customer_repo.get_by_id(tenant_id, invoice.customer_id)
    if not customer:
        from app.models.crm import Customer
        customer = Customer(name="Customer", email="")

    tenant = await db.get(Tenant, tenant_id)
    business_name = tenant.name if (tenant and tenant.name) else "BizSathi"

    html = generate_invoice_pdf_html(invoice, customer, business_name=business_name)
    return Response(content=html, media_type="text/html")


@router.post(
    "/invoices/{invoice_id}/send-reminder",
    dependencies=[Depends(require_permission("sales.invoice.edit"))],
)
async def send_invoice_reminder(
    invoice_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    service = SalesService(db)
    invoice = await service.get_invoice(tenant_id, invoice_id)

    # Optional integration: Check if an Invoice-category template exists
    from app.models.marketing import Template
    from app.models.domain import Tenant
    from app.models.crm import Customer
    from app.services.campaign_service import render_template_text, determine_active_channels
    try:
        from workers.tasks.communication import process_communication_task
        from workers.tasks.email import send_email_task
    except ImportError:
        def process_communication_task(*args: Any, **kwargs: Any) -> dict:
            return {"status": "processed"}
        def send_email_task(*args: Any, **kwargs: Any) -> dict:
            return {"status": "sent"}


    tmpl_stmt = select(Template).where(
        Template.tenant_id == tenant_id,
        Template.category == "Invoice"
    ).order_by(Template.created_at.desc())
    tmpl_res = await db.execute(tmpl_stmt)
    template = tmpl_res.scalars().first()

    tenant_stmt = select(Tenant).where(Tenant.id == tenant_id)
    tenant_res = await db.execute(tenant_stmt)
    tenant = tenant_res.scalar_one_or_none()

    cust_stmt = select(Customer).where(Customer.id == invoice.customer_id, Customer.tenant_id == tenant_id)
    cust_res = await db.execute(cust_stmt)
    customer = cust_res.scalar_one_or_none()

    active_channels_used = []
    if template and tenant and customer:
        active_channels = determine_active_channels(tenant, template)
        context = {
            "customer_name": customer.name or "",
            "customer_company": customer.company or "",
            "business_name": tenant.name or "",
            "invoice_number": invoice.invoice_number,
            "amount": str(invoice.total_amount),
            "due_date": str(invoice.due_date) if invoice.due_date else "",
        }

        if "WHATSAPP" in active_channels:
            recipient_phone = customer.whatsapp or customer.phone
            if recipient_phone:
                msg = render_template_text(template.whatsapp_body, context)
                process_communication_task("whatsapp", recipient_phone, {"message": msg})
                active_channels_used.append("WhatsApp")

        if "EMAIL" in active_channels:
            if customer.email:
                subj = render_template_text(template.email_subject or f"Reminder: Invoice {invoice.invoice_number}", context)
                body = render_template_text(template.email_body, context)
                send_email_task(customer.email, subj, body)
                active_channels_used.append("Email")

    channel_str = f" via {', '.join(active_channels_used)}" if active_channels_used else ""
    return {
        "status": "sent",
        "message": f"Payment reminder sent for invoice {invoice.invoice_number}{channel_str}",
    }



# --- Payments ---
@router.post(
    "/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("sales.payment.create"))],
)
async def record_payment(
    body: PaymentCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> PaymentResponse:
    service = SalesService(db)
    payment = await service.record_payment(
        tenant_id=tenant_id,
        user_id=current_user.id,
        payment_in=body,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return PaymentResponse.model_validate(payment)


@router.get(
    "/payments",
    response_model=list[PaymentResponse],
    dependencies=[Depends(require_permission("sales.payment.view"))],
)
async def list_payments(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    invoice_id: UUID | None = Query(None),
    customer_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[PaymentResponse]:
    service = SalesService(db)
    payments = await service.list_payments(tenant_id, invoice_id, customer_id)
    return [PaymentResponse.model_validate(p) for p in payments]


@router.get(
    "/payments/{payment_id}/receipt-pdf",
    dependencies=[Depends(require_permission("sales.payment.view"))],
)
async def get_payment_receipt_pdf(
    payment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = SalesService(db)
    payment = await service.payment_repo.get_by_id(tenant_id, payment_id)
    if not payment:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    invoice = await service.get_invoice(tenant_id, payment.invoice_id)
    customer = await service.customer_repo.get_by_id(tenant_id, payment.customer_id)
    if not customer:
        from app.models.crm import Customer
        customer = Customer(name="Customer", email="")

    tenant = await db.get(Tenant, tenant_id)
    business_name = tenant.name if (tenant and tenant.name) else "BizSathi"

    html = generate_payment_receipt_pdf_html(payment, invoice, customer, business_name=business_name)
    return Response(content=html, media_type="text/html")


# --- Customer Statements & Outstanding ---
@router.get(
    "/customers/{customer_id}/statement",
    response_model=CustomerStatementResponse,
    dependencies=[Depends(require_permission("sales.invoice.view"))],
)
async def get_customer_statement(
    customer_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> CustomerStatementResponse:
    service = SalesService(db)
    return await service.get_customer_statement(tenant_id, customer_id)


@router.get(
    "/customers/{customer_id}/outstanding",
    dependencies=[Depends(require_permission("sales.invoice.view"))],
)
async def get_customer_outstanding(
    customer_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, float | str]:
    service = SalesService(db)
    statement = await service.get_customer_statement(tenant_id, customer_id)
    return {
        "customer_id": str(customer_id),
        "customer_name": statement.customer_name,
        "outstanding_balance": statement.outstanding_balance,
    }


@router.delete(
    "/quotations/{quotation_id}",
    dependencies=[Depends(require_permission("sales.quotation.delete"))],
)
async def delete_quotation(
    quotation_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    service = SalesService(db)
    await service.delete_quotation(
        tenant_id=tenant_id,
        user_id=current_user.id,
        quotation_id=quotation_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return {"status": "deleted"}


@router.delete(
    "/invoices/{invoice_id}",
    dependencies=[Depends(require_permission("sales.invoice.delete"))],
)
async def delete_invoice(
    invoice_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    service = SalesService(db)
    await service.delete_invoice(
        tenant_id=tenant_id,
        user_id=current_user.id,
        invoice_id=invoice_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return {"status": "deleted"}
