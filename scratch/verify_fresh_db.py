import asyncio
import os
import sys
import subprocess
import asyncpg
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("backend"))

from app.services.subscription_service import SubscriptionService
from app.models.domain import Tenant, Subscription, Plan

DB_USER = "bizsathi"
DB_PASS = "bizsathi"
DB_HOST = "localhost"
DB_PORT = "5432"
TEST_DB_NAME = "bizsathi_fresh_test"

ASYNC_TEST_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{TEST_DB_NAME}"

async def create_fresh_database():
    print(f"Connecting to admin DB via asyncpg to recreate '{TEST_DB_NAME}'...")
    conn = await asyncpg.connect(user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT, database="postgres")
    
    # Terminate existing connections to test DB
    await conn.execute(f"""
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '{TEST_DB_NAME}'
          AND pid <> pg_backend_pid();
    """)
    await conn.execute(f"DROP DATABASE IF EXISTS {TEST_DB_NAME};")
    await conn.execute(f"CREATE DATABASE {TEST_DB_NAME};")
    await conn.close()
    print(f"Fresh database '{TEST_DB_NAME}' created successfully.")

def run_alembic_migrations():
    print("Running Alembic upgrade head via subprocess...")
    env = os.environ.copy()
    env["DATABASE_URL"] = ASYNC_TEST_URL
    
    python_exe = sys.executable
    cmd = [python_exe, "-m", "alembic", "upgrade", "head"]
    
    res = subprocess.run(cmd, cwd="backend", env=env, capture_output=True, text=True)
    if res.returncode != 0:
        print("Alembic output stdout:\n", res.stdout)
        print("Alembic output stderr:\n", res.stderr)
        raise RuntimeError(f"Alembic failed with return code {res.returncode}")
    print(res.stdout)
    print("Alembic migrations applied successfully.")

async def query_seeded_data():
    conn = await asyncpg.connect(user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT, database=TEST_DB_NAME)
    
    print("\n--- QUERY 1: SELECT key, name FROM modules; ---")
    modules_rows = await conn.fetch("SELECT key, name FROM modules ORDER BY created_at ASC;")
    print("key | name")
    print("-" * 30)
    for row in modules_rows:
        print(f"{row['key']} | {row['name']}")
        
    print("\n--- QUERY 2: SELECT name, slug, price_monthly FROM plans; ---")
    plans_rows = await conn.fetch("SELECT name, slug, price_monthly FROM plans ORDER BY price_monthly ASC;")
    print("name | slug | price_monthly")
    print("-" * 40)
    for row in plans_rows:
        print(f"{row['name']} | {row['slug']} | {row['price_monthly']}")
        
    await conn.close()
    return modules_rows, plans_rows

async def test_has_module_access():
    engine = create_async_engine(ASYNC_TEST_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    all_modules = ["crm", "customers", "vendors", "sales", "inventory", "hrm", "expenses", "marketing", "reports"]
    plan_slugs = ["starter", "business", "growth", "legacy"]
    
    results = {}
    
    async with async_session() as session:
        # Create test tenants and subscriptions for each plan tier
        for slug in plan_slugs:
            tenant_id = uuid4()
            tenant = Tenant(
                id=tenant_id,
                name=f"Test Tenant {slug.capitalize()}",
                slug=f"tenant-{slug}-{uuid4().hex[:6]}",
                is_active=True
            )
            session.add(tenant)
            
            # Fetch plan
            res = await session.execute(text("SELECT id FROM plans WHERE slug = :slug"), {"slug": slug})
            plan_id = res.scalar_one()
            
            sub = Subscription(
                id=uuid4(),
                tenant_id=tenant_id,
                plan_id=plan_id,
                status="ACTIVE",
                billing_cycle="monthly"
            )
            session.add(sub)
            await session.commit()
            
            sub_service = SubscriptionService(session)
            results[slug] = {}
            for mod in all_modules:
                has_access = await sub_service.has_module_access(tenant_id, mod)
                results[slug][mod] = has_access

    await engine.dispose()
    
    print("\n--- SPOT-CHECK: has_module_access() RESULTS PER PLAN TIER ---")
    header = f"{'Module':<12} | " + " | ".join([f"{s.capitalize():<10}" for s in plan_slugs])
    print(header)
    print("-" * len(header))
    for mod in all_modules:
        row = f"{mod:<12} | " + " | ".join([f"{str(results[s][mod]):<10}" for s in plan_slugs])
        print(row)

async def main():
    await create_fresh_database()
    run_alembic_migrations()
    await query_seeded_data()
    await test_has_module_access()

if __name__ == "__main__":
    asyncio.run(main())
