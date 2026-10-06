from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user
from app.core.database import get_db
from app.main import app
from app.models.domain import User
from app.services.reports import ReportService, resolve_date_range

TENANT_ID = uuid4()
USER_ID = uuid4()


def mock_get_current_user():
    return User(
        id=USER_ID,
        email="reporter@bizsathi.com",
        full_name="Report User",
        is_active=True,
        is_superuser=True,
    )


def mock_unprivileged_user():
    return User(
        id=USER_ID,
        email="unprivileged@bizsathi.com",
        full_name="Unprivileged User",
        is_active=True,
        is_superuser=False,
    )


def mock_get_current_tenant():
    return TENANT_ID


def mock_db_session():
    db = AsyncMock(spec=AsyncSession)

    async def mock_execute(stmt):
        mock_res = MagicMock()
        mock_res.scalar.return_value = 0
        mock_res.scalars.return_value.all.return_value = []
        mock_res.all.return_value = []

        mock_row = MagicMock()
        mock_row.tot_sales = 0
        mock_row.tot_paid = 0
        mock_row.tot_due = 0
        mock_row.inv_count = 0
        mock_row.tot_amt = 0
        mock_row.avg_amt = 0
        mock_row.exp_cnt = 0
        mock_row.__getitem__ = lambda self, idx: 0
        mock_res.one.return_value = mock_row

        return mock_res

    db.execute = mock_execute
    return db


def mock_db_session_permission_denied():
    db = AsyncMock(spec=AsyncSession)

    async def mock_execute(stmt):
        mock_res = MagicMock()
        mock_member = MagicMock()
        mock_member.is_owner = False
        mock_member.role_id = None
        mock_res.scalar_one_or_none.return_value = mock_member
        mock_res.scalars.return_value.first.return_value = mock_member
        mock_res.scalars.return_value.all.return_value = []
        mock_res.all.return_value = []
        mock_res.scalar.return_value = 0
        return mock_res

    db.execute = mock_execute
    return db


@pytest.fixture
def override_deps():
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_tenant] = mock_get_current_tenant
    app.dependency_overrides[get_db] = mock_db_session
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def override_deps_permission_denied():
    app.dependency_overrides[get_current_user] = mock_unprivileged_user
    app.dependency_overrides[get_current_tenant] = mock_get_current_tenant
    app.dependency_overrides[get_db] = mock_db_session_permission_denied
    yield
    app.dependency_overrides.clear()


def test_preset_date_ranges():
    start_dt, end_dt, period_lbl, s_date, e_date = resolve_date_range(period="current_month")
    today = date.today()
    assert s_date == date(today.year, today.month, 1)
    assert e_date == today

    _, _, _, s_today, e_today = resolve_date_range(period="today")
    assert s_today == today
    assert e_today == today

    custom_s = "2026-01-01"
    custom_e = "2026-01-31"
    _, _, _, res_s, res_e = resolve_date_range(
        period="custom", from_date_str=custom_s, to_date_str=custom_e
    )
    assert res_s == date(2026, 1, 1)
    assert res_e == date(2026, 1, 31)


def test_csv_export_sanitization():
    headers = ["ID", "Name", "Formula Test"]
    rows = [
        {"ID": "1", "Name": "Alice", "Formula Test": "=SUM(A1:A10)"},
        {"ID": "2", "Name": "Bob", "Formula Test": "+123456789"},
    ]
    csv_bytes = ReportService.export_report_to_csv(headers, rows)

    # Must start with UTF-8 BOM \xef\xbb\xbf
    assert csv_bytes.startswith(b"\xef\xbb\xbf")

    text = csv_bytes.decode("utf-8-sig")
    assert "ID,Name,Formula Test" in text
    # Checks formula injection prefixing
    assert "'=SUM(A1:A10)" in text
    assert "'+123456789" in text


def test_reports_status_endpoint(override_deps):
    client = TestClient(app)
    response = client.get("/api/v1/reports/status")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "reports"
    assert data["status"] == "ready"


REPORT_VIEW_ENDPOINTS = [
    "/dashboard",
    "/sales",
    "/expenses",
    "/customers",
    "/vendors",
    "/inventory",
    "/hrm",
    "/crm",
    "/campaigns",
]

REPORT_EXPORT_ENDPOINTS = [
    "/sales/export",
    "/expenses/export",
    "/customers/export",
    "/vendors/export",
    "/inventory/export",
    "/hrm/export",
    "/crm/export",
    "/campaigns/export",
]


@pytest.mark.parametrize("endpoint", REPORT_VIEW_ENDPOINTS)
def test_itemized_report_view_permission_denied(endpoint, override_deps_permission_denied):
    """Verify that unprivileged user without report.view permission receives HTTP 403 on every report endpoint."""
    client = TestClient(app)
    res = client.get(f"/api/v1/reports{endpoint}")
    assert res.status_code == 403, f"Expected 403 for {endpoint}, got {res.status_code}"
    assert "Permission denied" in res.json()["detail"]


@pytest.mark.parametrize("endpoint", REPORT_EXPORT_ENDPOINTS)
def test_itemized_report_export_permission_denied(endpoint, override_deps_permission_denied):
    """Verify that unprivileged user without report.export permission receives HTTP 403 on every report export endpoint."""
    client = TestClient(app)
    res = client.get(f"/api/v1/reports{endpoint}")
    assert res.status_code == 403, f"Expected 403 for {endpoint}, got {res.status_code}"
    assert "Permission denied" in res.json()["detail"]


@pytest.mark.parametrize("endpoint", REPORT_VIEW_ENDPOINTS)
def test_itemized_report_view_permission_granted(endpoint, override_deps):
    """Verify that user with valid report.view permission receives HTTP 200 OK on every report view endpoint."""
    client = TestClient(app)
    res = client.get(f"/api/v1/reports{endpoint}")
    assert res.status_code == 200, f"Expected 200 for {endpoint}, got {res.status_code}"


@pytest.mark.parametrize("endpoint", REPORT_EXPORT_ENDPOINTS)
def test_itemized_report_export_permission_granted(endpoint, override_deps):
    """Verify that user with valid report.export permission receives HTTP 200 OK on every report export endpoint."""
    client = TestClient(app)
    res = client.get(f"/api/v1/reports{endpoint}")
    assert res.status_code == 200, f"Expected 200 for {endpoint}, got {res.status_code}"
    assert res.headers["content-type"].startswith("text/csv")


@pytest.mark.asyncio
async def test_reports_cross_tenant_isolation_with_db():
    """Verify that ReportService queries strictly filter by tenant_id and isolate Tenant A from Tenant B."""
    from decimal import Decimal

    from app.core.database import AsyncSessionLocal
    from app.models.crm import Customer
    from app.models.domain import Tenant
    from app.models.expenses import Expense, ExpenseCategory
    from app.models.sales import Invoice

    t1_id = uuid4()
    t2_id = uuid4()

    async with AsyncSessionLocal() as session:
        t1 = Tenant(id=t1_id, name="Tenant A Reports", slug=f"tenant-a-rep-{t1_id.hex[:6]}", is_active=True)
        t2 = Tenant(id=t2_id, name="Tenant B Reports", slug=f"tenant-b-rep-{t2_id.hex[:6]}", is_active=True)
        session.add_all([t1, t2])
        await session.flush()

        # Seed Invoice for Tenant A only
        cust_a = Customer(id=uuid4(), tenant_id=t1_id, name="Tenant A Customer")
        session.add(cust_a)
        await session.flush()

        now_utc = datetime.now(UTC)
        inv_a = Invoice(
            id=uuid4(),
            tenant_id=t1_id,
            customer_id=cust_a.id,
            invoice_number=f"INV-REP-{uuid4().hex[:8]}",
            status="Paid",
            issue_date=now_utc,
            due_date=now_utc,
            created_at=now_utc,
            subtotal=Decimal("1000.00"),
            tax_amount=Decimal("0.00"),
            total_amount=Decimal("1000.00"),
            amount_paid=Decimal("1000.00"),
            amount_due=Decimal("0.00"),
        )
        session.add(inv_a)

        # Seed Expense for Tenant A only
        exp_cat = ExpenseCategory(id=uuid4(), tenant_id=t1_id, name=f"Cat A {t1_id.hex[:4]}")
        session.add(exp_cat)
        await session.flush()
        exp_a = Expense(
            id=uuid4(),
            tenant_id=t1_id,
            category_id=exp_cat.id,
            title="Office Rent Tenant A",
            amount=Decimal("500.00"),
            expense_date=date.today(),
            payment_method="CASH",
        )
        session.add(exp_a)
        await session.commit()

        # Query reports for Tenant B (should return ZERO metrics / ZERO rows for Tenant A's data)
        sales_rep_b = await ReportService.get_sales_report(session, tenant_id=t2_id, preset="current_month")
        exp_rep_b = await ReportService.get_expenses_report(session, tenant_id=t2_id, preset="current_month")

        # Assert Tenant B gets 0 invoice count and 0 total sales
        tot_sales_card = next(c for c in sales_rep_b.summary if c.title == "Total Sales Value")
        assert tot_sales_card.value == "₹0.00"
        assert sales_rep_b.table.total == 0

        # Assert Tenant B gets 0 expenses
        tot_exp_card = next(c for c in exp_rep_b.summary if c.title == "Total Expenses")
        assert tot_exp_card.value == "₹0.00"
        assert exp_rep_b.table.total == 0
