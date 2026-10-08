from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_returns_api_metadata() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "name": "Fire Hazardous Vegetation Portal API",
        "version": "0.1.0",
    }


def test_health_check_returns_ok() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
