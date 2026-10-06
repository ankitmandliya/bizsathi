from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, decode_token, hash_password, verify_password
from app.main import app
from app.models.domain import Session, TenantMember, User

client = TestClient(app)


def test_password_hashing() -> None:
    raw_password = "SecretTest123$$!"
    hashed = hash_password(raw_password)
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_tokens() -> None:
    user_id = str(uuid4())
    token = create_access_token(subject=user_id)
    payload = decode_token(token)
    assert payload.get("sub") == user_id


def test_unauthenticated_protected_route() -> None:
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_tenant_membership_verification_cross_tenant_forbidden(monkeypatch: MonkeyPatch) -> None:
    user_id = uuid4()
    tenant_a_id = uuid4()
    tenant_b_id = uuid4()

    mock_user = User(
        id=user_id,
        email="usera@example.com",
        password_hash="hash",
        full_name="User A",
        is_active=True,
        is_superuser=False,
    )

    async def mock_get_user() -> User:
        return mock_user

    async def mock_get_db_session():
        mock_db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.side_effect = lambda: (
            TenantMember(user_id=user_id, tenant_id=tenant_a_id, status="active")
        )
        mock_db.execute.return_value = mock_result
        yield mock_db

    app.dependency_overrides[get_current_user] = mock_get_user
    app.dependency_overrides[get_db] = mock_get_db_session

    try:
        mock_db_b = AsyncMock(spec=AsyncSession)
        mock_result_b = MagicMock()
        mock_result_b.scalar_one_or_none.return_value = None
        mock_db_b.execute.return_value = mock_result_b

        async def mock_get_db_b():
            yield mock_db_b

        app.dependency_overrides[get_db] = mock_get_db_b

        res_b = client.get("/api/v1/crm/status", headers={"X-Tenant-ID": str(tenant_b_id)})
        assert res_b.status_code == 403
        assert res_b.json()["detail"] == "Not a member of this tenant"

        mock_db_a = AsyncMock(spec=AsyncSession)
        mock_result_a = MagicMock()
        mock_result_a.scalar_one_or_none.return_value = TenantMember(
            user_id=user_id, tenant_id=tenant_a_id, status="active"
        )
        mock_db_a.execute.return_value = mock_result_a

        async def mock_get_db_a():
            yield mock_db_a

        app.dependency_overrides[get_db] = mock_get_db_a

        res_a = client.get("/api/v1/crm/status", headers={"X-Tenant-ID": str(tenant_a_id)})
        assert res_a.status_code == 200
        assert res_a.json()["tenant_id"] == str(tenant_a_id)

    finally:
        app.dependency_overrides.clear()


def test_forgot_password_and_reset_flow() -> None:
    user_id = uuid4()
    mock_user = User(
        id=user_id,
        email="test@example.com",
        password_hash="oldhash",
        full_name="Test User",
        is_active=True,
    )
    mock_session = Session(
        user_id=user_id,
        token="reset_validtoken123",
        expires_at=datetime.now(UTC),
    )

    async def mock_db_session():
        mock_db = AsyncMock(spec=AsyncSession)

        def mock_execute(stmt):
            res = MagicMock()
            sql_str = str(stmt)
            if "users" in sql_str:
                res.scalar_one_or_none.return_value = mock_user
            else:
                res.scalar_one_or_none.return_value = mock_session
            return res

        mock_db.execute.side_effect = mock_execute
        yield mock_db

    app.dependency_overrides[get_db] = mock_db_session

    try:
        res1 = client.post("/api/v1/auth/forgot-password", json={"email": "test@example.com"})
        assert res1.status_code == 200
        assert "token has been sent" in res1.json()["message"]

        async def mock_db_invalid_token():
            mock_db = AsyncMock(spec=AsyncSession)
            mock_res = MagicMock()
            mock_res.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_res
            yield mock_db

        app.dependency_overrides[get_db] = mock_db_invalid_token
        res2 = client.post(
            "/api/v1/auth/reset-password",
            json={"token": "invalid-token", "new_password": "NewTest123$$!"},
        )
        assert res2.status_code == 400
        assert "Invalid or expired" in res2.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_email_verification_flow() -> None:
    async def mock_db_invalid_token():
        mock_db = AsyncMock(spec=AsyncSession)
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_res
        yield mock_db

    app.dependency_overrides[get_db] = mock_db_invalid_token
    try:
        res = client.get("/api/v1/auth/verify-email?token=invalid-token")
        assert res.status_code == 400
        assert "Invalid or expired" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_auth_me_is_owner_resolution() -> None:
    """Dedicated test for /auth/me to verify is_owner and roles calculation for Owner vs Member."""
    owner_user_id = uuid4()
    member_user_id = uuid4()
    tenant_id = uuid4()

    owner_user = User(
        id=owner_user_id,
        email="owner@company.com",
        password_hash="hash",
        full_name="Owner User",
        is_active=True,
        is_verified=True,
        is_platform_admin=False,
    )
    member_user = User(
        id=member_user_id,
        email="member@company.com",
        password_hash="hash",
        full_name="Member User",
        is_active=True,
        is_verified=True,
        is_platform_admin=False,
    )

    owner_member = TenantMember(user_id=owner_user_id, tenant_id=tenant_id, status="active", is_owner=True)
    plain_member = TenantMember(user_id=member_user_id, tenant_id=tenant_id, status="active", is_owner=False, role_id=None)

    # Test Owner
    async def mock_get_owner_user() -> User:
        return owner_user

    async def mock_db_owner():
        mock_db = AsyncMock(spec=AsyncSession)
        def mock_exec(stmt):
            m = MagicMock()
            sql_str = str(stmt).lower()
            if "from tenant_members" in sql_str:
                m.scalars.return_value.first.return_value = owner_member
                m.scalar_one_or_none.return_value = owner_member
            elif "from tenants" in sql_str:
                m.scalar_one_or_none.return_value = None
            return m
        mock_db.execute.side_effect = mock_exec
        yield mock_db

    app.dependency_overrides[get_current_user] = mock_get_owner_user
    app.dependency_overrides[get_db] = mock_db_owner

    try:
        res = client.get("/api/v1/auth/me", headers={"X-Tenant-ID": str(tenant_id)})
        assert res.status_code == 200
        data = res.json()
        assert data["is_owner"] is True
        assert "owner" in data["roles"]

        # Test Plain Member
        async def mock_get_member_user() -> User:
            return member_user

        async def mock_db_member():
            mock_db = AsyncMock(spec=AsyncSession)
            def mock_exec(stmt):
                m = MagicMock()
                sql_str = str(stmt).lower()
                if "from tenant_members" in sql_str:
                    m.scalars.return_value.first.return_value = plain_member
                    m.scalar_one_or_none.return_value = plain_member
                elif "from tenants" in sql_str:
                    m.scalar_one_or_none.return_value = None
                return m
            mock_db.execute.side_effect = mock_exec
            yield mock_db

        app.dependency_overrides[get_current_user] = mock_get_member_user
        app.dependency_overrides[get_db] = mock_db_member

        res2 = client.get("/api/v1/auth/me", headers={"X-Tenant-ID": str(tenant_id)})
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["is_owner"] is False
        assert "owner" not in data2["roles"]
    finally:
        app.dependency_overrides.clear()


def test_fresh_tenant_has_zero_records_on_creation() -> None:
    """Permanent regression guard: A freshly created tenant has zero records across business list endpoints."""
    owner_id = uuid4()
    fresh_tenant_id = uuid4()

    owner_user = User(
        id=owner_id,
        email="fresh_owner@company.com",
        password_hash="hash",
        full_name="Fresh Owner",
        is_active=True,
        is_verified=True,
        is_platform_admin=False,
    )
    tenant_member = TenantMember(user_id=owner_id, tenant_id=fresh_tenant_id, status="active", is_owner=True)

    async def mock_get_user() -> User:
        return owner_user

    async def mock_db_session():
        mock_db = AsyncMock(spec=AsyncSession)
        def mock_exec(stmt):
            m = MagicMock()
            sql_str = str(stmt).lower()
            if "from tenant_members" in sql_str:
                m.scalars.return_value.first.return_value = tenant_member
                m.scalar_one_or_none.return_value = tenant_member
            else:
                m.scalar.return_value = 0
                m.scalar_one.return_value = 0
                m.scalars.return_value.all.return_value = []
                m.scalars.return_value.first.return_value = None
                m.scalar_one_or_none.return_value = 0

            return m
        mock_db.execute.side_effect = mock_exec
        yield mock_db

    app.dependency_overrides[get_current_user] = mock_get_user
    app.dependency_overrides[get_db] = mock_db_session

    try:
        headers = {"X-Tenant-ID": str(fresh_tenant_id)}

        # CRM Leads
        leads_res = client.get("/api/v1/crm/leads", headers=headers)
        assert leads_res.status_code == 200
        assert leads_res.json()["total"] == 0
        assert len(leads_res.json()["items"]) == 0

        # Sales Quotations
        quotes_res = client.get("/api/v1/sales/quotations", headers=headers)
        assert quotes_res.status_code == 200
        assert quotes_res.json()["total"] == 0
        assert len(quotes_res.json()["items"]) == 0

        # Sales Invoices
        invoices_res = client.get("/api/v1/sales/invoices", headers=headers)
        assert invoices_res.status_code == 200
        assert invoices_res.json()["total"] == 0
        assert len(invoices_res.json()["items"]) == 0
    finally:
        app.dependency_overrides.clear()


