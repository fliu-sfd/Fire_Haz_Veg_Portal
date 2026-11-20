import uuid

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.models import Assessment, CrewPhoto

pytestmark = pytest.mark.db


def new_assessment(year=2026, gid=None, asset="A-1001", status="NO ISSUES", **extra):
    return Assessment(
        season_year=year,
        source_global_id=gid or uuid.uuid4(),
        asset_id=asset,
        status=status,
        **extra,
    )


def new_photo(parent, gid=None, name="IMG_0001.jpg"):
    return CrewPhoto(
        assessment_id=parent.id,
        source_global_id=gid or uuid.uuid4(),
        file_name=name,
        content_type="image/jpeg",
        size_bytes=2048,
        storage_key=f"crew/{parent.id}/{uuid.uuid4()}.jpg",
    )


def test_assessment_gets_id_and_timestamp(db):
    row = new_assessment()
    db.add(row)
    db.flush()
    db.refresh(row)
    print("inserted:", row, row.id)

    assert row.id is not None
    assert row.created_at is not None
    assert row.comments is None


def test_same_season_and_global_id_is_rejected(db):
    shared_gid = uuid.uuid4()
    db.add(new_assessment(2026, shared_gid))
    db.flush()
    db.add(new_assessment(2026, shared_gid, asset="A-2002"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_same_global_id_in_another_season_is_allowed(db):
    shared_gid = uuid.uuid4()
    db.add_all([new_assessment(2025, shared_gid), new_assessment(2026, shared_gid)])
    db.flush()
    total = db.scalar(
        select(func.count())
        .select_from(Assessment)
        .where(Assessment.source_global_id == shared_gid)
    )
    assert total == 2


def test_asset_id_can_repeat(db):
    # one asset is inspected many times, so asset_id must not be unique
    db.add_all([new_assessment(asset="A-77") for _ in range(3)])
    db.flush()
    seen = db.scalars(select(Assessment).where(Assessment.asset_id == "A-77")).all()
    assert len(seen) == 3


def test_point_location_is_stored_and_read_back(db):
    row = new_assessment(location="SRID=4326;POINT(-111.9261 33.4942)")
    db.add(row)
    db.flush()
    lon, lat = db.execute(
        select(func.ST_X(Assessment.location), func.ST_Y(Assessment.location)).where(
            Assessment.id == row.id
        )
    ).one()
    print("lon/lat:", lon, lat)

    assert lon == pytest.approx(-111.9261)
    assert lat == pytest.approx(33.4942)


def test_location_has_a_spatial_index(db):
    found = db.execute(
        text("select indexdef from pg_indexes where indexname = 'ix_assessments_location'")
    ).scalar_one_or_none()
    print("index:", found)
    assert found is not None and "gist" in found.lower()


def test_photo_links_back_to_its_assessment(db):
    parent = new_assessment(status="ISSUES", photo_flag=True)
    db.add(parent)
    db.flush()
    db.add(new_photo(parent))
    db.flush()
    db.refresh(parent)

    assert len(parent.photos) == 1
    assert parent.photos[0].assessment.id == parent.id


def test_photo_global_id_is_unique(db):
    parent = new_assessment()
    db.add(parent)
    db.flush()
    dup = uuid.uuid4()
    db.add(new_photo(parent, dup))
    db.flush()
    db.add(new_photo(parent, dup, name="IMG_0002.jpg"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_photo_needs_an_existing_assessment(db):
    orphan = CrewPhoto(
        assessment_id=uuid.uuid4(),
        source_global_id=uuid.uuid4(),
        file_name="lost.jpg",
        content_type="image/jpeg",
        size_bytes=1,
        storage_key="crew/x/y.jpg",
    )
    db.add(orphan)
    with pytest.raises(IntegrityError):
        db.flush()


def test_deleting_assessment_removes_its_photos(db):
    parent = new_assessment(status="ISSUES")
    db.add(parent)
    db.flush()
    db.add_all([new_photo(parent), new_photo(parent, name="IMG_0003.jpg")])
    db.flush()
    pid = parent.id

    db.delete(parent)
    db.flush()
    left = db.scalar(
        select(func.count()).select_from(CrewPhoto).where(CrewPhoto.assessment_id == pid)
    )
    print("photos left:", left)
    assert left == 0
