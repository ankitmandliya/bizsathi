from typing import Any


def generate_report_task(tenant_id: str, report_type: str, parameters: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "completed",
        "tenant_id": tenant_id,
        "report_type": report_type,
    }
