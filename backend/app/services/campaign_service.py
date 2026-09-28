from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm import Customer
from app.models.domain import AuditLog, Tenant
from app.models.marketing import Campaign, CampaignRecipient, Template
import sys
from pathlib import Path

# Add workspace root to sys.path so 'workers' module is accessible regardless of CWD
workspace_root = Path(__file__).resolve().parents[3]
if str(workspace_root) not in sys.path:
    sys.path.insert(0, str(workspace_root))

try:
    from workers.tasks.communication import process_communication_task
    from workers.tasks.email import send_email_task
except ImportError:
    def process_communication_task(channel: str, recipient: str, payload: dict[str, Any]) -> dict[str, Any]:
        return {"status": "processed", "channel": channel, "recipient": recipient}

    def send_email_task(to_email: str, subject: str, body: str) -> dict[str, Any]:
        return {"status": "sent", "to": to_email, "subject": subject}



def render_template_text(text: str | None, context: dict[str, Any]) -> str:
    if not text:
        return ""
    rendered = text
    for key, value in context.items():
        placeholder = f"{{{{{key}}}}}"
        rendered = rendered.replace(placeholder, str(value if value is not None else ""))
    return rendered


def determine_active_channels(tenant: Tenant, template: Template) -> list[str]:
    active_channels: list[str] = []
    if tenant.whatsapp_enabled and template.whatsapp_body and template.whatsapp_status == "APPROVED":
        active_channels.append("WHATSAPP")
    if tenant.email_enabled and template.email_body:
        active_channels.append("EMAIL")
    return active_channels


async def resolve_target_customers(
    db: AsyncSession,
    tenant_id: UUID,
    audience_filter: str,
    audience_filter_value: str | None,
) -> list[Customer]:
    query = select(Customer).where(
        Customer.tenant_id == tenant_id,
        Customer.deleted_at.is_(None),
    )

    if audience_filter == "CITY" and audience_filter_value:
        query = query.where(Customer.city == audience_filter_value)
    elif audience_filter == "CUSTOMER_TYPE" and audience_filter_value:
        query = query.where(Customer.customer_type == audience_filter_value)

    res = await db.execute(query)
    return list(res.scalars().all())


async def execute_campaign_send(
    db: AsyncSession,
    campaign_id: UUID,
    tenant_id: UUID,
    user_id: UUID | None = None,
) -> Campaign:
    # 1. Fetch campaign and template
    stmt = (
        select(Campaign, Template, Tenant)
        .join(Template, Campaign.template_id == Template.id)
        .join(Tenant, Campaign.tenant_id == Tenant.id)
        .where(Campaign.id == campaign_id, Campaign.tenant_id == tenant_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
    campaign, template, tenant = row

    if campaign.status in ("SENT", "SENDING"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Campaign is already in '{campaign.status}' state",
        )

    # 2. Determine active channels based on tenant settings + template approval status
    active_channels = determine_active_channels(tenant, template)
    if not active_channels:
        detail_msg = "No usable sending channel is active. "
        reasons = []
        if template.whatsapp_body:
            if not tenant.whatsapp_enabled:
                reasons.append("WhatsApp channel is disabled in Business Settings")
            elif template.whatsapp_status != "APPROVED":
                reasons.append(f"WhatsApp template status is '{template.whatsapp_status}' (must be APPROVED)")
        if template.email_body:
            if not tenant.email_enabled:
                reasons.append("Email channel is disabled in Business Settings")
        if not template.whatsapp_body and not template.email_body:
            reasons.append("Template has no message content configured")
        detail_msg += "; ".join(reasons)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail_msg,
        )

    campaign.status = "SENDING"
    await db.flush()

    # 3. Resolve target customers
    customers = await resolve_target_customers(
        db, tenant_id, campaign.audience_filter, campaign.audience_filter_value
    )

    has_failures = False
    now = datetime.now(UTC)

    # 4. Dispatch per customer per active channel
    for customer in customers:
        base_context = {
            "customer_name": customer.name or "",
            "customer_company": customer.company or "",
            "business_name": tenant.name or "",
            "invoice_number": "",
            "amount": "",
            "due_date": "",
        }

        # WhatsApp Channel
        if "WHATSAPP" in active_channels:
            recipient_phone = customer.whatsapp or customer.phone
            if not recipient_phone:
                recipient = CampaignRecipient(
                    tenant_id=tenant_id,
                    campaign_id=campaign.id,
                    customer_id=customer.id,
                    channel="WHATSAPP",
                    status="FAILED",
                    error_reason="Customer missing phone/WhatsApp number",
                    sent_at=now,
                )
                db.add(recipient)
                has_failures = True
            else:
                rendered_wa = render_template_text(template.whatsapp_body, base_context)
                # Call worker task
                process_communication_task(
                    channel="whatsapp",
                    recipient=recipient_phone,
                    payload={"message": rendered_wa, "sender_number": tenant.whatsapp_business_number},
                )
                recipient = CampaignRecipient(
                    tenant_id=tenant_id,
                    campaign_id=campaign.id,
                    customer_id=customer.id,
                    channel="WHATSAPP",
                    status="SENT",
                    sent_at=now,
                )
                db.add(recipient)

        # Email Channel
        if "EMAIL" in active_channels:
            if not customer.email:
                recipient = CampaignRecipient(
                    tenant_id=tenant_id,
                    campaign_id=campaign.id,
                    customer_id=customer.id,
                    channel="EMAIL",
                    status="FAILED",
                    error_reason="Customer missing email address",
                    sent_at=now,
                )
                db.add(recipient)
                has_failures = True
            else:
                rendered_subject = render_template_text(template.email_subject or "Message from " + tenant.name, base_context)
                rendered_body = render_template_text(template.email_body, base_context)
                # Call email worker task
                send_email_task(
                    to_email=customer.email,
                    subject=rendered_subject,
                    body=rendered_body,
                )
                recipient = CampaignRecipient(
                    tenant_id=tenant_id,
                    campaign_id=campaign.id,
                    customer_id=customer.id,
                    channel="EMAIL",
                    status="SENT",
                    sent_at=now,
                )
                db.add(recipient)

    campaign.status = "FAILED_PARTIAL" if has_failures else "SENT"
    campaign.updated_at = datetime.now(UTC)

    # 5. Record Audit log
    audit_entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action="marketing.campaign.send",
        entity_type="Campaign",
        entity_id=str(campaign.id),
        details={
            "campaign_name": campaign.name,
            "audience_count": len(customers),
            "channels": active_channels,
            "status": campaign.status,
        },
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(campaign)

    return campaign
