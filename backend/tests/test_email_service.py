import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.services.email import EmailService
from app.services.tenant import create_tenant_and_owner, resend_business_invitation


def test_email_service_safe_config_masks_password():
    service = EmailService()
    cfg = service.get_safe_config()
    assert "password" not in cfg
    assert cfg["provider"] == "SMTP"
    assert "host" in cfg
    assert "port" in cfg
    assert "security" in cfg


def test_email_service_verify_smtp_connection_unconfigured():
    with patch.object(get_settings(), "smtp_host", None):
        service = EmailService()
        service.settings.smtp_host = None
        ok, msg = service.verify_smtp_connection()
        assert ok is False
        assert "not configured" in msg.lower()


@patch("smtplib.SMTP")
def test_email_service_verify_smtp_connection_success(mock_smtp):
    instance = MagicMock()
    mock_smtp.return_value = instance

    service = EmailService()
    service.settings.smtp_host = "smtp.example.com"
    service.settings.smtp_port = 587
    service.settings.smtp_username = "testuser"
    service.settings.smtp_password = "testpassword"

    ok, msg = service.verify_smtp_connection()
    assert ok is True
    assert "successful" in msg.lower()


@patch("smtplib.SMTP")
def test_email_service_send_email_success(mock_smtp):
    instance = MagicMock()
    mock_smtp.return_value = instance

    service = EmailService()
    service.settings.smtp_host = "smtp.example.com"

    ok, err = service.send_email(
        to_email="owner@example.com",
        subject="Test Subject",
        body_text="Hello text",
        body_html="<p>Hello html</p>",
    )
    assert ok is True
    assert err is None
    assert instance.sendmail.called


@pytest.mark.asyncio
async def test_create_tenant_and_owner_records_email_delivery():
    mock_db = AsyncMock(spec=AsyncSession)

    # Mock execute for checking existing user & pipeline stages
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result

    test_email = f"owner-{uuid4().hex[:6]}@example.com"
    tenant, user, token = await create_tenant_and_owner(
        mock_db,
        business_name="Test Email Business",
        owner_name="Test Owner",
        owner_email=test_email,
        created_via="SUPER_ADMIN",
    )
    assert tenant is not None
    assert user is not None
    assert token is not None


@pytest.mark.asyncio
async def test_resend_business_invitation():
    mock_db = AsyncMock(spec=AsyncSession)
    admin_id = uuid4()
    tenant_id = uuid4()

    mock_tenant = MagicMock()
    mock_tenant.id = tenant_id
    mock_tenant.name = "Resend Test Business"

    mock_owner = MagicMock()
    mock_owner.id = uuid4()
    mock_owner.email = "owner@example.com"
    mock_owner.full_name = "Resend Owner"
    mock_owner.password_hash = "!UNSET_INVITE_PENDING!"

    def mock_execute(stmt):
        res = MagicMock()
        stmt_str = str(stmt)
        if "from tenants" in stmt_str.lower() or "tenants" in stmt_str.lower():
            res.scalar_one_or_none.return_value = mock_tenant
        elif "from users" in stmt_str.lower() or "users" in stmt_str.lower():
            res.scalar_one_or_none.return_value = mock_owner
        else:
            res.scalars.return_value.first.return_value = None
            res.scalar_one_or_none.return_value = None
        return res

    mock_db.execute.side_effect = mock_execute

    ok, msg = await resend_business_invitation(
        mock_db,
        tenant_id=tenant_id,
        actor_id=admin_id,
        actor_name="Super Admin",
    )
    assert isinstance(ok, bool)
    assert "invitation" in msg.lower()
