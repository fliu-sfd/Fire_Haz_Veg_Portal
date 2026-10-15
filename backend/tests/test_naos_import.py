import os
import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import func, select, text

from app.importers.base import PhotoRecord, PointRecord
from app.importers.geodatabase import GeodatabaseSource
from app.models import Assessment, CrewPhoto
from app.services.import_service import import_inspections
from app.storage import LocalDiskStore

pytestmark = pytest.mark.db

YEAR = 2026
SAMPLE_PATH = os.environ.get("NAOS_GDB_PATH")

GID_A, GID_B, GID_C = (uuid.uuid4() for _ in range(3))
PHOTO_1, PHOTO_2 = uuid.uuid4(), uuid.uuid4()
JPEG = b"\xff\xd8\xff\xe0tiny\xff\xd9"


def make_point(gid, asset="1001", status="NO ISSUES", **over):
    base = dict(
        global_id=gid,
        asset_id=asset,
        parent_asset_id=asset,
        prior_asset_id="55",
        status=status,
        comments=None,
        crew_code="610A",
        inspected_at=datetime(2026, 6, 1, 12, 0, tzinfo=UTC),
        photo_flag=None,
        site_address=None,
        site_type="Community",
        inspection_type="Community N.A.O.S",
        lon=-111.8389,
        lat=33.6324,
    )
    base.update(over)
    return PointRecord(**base)


class ListSource:
    """Small stand-in for the geodatabase: hands back lists, nothing on disk."""

    def __init__(self, points, photos):
        self._points = points
        self._photos = photos

    def read_points(self):
        return iter(self._points)

    def read_photos(self):
        return iter(self._photos)


@pytest.fixture
def three_points():
    return [
        make_point(GID_A, "1001", "ISSUES", comments="Needs trim", photo_flag=True),
        make_point(GID_B, "1001", "NO ISSUES", comments="   ", lon=-111.9, lat=33.7),
        make_point(GID_C, "2002", "NO ISSUES"),
    ]


@pytest.fixture
def two_photos():
    return [
        PhotoRecord(GID_A, PHOTO_1, "Photo 1.jpg", "image/jpeg", JPEG),
        PhotoRecord(uuid.uuid4(), PHOTO_2, "Photo 2.jpg", "image/jpeg", JPEG),  # no such point
    ]


@pytest.fixture
def store(tmp_path):
    return LocalDiskStore(tmp_path / "photos")


def table_count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def test_counts_for_a_small_import(db, store, three_points, two_photos):
    result = import_inspections(db, ListSource(three_points, two_photos), YEAR, store)
    print("summary:", result)

    assert (result.points_read, result.points_inserted, result.points_skipped) == (3, 3, 0)
    assert result.photos_read == 2
    assert result.photos_inserted == 1
    assert result.photos_skipped == 0
    assert result.photos_orphaned == 1
    assert table_count(db, Assessment) == 3
    assert table_count(db, CrewPhoto) == 1


def test_running_twice_adds_nothing_new(db, store, three_points, two_photos):
    src = ListSource(three_points, two_photos)
    import_inspections(db, src, YEAR, store)
    again = import_inspections(db, src, YEAR, store)
    print("second run:", again)

    assert (again.points_read, again.points_inserted, again.points_skipped) == (3, 0, 3)
    assert again.photos_inserted == 0
    assert again.photos_skipped == 1
    assert again.photos_orphaned == 1
    assert table_count(db, Assessment) == 3
    assert table_count(db, CrewPhoto) == 1


def test_same_file_for_another_season_is_kept_separately(db, store, three_points):
    src = ListSource(three_points, [])
    import_inspections(db, src, 2025, store)
    later = import_inspections(db, src, 2026, store)
    assert later.points_inserted == 3
    assert table_count(db, Assessment) == 6


def test_orphan_photo_is_reported_and_not_saved(db, store, three_points, two_photos):
    result = import_inspections(db, ListSource(three_points, two_photos), YEAR, store)

    assert result.orphan_photo_ids == [PHOTO_2]
    rows = db.scalars(select(CrewPhoto)).all()
    assert [r.source_global_id for r in rows] == [PHOTO_1]
    assert len(list(store.root.rglob("*.jpg"))) == 1


def test_photo_bytes_are_stored_under_a_safe_key(db, store, three_points, two_photos):
    import_inspections(db, ListSource(three_points, two_photos), YEAR, store)
    photo = db.scalars(select(CrewPhoto)).one()
    parent = db.scalars(select(Assessment).where(Assessment.source_global_id == GID_A)).one()

    print("key:", photo.storage_key)
    assert photo.storage_key == f"crew/{parent.id}/{photo.id}.jpg"
    assert "Photo 1" not in photo.storage_key
    assert photo.file_name == "Photo 1.jpg"
    assert photo.size_bytes == len(JPEG)
    assert store.read(photo.storage_key) == JPEG
    assert photo.assessment_id == parent.id


def test_blank_comments_and_address_are_null(db, store, three_points):
    import_inspections(db, ListSource(three_points, []), YEAR, store)
    rows = {r.source_global_id: r for r in db.scalars(select(Assessment))}

    assert rows[GID_A].comments == "Needs trim"
    assert rows[GID_B].comments is None
    assert rows[GID_C].site_address is None
    assert rows[GID_A].photo_flag is True
    assert rows[GID_C].photo_flag is None


def test_coordinates_round_trip(db, store, three_points):
    import_inspections(db, ListSource(three_points, []), YEAR, store)
    lon, lat = db.execute(
        select(func.ST_X(Assessment.location), func.ST_Y(Assessment.location)).where(
            Assessment.source_global_id == GID_B
        )
    ).one()
    srid = db.scalar(
        select(func.ST_SRID(Assessment.location)).where(Assessment.source_global_id == GID_B)
    )
    print("round trip:", lon, lat, srid)

    assert lon == pytest.approx(-111.9)
    assert lat == pytest.approx(33.7)
    assert srid == 4326


def test_no_staff_email_column_exists_in_the_database(db, store, three_points):
    import_inspections(db, ListSource(three_points, []), YEAR, store)
    cols = db.execute(
        text("select column_name from information_schema.columns where table_name = 'assessments'")
    ).scalars()
    names = list(cols)
    assert not any("edit_by" in n or "email" in n for n in names)


def test_more_than_one_batch_is_handled(db, store):
    from app.services import import_service

    many = [make_point(uuid.uuid4(), str(i)) for i in range(2500)]
    result = import_service.import_inspections(db, ListSource(many, []), YEAR, store)
    assert result.points_inserted == 2500
    assert table_count(db, Assessment) == 2500


def test_repeated_point_inside_one_file_is_inserted_once(db, store):
    twin = make_point(GID_A)
    result = import_inspections(db, ListSource([twin, twin], []), YEAR, store)
    assert result.points_read == 2
    assert result.points_inserted == 1
    assert result.points_skipped == 1


def test_failed_photo_import_leaves_no_files_behind(db, store, three_points):
    class BrokenAfterOne(ListSource):
        def read_photos(self):
            yield PhotoRecord(GID_A, PHOTO_1, "Photo 1.jpg", "image/jpeg", JPEG)
            raise RuntimeError("file went bad halfway")

    with pytest.raises(RuntimeError):
        import_inspections(db, BrokenAfterOne(three_points, []), YEAR, store)

    assert list(store.root.rglob("*.jpg")) == []
    assert table_count(db, CrewPhoto) == 0


@pytest.mark.skipif(not SAMPLE_PATH, reason="set NAOS_GDB_PATH to the sample file")
def test_real_sample_file_loads_with_the_known_numbers(db, store):
    with GeodatabaseSource(SAMPLE_PATH) as src:
        result = import_inspections(db, src, YEAR, store)
    print("real sample:", result)

    assert result.points_inserted == 7040
    assert result.photos_inserted == 136
    assert result.photos_orphaned == 0
    assert table_count(db, Assessment) == 7040
    assert db.scalar(select(func.count()).where(Assessment.status == "ISSUES")) == 145
    assert db.scalar(select(func.count()).where(Assessment.status == "NO ISSUES")) == 6895
    assert table_count(db, CrewPhoto) == 136
    assert db.scalar(select(func.count(func.distinct(Assessment.asset_id)))) == 2054

    with_photo = db.execute(
        select(Assessment.status, func.count(func.distinct(Assessment.id)))
        .join(CrewPhoto, CrewPhoto.assessment_id == Assessment.id)
        .group_by(Assessment.status)
    ).all()
    assert dict(with_photo) == {"ISSUES": 95, "NO ISSUES": 13}

    lons = db.scalars(select(func.ST_X(Assessment.location))).all()
    assert all(-112.0 < v < -111.7 for v in lons)
