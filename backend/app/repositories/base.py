from collections.abc import Sequence
from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

ModelT = TypeVar("ModelT", bound=DeclarativeBase)


class TenantRepository(Generic[ModelT]):
    def __init__(self, session: AsyncSession, model: type[ModelT]) -> None:
        self.session = session
        self.model = model

    def tenant_query(self, tenant_id: UUID) -> Select[tuple[ModelT]]:
        return select(self.model).where(getattr(self.model, "tenant_id") == tenant_id)

    async def list_for_tenant(self, tenant_id: UUID) -> Sequence[ModelT]:
        result = await self.session.scalars(self.tenant_query(tenant_id))
        return result.all()
