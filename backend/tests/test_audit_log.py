from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.database import get_db
from app.main import app
from app.models.domain import TenantMember, User
from app.services.audit import compute_changes, get_client_ip, log_audit_event

client = TestClient(app)


# ─── 1. Unit Tests for compute_changes & Sensitive Data Masking ──────────────

def test_compute_changes_basic():
    before = {"name": "Old Name", "amount": 100, "status": "Draft"}
    after = {"name": "New Name", "amount": 100, "status": "Sent"}
    fields = ["name", "amount", "status"]

    diff = compute_changes(before, after, fields)
    assert "amount" not in diff  # unchanged
    assert diff["name"] == {"old": "Old Name", "new": "New Name"}
    assert diff["status"] == {"old": "Draft", "new": "Sent"}


def test_compute_changes_null_transitions():
    before = {"notes": None, "closing_date": "2026-09-01"}
    after = {"notes": "Follow up scheduled", "closing_date": None}
    fields = ["notes", "closing_date"]

    diff = compute_changes(before, after, fields)
    assert diff["notes"] == {"old": None, "new": "Follow up scheduled"}
    assert diff["closing_date"] == {"old": "2026-09-01", "new": None}


def test_compute_changes_sensitive_fields_omitted_or_masked():
    before = {
        "password": "secret_old_password",
        "password_hash": "$2b$12$oldhash",
        "bank_account_number": "123456789012",
        "api_key": "sk-1234567890",
        "amount": 500,
    }
    after = {
        "password": "secret_new_password",
        "password_hash": "$2b$12$newhash",
        "bank_account_number": "987654321098",
        "api_key": "sk-0987654321",
        "amount": 750,
    }
    fields = ["password", "password_hash", "bank_account_number", "api_key", "amount"]

    diff = compute_changes(before, after, fields)

    # Passwords, hashes, and API keys must NEVER appear in diff values
    assert "password" not in diff
    assert "password_hash" not in diff
    assert "api_key" not in diff

    # Bank account numbers must be masked to last 4 digits only
    assert diff["bank_account_number"] == {"old": "****9012", "new": "****1098"}

    # Normal fields preserved
    assert diff["amount"] == {"old": 500, "new": 750}


# ─── 2. Unit Tests for Client IP Extraction (Spoofing Protection) ──────────

def test_get_client_ip_trusted_proxy():
    # Simulated request coming from trusted proxy 127.0.0.1 with forwarded client IP
    mock_request = MagicMock()
    mock_request.client.host = "127.0.0.1"
    mock_request.headers = {"X-Forwarded-For": "203.0.113.195, 10.0.0.1"}

    extracted_ip = get_client_ip(mock_request)
    assert extracted_ip == "203.0.113.195"


def test_get_client_ip_untrusted_source_ignores_forged_header():
    # Untrusted external client host trying to spoof IP via X-Forwarded-For header
    mock_request = MagicMock()
    mock_request.client.host = "198.51.100.44"  # NOT in trusted proxies
    mock_request.headers = {"X-Forwarded-For": "1.1.1.1"}  # Forged header

    extracted_ip = get_client_ip(mock_request)
    # Must ignore forged X-Forwarded-For and return host IP
    assert extracted_ip == "198.51.100.44"


# ─── 3. Access Control & Permission Tests ────────────────────────────────────

def test_get_audit_logs_unauthorized_user_forbidden():
    regular_user_id = uuid4()
    tenant_id = uuid4()

    mock_user = User(
        id=regular_user_id,
        email="employee@example.com",
        password_hash="hash",
        full_name="Plain Employee",
        is_active=True,
    )
    mock_member = TenantMember(
        id=uuid4(),
        tenant_id=tenant_id,
        user_id=regular_user_id,
        is_owner=False,
    )

    mock_db = AsyncMock()
    mock_member_res = MagicMock()
    mock_member_res.scalar_one_or_none.return_value = mock_member
    mock_db.execute.return_value = mock_member_res

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user

    try:
        response = client.get("/api/v1/audit-logs")
        # Employee without audit.view permission must get 403 Forbidden
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


# ─── 4. Append-Only Route Safety Check ──────────────────────────────────────

def test_audit_logs_append_only_no_mutating_routes():
    dummy_id = str(uuid4())
    # Verify PUT, POST, DELETE, PATCH return 405 Method Not Allowed or 404
    post_resp = client.post("/api/v1/audit-logs", json={"action": "fake"})
    put_resp = client.put(f"/api/v1/audit-logs/{dummy_id}", json={"action": "fake"})
    patch_resp = client.patch(f"/api/v1/audit-logs/{dummy_id}", json={"action": "fake"})
    delete_resp = client.delete(f"/api/v1/audit-logs/{dummy_id}")

    assert post_resp.status_code in (405, 404)
    assert put_resp.status_code in (405, 404)
    assert patch_resp.status_code in (405, 404)
    assert delete_resp.status_code in (405, 404)


# ─── 5. Parametrized Action Coverage Matrix ──────────────────────────────────

ACTIONS_MATRIX = [
    ("user.login", "user", "Login Success"),
    ("user.login_failed", "user", "Login Failed"),
    ("user.logout", "user", "Logout"),
    ("user.password_change", "user", "Password Changed"),
    ("crm.lead.create", "lead", "Lead Created"),
    ("crm.lead.update", "lead", "Lead Updated"),
    ("crm.lead.delete", "lead", "Lead Deleted"),
    ("crm.lead.convert", "lead", "Lead Converted"),
    ("crm.deal.create", "deal", "Deal Created"),
    ("crm.deal.update", "deal", "Deal Updated"),
    ("crm.deal.stage_change", "deal", "Deal Stage Changed"),
    ("crm.customer.create", "customer", "Customer Created"),
    ("crm.customer.update", "customer", "Customer Updated"),
    ("sales.quotation.create", "quotation", "Quotation Created"),
    ("sales.invoice.create", "invoice", "Invoice Created"),
    ("sales.payment.create", "payment", "Payment Recorded"),
    ("hrm.employee.create", "employee", "Employee Created"),
    ("hrm.attendance.correct", "attendance", "Attendance Corrected"),
    ("hrm.leave.approve", "leave", "Leave Approved"),
    ("hrm.salary_advance.create", "salary_advance", "Salary Advance Created"),
    ("hrm.payroll.run", "payroll", "Payroll Executed"),
    ("expense.create", "expense", "Expense Created"),
    ("tenant.settings.update_channels", "tenant", "Channels Updated"),
]

@pytest.mark.parametrize("action_name,entity_type,label", ACTIONS_MATRIX)
async def test_audit_event_logging_payload_structure(action_name, entity_type, label):
    tenant_id = uuid4()
    user_id = uuid4()

    mock_db = AsyncMock()

    log_entry = await log_audit_event(
        db=mock_db,
        tenant_id=tenant_id,
        user_id=user_id,
        action=action_name,
        entity_type=entity_type,
        entity_id=str(uuid4()),
        actor_name="Test Actor",
        entity_label=label,
        changes={"field": {"old": "A", "new": "B"}},
        ip_address="103.21.12.1",
        user_agent="Mozilla/5.0",
    )

    assert log_entry.tenant_id == tenant_id
    assert log_entry.user_id == user_id
    assert log_entry.action == action_name
    assert log_entry.entity_type == entity_type
    assert log_entry.actor_name == "Test Actor"
    assert log_entry.entity_label == label
    assert log_entry.changes == {"field": {"old": "A", "new": "B"}}
    assert log_entry.ip_address == "103.21.12.1"
    assert log_entry.user_agent == "Mozilla/5.0"
