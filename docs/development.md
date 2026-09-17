# Development guide

## Local frontend

```bash
cd frontend
npm install
npm run dev
```

## Local backend

```bash
cd backend
python -m venv ../.venv
. ../.venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Docker

```bash
docker compose up --build
```
