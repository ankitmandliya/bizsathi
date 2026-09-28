from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models.crm import Customer
from app.models.domain import Tenant, TenantMember, User
from app.models.marketing import Campaign, CampaignRecipient, Template
from app.services.campaign_service import (
    determine_active_channels,
    execute_campaign_send,
    render_template_text,
    resolve_target_customers,
)


def build_marketing_mock_db():
    mock_db = AsyncMock(spec=AsyncSession)
    stored_objects: list[object] = []

    def mock_add(obj: object) -> None:
        now = datetime.now(UTC)
        if not hasattr(obj, "id") or getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        if hasattr(obj, "created_at") and getattr(obj, "created_at", None) is None:
            setattr(obj, "created_at", now)
        if hasattr(obj, "updated_at") and getattr(obj, "updated_at", None) is None:
            setattr(obj, "updated_at", now)
        stored_objects.append(obj)


    def mock_add_all(objs: list[object]) -> None:
        for o in objs:
            mock_add(o)

    async def mock_flush() -> None:
        pass

    async def mock_refresh(obj: object) -> None:
        pass

    async def mock_commit() -> None:
        pass

    async def mock_delete(obj: object) -> None:
        if obj in stored_objects:
            stored_objects.remove(obj)

    async def mock_execute(stmt: object) -> MagicMock:
        mock_res = MagicMock()
        sql_str = str(stmt)

        if "users" in sql_str:
            users = [o for o in stored_objects if isinstance(o, User)]
            mock_res.scalar_one_or_none.return_value = users[0] if users else None
            mock_res.scalars.return_value.all.return_value = users
            mock_res.scalars.return_value.first.return_value = users[0] if users else None
        elif "tenant_members" in sql_str:
            members = [o for o in stored_objects if isinstance(o, TenantMember)]
            mock_res.scalar_one_or_none.return_value = members[0] if members else None
            mock_res.scalars.return_value.first.return_value = members[0] if members else None
            mock_res.scalars.return_value.all.return_value = members
        elif "tenants" in sql_str and "templates" in sql_str and "campaigns" in sql_str:
            camps = [o for o in stored_objects if isinstance(o, Campaign)]
            tmpls = [o for o in stored_objects if isinstance(o, Template)]
            tenants = [o for o in stored_objects if isinstance(o, Tenant)]
            if camps and tmpls and tenants:
                mock_res.first.return_value = (camps[0], tmpls[0], tenants[0])
            else:
                mock_res.first.return_value = None
        elif "tenants" in sql_str:
            tenants = [o for o in stored_objects if isinstance(o, Tenant)]
            mock_res.scalar_one_or_none.return_value = tenants[0] if tenants else None
            mock_res.scalars.return_value.all.return_value = tenants
        elif "templates" in sql_str:
            tmpls = [o for o in stored_objects if isinstance(o, Template)]
            mock_res.scalar_one_or_none.return_value = tmpls[0] if tmpls else None
            mock_res.scalars.return_value.all.return_value = tmpls
            mock_res.all.return_value = [(t, "Template Name") for t in tmpls]
        elif "campaigns" in sql_str:
            camps = [o for o in stored_objects if isinstance(o, Campaign)]
            mock_res.scalar_one_or_none.return_value = camps[0] if camps else None
            mock_res.scalars.return_value.all.return_value = camps
            mock_res.all.return_value = [(c, "Template Name") for c in camps]
        elif "customers" in sql_str:
            custs = [o for o in stored_objects if isinstance(o, Customer) and getattr(o, "deleted_at", None) is None]
            mock_res.scalars.return_value.all.return_value = custs
            mock_res.all.return_value = custs
        else:
            mock_res.scalar_one_or_none.return_value = None
            mock_res.scalars.return_value.all.return_value = []
            mock_res.all.return_value = []

        return mock_res

    mock_db.add = mock_add
    mock_db.add_all = mock_add_all
    mock_db.flush = mock_flush
    mock_db.refresh = mock_refresh
    mock_db.commit = mock_commit
    mock_db.delete = mock_delete
    mock_db.execute = mock_execute

    return mock_db, stored_objects


@pytest.mark.asyncio
async def test_template_variable_rendering():
    text = "Hello {{customer_name}} from {{business_name}}! Invoice {{invoice_number}} for {{amount}} is due on {{due_date}}."
    context = {
        "customer_name": "Rajesh Kumar",
        "business_name": "BizSathi Tech",
        "invoice_number": "INV-2026-001",
        "amount": "₹15,000",
        "due_date": "2026-10-01",
    }
    rendered = render_template_text(text, context)
    assert "Rajesh Kumar" in rendered
    assert "BizSathi Tech" in rendered
    assert "INV-2026-001" in rendered
    assert "₹15,000" in rendered
    assert "2026-10-01" in rendered


@pytest.mark.asyncio
async def test_single_source_of_truth_channel_enforcement():
    tenant = Tenant(whatsapp_enabled=True, email_enabled=False)
    template_both = Template(
        whatsapp_body="WhatsApp Text",
        whatsapp_status="APPROVED",
        email_body="Email Body",
    )
    channels = determine_active_channels(tenant, template_both)
    # Email is disabled on tenant -> only WHATSAPP active
    assert channels == ["WHATSAPP"]

    tenant_email_only = Tenant(whatsapp_enabled=False, email_enabled=True)
    channels_email = determine_active_channels(tenant_email_only, template_both)
    assert channels_email == ["EMAIL"]


@pytest.mark.asyncio
async def test_whatsapp_approval_gate_status():
    tenant = Tenant(whatsapp_enabled=True, email_enabled=True)
    template_pending = Template(
        whatsapp_body="WhatsApp Text",
        whatsapp_status="PENDING_APPROVAL",
        email_body="Email Body",
    )
    channels = determine_active_channels(tenant, template_pending)
    # WhatsApp is pending approval -> blocked, so only EMAIL active
    assert channels == ["EMAIL"]


@pytest.mark.asyncio
async def test_campaign_dispatch_and_recipient_processing():
    mock_db, stored = build_marketing_mock_db()
    tenant_id = uuid4()
    user_id = uuid4()

    tenant = Tenant(id=tenant_id, name="Test Enterprise", whatsapp_enabled=True, email_enabled=False)
    template = Template(id=uuid4(), tenant_id=tenant_id, name="Promo", whatsapp_body="Hello {{customer_name}}", whatsapp_status="APPROVED")
    campaign = Campaign(id=uuid4(), tenant_id=tenant_id, template_id=template.id, name="Promo Camp", status="DRAFT", audience_filter="ALL")
    c1 = Customer(id=uuid4(), tenant_id=tenant_id, name="Cust 1", phone="+919876543210")
    c2 = Customer(id=uuid4(), tenant_id=tenant_id, name="Cust 2", phone="")

    stored.extend([tenant, template, campaign, c1, c2])

    result_camp = await execute_campaign_send(mock_db, campaign.id, tenant_id, user_id)
    # c1 had phone (SENT), c2 missing phone (FAILED) -> FAILED_PARTIAL status
    assert result_camp.status in ("SENT", "FAILED_PARTIAL")

    recipients = [o for o in stored if isinstance(o, CampaignRecipient)]
    assert len(recipients) == 2
    assert any(r.status == "SENT" for r in recipients)
    assert any(r.status == "FAILED" for r in recipients)


@pytest.mark.asyncio
async def test_marketing_api_routes():
    mock_db, stored = build_marketing_mock_db()
    user = User(id=uuid4(), email="user@marketing.com", full_name="Marketing User", is_active=True)
    tenant = Tenant(id=uuid4(), name="API Tenant", slug="api-tenant", is_active=True, whatsapp_enabled=True, email_enabled=True)

    member = TenantMember(user_id=user.id, tenant_id=tenant.id, is_owner=True, status="active")
    stored.extend([user, tenant, member])

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: user

    from app.core.security import create_access_token
    token = create_access_token(subject=str(user.id))
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}


    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create template
        res = await ac.post(
            "/api/v1/marketing/templates",
            json={
                "name": "Welcome Template",
                "category": "Offer",
                "whatsapp_body": "Welcome {{customer_name}}!",
                "email_subject": "Welcome!",
                "email_body": "Welcome HTML",
            },
            headers=headers,
        )
        assert res.status_code == 201
        tmpl_id = res.json()["id"]

        # Submit approval
        res_sub = await ac.post(f"/api/v1/marketing/templates/{tmpl_id}/submit-approval", headers=headers)
        assert res_sub.status_code == 200
        assert res_sub.json()["whatsapp_status"] == "PENDING_APPROVAL"

        # Check approval
        res_appr = await ac.post(f"/api/v1/marketing/templates/{tmpl_id}/check-approval", headers=headers)
        assert res_appr.status_code == 200
        assert res_appr.json()["whatsapp_status"] == "APPROVED"

        # List templates
        res_list = await ac.get("/api/v1/marketing/templates", headers=headers)
        assert res_list.status_code == 200
        assert len(res_list.json()) >= 1

        # Audience count
        res_aud = await ac.post(
            "/api/v1/marketing/audience-count",
            json={"audience_filter": "ALL"},
            headers=headers,
        )
        assert res_aud.status_code == 200

        # Update Tenant channel settings
        res_chan = await ac.put(
            "/api/v1/tenants/settings/channels",
            json={
                "logo_url": "https://s3.amazonaws.com/mybucket/logo.png",
                "whatsapp_enabled": True,
                "whatsapp_business_number": "+919876543210",
                "email_enabled": True,
                "email_sender_name": "BizSathi",
            },
            headers=headers,
        )
        assert res_chan.status_code == 200
        assert res_chan.json()["logo_url"] == "https://s3.amazonaws.com/mybucket/logo.png"

    app.dependency_overrides.clear()
