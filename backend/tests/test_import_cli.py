import io
import uuid

import pytest
from sqlalchemy import func, select

from app.cli.import_naos import build_parser, count_only, main, run_import
from app.importers.base import PhotoRecord
from app.models import Assessment, CrewPhoto
from app.storage import LocalDiskStore

from .test_naos_import import GID_A, GID_B, GID_C, JPEG, ListSource, make_point


def sample_source():
    points = [make_point(GID_A), make_point(GID_B), make_point(GID_C)]
    stray = uuid.uuid4()
    photos = [
        PhotoRecord(GID_A, uuid.uuid4(), "Photo 1.jpg", "image/jpeg", JPEG),
        PhotoRecord(stray, uuid.uuid4(), "Photo 2.jpg", "image/jpeg", JPEG),
    ]
    return ListSource(points, photos)


def test_year_is_required():
    with pytest.raises(SystemExit) as stop:
        build_parser().parse_args(["some_file.zip"])
    assert stop.value.code == 2


def test_arguments_are_read():
    got = build_parser().parse_args(["data.gdb.zip", "--year", "2026", "--dry-run"])
    assert str(got.path) == "data.gdb.zip"
    assert got.year == 2026
    assert got.dry_run is True


def test_count_only_finds_the_stray_photo():
    result = count_only(sample_source())
    assert (result.points_read, result.photos_read, result.photos_orphaned) == (3, 2, 1)


def test_dry_run_prints_counts_and_touches_nothing(tmp_path):
    def no_database():
        raise AssertionError("a dry run must not open a database session")

    buf = io.StringIO()
    store = LocalDiskStore(tmp_path / "photos")
    run_import(sample_source(), 2026, True, no_database, store, buf)
    shown = buf.getvalue()
    print(shown)

    assert "points: read 3" in shown
    assert "photos: read 2" in shown
    assert "warning: photo" in shown
    assert "nothing was written" in shown
    assert list(store.root.rglob("*.jpg")) == []


def test_missing_file_gives_error_message_and_exit_code_1(tmp_path, capsys):
    code = main([str(tmp_path / "nothing.gdb.zip"), "--year", "2026"])
    assert code == 1
    assert "error:" in capsys.readouterr().err


def test_file_that_is_not_a_zip_gives_error_message(tmp_path, capsys):
    broken = tmp_path / "broken.gdb.zip"
    broken.write_text("this is not a zip file")
    code = main([str(broken), "--year", "2026"])
    assert code == 1
    assert "error:" in capsys.readouterr().err


@pytest.mark.db
def test_real_run_prints_summary_and_writes_rows(db, tmp_path):
    buf = io.StringIO()
    store = LocalDiskStore(tmp_path / "photos")
    run_import(sample_source(), 2026, False, lambda: _Borrowed(db), store, buf)
    shown = buf.getvalue()
    print(shown)

    assert "points: read 3, inserted 3, skipped 0" in shown
    assert "photos: read 2, inserted 1, skipped 0, orphaned 1" in shown
    assert shown.count("warning: photo") == 1
    assert db.scalar(select(func.count()).select_from(Assessment)) == 3
    assert db.scalar(select(func.count()).select_from(CrewPhoto)) == 1


class _Borrowed:
    """Lets the CLI use the test session without closing it when the with-block ends."""

    def __init__(self, session):
        self._session = session

    def __enter__(self):
        return self._session

    def __exit__(self, *exc):
        return False
