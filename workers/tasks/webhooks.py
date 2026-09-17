from typing import Any


def send_webhook_task(url: str, event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "dispatched",
        "url": url,
        "event_type": event_type,
    }
