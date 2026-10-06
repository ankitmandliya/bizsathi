import asyncio
import os
import sys

sys.path.insert(0, os.getcwd())

from datetime import datetime, timezone
from uuid import uuid4
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password, create_access_token
from app.models.domain import User, Tenant, TenantMember, Plan, Subscription
from app.models.crm import Customer
from app.models.hrm import Employee
from app.models.sales import Invoice
from app.services.hrm import HRMService


async def run_manual_verification():
    print("=== STARTING GAP 1 MANUAL VERIFICATION ===")
    async with AsyncSessionLocal() as session:
        uid = uuid4().hex[:6]

        # 1. Create a test tenant on Starter plan (2-user limit)
        plan = Plan(
            name=f"Manual Starter {uid}",
            slug=f"manual-starter-{uid}",
            code=f"manual_starter_{uid}",
            price_monthly=100.0,
            user_limit=2,
        )
        session.add(plan)
        await session.flush()

        tenant = Tenant(name=f"Manual Gap Tenant {uid}", slug=f"manual-gap-{uid}", status="Active")
        session.add(tenant)
        await session.flush()

        sub = Subscription(tenant_id=tenant.id, plan_id=plan.id, status="ACTIVE")
        session.add(sub)

        # Member 1 (Owner)
        owner = User(
            email=f"manual_owner_{uid}@example.com",
            password_hash=hash_password("Pass123$$"),
            full_name="Manual Owner",
        )
        session.add(owner)
        await session.flush()
        tm1 = TenantMember(tenant_id=tenant.id, user_id=owner.id, is_owner=True, status="active")
        session.add(tm1)

        # Member 2 (Second active member)
        member2 = User(
            email=f"manual_m2_{uid}@example.com",
            password_hash=hash_password("Pass123$$"),
            full_name="Member Two",
        )
        session.add(member2)
        await session.flush()
        tm2 = TenantMember(tenant_id=tenant.id, user_id=member2.id, is_owner=False, status="active")
        session.add(tm2)

        # Add 1 customer, 1 employee, 1 invoice for record spot-checking
        customer = Customer(tenant_id=tenant.id, name=f"Manual Cust {uid}", email=f"mcust_{uid}@example.com")
        session.add(customer)
        await session.flush()

        employee = Employee(tenant_id=tenant.id, name="Manual Emp", email=f"memp_{uid}@example.com", status="active")
        session.add(employee)
        await session.flush()

        now = datetime.now(timezone.utc)
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number=f"MAN-INV-{uid}",
            subtotal=250.0,
            total_amount=250.0,
            status="Paid",
            issue_date=now,
            due_date=now,
        )
        session.add(invoice)

        # Super Admin User
        admin_user = User(
            email=f"manual_admin_{uid}@example.com",
            password_hash=hash_password("Pass123$$"),
            full_name="Platform SuperAdmin",
            is_platform_admin=True,
        )
        session.add(admin_user)

        await session.commit()

        print(f"[OK] Created Tenant: {tenant.name} (Limit: 2, Current Members: 2)")

        owner_token = create_access_token(subject=str(owner.id))
        admin_token = create_access_token(subject=str(admin_user.id))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 2. Attempt 3rd tenant-member invite -> Confirm blocked with exact message format
            res_invite = await client.post(
                "/api/v1/tenants/members",
                json={"email": f"blocked_member_{uid}@example.com", "full_name": "Blocked Member"},
                headers={"Authorization": f"Bearer {owner_token}", "X-Tenant-ID": str(tenant.id)},
            )
            print(f"[OK] 3rd Member Invite Status: {res_invite.status_code}")
            assert res_invite.status_code == 403
            detail_invite = res_invite.json()["detail"]
            print(f"  Exact Error Message: \"{detail_invite}\"")
            assert f"Your {plan.name} plan includes up to 2 users — you're at 2/2. Upgrade to Growth for unlimited users." in detail_invite

            # 3. Attempt 3rd HRM employee login setup on same tenant -> Confirm blocked too
            hrm_service = HRMService(session)
            try:
                await hrm_service.setup_employee_login(
                    tenant.id, employee.id, f"blocked_hrm_{uid}@example.com", "Pass123!$", owner.id, "Employee"
                )
                print("FAILED: HRM login setup did not raise HTTP 403!")
                sys.exit(1)
            except Exception as e:
                print(f"[OK] 3rd HRM Employee Login Setup Status: {getattr(e, 'status_code', 500)}")
                assert getattr(e, 'status_code', None) == 403
                print(f"  Exact Error Message: \"{getattr(e, 'detail', str(e))}\"")

            # 4. Open Super Admin's /admin/usage page -> Confirm counts match
            res_admin = await client.get(f"/api/v1/admin/usage?search={tenant.name}", headers={"Authorization": f"Bearer {admin_token}"})
            print(f"[OK] GET /api/v1/admin/usage Status: {res_admin.status_code}")
            assert res_admin.status_code == 200
            admin_data = res_admin.json()
            matching_items = [t for t in admin_data["items"] if t["tenant_id"] == str(tenant.id)]
            assert len(matching_items) == 1
            t_item = matching_items[0]
            print(f"  Super Admin Record Spot-Check: Users={t_item['user_count']}/{t_item['user_limit']}, Customers={t_item['customer_count']}, Employees={t_item['employee_count']}, Invoices={t_item['invoices_this_month']}")
            assert t_item["user_count"] == 2
            assert t_item["user_limit"] == 2
            assert t_item["customer_count"] == 1
            assert t_item["employee_count"] == 1
            assert t_item["invoices_this_month"] == 1

            # 5. Open Tenant's own Subscriptions/Billing page data (/tenant/usage)
            res_tenant_usage = await client.get(
                "/api/v1/tenant/usage",
                headers={"Authorization": f"Bearer {owner_token}", "X-Tenant-ID": str(tenant.id)},
            )
            print(f"[OK] GET /api/v1/tenant/usage Status: {res_tenant_usage.status_code}")
            assert res_tenant_usage.status_code == 200
            t_usage = res_tenant_usage.json()
            print(f"  Tenant Self-Usage Card Data: {t_usage}")
            assert t_usage["users"]["used"] == 2
            assert t_usage["users"]["limit"] == 2
            assert t_usage["customers"]["used"] == 1
            assert t_usage["employees"]["used"] == 1
            assert t_usage["invoices_this_month"]["used"] == 1

    print("=== GAP 1 MANUAL VERIFICATION SUCCESSFUL & CONFIRMED ===")

if __name__ == "__main__":
    asyncio.run(run_manual_verification())
