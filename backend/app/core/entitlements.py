from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

# In-memory override map for testing disabled modules per tenant
_DISABLED_MODULES: set[tuple[UUID, str]] = set()


def set_module_access(tenant_id: UUID, module_name: str, enabled: bool) -> None:
    """Helper used in tests to simulate enabling/disabling a module for a tenant."""
    key = (tenant_id, module_name.lower())
    if enabled:
        _DISABLED_MODULES.discard(key)
    else:
        _DISABLED_MODULES.add(key)


async def has_module_access(db: AsyncSession, tenant_id: UUID, module_name: str) -> bool:
    """Check if a tenant has access to a specific module.
    For V1 compatibility, module access defaults to True unless explicitly disabled.
    Will be backed by central subscription entitlement tables in future phases.
    """
    key = (tenant_id, module_name.lower())
    if key in _DISABLED_MODULES:
        return False
    return True
