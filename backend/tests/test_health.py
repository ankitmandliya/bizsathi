from fastapi.testclient import TestClient
from pytest import MonkeyPatch

import app.api.v1.health.routes as health_routes
from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


async def _healthy() -> bool:
    return True


def test_ready(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setattr(health_routes, 'check_database', _healthy)
    monkeypatch.setattr(health_routes, 'check_redis', _healthy)

    response = client.get('/api/v1/ready')
    assert response.status_code == 200
    assert response.json() == {
        'status': 'ready',
        'checks': {'database': True, 'redis': True},
    }


def test_api_health() -> None:
    response = client.get('/api/v1/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}
