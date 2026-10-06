import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        """Check if SMTP host is configured."""
        return bool(self.settings.smtp_host and self.settings.smtp_host.strip())

    def get_safe_config(self, connection_status: str | None = None) -> dict[str, Any]:
        """Return safe SMTP configuration dictionary with password masked/omitted."""
        security = "NONE"
        if self.settings.smtp_use_ssl:
            security = "SSL"
        elif self.settings.smtp_use_tls:
            security = "STARTTLS"

        return {
            "configured": self.is_configured(),
            "provider": "SMTP",
            "host": self.settings.smtp_host or "Not Configured",
            "port": self.settings.smtp_port,
            "security": security,
            "username": self.settings.smtp_username or "None",
            "from_email": self.settings.mail_from_email,
            "from_name": self.settings.mail_from_name,
            "connection_status": connection_status or ("connected" if self.is_configured() else "not_configured"),
        }

    def verify_smtp_connection(self) -> tuple[bool, str]:
        """Test SMTP connection and authentication without sending email."""
        if not self.is_configured():
            return False, "SMTP Host is not configured."

        host = self.settings.smtp_host or ""
        port = self.settings.smtp_port
        try:
            server: smtplib.SMTP | smtplib.SMTP_SSL
            if self.settings.smtp_use_ssl:
                server = smtplib.SMTP_SSL(host, port, timeout=10)
            else:
                server = smtplib.SMTP(host, port, timeout=10)

            server.ehlo()
            if self.settings.smtp_use_tls and not self.settings.smtp_use_ssl:
                server.starttls()
                server.ehlo()

            if self.settings.smtp_username and self.settings.smtp_password:
                server.login(self.settings.smtp_username, self.settings.smtp_password)

            server.quit()
            return True, "SMTP connection and authentication successful."
        except Exception as err:
            logger.warning("[EmailService] SMTP connection verification failed: %s", str(err))
            return False, f"SMTP Connection Failed: {str(err)}"

    def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
    ) -> tuple[bool, str | None]:
        """Send an email using configured SMTP settings."""
        if not self.is_configured():
            msg = "SMTP Host is not configured. Email recorded as fallback/failed."
            logger.info("[EmailService Mock Fallback] To: %s | Subject: %s", to_email, subject)
            return False, msg

        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            from_header = f"{self.settings.mail_from_name} <{self.settings.mail_from_email}>"
            message["From"] = from_header
            message["To"] = to_email

            message.attach(MIMEText(body_text, "plain", "utf-8"))
            if body_html:
                message.attach(MIMEText(body_html, "html", "utf-8"))

            host = self.settings.smtp_host or ""
            port = self.settings.smtp_port
            server: smtplib.SMTP | smtplib.SMTP_SSL
            if self.settings.smtp_use_ssl:
                server = smtplib.SMTP_SSL(host, port, timeout=15)
            else:
                server = smtplib.SMTP(host, port, timeout=15)

            server.ehlo()
            if self.settings.smtp_use_tls and not self.settings.smtp_use_ssl:
                server.starttls()
                server.ehlo()

            if self.settings.smtp_username and self.settings.smtp_password:
                server.login(self.settings.smtp_username, self.settings.smtp_password)

            server.sendmail(self.settings.mail_from_email, [to_email], message.as_string())
            server.quit()

            logger.info("[EmailService] Successfully sent email to %s", to_email)
            return True, None
        except Exception as err:
            err_msg = f"SMTP Send Error: {str(err)}"
            logger.error("[EmailService] Failed to send email to %s: %s", to_email, str(err))
            return False, err_msg

    def send_test_email(self, to_email: str) -> tuple[bool, str]:
        """Send a diagnostic test email to Super Admin specified address."""
        subject = "BizSathi — Test Email Diagnostic"
        body_text = (
            f"Hello,\n\n"
            f"This is a diagnostic test email sent from BizSathi Platform Governance.\n\n"
            f"SMTP Provider: SMTP ({self.settings.smtp_host}:{self.settings.smtp_port})\n"
            f"From: {self.settings.mail_from_name} <{self.settings.mail_from_email}>\n\n"
            f"If you received this message, your SMTP configuration is active and working properly.\n\n"
            f"Regards,\nBizSathi Platform Administration"
        )
        body_html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 20px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0;">BizSathi Platform Diagnostics</h2>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 10px 10px;">
              <p>Hello,</p>
              <p>This is a diagnostic test email sent from <strong>BizSathi Platform Governance</strong>.</p>
              <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>SMTP Host:</strong> {self.settings.smtp_host}:{self.settings.smtp_port}</p>
                <p style="margin: 4px 0;"><strong>From Address:</strong> {self.settings.mail_from_name} &lt;{self.settings.mail_from_email}&gt;</p>
                <p style="margin: 4px 0; color: #10b981;"><strong>Status:</strong> Connected & Delivered</p>
              </div>
              <p>If you received this message, your SMTP email configuration is active and working properly.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748b;">Regards,<br /><strong>BizSathi Platform Administration</strong></p>
            </div>
          </body>
        </html>
        """
        success, err = self.send_email(to_email, subject, body_text, body_html)
        if success:
            return True, "Test email sent successfully."
        return False, err or "Failed to send test email."

    def send_business_invitation(
        self,
        to_email: str,
        owner_name: str,
        business_name: str,
        setup_url: str,
    ) -> tuple[bool, str | None]:
        """Send Account Setup Invitation email to provisioned business owner."""
        subject = "Complete your BizSathi account setup"
        body_text = (
            f"Hello {owner_name},\n\n"
            f"Your BizSathi business account has been created.\n\n"
            f"Business: {business_name}\n\n"
            f"To complete your account setup and create your password, click the link below:\n"
            f"{setup_url}\n\n"
            f"This setup link is valid for 7 days and can only be used once.\n\n"
            f"If you did not expect this email, please contact your administrator.\n\n"
            f"Regards,\nBizSathi Team"
        )
        body_html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: #ffffff; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800;">BizSathi</h1>
              <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Business Management Platform</p>
            </div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Hello {owner_name},</h2>
              <p>Your BizSathi business account has been created.</p>
              
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; display: block;">Business Name</span>
                <strong style="font-size: 16px; color: #0f172a; display: block; margin-top: 4px;">{business_name}</strong>
              </div>

              <p>To complete your account setup and set your password, click the button below:</p>
              
              <div style="text-align: center; margin: 28px 0;">
                <a href="{setup_url}" style="background: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                  Complete Account Setup
                </a>
              </div>

              <p style="font-size: 13px; color: #64748b; background: #fffbebfb; border: 1px solid #fef3c7; padding: 12px; border-radius: 6px;">
                ⏱ <strong>Security Note:</strong> This setup link is valid for <strong>7 days</strong> and can only be used once.
              </p>

              <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
                If you did not expect this email, please contact your administrator.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 13px; color: #64748b; margin: 0;">Regards,<br /><strong>The BizSathi Team</strong></p>
            </div>
          </body>
        </html>
        """
        return self.send_email(to_email, subject, body_text, body_html)
