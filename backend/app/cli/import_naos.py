"""Load a season's NAOS inspection file into the database.

    uv run python -m app.cli.import_naos <path> --year 2026
    uv run python -m app.cli.import_naos <path> --year 2026 --dry-run

The path can be the zipped geodatabase or the unzipped .gdb folder.
"""

import argparse
import sys
import zipfile
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import TextIO

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.importers.base import InspectionSource
from app.importers.geodatabase import GeodatabaseSource
from app.services.import_service import ImportSummary, import_inspections
from app.storage import LocalDiskStore, PhotoStore


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.cli.import_naos",
        description="Import a NAOS inspection geodatabase (points and crew photos).",
    )
    parser.add_argument("path", type=Path, help="the .gdb.zip file or an unzipped .gdb folder")
    parser.add_argument("--year", type=int, required=True, help="season year, for example 2026")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="read the file and count what is in it, without writing anything",
    )
    return parser


def count_only(source: InspectionSource) -> ImportSummary:
    """Read everything and count it. Nothing is written anywhere."""
    summary = ImportSummary()
    known_points: set = set()
    for point in source.read_points():
        summary.points_read += 1
        known_points.add(point.global_id)
    for photo in source.read_photos():
        summary.photos_read += 1
        if photo.parent_global_id not in known_points:
            summary.photos_orphaned += 1
            summary.orphan_photo_ids.append(photo.global_id)
    return summary


def print_summary(summary: ImportSummary, dry_run: bool, out: TextIO) -> None:
    for photo_id in summary.orphan_photo_ids:
        print(f"warning: photo {photo_id} has no matching inspection point", file=out)
    if dry_run:
        print(f"points: read {summary.points_read}", file=out)
        print(
            f"photos: read {summary.photos_read}, without a matching point "
            f"{summary.photos_orphaned}",
            file=out,
        )
        print("dry run: nothing was written", file=out)
        return
    print(
        f"points: read {summary.points_read}, inserted {summary.points_inserted}, "
        f"skipped {summary.points_skipped}",
        file=out,
    )
    print(
        f"photos: read {summary.photos_read}, inserted {summary.photos_inserted}, "
        f"skipped {summary.photos_skipped}, orphaned {summary.photos_orphaned}",
        file=out,
    )


def run_import(
    source: InspectionSource,
    year: int,
    dry_run: bool,
    session_factory: Callable[[], Session],
    photo_store: PhotoStore,
    out: TextIO,
) -> ImportSummary:
    if dry_run:
        summary = count_only(source)
    else:
        with session_factory() as db:
            summary = import_inspections(db, source, year, photo_store)
    print_summary(summary, dry_run, out)
    return summary


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        with GeodatabaseSource(args.path) as source:
            run_import(
                source,
                args.year,
                args.dry_run,
                SessionLocal,
                LocalDiskStore(settings.photo_storage_dir),
                sys.stdout,
            )
    except (FileNotFoundError, ValueError, zipfile.BadZipFile) as err:
        print(f"error: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
