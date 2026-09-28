import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, timedelta
from decimal import Decimal
import random

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.domain import Tenant, User
from app.models.expenses import Expense, ExpenseCategory
from app.services.expenses import ExpenseService


SAMPLE_EXPENSES = [
    {
        "title": "Office Space Monthly Lease",
        "category_name": "Office Rent",
        "amount": Decimal("45000.00"),
        "days_ago": 2,
        "payment_method": "BANK",
        "vendor_name": "Godrej Commercial Properties",
        "reference_number": "RENT-SEP2026-8921",
        "description": "Monthly office rent for September 2026",
    },
    {
        "title": "Electricity & Power Charges",
        "category_name": "Electricity",
        "amount": Decimal("12450.00"),
        "days_ago": 5,
        "payment_method": "UPI",
        "vendor_name": "State Electricity Board (BESCOM)",
        "reference_number": "ELEC-20260905-3301",
        "description": "Office electricity bill for August usage",
    },
    {
        "title": "High-Speed Fiber Broadband Internet",
        "category_name": "Internet",
        "amount": Decimal("3499.00"),
        "days_ago": 8,
        "payment_method": "UPI",
        "vendor_name": "Airtel Business Broadband",
        "reference_number": "AIRTEL-BB-9921",
        "description": "500 Mbps dedicated office broadband line",
    },
    {
        "title": "Client Meeting Dinner & Catering",
        "category_name": "Food",
        "amount": Decimal("4250.00"),
        "days_ago": 10,
        "payment_method": "CARD",
        "vendor_name": "Barbeque Nation / Swiggy Corporate",
        "reference_number": "MEAL-SEP-10",
        "description": "Dinner meeting with prospective enterprise client team",
    },
    {
        "title": "Printer Ink & Stationery Supplies",
        "category_name": "Office Supplies",
        "amount": Decimal("2850.00"),
        "days_ago": 12,
        "payment_method": "CASH",
        "vendor_name": "Metro Office Depot",
        "reference_number": "INV-ST-4821",
        "description": "A4 paper reams, HP ink cartridges, notebooks",
    },
    {
        "title": "Google Workspace & AWS Cloud Hosting",
        "category_name": "Software & Subscriptions",
        "amount": Decimal("8900.00"),
        "days_ago": 15,
        "payment_method": "CARD",
        "vendor_name": "Google LLC / Amazon Web Services",
        "reference_number": "SAAS-AWS-9012",
        "description": "Monthly cloud infrastructure and company email domain billing",
    },
    {
        "title": "Google Ads & Social Media Marketing",
        "category_name": "Marketing",
        "amount": Decimal("15000.00"),
        "days_ago": 18,
        "payment_method": "CARD",
        "vendor_name": "Google Ads India",
        "reference_number": "GADS-2026-SEP",
        "description": "Digital marketing campaign for SMB software awareness",
    },
    {
        "title": "Local Client Visit Cab Fare",
        "category_name": "Transportation",
        "amount": Decimal("1650.00"),
        "days_ago": 20,
        "payment_method": "UPI",
        "vendor_name": "Uber Corporate",
        "reference_number": "UBER-SEP20",
        "description": "Cab charges for onsite client consultation visit",
    },
    {
        "title": "AC Servicing & Deep Office Cleaning",
        "category_name": "Maintenance",
        "amount": Decimal("3500.00"),
        "days_ago": 22,
        "payment_method": "UPI",
        "vendor_name": "Urban Company Services",
        "reference_number": "UC-MAINT-8831",
        "description": "Quarterly HVAC servicing and sanitation",
    },
    {
        "title": "Team Friday Snacks & Refreshments",
        "category_name": "Food",
        "amount": Decimal("1850.00"),
        "days_ago": 25,
        "payment_method": "UPI",
        "vendor_name": "Chai Point",
        "reference_number": "CP-44012",
        "description": "Tea, coffee, and evening snacks for team celebration",
    },
    {
        "title": "August Office Lease",
        "category_name": "Office Rent",
        "amount": Decimal("45000.00"),
        "days_ago": 35,
        "payment_method": "BANK",
        "vendor_name": "Godrej Commercial Properties",
        "reference_number": "RENT-AUG2026-7811",
        "description": "Office rent for August 2026",
    },
    {
        "title": "August Electricity Bill",
        "category_name": "Electricity",
        "amount": Decimal("11800.00"),
        "days_ago": 40,
        "payment_method": "UPI",
        "vendor_name": "State Electricity Board",
        "reference_number": "ELEC-202608-1120",
        "description": "August electricity bill",
    },
]


async def seed_expenses():
    async with AsyncSessionLocal() as db:
        service = ExpenseService(db)

        # Get all tenants
        tenants = (await db.execute(select(Tenant))).scalars().all()
        if not tenants:
            print("No tenants found in DB.")
            return

        for tenant in tenants:
            print(f"Seeding dummy expenses for tenant '{tenant.name}' ({tenant.id})...")
            # Ensure categories exist
            categories = await service.list_categories(tenant.id)
            cat_map = {c.name.lower(): c.id for c in categories}

            # Get user for created_by
            user = (await db.execute(select(User))).scalars().first()
            user_id = user.id if user else None

            today = date.today()

            for item in SAMPLE_EXPENSES:
                cat_id = cat_map.get(item["category_name"].lower())
                if not cat_id:
                    # fallback to any category
                    cat_id = categories[0].id

                exp_date = today - timedelta(days=item["days_ago"])

                # Check if already seeded
                existing = (
                    await db.execute(
                        select(Expense).where(
                            Expense.tenant_id == tenant.id,
                            Expense.title == item["title"],
                            Expense.expense_date == exp_date,
                        )
                    )
                ).scalar_one_or_none()

                if not existing:
                    expense = Expense(
                        tenant_id=tenant.id,
                        category_id=cat_id,
                        title=item["title"],
                        description=item["description"],
                        amount=item["amount"],
                        expense_date=exp_date,
                        payment_method=item["payment_method"],
                        vendor_name=item["vendor_name"],
                        reference_number=item["reference_number"],
                        created_by_id=user_id,
                        updated_by_id=user_id,
                    )
                    db.add(expense)

            await db.commit()
            print(f"Successfully seeded dummy expenses for tenant '{tenant.name}'.")


if __name__ == "__main__":
    asyncio.run(seed_expenses())
