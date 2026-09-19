import asyncio
import httpx

async def test_dashboard():
    async with httpx.AsyncClient() as client:
        # 1. Login
        login_res = await client.post("http://localhost:8000/api/v1/auth/login", json={
            "email": "priya.verma@bizsathi.com",
            "password": "Password123!"
        })
        print("LOGIN STATUS:", login_res.status_code)
        if login_res.status_code != 200:
            print("LOGIN FAIL:", login_res.text)
            return

        data = login_res.json()
        token = data.get("access_token")
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Call Dashboard
        dash_res = await client.get("http://localhost:8000/api/v1/reports/dashboard", headers=headers)
        print("DASHBOARD STATUS:", dash_res.status_code)
        print("DASHBOARD RESPONSE:", dash_res.text)

if __name__ == "__main__":
    asyncio.run(test_dashboard())
