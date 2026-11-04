import uuid

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.core.security import create_access_token
from app.models import FullAssessmentRequest, ResidentAsset, User, UserRole

pytestmark = pytest.mark.db
BASE = "/api/v1"


def login(client, user: User) -> None:
    client.cookies.clear()
    client.cookies.set(settings.auth_cookie_name, create_access_token(user.id))


def create(client, asset_id="HOME-100", note=None):
    return client.post(
        f"{BASE}/residents/me/properties/{asset_id}/assessment-requests",
        json={"note": note},
    )


@pytest.fixture
def people(client, db):
    def user(name, role=UserRole.RESIDENT, assets=()):
        row = User(
            email=f"{name.lower()}@example.com",
            password_hash="not-a-real-hash",
            full_name=name,
            role=role,
            resident_assets=[ResidentAsset(asset_id=asset) for asset in assets],
        )
        db.add(row)
        db.flush()
        return row

    rows = {
        "owner": user("Owner One", assets=["HOME-100"]),
        "co_owner": user("Owner Two", assets=["home-100"]),
        "other": user("Other Owner", assets=["HOME-200"]),
        "admin": user("Admin User", UserRole.ADMIN),
        "second_admin": user("Second Admin", UserRole.ADMIN),
    }
    db.commit()
    login(client, rows["owner"])
    return rows


def test_homeowner_creates_request_for_linked_property(client, db, people):
    response = create(client, " home-100 ", "  Please inspect the whole property.  ")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["asset_id"] == "HOME-100"
    assert body["note"] == "Please inspect the whole property."
    assert body["status"] == "open"
    assert body["handled_at"] is None
    assert body["requested_at"]

    row = db.get(FullAssessmentRequest, uuid.UUID(body["id"]))
    assert row.homeowner_id == people["owner"].id
    assert row.handled_by is None


def test_open_request_can_be_loaded_after_page_refresh(client, people):
    assert (
        client.get(f"{BASE}/residents/me/properties/HOME-100/assessment-requests/open").json()
        is None
    )
    saved = create(client, note="Call before visiting").json()
    response = client.get(f"{BASE}/residents/me/properties/home-100/assessment-requests/open")
    assert response.status_code == 200
    assert response.json() == saved


def test_duplicate_open_request_returns_existing_without_changing_it(client, db, people):
    first = create(client, note="Original note").json()
    second = create(client, note="Different note")
    assert second.status_code == 200
    assert second.json() == first
    assert db.scalar(select(func.count()).select_from(FullAssessmentRequest)) == 1


def test_same_property_on_another_account_returns_existing_request(client, db, people):
    first = create(client).json()
    login(client, people["co_owner"])
    second = create(client, "HOME-100", "A second owner's note")
    assert second.status_code == 200
    assert second.json() == first
    assert db.scalar(select(func.count()).select_from(FullAssessmentRequest)) == 1


@pytest.mark.parametrize("action", ["create", "read"])
def test_homeowner_cannot_access_another_property(client, db, people, action):
    if action == "create":
        response = create(client, "HOME-200")
    else:
        response = client.get(f"{BASE}/residents/me/properties/HOME-200/assessment-requests/open")
    assert response.status_code == 404
    assert db.scalar(select(func.count()).select_from(FullAssessmentRequest)) == 0


def test_create_rejects_bad_body_and_long_note(client, db, people):
    endpoint = f"{BASE}/residents/me/properties/HOME-100/assessment-requests"
    assert client.post(endpoint, json={"note": "okay", "status": "handled"}).status_code == 422
    assert client.post(endpoint, json={"note": "x" * 2001}).status_code == 422
    assert db.scalar(select(func.count()).select_from(FullAssessmentRequest)) == 0


def test_only_residents_can_create_and_a_session_is_required(client, db, people):
    login(client, people["admin"])
    assert create(client).status_code == 403
    client.cookies.clear()
    assert create(client).status_code == 401
    assert db.scalar(select(func.count()).select_from(FullAssessmentRequest)) == 0


def test_admin_list_shows_open_first_and_supports_status_filter(client, db, people):
    handled = create(client, note="First request").json()
    login(client, people["admin"])
    assert (
        client.post(f"{BASE}/admin/assessment-requests/{handled['id']}/handle").status_code == 200
    )
    login(client, people["other"])
    opened = create(client, "HOME-200", note="Still open").json()
    login(client, people["admin"])

    response = client.get(f"{BASE}/admin/assessment-requests")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert [item["id"] for item in body["items"]] == [opened["id"], handled["id"]]
    assert body["items"][0]["homeowner_name"] == "Other Owner"
    assert body["items"][0]["status"] == "open"
    assert body["items"][1]["status"] == "handled"
    assert body["items"][1]["handled_by_name"] == "Admin User"

    open_body = client.get(f"{BASE}/admin/assessment-requests?status=open").json()
    handled_body = client.get(f"{BASE}/admin/assessment-requests?status=handled").json()
    assert [item["id"] for item in open_body["items"]] == [opened["id"]]
    assert [item["id"] for item in handled_body["items"]] == [handled["id"]]


def test_only_admins_can_list_or_handle(client, people):
    saved = create(client).json()
    assert client.get(f"{BASE}/admin/assessment-requests").status_code == 403
    assert client.post(f"{BASE}/admin/assessment-requests/{saved['id']}/handle").status_code == 403
    client.cookies.clear()
    assert client.get(f"{BASE}/admin/assessment-requests").status_code == 401
    assert client.post(f"{BASE}/admin/assessment-requests/{saved['id']}/handle").status_code == 401


def test_admin_marks_request_handled_and_second_decision_is_refused(client, db, people):
    saved = create(client).json()
    login(client, people["admin"])
    endpoint = f"{BASE}/admin/assessment-requests/{saved['id']}/handle"
    response = client.post(endpoint)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "handled"
    assert body["handled_at"]
    assert body["handled_by_name"] == "Admin User"

    row = db.get(FullAssessmentRequest, uuid.UUID(saved["id"]))
    assert row.handled_by == people["admin"].id
    assert client.post(endpoint).status_code == 409


def test_handled_request_does_not_block_a_new_request(client, db, people):
    first = create(client).json()
    login(client, people["admin"])
    client.post(f"{BASE}/admin/assessment-requests/{first['id']}/handle")
    login(client, people["owner"])
    second = create(client, note="Please reassess").json()

    assert second["id"] != first["id"]
    assert second["status"] == "open"
    assert db.scalar(select(func.count()).select_from(FullAssessmentRequest)) == 2


def test_missing_and_already_handled_requests_return_clear_errors(client, people):
    login(client, people["admin"])
    assert client.post(f"{BASE}/admin/assessment-requests/{uuid.uuid4()}/handle").status_code == 404


def test_admin_list_validates_filter_and_pagination(client, people):
    login(client, people["admin"])
    assert client.get(f"{BASE}/admin/assessment-requests?status=pending").status_code == 422
    assert client.get(f"{BASE}/admin/assessment-requests?limit=0").status_code == 422
    assert client.get(f"{BASE}/admin/assessment-requests?offset=-1").status_code == 422


def test_deleted_homeowner_does_not_remove_request(client, db, people):
    saved = create(client).json()
    db.delete(people["owner"])
    db.commit()
    login(client, people["admin"])
    body = client.get(f"{BASE}/admin/assessment-requests").json()
    assert body["items"][0]["id"] == saved["id"]
    assert body["items"][0]["homeowner_name"] == "Former homeowner"
