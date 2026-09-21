from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.crm import Activity, Customer, Deal, Lead, PipelineStage
from app.repositories.base import TenantRepository


class LeadRepository(TenantRepository[Lead]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Lead)

    async def get_by_id(self, tenant_id: UUID, lead_id: UUID) -> Lead | None:
        stmt = select(Lead).where(
            Lead.tenant_id == tenant_id,
            Lead.id == lead_id,
            Lead.deleted_at.is_(None),
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_leads(
        self,
        tenant_id: UUID,
        search: str | None = None,
        status: str | None = None,
        source: str | None = None,
        priority: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[Lead], int]:
        base_query = select(Lead).where(
            Lead.tenant_id == tenant_id,
            Lead.deleted_at.is_(None),
        )

        if search:
            search_pattern = f"%{search}%"
            base_query = base_query.where(
                or_(
                    Lead.name.ilike(search_pattern),
                    Lead.company.ilike(search_pattern),
                    Lead.email.ilike(search_pattern),
                    Lead.phone.ilike(search_pattern),
                )
            )

        if status:
            base_query = base_query.where(Lead.status == status)
        if source:
            base_query = base_query.where(Lead.source == source)
        if priority:
            base_query = base_query.where(Lead.priority == priority)

        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one() or 0

        paginated_stmt = base_query.order_by(Lead.created_at.desc()).offset(skip).limit(limit)
        res = await self.session.execute(paginated_stmt)
        items = res.scalars().all()

        return items, total

    async def create(self, lead: Lead) -> Lead:
        self.session.add(lead)
        await self.session.flush()
        await self.session.refresh(lead)
        return lead

    async def soft_delete(self, tenant_id: UUID, lead_id: UUID) -> bool:
        lead = await self.get_by_id(tenant_id, lead_id)
        if not lead:
            return False
        lead.deleted_at = datetime.now(UTC)
        await self.session.flush()
        return True


class PipelineStageRepository(TenantRepository[PipelineStage]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PipelineStage)

    async def get_by_id(self, tenant_id: UUID, stage_id: UUID) -> PipelineStage | None:
        stmt = select(PipelineStage).where(
            PipelineStage.tenant_id == tenant_id,
            PipelineStage.id == stage_id,
            PipelineStage.is_active.is_(True),
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_for_tenant(self, tenant_id: UUID) -> Sequence[PipelineStage]:
        stmt = (
            select(PipelineStage)
            .where(PipelineStage.tenant_id == tenant_id, PipelineStage.is_active.is_(True))
            .order_by(PipelineStage.order.asc())
        )
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def create(self, stage: PipelineStage) -> PipelineStage:
        self.session.add(stage)
        await self.session.flush()
        await self.session.refresh(stage)
        return stage


class DealRepository(TenantRepository[Deal]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Deal)

    async def get_by_id(self, tenant_id: UUID, deal_id: UUID) -> Deal | None:
        stmt = (
            select(Deal)
            .where(
                Deal.tenant_id == tenant_id,
                Deal.id == deal_id,
                Deal.deleted_at.is_(None),
            )
            .options(selectinload(Deal.stage))
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_deals(
        self,
        tenant_id: UUID,
        stage_id: UUID | None = None,
        lead_id: UUID | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[Deal], int]:
        base_query = select(Deal).where(
            Deal.tenant_id == tenant_id,
            Deal.deleted_at.is_(None),
        )

        if stage_id:
            base_query = base_query.where(Deal.stage_id == stage_id)
        if lead_id:
            base_query = base_query.where(Deal.lead_id == lead_id)
        if search:
            search_pattern = f"%{search}%"
            base_query = base_query.where(Deal.title.ilike(search_pattern))

        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one() or 0

        paginated_stmt = (
            base_query.options(selectinload(Deal.stage))
            .order_by(Deal.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.session.execute(paginated_stmt)
        items = res.scalars().all()

        return items, total

    async def create(self, deal: Deal) -> Deal:
        self.session.add(deal)
        await self.session.flush()
        await self.session.refresh(deal)
        return deal

    async def soft_delete(self, tenant_id: UUID, deal_id: UUID) -> bool:
        deal = await self.get_by_id(tenant_id, deal_id)
        if not deal:
            return False
        deal.deleted_at = datetime.now(UTC)
        await self.session.flush()
        return True


class ActivityRepository(TenantRepository[Activity]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Activity)

    async def get_by_id(self, tenant_id: UUID, activity_id: UUID) -> Activity | None:
        stmt = select(Activity).where(
            Activity.tenant_id == tenant_id,
            Activity.id == activity_id,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_activities(
        self,
        tenant_id: UUID,
        lead_id: UUID | None = None,
        deal_id: UUID | None = None,
        customer_id: UUID | None = None,
    ) -> Sequence[Activity]:
        stmt = select(Activity).where(Activity.tenant_id == tenant_id)
        if lead_id:
            stmt = stmt.where(Activity.lead_id == lead_id)
        if deal_id:
            stmt = stmt.where(Activity.deal_id == deal_id)
        if customer_id:
            stmt = stmt.where(Activity.customer_id == customer_id)

        stmt = stmt.order_by(Activity.created_at.desc())
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def create(self, activity: Activity) -> Activity:
        self.session.add(activity)
        await self.session.flush()
        await self.session.refresh(activity)
        return activity


class CustomerRepository(TenantRepository[Customer]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Customer)

    async def get_by_id(self, tenant_id: UUID, customer_id: UUID) -> Customer | None:
        stmt = select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.id == customer_id,
            Customer.deleted_at.is_(None),
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_lead_id(self, tenant_id: UUID, lead_id: UUID) -> Customer | None:
        stmt = select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.converted_from_lead_id == lead_id,
            Customer.deleted_at.is_(None),
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_phone(self, tenant_id: UUID, phone: str) -> Customer | None:
        clean_phone = phone.strip()
        stmt = select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.phone == clean_phone,
            Customer.deleted_at.is_(None),
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_customers(
        self,
        tenant_id: UUID,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[Customer], int]:
        base_query = select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.deleted_at.is_(None),
        )

        if search and search.strip():
            pattern = f"%{search.strip()}%"
            base_query = base_query.where(
                or_(
                    Customer.name.ilike(pattern),
                    Customer.company.ilike(pattern),
                    Customer.email.ilike(pattern),
                    Customer.phone.ilike(pattern),
                    Customer.gstin.ilike(pattern),
                )
            )

        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one() or 0

        paginated_stmt = base_query.order_by(Customer.created_at.desc()).offset(skip).limit(limit)
        res = await self.session.execute(paginated_stmt)
        items = res.scalars().all()

        return items, total

    async def create(self, customer: Customer) -> Customer:
        self.session.add(customer)
        await self.session.flush()
        await self.session.refresh(customer)
        return customer

    async def soft_delete(self, tenant_id: UUID, customer_id: UUID) -> bool:
        cust = await self.get_by_id(tenant_id, customer_id)
        if not cust:
            return False
        cust.deleted_at = datetime.now(UTC)
        await self.session.flush()
        return True
