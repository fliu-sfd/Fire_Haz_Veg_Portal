import dataclasses
import os
import uuid
from pathlib import Path

import pytest

from app.importers import geodatabase as gdb_mod
from app.importers.base import PointRecord
from app.importers.geodatabase import (
    POINT_COLUMNS,
    GeodatabaseSource,
    clean_id,
    clean_text,
    parse_guid,
    point_xy,
    yes_no,
)

SAMPLE_PATH = os.environ.get("NAOS_GDB_PATH")
needs_sample = pytest.mark.skipif(not SAMPLE_PATH, reason="set NAOS_GDB_PATH to the sample file")


def test_braces_are_stripped_from_guids():
    got = parse_guid("{B7693CA9-0B37-461D-95B5-1D6D6CC09EBD}")
    assert got == uuid.UUID("b7693ca9-0b37-461d-95b5-1d6d6cc09ebd")
    print("parsed guid:", got)


@pytest.mark.parametrize("blank", [None, "", "   ", "{}"])
def test_blank_guid_gives_none(blank):
    assert parse_guid(blank) is None


@pytest.mark.parametrize("blank", [None, "", "   ", "\t"])
def test_blank_text_becomes_none(blank):
    assert clean_text(blank) is None


def test_text_is_trimmed_but_kept():
    assert clean_text("  Needs trim ") == "Needs trim"


@pytest.mark.parametrize(
    "raw, expected",
    [("YES", True), ("yes", True), ("NO", False), (" No ", False), ("", None), (None, None)],
)
def test_yes_no_flags(raw, expected):
    assert yes_no(raw) is expected


def test_numeric_ids_become_text():
    assert clean_id(1732983) == "1732983"
    assert clean_id(None) is None


def test_point_wkb_is_decoded():
    import struct

    flat = struct.pack("<BIdd", 1, 1, 10.5, 20.25)
    with_z = struct.pack("<BIddd", 1, 1001, 10.5, 20.25, 3.0)
    big_endian = struct.pack(">BIdd", 0, 1, 10.5, 20.25)
    assert point_xy(flat) == (10.5, 20.25)
    assert point_xy(with_z) == (10.5, 20.25)
    assert point_xy(big_endian) == (10.5, 20.25)


def test_non_point_geometry_is_rejected():
    import struct

    line = struct.pack("<BIdd", 1, 2, 1.0, 2.0)
    with pytest.raises(ValueError):
        point_xy(line)
    with pytest.raises(ValueError):
        point_xy(None)


def test_staff_email_column_is_never_requested():
    # sfd_edit_by holds staff emails; it must not be read or carried along
    assert "sfd_edit_by" not in POINT_COLUMNS
    assert not any("edit_by" in f.name for f in dataclasses.fields(PointRecord))


def test_missing_file_is_a_clear_error(tmp_path):
    with pytest.raises(FileNotFoundError):
        GeodatabaseSource(tmp_path / "nope.gdb.zip")


def test_zip_without_a_gdb_folder_is_rejected(tmp_path):
    import zipfile

    bad = tmp_path / "empty.zip"
    with zipfile.ZipFile(bad, "w") as z:
        z.writestr("readme.txt", "no geodatabase in here")
    with pytest.raises(ValueError):
        GeodatabaseSource(bad).read_points().__next__()


@needs_sample
def test_sample_points_match_the_known_counts():
    with GeodatabaseSource(SAMPLE_PATH) as src:
        pts = list(src.read_points())
    statuses = [p.status for p in pts]
    print("points:", len(pts), "ISSUES:", statuses.count("ISSUES"))

    assert len(pts) == 7040
    assert statuses.count("ISSUES") == 145
    assert statuses.count("NO ISSUES") == 6895
    assert len({p.asset_id for p in pts}) == 2054
    assert all(-112.0 < p.lon < -111.7 for p in pts)
    assert all(33.5 < p.lat < 33.9 for p in pts)
    assert all(p.inspected_at is not None and p.inspected_at.tzinfo for p in pts)


@needs_sample
def test_sample_photos_match_the_known_counts():
    with GeodatabaseSource(SAMPLE_PATH) as src:
        shots = list(src.read_photos())
    parents = {s.parent_global_id for s in shots}
    print("photos:", len(shots), "points with a photo:", len(parents))

    assert len(shots) == 136
    assert len(parents) == 108
    assert all(s.data[:2] == b"\xff\xd8" for s in shots)  # JPEG header


@needs_sample
def test_unzip_folder_is_removed_on_close():
    src = GeodatabaseSource(Path(SAMPLE_PATH))
    with src:
        next(src.read_points())
        scratch = Path(src._scratch.name)
        assert scratch.exists()
    assert not scratch.exists()


def test_module_exposes_both_layer_names():
    assert gdb_mod.POINT_LAYER.endswith("NAOS")
    assert gdb_mod.PHOTO_LAYER.endswith("__ATTACH")
