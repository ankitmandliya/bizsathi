from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.main import app
from app.models.crm import Activity, Customer, Deal, Lead, PipelineStage
from app.models.domain import TenantMember, User
from app.schemas.crm import ActivityCreate, DealCreate, LeadCreate, LeadUpdate
from app.services.crm import CRMService

client = TestClient(app)


def build_mock_db_session():
    mock_db = AsyncMock(spec=AsyncSession)
    stored_objects: list[object] = []

    def mock_add(obj: object) -> None:
        if not hasattr(obj, "id") or getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        stored_objects.append(obj)

    async def mock_flush() -> None:
        pass

    async def mock_refresh(obj: object) -> None:
        pass

    async def mock_execute(stmt: object) -> MagicMock:
        mock_res = MagicMock()
        sql_str = str(stmt)
        params = list(stmt.compile().params.values()) if hasattr(stmt, "compile") else []

        if "pipeline_stages" in sql_str:
            stages = [o for o in stored_objects if isinstance(o, PipelineStage)]
            mock_res.scalars.return_value.all.return_value = stages
            matched = [s for s in stages if s.id in params]
            mock_res.scalar_one_or_none.return_value = matched[0] if matched else (stages[0] if stages else None)
        elif "leads" in sql_str:
            leads = [o for o in stored_objects if isinstance(o, Lead) and getattr(o, "deleted_at", None) is None]
            mock_res.scalars.return_value.all.return_value = leads
            mock_res.scalar_one.return_value = len(leads)
            matched_l = [ld for ld in leads if ld.id in params and ld.tenant_id in params]
            mock_res.scalar_one_or_none.return_value = matched_l[0] if matched_l else None
        elif "deals" in sql_str:
            deals = [o for o in stored_objects if isinstance(o, Deal) and getattr(o, "deleted_at", None) is None]
            mock_res.scalars.return_value.all.return_value = deals
            mock_res.scalar_one.return_value = len(deals)
            matched_d = [d for d in deals if d.id in params and d.tenant_id in params]
            mock_res.scalar_one_or_none.return_value = matched_d[0] if matched_d else None
        elif "activities" in sql_str:
            activities = [o for o in stored_objects if isinstance(o, Activity)]
            mock_res.scalars.return_value.all.return_value = activities
            matched_a = [a for a in activities if a.id in params and a.tenant_id in params]
            mock_res.scalar_one_or_none.return_value = matched_a[0] if matched_a else None
        elif "customers" in sql_str:
            customers = [o for o in stored_objects if isinstance(o, Customer) and getattr(o, "deleted_at", None) is None]
            mock_res.scalars.return_value.all.return_value = customers
            matched_c = [c for c in customers if (c.id in params or c.phone in params) and c.tenant_id in params]
            mock_res.scalar_one_or_none.return_value = matched_c[0] if matched_c else None
        else:
            mock_res.scalars.return_value.all.return_value = []
            mock_res.scalar_one_or_none.return_value = None
            mock_res.scalar_one.return_value = 0

        return mock_res

    mock_db.add.side_effect = mock_add
    mock_db.flush.side_effect = mock_flush
    mock_db.refresh.side_effect = mock_refresh
    mock_db.execute.side_effect = mock_execute
    return mock_db, stored_objects


@pytest.mark.asyncio
async def test_crm_service_lead_crud_and_conversion() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored_objects = build_mock_db_session()

    service = CRMService(mock_db)

    # 1. Seed Pipeline Stages
    stages = await service.list_pipeline_stages(tenant_id)
    assert len(stages) == 6
    won_stage = next(s for s in stages if s.is_won)

    # 2. Create Lead
    lead_in = LeadCreate(
        name="Acme Corp Lead",
        company="Acme Corp",
        email="lead@acme.com",
        phone="+1234567890",
        source="Website",
        status="New",
        priority="High",
        estimated_value=50000,
    )
    lead = await service.create_lead(tenant_id, user_id, lead_in)
    assert lead.id is not None
    assert lead.name == "Acme Corp Lead"
    assert lead.tenant_id == tenant_id

    # 3. Update Lead
    update_in = LeadUpdate(company="Acme Global Industries", status="Qualified")
    updated_lead = await service.update_lead(tenant_id, user_id, lead.id, update_in)
    assert updated_lead.company == "Acme Global Industries"
    assert updated_lead.status == "Qualified"

    # 4. Create Deal in Won Stage (triggers lead -> customer conversion)
    deal_in = DealCreate(
        title="Acme Enterprise Deal",
        value=50000,
        stage_id=won_stage.id,
        lead_id=lead.id,
    )
    deal = await service.create_deal(tenant_id, user_id, deal_in)
    assert deal.id is not None
    assert deal.stage_id == won_stage.id
    assert deal.actual_closing_date is not None

    # Check lead converted
    refetched_lead = await service.get_lead(tenant_id, lead.id)
    assert refetched_lead.status == "Converted"
    assert refetched_lead.converted_customer_id is not None

    # Check customer created
    customers, _ = await service.list_customers(tenant_id)
    assert len(customers) == 1
    assert customers[0].name == "Acme Corp Lead"
    assert customers[0].converted_from_lead_id == lead.id


@pytest.mark.asyncio
async def test_crm_duplicate_lead_conversion_prevented() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored_objects = build_mock_db_session()

    service = CRMService(mock_db)

    lead_in = LeadCreate(name="Duplicate Check Lead", email="dup@check.com")
    lead = await service.create_lead(tenant_id, user_id, lead_in)

    # First conversion
    cust1 = await service.convert_lead_to_customer(tenant_id, user_id, lead.id)
    assert cust1.id is not None

    # Second conversion attempt
    cust2 = await service.convert_lead_to_customer(tenant_id, user_id, lead.id)
    assert cust2.id == cust1.id

    customers, total = await service.list_customers(tenant_id)
    assert len(customers) == 1


@pytest.mark.asyncio
async def test_crm_deal_won_to_lost_preserves_customer() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored_objects = build_mock_db_session()

    service = CRMService(mock_db)
    stages = await service.list_pipeline_stages(tenant_id)
    won_stage = next(s for s in stages if s.is_won)
    lost_stage = next(s for s in stages if s.is_lost)

    lead = await service.create_lead(tenant_id, user_id, LeadCreate(name="Won/Lost Lead"))

    # Create deal in Won stage -> creates customer
    deal = await service.create_deal(
        tenant_id,
        user_id,
        DealCreate(title="Test Deal", stage_id=won_stage.id, lead_id=lead.id),
    )
    assert deal.customer_id is not None

    # Move deal to Lost stage -> customer must NOT be deleted or unlinked
    from app.schemas.crm import DealUpdate
    updated_deal = await service.update_deal(
        tenant_id,
        user_id,
        deal.id,
        DealUpdate(stage_id=lost_stage.id),
    )
    assert updated_deal.customer_id is not None

    refetched_lead = await service.get_lead(tenant_id, lead.id)
    assert refetched_lead.converted_customer_id is not None
    assert refetched_lead.status == "Converted"


@pytest.mark.asyncio
async def test_crm_activity_parent_validation() -> None:
    tenant_id = uuid4()
    user_id = uuid4()
    mock_db, stored_objects = build_mock_db_session()

    service = CRMService(mock_db)

    # Creating activity with no parent link should fail with 400
    with pytest.raises(Exception) as exc_info:
        await service.create_activity(
            tenant_id,
            user_id,
            ActivityCreate(subject="Unlinked Activity", type="Call"),
        )
    assert "Activity must be linked to at least one" in str(exc_info.value)


@pytest.mark.asyncio
async def test_crm_cross_tenant_parent_validation() -> None:
    tenant_a_id = uuid4()
    tenant_b_id = uuid4()
    user_id = uuid4()
    mock_db, stored_objects = build_mock_db_session()

    service = CRMService(mock_db)

    # Lead belonging to Tenant B
    lead_b = await service.create_lead(tenant_b_id, user_id, LeadCreate(name="Tenant B Lead"))

    # Creating activity in Tenant A linked to Tenant B lead should fail
    with pytest.raises(Exception) as exc_info:
        await service.create_activity(
            tenant_a_id,
            user_id,
            ActivityCreate(subject="Cross Tenant Activity", lead_id=lead_b.id),
        )
    assert "Invalid or cross-tenant lead_id" in str(exc_info.value)


def test_crm_cross_tenant_security_isolation_403() -> None:
    user_id = uuid4()
    tenant_a_id = uuid4()
    tenant_b_id = uuid4()

    mock_user = User(
        id=user_id,
        email="tenant_a_user@example.com",
        password_hash="hash",
        full_name="Tenant A User",
        is_active=True,
        is_superuser=False,
    )

    async def mock_get_user() -> User:
        return mock_user

    app.dependency_overrides[get_current_user] = mock_get_user

    # Mock DB where user belongs ONLY to Tenant A
    async def mock_db_dep():
        mock_db = AsyncMock(spec=AsyncSession)

        def mock_execute(stmt):
            mock_res = MagicMock()
            sql_str = str(stmt)
            if "tenant_members" in sql_str:
                # If checking Tenant A, return member; if Tenant B, return None
                if str(tenant_a_id) in sql_str:
                    mock_res.scalar_one_or_none.return_value = TenantMember(
                        user_id=user_id, tenant_id=tenant_a_id, status="active"
                    )
                else:
                    mock_res.scalar_one_or_none.return_value = None
            else:
                mock_res.scalar_one_or_none.return_value = None
                mock_res.scalars.return_value.all.return_value = []
            return mock_res

        mock_db.execute.side_effect = mock_execute
        yield mock_db

    app.dependency_overrides[get_db] = mock_db_dep

    try:
        dummy_id = str(uuid4())

        # Test cross-tenant requests with Tenant B header
        headers = {"X-Tenant-ID": str(tenant_b_id)}

        res1 = client.get(f"/api/v1/crm/leads/{dummy_id}", headers=headers)
        assert res1.status_code == 403
        assert res1.json()["detail"] == "Not a member of this tenant"

        res2 = client.put(f"/api/v1/crm/leads/{dummy_id}", json={"name": "Hacked"}, headers=headers)
        assert res2.status_code == 403

        res3 = client.delete(f"/api/v1/crm/leads/{dummy_id}", headers=headers)
        assert res3.status_code == 403

        res4 = client.post(f"/api/v1/crm/leads/{dummy_id}/convert", headers=headers)
        assert res4.status_code == 403

        res5 = client.get(f"/api/v1/crm/deals/{dummy_id}", headers=headers)
        assert res5.status_code == 403

        res6 = client.put(f"/api/v1/crm/deals/{dummy_id}", json={"title": "Hacked"}, headers=headers)
        assert res6.status_code == 403

        res7 = client.delete(f"/api/v1/crm/deals/{dummy_id}", headers=headers)
        assert res7.status_code == 403

        res8 = client.get(f"/api/v1/crm/activities/{dummy_id}", headers=headers)
        assert res8.status_code == 403

        res9 = client.put(f"/api/v1/crm/activities/{dummy_id}", json={"subject": "Hacked"}, headers=headers)
        assert res9.status_code == 403

        res10 = client.get(f"/api/v1/crm/customers/{dummy_id}", headers=headers)
        assert res10.status_code == 403

        res11 = client.get("/api/v1/crm/customers", headers=headers)
        assert res11.status_code == 403

        res12 = client.get("/api/v1/crm/pipeline-stages", headers=headers)
        assert res12.status_code == 403

    finally:
        app.dependency_overrides.clear()


def test_crm_rbac_permission_enforcement_403() -> None:
    user_id = uuid4()
    tenant_id = uuid4()

    # User who is active member of tenant but NOT owner and has NO admin role
    mock_user = User(
        id=user_id,
        email="regular_member@example.com",
        password_hash="hash",
        full_name="Regular Member",
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
                # Member is active, but is_owner=False, role_id=None
                mock_res.scalar_one_or_none.return_value = TenantMember(
                    user_id=user_id, tenant_id=tenant_id, is_owner=False, status="active", role_id=None
                )
            else:
                mock_res.scalar_one_or_none.return_value = None
                mock_res.scalars.return_value.all.return_value = []
            return mock_res

        mock_db.execute.side_effect = mock_execute
        yield mock_db

    app.dependency_overrides[get_db] = mock_db_dep

    try:
        dummy_id = str(uuid4())
        headers = {"X-Tenant-ID": str(tenant_id)}

        res1 = client.get(f"/api/v1/crm/leads/{dummy_id}", headers=headers)
        assert res1.status_code == 403
        assert "Permission denied" in res1.json()["detail"]

        res2 = client.post("/api/v1/crm/leads", json={"name": "Test"}, headers=headers)
        assert res2.status_code == 403

        res3 = client.get(f"/api/v1/crm/deals/{dummy_id}", headers=headers)
        assert res3.status_code == 403

        res4 = client.get(f"/api/v1/crm/activities/{dummy_id}", headers=headers)
        assert res4.status_code == 403
    finally:
        app.dependency_overrides.clear()
