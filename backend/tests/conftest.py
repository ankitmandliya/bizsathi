import pytest
from app.core.database import engine
from app.main import app


@pytest.fixture(autouse=True)
async def cleanup_event_loop_and_db():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()
    await engine.dispose()
