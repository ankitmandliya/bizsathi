import logging
from typing import Any

from app.services.email import EmailService

logger = logging.getLogger(__name__)


def send_email_task(to_email: str, subject: str, body: str) -> dict[str, Any]:
    """Background task handler for asynchronous email delivery."""
    email_service = EmailService()
    success, err_msg = email_service.send_email(to_email, subject, body)
    if success:
        return {"status": "sent", "to": to_email, "subject": subject}
    logger.warning("[send_email_task] Failed to send email to %s: %s", to_email, err_msg)
    return {"status": "failed", "to": to_email, "error": err_msg}
