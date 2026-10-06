import asyncio
import asyncpg

async def check():
    try:
        conn = await asyncpg.connect("postgresql://bizsathi:bizsathi@localhost:5432/bizsathi")
        rows = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        print("Tables in 'bizsathi':", [r['table_name'] for r in rows])
        await conn.close()
    except Exception as e:
        print("Error connecting to 'bizsathi':", type(e), e)

if __name__ == "__main__":
    asyncio.run(check())
