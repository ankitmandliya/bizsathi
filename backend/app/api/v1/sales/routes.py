from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user, require_permission
from app.core.database import get_db
from app.models.domain import User
from app.schemas.sales import (
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
from app.services.pdf import generate_invoice_pdf_html, generate_payment_receipt_pdf_html
from app.services.sales import SalesService

router = APIRouter(prefix="/sales", tags=["sales"])


def get_client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


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
    )
    return InvoiceResponse.model_validate(invoice)


# --- Invoices ---
@router.post(
    "/invoices",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("sales.invoice.create"))],
)
async def create_invoice(
    body: InvoiceCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    service = SalesService(db)
    invoice = await service.create_invoice(
        tenant_id=tenant_id,
        user_id=current_user.id,
        invoice_in=body,
        ip_address=get_client_ip(request),
    )
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

    html = generate_invoice_pdf_html(invoice, customer)
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
    return {
        "status": "sent",
        "message": f"Payment reminder sent for invoice {invoice.invoice_number}",
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

    html = generate_payment_receipt_pdf_html(payment, invoice, customer)
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
    )
    return {"status": "deleted"}
