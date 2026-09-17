from typing import Any


def send_notification_task(user_id: str, title: str, message: str) -> dict[str, Any]:
    return {
        "status": "delivered",
        "user_id": user_id,
        "title": title,
    }
