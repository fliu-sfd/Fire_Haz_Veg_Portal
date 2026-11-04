import logging
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.models import Assessment, ResidentAsset, User, UserRole
from app.services import resident_property_service
from app.services.resident_property_service import MAX_LINKED_PROPERTIES

pytestmark = pytest.mark.db

URL = "/api/v1/residents/me/properties"
ASSESSMENT = "/api/v1/assessments/{asset_id}"
SERVICE_LOGGER = "app.services.resident_property_service"


def add_assessment(db, asset_id, status="ISSUES"):
    row = Assessment(
        season_year=2026, source_global_id=uuid.uuid4(), asset_id=asset_id, status=status
    )
    db.add(row)
    db.flush()
    return row


def add_user(db, email="jane@example.com", role=UserRole.RESIDENT, assets=()):
    user = User(
        email=email,
        password_hash="$argon2id$not-a-real-hash",
        full_name="Test Person",
        role=role,
        resident_assets=[ResidentAsset(asset_id=a) for a in assets],
    )
    db.add(user)
    db.commit()
    return user


def sign_in(client, user):
    client.cookies.set(settings.auth_cookie_name, create_access_token(user.id))


def asset_ids(resp) -> list[str]:
    return [item["asset_id"] for item in resp.json()]


def link_count(db, user=None) -> int:
    query = select(func.count()).select_from(ResidentAsset)
    if user is not None:
        query = query.where(ResidentAsset.user_id == user.id)
    return db.scalar(query)


# ---- who may call ------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("get", URL, None),
        ("post", URL, {"asset_id": "1001"}),
        ("delete", f"{URL}/1001", None),
    ],
)
def test_access_by_role(client, db, method, path, body) -> None:
    add_assessment(db, "1001")
    db.commit()
    kwargs = {"json": body} if body else {}

    assert client.request(method, path, **kwargs).status_code == 401

    sign_in(client, add_user(db, "admin@example.com", role=UserRole.ADMIN))
    assert client.request(method, path, **kwargs).status_code == 403

    sign_in(client, add_user(db))
    assert client.request(method, path, **kwargs).status_code == 200


# ---- linking -----------------------------------------------------------------------------


def test_link_returns_the_list_with_the_latest_inspection(client, db) -> None:
    add_assessment(db, "1001", status="NO ISSUES")
    user = add_user(db)
    sign_in(client, user)

    resp = client.post(URL, json={"asset_id": "1001"})

    assert resp.status_code == 200
    assert resp.json()[0]["asset_id"] == "1001"
    assert resp.json()[0]["latest_status"] == "NO ISSUES"
    assert resp.json()[0]["season_year"] == 2026
    assert resp.json() == client.get(URL).json()


def test_link_a_second_asset_shows_both(client, db) -> None:
    add_assessment(db, "1001")
    add_assessment(db, "1002")
    sign_in(client, add_user(db))

    client.post(URL, json={"asset_id": "1001"})
    resp = client.post(URL, json={"asset_id": "1002"})

    assert sorted(asset_ids(resp)) == ["1001", "1002"]
    assert client.get("/api/v1/auth/me").json()["property_ids"] == asset_ids(resp)


def test_link_ignores_case_and_spaces_and_saves_the_stored_id(client, db) -> None:
    add_assessment(db, "naos-77b")
    sign_in(client, add_user(db))

    resp = client.post(URL, json={"asset_id": "  NAOS-77b "})

    assert resp.status_code == 200
    assert asset_ids(resp) == ["naos-77b"]


def test_unknown_asset_is_404_and_saves_nothing(client, db) -> None:
    add_assessment(db, "1001")
    sign_in(client, add_user(db))

    resp = client.post(URL, json={"asset_id": "9999"})

    assert resp.status_code == 404
    assert resp.json()["detail"] == {
        "code": "property_not_found",
        "message": "We could not find that Asset ID. Check the number on your door tag.",
        "field": "asset_id",
    }
    assert link_count(db) == 0


def test_same_asset_twice_is_409(client, db) -> None:
    add_assessment(db, "1001")
    sign_in(client, add_user(db))
    client.post(URL, json={"asset_id": "1001"})

    resp = client.post(URL, json={"asset_id": "1001"})

    assert resp.status_code == 409
    assert resp.json()["detail"] == {
        "code": "already_linked",
        "message": "This property is already on your account.",
        "field": "asset_id",
    }
    assert link_count(db) == 1


def test_the_property_over_the_limit_is_409(client, db) -> None:
    assets = [f"A-{n}" for n in range(MAX_LINKED_PROPERTIES + 1)]
    for asset in assets:
        add_assessment(db, asset)
    user = add_user(db, assets=assets[:-1])
    sign_in(client, user)

    resp = client.post(URL, json={"asset_id": assets[-1]})

    assert MAX_LINKED_PROPERTIES == 25
    assert resp.status_code == 409
    assert resp.json()["detail"] == {
        "code": "too_many_properties",
        "message": (
            "You can link up to 25 properties. "
            "Contact the Scottsdale Fire Department if you need more."
        ),
    }
    assert link_count(db, user) == 25


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"asset_id": ""},
        {"asset_id": "   "},
        {"asset_id": "x" * 33},
        {"asset_id": "!!!"},
        {"asset_id": "A 1001"},
        {"asset_id": "1001", "user_id": str(uuid.uuid4())},
    ],
)
def test_bad_body_is_422(client, db, body) -> None:
    sign_in(client, add_user(db))
    assert client.post(URL, json=body).status_code == 422
    assert link_count(db) == 0


def test_asset_on_another_account_still_links_and_both_see_it(client, db, caplog) -> None:
    caplog.set_level(logging.INFO, logger=SERVICE_LOGGER)
    add_assessment(db, "1001")
    first = add_user(db, "first@example.com", assets=["1001"])
    second = add_user(db, "second@example.com")
    sign_in(client, second)

    resp = client.post(URL, json={"asset_id": "1001"})

    assert resp.status_code == 200
    assert asset_ids(resp) == ["1001"]
    sign_in(client, first)
    assert asset_ids(client.get(URL)) == ["1001"]
    assert f"resident {second.id} linked asset 1001 already on another account" in caplog.text
    assert second.email not in caplog.text


def test_can_link_is_the_one_place_that_can_refuse(client, db, monkeypatch) -> None:
    add_assessment(db, "1001")
    sign_in(client, add_user(db))
    monkeypatch.setattr(resident_property_service, "can_link", lambda *_: False)

    resp = client.post(URL, json={"asset_id": "1001"})

    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "link_not_allowed"
    assert link_count(db) == 0


def test_link_and_unlink_each_log_one_line(client, db, caplog) -> None:
    caplog.set_level(logging.INFO, logger=SERVICE_LOGGER)
    add_assessment(db, "1001")
    user = add_user(db)
    sign_in(client, user)

    client.post(URL, json={"asset_id": "1001"})
    client.delete(f"{URL}/1001")

    assert [r.getMessage() for r in caplog.records if r.name == SERVICE_LOGGER] == [
        f"resident {user.id} linked asset 1001",
        f"resident {user.id} unlinked asset 1001",
    ]
    assert user.email not in caplog.text


def test_failed_link_and_no_op_unlink_log_nothing(client, db, caplog) -> None:
    caplog.set_level(logging.INFO, logger=SERVICE_LOGGER)
    sign_in(client, add_user(db))

    client.post(URL, json={"asset_id": "9999"})
    client.delete(f"{URL}/9999")

    assert [r for r in caplog.records if r.name == SERVICE_LOGGER] == []


# ---- unlinking ---------------------------------------------------------------------------


def test_remove_returns_the_remaining_list_and_keeps_the_assessments(client, db) -> None:
    add_assessment(db, "1001")
    add_assessment(db, "1002")
    sign_in(client, add_user(db, assets=["1001", "1002"]))

    resp = client.delete(f"{URL}/1001")

    assert resp.status_code == 200
    assert asset_ids(resp) == ["1002"]
    assert asset_ids(client.get(URL)) == ["1002"]
    assert db.scalar(select(func.count()).select_from(Assessment)) == 2


def test_remove_ignores_letter_case(client, db) -> None:
    sign_in(client, add_user(db, assets=["NAOS-77B"]))
    assert client.delete(f"{URL}/naos-77b").json() == []


def test_remove_of_an_unlinked_asset_changes_nothing(client, db) -> None:
    sign_in(client, add_user(db, assets=["1001"]))
    resp = client.delete(f"{URL}/2002")
    assert resp.status_code == 200
    assert asset_ids(resp) == ["1001"]


def test_remove_with_an_overlong_id_is_422(client, db) -> None:
    sign_in(client, add_user(db))
    assert client.delete(f"{URL}/{'x' * 33}").status_code == 422


def test_a_resident_cannot_read_or_remove_another_residents_links(client, db) -> None:
    owner = add_user(db, "owner@example.com", assets=["1001"])
    sign_in(client, add_user(db, "other@example.com"))

    assert client.get(URL).json() == []
    assert client.delete(f"{URL}/1001").json() == []
    assert link_count(db, owner) == 1


# ---- the assessment page follows the link ------------------------------------------------


def test_linked_asset_opens_and_a_removed_one_looks_missing(client, db) -> None:
    add_assessment(db, "1001")
    sign_in(client, add_user(db))
    page = ASSESSMENT.format(asset_id="1001")
    # not linked yet: 404, not 403, so the API does not reveal that the record exists
    assert client.get(page).status_code == 404

    client.post(URL, json={"asset_id": "1001"})
    assert client.get(page).status_code == 200

    client.delete(f"{URL}/1001")
    assert client.get(page).status_code == 404


# ---- requests at the same moment: real commits on separate connections -------------------


@pytest.fixture
def real_db(test_engine):
    factory = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)

    def get_real_db():
        with factory() as session:
            yield session

    app.dependency_overrides[get_db] = get_real_db
    try:
        yield factory
    finally:
        app.dependency_overrides.clear()
        with factory() as session:
            session.execute(delete(ResidentAsset))
            session.execute(delete(User))
            session.execute(delete(Assessment))
            session.commit()


def post_together(user, asset_ids_to_send: list[str]) -> list:
    barrier = threading.Barrier(len(asset_ids_to_send))

    def send(asset_id: str):
        client = TestClient(app)
        sign_in(client, user)
        barrier.wait(timeout=10)
        return client.post(URL, json={"asset_id": asset_id})

    with ThreadPoolExecutor(max_workers=len(asset_ids_to_send)) as pool:
        return list(pool.map(send, asset_ids_to_send))


def test_two_requests_at_once_save_one_row(real_db) -> None:
    with real_db() as session:
        add_assessment(session, "1001")
        user = add_user(session)

    responses = post_together(user, ["1001", "1001"])

    assert sorted(r.status_code for r in responses) == [200, 409]
    refused = next(r for r in responses if r.status_code == 409)
    assert refused.json()["detail"]["code"] == "already_linked"
    with real_db() as session:
        assert link_count(session, user) == 1


def test_requests_at_once_cannot_pass_the_limit(real_db) -> None:
    assets = [f"A-{n}" for n in range(MAX_LINKED_PROPERTIES + 5)]
    with real_db() as session:
        for asset in assets:
            add_assessment(session, asset)
        user = add_user(session, assets=assets[: MAX_LINKED_PROPERTIES - 1])

    responses = post_together(user, assets[MAX_LINKED_PROPERTIES - 1 :])

    assert sorted(r.status_code for r in responses) == [200, 409, 409, 409, 409, 409]
    with real_db() as session:
        assert link_count(session, user) == MAX_LINKED_PROPERTIES


def test_unique_constraint_firing_returns_already_linked(real_db, monkeypatch) -> None:
    # an admin links the same pair after the resident's checks passed
    with real_db() as session:
        add_assessment(session, "1001")
        user = add_user(session)

    def racing_link(db, user, asset_id):
        with real_db() as other:
            other.add(ResidentAsset(user_id=user.id, asset_id=asset_id))
            other.commit()
        db.add(ResidentAsset(user_id=user.id, asset_id=asset_id))
        db.flush()

    monkeypatch.setattr(resident_property_service, "link_user_to_property", racing_link)
    client = TestClient(app)
    sign_in(client, user)

    resp = client.post(URL, json={"asset_id": "1001"})

    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "already_linked"
    with real_db() as session:
        assert link_count(session, user) == 1
