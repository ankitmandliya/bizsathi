from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class TenantContext:
    tenant_id: UUID
    user_id: UUID
    permissions: frozenset[str]

    def can(self, permission: str) -> bool:
        return permission in self.permissions
