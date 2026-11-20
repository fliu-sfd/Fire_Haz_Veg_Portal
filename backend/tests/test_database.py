import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.db.session import build_engine, get_db
from app.main import app

client = TestClient(app)


@pytest.mark.db
def test_db_health_reports_postgis() -> None:
    resp = client.get("/api/v1/health/db")
    body = resp.json()
    print("db health ->", body)

    assert resp.status_code == 200
    assert body["status"] == "ok"
    assert body["postgres"].startswith("16")
    assert body["postgis"]


@pytest.mark.db
def test_spatial_query_works() -> None:
    # sanity check on a NAOS sample point: EPSG:4326 -> EPSG:2868 (AZ Central, ft)
    with build_engine().connect() as conn:
        x = conn.execute(
            text(
                "SELECT ST_X(ST_Transform(ST_SetSRID("
                "ST_MakePoint(-111.83892, 33.63242), 4326), 2868))"
            )
        ).scalar_one()
    print("projected x (ft):", x)
    assert 700_000 < x < 800_000


def test_db_health_returns_503_when_db_down() -> None:
    dead = build_engine("postgresql+psycopg://nobody:x@127.0.0.1:1/none")

    def broken_session():
        db = Session(bind=dead)  # fails on first query, not here
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = broken_session
    try:
        resp = client.get("/api/v1/health/db")
    except OperationalError:
        pytest.fail("connection error leaked out of the endpoint")
    finally:
        app.dependency_overrides.clear()
    print("db down ->", resp.status_code, resp.json())
    assert resp.status_code == 503
    assert resp.json()["status"] == "unavailable"
