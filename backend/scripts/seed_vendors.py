import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from decimal import Decimal
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.domain import Tenant, User
from app.models.vendors import Vendor
from app.schemas.vendors import VendorCreate
from app.services.vendors import VendorService

SAMPLE_VENDORS = [
    {
        "name": "Apex Industrial Supplies Pvt Ltd",
        "contact_person": "Rajesh Sharma",
        "phone": "+91 98230 11223",
        "email": "rajesh@apexindustrial.in",
        "vendor_type": "Business",
        "company_name": "Apex Industrial Supplies Pvt Ltd",
        "billing_address": "Plot 42, MIDC Industrial Area, Andheri East",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400093",
        "gstin": "27AAACA1234A1Z5",
        "pan": "AAACA1234A",
        "payment_terms": "Net 30",
        "opening_balance": Decimal("45000.00"),
        "opening_balance_type": "Payable",
        "notes": "Primary supplier for heavy machinery, safety gear, and industrial equipment.",
    },
    {
        "name": "Mahavir Tech & Electronics",
        "contact_person": "Amit Shah",
        "phone": "+91 98111 44556",
        "email": "sales@mahavirtech.com",
        "vendor_type": "Business",
        "company_name": "Mahavir Tech & Electronics",
        "billing_address": "Shop 12, CG Road Electronics Market",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380009",
        "gstin": "24BBBBM5678B1Z2",
        "pan": "BBBBM5678B",
        "payment_terms": "Net 15",
        "opening_balance": Decimal("12500.00"),
        "opening_balance_type": "Payable",
        "notes": "Vendor for office IT hardware, peripherals, cables, and electronic components.",
    },
    {
        "name": "GreenLeaf Packaging Solutions",
        "contact_person": "Sunita Verma",
        "phone": "+91 97400 88990",
        "email": "contact@greenleafpack.in",
        "vendor_type": "Business",
        "company_name": "GreenLeaf Packaging Solutions",
        "billing_address": "88 Peenya Industrial Estate, Phase 3",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560058",
        "gstin": "29CCCCG9012C1Z8",
        "pan": "CCCCG9012C",
        "payment_terms": "Due on Receipt",
        "opening_balance": Decimal("8500.00"),
        "opening_balance_type": "Advance",
        "notes": "Eco-friendly corrugated boxes, tape rolls, bubble wraps, and custom shipping labels.",
    },
    {
        "name": "Sharma Logistics & Freight Services",
        "contact_person": "Vikram Sharma",
        "phone": "+91 99887 66554",
        "email": "vikram@sharmalogistics.com",
        "vendor_type": "Business",
        "company_name": "Sharma Logistics & Freight Services",
        "billing_address": "Transport Nagar, Outer Ring Road",
        "city": "New Delhi",
        "state": "Delhi",
        "pincode": "110042",
        "gstin": "07DDDDS3456D1Z1",
        "pan": "DDDDS3456D",
        "payment_terms": "Net 45",
        "opening_balance": Decimal("28000.00"),
        "opening_balance_type": "Payable",
        "notes": "Logistics partner for nationwide freight, parcel dispatch, and bulk cargo distribution.",
    },
    {
        "name": "Rohan Raw Materials & Hardware",
        "contact_person": "Rohan Gupta",
        "phone": "+91 98980 12345",
        "email": "rohan@rohanent.com",
        "vendor_type": "Individual",
        "company_name": "Rohan Raw Materials & Hardware",
        "billing_address": "G-14 Vishwakarma Industrial Area",
        "city": "Jaipur",
        "state": "Rajasthan",
        "pincode": "302013",
        "gstin": "08EEEEG7890E1Z4",
        "pan": "EEEEG7890E",
        "payment_terms": "Net 30",
        "opening_balance": Decimal("15000.00"),
        "opening_balance_type": "Advance",
        "notes": "Direct supplier of steel rods, aluminum sheets, nuts & bolts for fabrication.",
    },
    {
        "name": "Zenith Office Stationery Depot",
        "contact_person": "Priya Nair",
        "phone": "+91 94470 55112",
        "email": "orders@zenithstationery.in",
        "vendor_type": "Business",
        "company_name": "Zenith Office Stationery Depot",
        "billing_address": "MG Road Trade Tower, 2nd Floor",
        "city": "Kochi",
        "state": "Kerala",
        "pincode": "682016",
        "gstin": "32FFFFZ2468F1Z9",
        "pan": "FFFFZ2468F",
        "payment_terms": "Net 15",
        "opening_balance": Decimal("3200.00"),
        "opening_balance_type": "Payable",
        "notes": "Wholesale stationery, printing paper reams, cartridges, and office consumable supplies.",
    },
]


async def seed_vendors():
    async with AsyncSessionLocal() as db:
        # Fetch all tenants
        t_res = await db.execute(select(Tenant))
        tenants = t_res.scalars().all()
        if not tenants:
            print("[SEED] No tenants found in database!")
            return

        for tenant in tenants:
            # Find a user to associate audit logs
            u_res = await db.execute(select(User))
            user = u_res.scalars().first()
            user_id = user.id if user else tenant.id

            service = VendorService(db)
            seeded_count = 0

            for v_data in SAMPLE_VENDORS:
                # Check if vendor with same name or phone exists for tenant
                existing_v = await service.repo.get_by_phone(tenant.id, v_data["phone"])
                if not existing_v:
                    v_create = VendorCreate(**v_data)
                    await service.create_vendor(
                        tenant_id=tenant.id,
                        vendor_in=v_create,
                        user_id=user_id,
                        ip_address="127.0.0.1",
                        user_agent="SeedScript/VendorManagement",
                    )
                    seeded_count += 1

            print(f"[SEED] Tenant '{tenant.name}' ({tenant.id}): Seeded {seeded_count} new vendors.")

if __name__ == "__main__":
    asyncio.run(seed_vendors())
