import struct
import tempfile
import uuid
import zipfile
from collections.abc import Iterator
from datetime import UTC
from pathlib import Path

from pyogrio import list_layers
from pyogrio.raw import read as read_layer
from pyproj import CRS, Transformer

from app.importers.base import PhotoRecord, PointRecord

POINT_LAYER = "Hazardous_Vegetation_Community_NAOS"
PHOTO_LAYER = "Hazardous_Vegetation_Community_NAOS__ATTACH"

# Only these columns are ever asked for. sfd_edit_by (staff emails) is not
# on the list, so it never leaves the file.
POINT_COLUMNS = [
    "GlobalID",
    "asset_id",
    "parent_asset_id",
    "asset_id_2025",
    "sfd_status",
    "comments",
    "sfd_assigned",
    "sfd_edit_date",
    "photo_taken",
    "site_address",
    "site_type",
    "inspection_type",
]
PHOTO_COLUMNS = ["REL_GLOBALID", "GLOBALID", "ATT_NAME", "CONTENT_TYPE", "DATA"]

TARGET_CRS = "EPSG:4326"
POINT_CHUNK = 1000
PHOTO_CHUNK = 10  # photos are large, so only a few are held in memory at once


def parse_guid(raw: str | None) -> uuid.UUID | None:
    """'{B7693CA9-...}' -> UUID. Blank values give None."""
    if raw is None:
        return None
    text = str(raw).strip().strip("{}").strip()
    return uuid.UUID(text) if text else None


def clean_text(raw) -> str | None:
    """Blank or whitespace-only text becomes None."""
    if raw is None:
        return None
    text = str(raw).strip()
    return text or None


def yes_no(raw) -> bool | None:
    text = clean_text(raw)
    if text is None:
        return None
    flag = text.upper()
    if flag == "YES":
        return True
    if flag == "NO":
        return False
    return None


def clean_id(raw) -> str | None:
    """Numeric asset ids arrive as ints; keep them as text."""
    if raw is None:
        return None
    return str(int(raw))


def point_xy(wkb: bytes | None) -> tuple[float, float]:
    """Read x and y from a Point stored as WKB (works with or without a Z value)."""
    if not wkb:
        raise ValueError("inspection point has no geometry")
    endian = "<" if wkb[0] == 1 else ">"
    (geom_type,) = struct.unpack_from(endian + "I", wkb, 1)
    # 1 = Point, 1001 = Point Z (ISO); EWKB sets high flag bits instead
    if (geom_type & 0xFFFF) % 1000 != 1:
        raise ValueError(f"expected a Point, got WKB type {geom_type}")
    x, y = struct.unpack_from(endian + "dd", wkb, 5)
    return x, y


class GeodatabaseSource:
    """Reads the City's Esri file geodatabase (a .gdb folder or a zipped one).

    Use it as a context manager so a temporary unzip folder is removed:

        with GeodatabaseSource("Community_NAOS_Inspections.gdb.zip") as src:
            ...
    """

    def __init__(self, path: str | Path):
        self.path = Path(path).expanduser()
        if not self.path.exists():
            raise FileNotFoundError(f"no such file: {self.path}")
        self._scratch: tempfile.TemporaryDirectory | None = None
        self._gdb: Path | None = None

    # -- opening and cleaning up -------------------------------------------------

    def __enter__(self) -> "GeodatabaseSource":
        self._open()
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()

    def close(self) -> None:
        if self._scratch is not None:
            self._scratch.cleanup()
            self._scratch = None
            self._gdb = None

    def _open(self) -> Path:
        if self._gdb is not None:
            return self._gdb
        if self.path.suffix.lower() == ".zip":
            self._scratch = tempfile.TemporaryDirectory(prefix="naos_gdb_")
            with zipfile.ZipFile(self.path) as archive:
                archive.extractall(self._scratch.name)
            found = sorted(Path(self._scratch.name).rglob("*.gdb"))
            if not found:
                self.close()
                raise ValueError(f"no .gdb folder found inside {self.path.name}")
            self._gdb = found[0]
        else:
            self._gdb = self.path
        return self._gdb

    def _check_layers(self, gdb: Path) -> None:
        names = {str(row[0]) for row in list_layers(gdb)}
        for needed in (POINT_LAYER, PHOTO_LAYER):
            if needed not in names:
                raise ValueError(f"layer {needed!r} is missing from {self.path.name}")

    # -- reading -------------------------------------------------------------------

    def read_points(self) -> Iterator[PointRecord]:
        gdb = self._open()
        self._check_layers(gdb)
        offset = 0
        transformer = None
        while True:
            meta, _, geoms, cols = read_layer(
                gdb,
                layer=POINT_LAYER,
                columns=POINT_COLUMNS,
                skip_features=offset,
                max_features=POINT_CHUNK,
            )
            if geoms is None or len(geoms) == 0:
                return
            if transformer is None:
                if not meta.get("crs"):
                    raise ValueError("the point layer has no coordinate system")
                transformer = Transformer.from_crs(
                    CRS.from_user_input(meta["crs"]), TARGET_CRS, always_xy=True
                )
            by_name = dict(zip(meta["fields"], cols, strict=True))
            xs, ys = zip(*(point_xy(g) for g in geoms), strict=True)
            lons, lats = transformer.transform(list(xs), list(ys))
            edited = by_name["sfd_edit_date"].astype("datetime64[ms]").tolist()

            for i in range(len(geoms)):
                gid = parse_guid(by_name["GlobalID"][i])
                status = clean_text(by_name["sfd_status"][i])
                if gid is None or status is None:
                    raise ValueError(f"point row {offset + i} has no GlobalID or status")
                stamp = edited[i]
                yield PointRecord(
                    global_id=gid,
                    asset_id=clean_id(by_name["asset_id"][i]),
                    parent_asset_id=clean_id(by_name["parent_asset_id"][i]),
                    prior_asset_id=clean_id(by_name["asset_id_2025"][i]),
                    status=status,
                    comments=clean_text(by_name["comments"][i]),
                    crew_code=clean_text(by_name["sfd_assigned"][i]),
                    inspected_at=stamp.replace(tzinfo=UTC) if stamp else None,
                    photo_flag=yes_no(by_name["photo_taken"][i]),
                    site_address=clean_text(by_name["site_address"][i]),
                    site_type=clean_text(by_name["site_type"][i]),
                    inspection_type=clean_text(by_name["inspection_type"][i]),
                    lon=float(lons[i]),
                    lat=float(lats[i]),
                )
            offset += len(geoms)

    def read_photos(self) -> Iterator[PhotoRecord]:
        gdb = self._open()
        self._check_layers(gdb)
        offset = 0
        while True:
            meta, _, _, cols = read_layer(
                gdb,
                layer=PHOTO_LAYER,
                columns=PHOTO_COLUMNS,
                read_geometry=False,
                skip_features=offset,
                max_features=PHOTO_CHUNK,
            )
            by_name = dict(zip(meta["fields"], cols, strict=True))
            count = len(by_name["GLOBALID"])
            if count == 0:
                return
            for i in range(count):
                parent = parse_guid(by_name["REL_GLOBALID"][i])
                own = parse_guid(by_name["GLOBALID"][i])
                blob = by_name["DATA"][i]
                if parent is None or own is None or blob is None:
                    raise ValueError(f"photo row {offset + i} is missing an id or its data")
                yield PhotoRecord(
                    parent_global_id=parent,
                    global_id=own,
                    file_name=clean_text(by_name["ATT_NAME"][i]) or f"{own}.jpg",
                    content_type=clean_text(by_name["CONTENT_TYPE"][i]) or "image/jpeg",
                    data=bytes(blob),
                )
            offset += count
