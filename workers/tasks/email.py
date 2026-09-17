from typing import Any


def send_email_task(to_email: str, subject: str, body: str) -> dict[str, Any]:
    # Production task handler placeholder for asynchronous email delivery
    return {
        "status": "sent",
        "to": to_email,
        "subject": subject,
    }
