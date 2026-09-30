from datetime import date
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


@pytest.fixture
def override_deps():
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_tenant] = mock_get_current_tenant
    app.dependency_overrides[get_db] = mock_db_session
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


def test_reports_dashboard_endpoint(override_deps):
    client = TestClient(app)
    response = client.get("/api/v1/reports/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "active_tenants" in data
    assert "total_revenue" in data
    assert "performance_trend" in data


def test_reports_category_endpoints(override_deps):
    client = TestClient(app)
    categories = [
        "sales",
        "expenses",
        "customers",
        "vendors",
        "inventory",
        "hrm",
        "crm",
        "campaigns",
    ]

    for cat in categories:
        # JSON endpoint
        res = client.get(f"/api/v1/reports/{cat}?preset=current_month&page=1&page_size=10")
        assert res.status_code == 200, f"Failed for category: {cat}"
        json_data = res.json()
        assert "summary" in json_data
        assert "table" in json_data

        # CSV Export endpoint
        export_res = client.get(f"/api/v1/reports/{cat}/export?preset=current_month")
        assert export_res.status_code == 200, f"Export failed for category: {cat}"
        assert export_res.headers["content-type"].startswith("text/csv")
        assert export_res.content.startswith(b"\xef\xbb\xbf")
