# BizSathi

BizSathi is a multi-tenant SaaS foundation for small and medium-sized businesses. This repository establishes the project architecture, configuration, and base app shell for a future modular ERP platform.

## Stack

- Frontend: React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS
- Backend: FastAPI, SQLAlchemy 2.x, PostgreSQL, Redis, JWT, Pydantic v2
- Workers: Celery/RQ-style background tasks
- Infrastructure: Docker Compose + AWS-ready structure

## Monorepo layout

- `frontend/` — React application shell and route foundation
- `backend/` — FastAPI backend and API foundation
- `workers/` — async task workers
- `infrastructure/` — AWS and deployment placeholders
- `docs/` — architecture and operational documentation
- `scripts/` — operational scripts

## Quick start

### Prerequisites

- Node 20 LTS
- Python 3.12+
- Docker Desktop / Docker Engine

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv ../.venv
source ../.venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker

```bash
docker compose up --build
```

## Environment

Copy `.env.example` to `.env` and adjust secrets before running local services.

## Testing

```bash
cd frontend
npm run build
npm run test

cd backend
pytest
```

## Current status

This phase focuses on the architecture foundation and a working base shell. Core business modules are intentionally not implemented yet.
