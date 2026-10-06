import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Tenant, Plan, Subscription, BillingPayment, BillingInvoice

async def main():
    async with AsyncSessionLocal() as session:
        # 1. Fetch all plans
        plans_res = await session.execute(select(Plan))
        plans = plans_res.scalars().all()
        print("=== ALL PLANS IN DB ===")
        for p in plans:
            print(f"ID: {p.id} | Name: '{p.name}' | Slug: '{p.slug}' | Price Monthly: {p.price_monthly} | Is Public: {p.is_public} | Is Active: {p.is_active}")
        
        # 2. Fetch all tenants and their subscriptions
        tenants_res = await session.execute(select(Tenant))
        tenants = tenants_res.scalars().all()
        print("\n=== ALL TENANTS & SUBSCRIPTIONS ===")
        for t in tenants:
            sub_res = await session.execute(select(Subscription).where(Subscription.tenant_id == t.id))
            sub = sub_res.scalar_one_or_none()
            if sub:
                plan_res = await session.execute(select(Plan).where(Plan.id == sub.plan_id))
                plan = plan_res.scalar_one_or_none()
                plan_info = f"Plan '{plan.name}' (slug='{plan.slug}', price={plan.price_monthly})" if plan else f"Unknown plan_id={sub.plan_id}"
                print(f"Tenant: '{t.name}' (id={t.id}) -> Sub ID={sub.id}, Status={sub.status}, {plan_info}, PeriodEnd={sub.current_period_end}")
            else:
                print(f"Tenant: '{t.name}' (id={t.id}) -> NO SUBSCRIPTION RECORD")
                
        # 3. Fetch all payments and invoices
        payments_res = await session.execute(select(BillingPayment))
        payments = payments_res.scalars().all()
        print(f"\n=== BILLING PAYMENTS ({len(payments)} records) ===")
        for pay in payments:
            print(f"Payment ID: {pay.id}, Tenant: {pay.tenant_id}, Amount: {pay.amount}, Status: {pay.status}, ProviderRef: {pay.provider_payment_id}")
            
        invoices_res = await session.execute(select(BillingInvoice))
        invoices = invoices_res.scalars().all()
        print(f"\n=== BILLING INVOICES ({len(invoices)} records) ===")
        for inv in invoices:
            print(f"Invoice ID: {inv.id}, Tenant: {inv.tenant_id}, Number: {inv.invoice_number}, Total: {inv.total_amount}, Status: {inv.status}")

if __name__ == "__main__":
    asyncio.run(main())
