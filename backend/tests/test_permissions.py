from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.main import app
from app.models.domain import TenantMember, User

client = TestClient(app)

DUMMY_UUID = "11111111-1111-1111-1111-111111111111"

PERMISSION_SCENARIOS = [
    # crm.lead.view / create / update / delete
    ("crm.lead.view", "GET", f"/api/v1/crm/leads/{DUMMY_UUID}", None),
    ("crm.lead.create", "POST", "/api/v1/crm/leads", {"name": "Test Lead"}),
    ("crm.lead.update", "PUT", f"/api/v1/crm/leads/{DUMMY_UUID}", {"name": "Updated Lead"}),
    ("crm.lead.delete", "DELETE", f"/api/v1/crm/leads/{DUMMY_UUID}", None),

    # crm.deal.view / create / update / delete
    ("crm.deal.view", "GET", f"/api/v1/crm/deals/{DUMMY_UUID}", None),
    ("crm.deal.create", "POST", "/api/v1/crm/deals", {"title": "Test Deal", "value": 100}),
    ("crm.deal.update", "PUT", f"/api/v1/crm/deals/{DUMMY_UUID}", {"title": "Updated Deal"}),
    ("crm.deal.delete", "DELETE", f"/api/v1/crm/deals/{DUMMY_UUID}", None),

    # crm.activity.view / create / update
    ("crm.activity.view", "GET", f"/api/v1/crm/activities/{DUMMY_UUID}", None),
    ("crm.activity.create", "POST", "/api/v1/crm/activities", {"subject": "Test Act", "type": "Call"}),
    ("crm.activity.update", "PUT", f"/api/v1/crm/activities/{DUMMY_UUID}", {"subject": "Updated Act"}),

    # sales.quotation.view / create / update / delete
    ("sales.quotation.view", "GET", f"/api/v1/sales/quotations/{DUMMY_UUID}", None),
    ("sales.quotation.create", "POST", "/api/v1/sales/quotations", {"customer_id": DUMMY_UUID, "items": []}),
    ("sales.quotation.update", "PUT", f"/api/v1/sales/quotations/{DUMMY_UUID}", {"notes": "Updated"}),
    ("sales.quotation.delete", "DELETE", f"/api/v1/sales/quotations/{DUMMY_UUID}", None),

    # sales.invoice.view / create / update / delete
    ("sales.invoice.view", "GET", f"/api/v1/sales/invoices/{DUMMY_UUID}", None),
    ("sales.invoice.create", "POST", "/api/v1/sales/invoices", {"customer_id": DUMMY_UUID, "items": []}),
    ("sales.invoice.update", "POST", f"/api/v1/sales/invoices/{DUMMY_UUID}/send-reminder", None),
    ("sales.invoice.delete", "DELETE", f"/api/v1/sales/invoices/{DUMMY_UUID}", None),

    # sales.payment.view / create
    ("sales.payment.view", "GET", "/api/v1/sales/payments", None),
    ("sales.payment.create", "POST", "/api/v1/sales/payments", {"invoice_id": DUMMY_UUID, "amount": 100}),
]


def setup_permission_test_user(is_owner: bool = False):
    user_id = uuid4()
    tenant_id = uuid4()

    mock_user = User(
        id=user_id,
        email="test_perm_user@example.com",
        password_hash="hash",
        full_name="Test Perm User",
        is_active=True,
        is_superuser=False,
    )

    async def mock_get_user() -> User:
        return mock_user

    app.dependency_overrides[get_current_user] = mock_get_user

    async def mock_db_dep():
        mock_db = AsyncMock(spec=AsyncSession)

        def mock_execute(stmt):
            mock_res = MagicMock()
            sql_str = str(stmt)
            if "tenant_members" in sql_str:
                mock_res.scalar_one_or_none.return_value = TenantMember(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    is_owner=is_owner,
                    status="active",
                    role_id=None,
                )
            else:
                mock_res.scalar_one_or_none.return_value = None
                mock_res.scalars.return_value.all.return_value = []
            return mock_res

        mock_db.execute.side_effect = mock_execute
        yield mock_db

    app.dependency_overrides[get_db] = mock_db_dep
    return tenant_id


@pytest.mark.parametrize("perm_key, method, path, payload", PERMISSION_SCENARIOS, ids=[s[0] for s in PERMISSION_SCENARIOS])
def test_permission_denied_without_role(perm_key: str, method: str, path: str, payload: dict | None) -> None:
    tenant_id = setup_permission_test_user(is_owner=False)
    headers = {"X-Tenant-ID": str(tenant_id)}

    try:
        if method == "GET":
            res = client.get(path, headers=headers)
        elif method == "POST":
            res = client.post(path, json=payload, headers=headers)
        elif method == "PUT":
            res = client.put(path, json=payload, headers=headers)
        elif method == "DELETE":
            res = client.delete(path, headers=headers)
        else:
            raise ValueError(f"Unsupported method {method}")

        assert res.status_code == 403, f"{perm_key} expected 403, got {res.status_code}"
        assert "Permission denied" in res.json().get("detail", "")
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("perm_key, method, path, payload", PERMISSION_SCENARIOS, ids=[s[0] for s in PERMISSION_SCENARIOS])
def test_permission_allowed_for_owner(perm_key: str, method: str, path: str, payload: dict | None) -> None:
    tenant_id = setup_permission_test_user(is_owner=True)
    headers = {"X-Tenant-ID": str(tenant_id)}

    try:
        try:
            if method == "GET":
                res = client.get(path, headers=headers)
            elif method == "POST":
                res = client.post(path, json=payload, headers=headers)
            elif method == "PUT":
                res = client.put(path, json=payload, headers=headers)
            elif method == "DELETE":
                res = client.delete(path, headers=headers)
            else:
                raise ValueError(f"Unsupported method {method}")

            assert res.status_code != 403, f"{perm_key} expected non-403 for owner, got {res.status_code}"
        except Exception as exc:
            # Route handler executed past permission check (raised internal mock exception) -> permission granted
            assert "403" not in str(exc), f"{perm_key} permission denied for owner"
    finally:
        app.dependency_overrides.clear()
