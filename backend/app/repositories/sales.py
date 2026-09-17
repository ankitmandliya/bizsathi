from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sales import (
    Invoice,
    Payment,
    Quotation,
    SalesSequence,
)
from app.repositories.base import TenantRepository


class SalesSequenceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_next_number(self, tenant_id: UUID, entity_type: str, prefix: str) -> str:
        stmt = (
            select(SalesSequence)
            .where(
                SalesSequence.tenant_id == tenant_id,
                SalesSequence.entity_type == entity_type,
            )
            .with_for_update()
        )
        res = await self.session.execute(stmt)
        seq = res.scalar_one_or_none()

        if not seq:
            seq = SalesSequence(
                tenant_id=tenant_id,
                entity_type=entity_type,
                last_number=1,
            )
            self.session.add(seq)
            number = 1
        else:
            seq.last_number += 1
            number = seq.last_number

        await self.session.flush()
        return f"{prefix}-{number:04d}"


class QuotationRepository(TenantRepository[Quotation]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Quotation)

    async def get_by_id(self, tenant_id: UUID, quotation_id: UUID) -> Quotation | None:
        stmt = (
            select(Quotation)
            .where(
                Quotation.tenant_id == tenant_id,
                Quotation.id == quotation_id,
                Quotation.deleted_at.is_(None),
            )
            .options(selectinload(Quotation.items))
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_quotations(
        self,
        tenant_id: UUID,
        customer_id: UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[Quotation], int]:
        base_query = select(Quotation).where(
            Quotation.tenant_id == tenant_id,
            Quotation.deleted_at.is_(None),
        )

        if customer_id:
            base_query = base_query.where(Quotation.customer_id == customer_id)
        if status:
            base_query = base_query.where(Quotation.status == status)

        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one() or 0

        paginated_stmt = (
            base_query.options(selectinload(Quotation.items))
            .order_by(Quotation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.session.execute(paginated_stmt)
        items = res.scalars().all()

        return items, total

    async def create(self, quotation: Quotation) -> Quotation:
        self.session.add(quotation)
        await self.session.flush()
        await self.session.refresh(quotation)
        return quotation

    async def soft_delete(self, tenant_id: UUID, quotation_id: UUID) -> bool:
        quotation = await self.get_by_id(tenant_id, quotation_id)
        if not quotation:
            return False
        quotation.deleted_at = datetime.now(UTC)
        await self.session.flush()
        return True


class InvoiceRepository(TenantRepository[Invoice]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Invoice)

    async def get_by_id(self, tenant_id: UUID, invoice_id: UUID) -> Invoice | None:
        stmt = (
            select(Invoice)
            .where(
                Invoice.tenant_id == tenant_id,
                Invoice.id == invoice_id,
                Invoice.deleted_at.is_(None),
            )
            .options(selectinload(Invoice.items), selectinload(Invoice.payments))
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_invoices(
        self,
        tenant_id: UUID,
        customer_id: UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[Invoice], int]:
        base_query = select(Invoice).where(
            Invoice.tenant_id == tenant_id,
            Invoice.deleted_at.is_(None),
        )

        if customer_id:
            base_query = base_query.where(Invoice.customer_id == customer_id)
        if status:
            base_query = base_query.where(Invoice.status == status)

        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one() or 0

        paginated_stmt = (
            base_query.options(selectinload(Invoice.items), selectinload(Invoice.payments))
            .order_by(Invoice.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.session.execute(paginated_stmt)
        items = res.scalars().all()

        return items, total

    async def create(self, invoice: Invoice) -> Invoice:
        self.session.add(invoice)
        await self.session.flush()
        await self.session.refresh(invoice)
        return invoice

    async def soft_delete(self, tenant_id: UUID, invoice_id: UUID) -> bool:
        invoice = await self.get_by_id(tenant_id, invoice_id)
        if not invoice:
            return False
        invoice.deleted_at = datetime.now(UTC)
        await self.session.flush()
        return True


class PaymentRepository(TenantRepository[Payment]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Payment)

    async def get_by_id(self, tenant_id: UUID, payment_id: UUID) -> Payment | None:
        stmt = select(Payment).where(
            Payment.tenant_id == tenant_id,
            Payment.id == payment_id,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_payments(
        self,
        tenant_id: UUID,
        invoice_id: UUID | None = None,
        customer_id: UUID | None = None,
    ) -> Sequence[Payment]:
        stmt = select(Payment).where(Payment.tenant_id == tenant_id)
        if invoice_id:
            stmt = stmt.where(Payment.invoice_id == invoice_id)
        if customer_id:
            stmt = stmt.where(Payment.customer_id == customer_id)

        stmt = stmt.order_by(Payment.payment_date.desc())
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def create(self, payment: Payment) -> Payment:
        self.session.add(payment)
        await self.session.flush()
        await self.session.refresh(payment)
        return payment
