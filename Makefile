.PHONY: up down frontend backend test

up:
	docker compose up --build

down:
	docker compose down -v

frontend:
	cd frontend && npm install && npm run dev

backend:
	cd backend && python -m venv ../.venv && . ../.venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	cd frontend && npm run build && npm run test
	cd backend && . ../.venv/bin/activate && pytest
