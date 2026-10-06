import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("backend"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import get_settings

DATABASE_URL = "postgresql+asyncpg://bizsathi:bizsathi@localhost:5432/bizsathi"

async def check():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    settings = get_settings()
    print("--- 1. SMTP CONFIGURATION IN SETTINGS ---")
    print("SMTP_HOST:", settings.smtp_host)
    print("SMTP_PORT:", settings.smtp_port)
    print("SMTP_USERNAME:", settings.smtp_username)
    print("SMTP_PASSWORD Configured:", bool(settings.smtp_password))
    print("MAIL_FROM_EMAIL:", settings.mail_from_email)
    print("MAIL_FROM_NAME:", settings.mail_from_name)
    
    async with async_session() as session:
        print("\n--- 2. TENANTS MATCHING 'yash' ---")
        t_res = await session.execute(text("SELECT id, name, slug, status, created_via, created_at FROM tenants WHERE LOWER(name) LIKE '%yash%'"))
        tenants = t_res.fetchall()
        if not tenants:
            print("No tenant found matching 'yash'!")
            # List recent tenants
            t_res = await session.execute(text("SELECT id, name, slug, status, created_via, created_at FROM tenants ORDER BY created_at DESC LIMIT 5"))
            print("Recent tenants in DB instead:")
            for r in t_res.fetchall():
                print(r)
        else:
            for t in tenants:
                print(dict(t._mapping))
                tenant_id = t._mapping["id"]
                
                # Fetch Owner
                u_res = await session.execute(text("""
                    SELECT u.id, u.email, u.full_name, u.password_hash, u.is_active, tm.is_owner
                    FROM users u
                    JOIN tenant_members tm ON tm.user_id = u.id
                    WHERE tm.tenant_id = :tid
                """), {"tid": tenant_id})
                owners = u_res.fetchall()
                print("   Owner User(s):")
                for u in owners:
                    print("  ", dict(u._mapping))
                    user_id = u._mapping["id"]
                    
                    # Sessions
                    s_res = await session.execute(text("SELECT id, token, expires_at, created_at FROM sessions WHERE user_id = :uid"), {"uid": user_id})
                    for s in s_res.fetchall():
                        print("      Session Token:", s._mapping["token"], "Expires:", s._mapping["expires_at"])
                
                # Email Deliveries
                ed_res = await session.execute(text("SELECT id, recipient_email, email_type, status, error_message, sent_at, created_at FROM email_deliveries WHERE tenant_id = :tid ORDER BY created_at DESC"), {"tid": tenant_id})
                deliveries = ed_res.fetchall()
                print("   Email Deliveries:")
                if not deliveries:
                    print("   (No email delivery records found for this tenant)")
                for ed in deliveries:
                    print("  ", dict(ed._mapping))

                # Audit Logs
                al_res = await session.execute(text("SELECT id, action, details, created_at FROM audit_logs WHERE tenant_id = :tid ORDER BY created_at DESC LIMIT 5"), {"tid": tenant_id})
                print("   Audit Logs:")
                for al in al_res.fetchall():
                    print("  ", dict(al._mapping))

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
