import uuid
from datetime import UTC, datetime

import pytest

from app.api.deps import get_photo_store
from app.core.config import settings
from app.core.security import create_access_token
from app.main import app
from app.models import Assessment, CrewPhoto, ResidentAsset, User, UserRole

pytestmark = pytest.mark.db

DETAIL = "/api/v1/assessments/{asset_id}"
PHOTO = "/api/v1/assessments/photos/{photo_id}"
FAKE_HASH = "$argon2id$not-a-real-hash"
JPEG = b"\xff\xd8\xff\xe0test-photo\xff\xd9"


class MemoryPhotoStore:
    def __init__(self, files=None):
        self.files = dict(files or {})

    def save(self, key, data, content_type):
        self.files[key] = data
        return key

    def read(self, key):
        try:
            return self.files[key]
        except KeyError:
            raise FileNotFoundError(key) from None

    def delete(self, key):
        self.files.pop(key, None)


def add_user(db, email, role=UserRole.RESIDENT, assets=()):
    user = User(
        email=email,
        password_hash=FAKE_HASH,
        full_name="Test Person",
        role=role,
        resident_assets=[ResidentAsset(asset_id=asset) for asset in assets],
    )
    db.add(user)
    db.flush()
    return user


def add_assessment(
    db,
    asset_id,
    *,
    year=2026,
    result="ISSUES",
    when=None,
    comments=None,
    address=None,
    crew_code="A1",
):
    row = Assessment(
        season_year=year,
        source_global_id=uuid.uuid4(),
        asset_id=asset_id,
        status=result,
        inspected_at=when,
        comments=comments,
        site_address=address,
        inspection_type="NAOS",
        crew_code=crew_code,
    )
    db.add(row)
    db.flush()
    return row


def add_photo(db, assessment, *, key="crew/example/photo.jpg"):
    photo = CrewPhoto(
        assessment_id=assessment.id,
        source_global_id=uuid.uuid4(),
        file_name="Crew Photo.jpg",
        content_type="image/jpeg",
        size_bytes=len(JPEG),
        storage_key=key,
    )
    db.add(photo)
    db.flush()
    return photo


def sign_in(client, user):
    client.cookies.set(settings.auth_cookie_name, create_access_token(user.id))


def use_photo_store(store):
    app.dependency_overrides[get_photo_store] = lambda: store


def test_owner_gets_latest_season_points_and_safe_photo_metadata(client, db):
    add_assessment(db, "ASSET-1", year=2025, comments="old record")
    no_issue = add_assessment(
        db,
        "ASSET-1",
        result="NO ISSUES",
        when=datetime(2026, 5, 1, tzinfo=UTC),
    )
    issue = add_assessment(
        db,
        "ASSET-1",
        when=datetime(2026, 4, 1, tzinfo=UTC),
        comments="Needs trim",
        address="1 Desert Rd",
        crew_code="PRIVATE-CREW",
    )
    photo = add_photo(db, issue)
    owner = add_user(db, "owner@example.com", assets=["ASSET-1"])
    db.commit()
    sign_in(client, owner)

    response = client.get(DETAIL.format(asset_id="asset-1"))

    assert response.status_code == 200
    body = response.json()
    assert body["asset_id"] == "ASSET-1"
    assert body["season_year"] == 2026
    assert body["site_address"] == "1 Desert Rd"
    assert [row["id"] for row in body["inspections"]] == [str(issue.id), str(no_issue.id)]
    assert body["inspections"][0]["comments"] == "Needs trim"
    assert body["inspections"][0]["photos"] == [
        {
            "id": str(photo.id),
            "file_name": "Crew Photo.jpg",
            "content_type": "image/jpeg",
            "size_bytes": len(JPEG),
        }
    ]
    assert "crew_code" not in body["inspections"][0]
    assert "storage_key" not in body["inspections"][0]["photos"][0]
    assert "old record" not in response.text


def test_admin_can_open_any_asset(client, db):
    add_assessment(db, "ASSET-1")
    admin = add_user(db, "admin@example.com", role=UserRole.ADMIN)
    db.commit()
    sign_in(client, admin)

    assert client.get(DETAIL.format(asset_id="ASSET-1")).status_code == 200


def test_resident_cannot_open_another_residents_asset(client, db):
    add_assessment(db, "ASSET-1")
    add_user(db, "owner@example.com", assets=["ASSET-1"])
    stranger = add_user(db, "stranger@example.com", assets=["OTHER-ASSET"])
    db.commit()
    sign_in(client, stranger)

    assert client.get(DETAIL.format(asset_id="ASSET-1")).status_code == 404


def test_unknown_and_not_linked_assets_have_the_same_response(client, db):
    add_assessment(db, "ASSET-1")
    resident = add_user(db, "resident@example.com", assets=["OTHER-ASSET"])
    db.commit()
    sign_in(client, resident)

    forbidden = client.get(DETAIL.format(asset_id="ASSET-1"))
    missing = client.get(DETAIL.format(asset_id="UNKNOWN"))

    assert forbidden.status_code == missing.status_code == 404
    assert forbidden.json() == missing.json() == {"detail": "Assessment not found"}


def test_assessment_route_requires_sign_in(client, db):
    add_assessment(db, "ASSET-1")
    db.commit()
    assert client.get(DETAIL.format(asset_id="ASSET-1")).status_code == 401


def test_owner_can_read_private_photo(client, db):
    assessment = add_assessment(db, "ASSET-1")
    photo = add_photo(db, assessment)
    owner = add_user(db, "owner@example.com", assets=["ASSET-1"])
    db.commit()
    sign_in(client, owner)
    use_photo_store(MemoryPhotoStore({photo.storage_key: JPEG}))

    response = client.get(PHOTO.format(photo_id=photo.id))

    assert response.status_code == 200
    assert response.content == JPEG
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_photo_route_hides_photo_from_another_homeowner(client, db):
    assessment = add_assessment(db, "ASSET-1")
    photo = add_photo(db, assessment)
    stranger = add_user(db, "stranger@example.com", assets=["OTHER-ASSET"])
    db.commit()
    sign_in(client, stranger)
    use_photo_store(MemoryPhotoStore({photo.storage_key: JPEG}))

    response = client.get(PHOTO.format(photo_id=photo.id))

    assert response.status_code == 404
    assert response.json() == {"detail": "Photo not found"}


def test_photo_route_returns_not_found_when_file_is_missing(client, db):
    assessment = add_assessment(db, "ASSET-1")
    photo = add_photo(db, assessment)
    owner = add_user(db, "owner@example.com", assets=["ASSET-1"])
    db.commit()
    sign_in(client, owner)
    use_photo_store(MemoryPhotoStore())

    assert client.get(PHOTO.format(photo_id=photo.id)).status_code == 404


def test_photo_route_requires_sign_in(client, db):
    assessment = add_assessment(db, "ASSET-1")
    photo = add_photo(db, assessment)
    db.commit()
    use_photo_store(MemoryPhotoStore({photo.storage_key: JPEG}))

    assert client.get(PHOTO.format(photo_id=photo.id)).status_code == 401
