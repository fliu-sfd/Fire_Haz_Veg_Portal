# Database

PostgreSQL 16 with PostGIS 3.4, accessed through SQLAlchemy 2 and migrated with Alembic.

## Local setup

```bash
docker compose up -d db          # from repo root
cd backend
cp .env.example .env
uv sync --extra dev
uv run alembic upgrade head
uv run pytest                    # db tests skip if postgres is down
```

| Setting | Value |
| --- | --- |
| host / port | localhost / 5432 |
| database | `fire_hazard_veg` (tests: `fire_hazard_veg_test`) |
| user / password | `fhv` / `fhv_dev_pw` (local only) |

Health check: `GET /api/v1/health/db`

Reset: `docker compose down -v && docker compose up -d db`

## Schema

```mermaid
erDiagram
    users ||--o| resident_profiles : has
    users ||--o| firefighter_profiles : has
    assessments ||--o{ crew_photos : has

    users {
        uuid id PK
        varchar email "unique, case-insensitive"
        varchar password_hash
        varchar full_name
        varchar phone
        user_role role "resident | firefighter | admin"
        bool is_active
        bool email_verified
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }
    resident_profiles {
        uuid user_id PK, FK
        varchar street_address
        varchar city
        char state
        varchar zip_code
        varchar hoa_name
    }
    firefighter_profiles {
        uuid user_id PK, FK
        varchar employee_id "unique"
        varchar station_code
    }
    assessments {
        uuid id PK
        smallint season_year "unique with source_global_id"
        uuid source_global_id "the City's GlobalID"
        varchar asset_id "indexed, repeats across rows"
        varchar parent_asset_id
        varchar prior_asset_id "last year's asset id"
        varchar status "indexed, ISSUES | NO ISSUES"
        text comments
        varchar crew_code "indexed"
        timestamptz inspected_at
        bool photo_flag "the crew's flag, kept as given"
        varchar site_address
        varchar site_type
        varchar inspection_type
        geometry location "Point, 4326, GiST index"
        timestamptz created_at
    }
    crew_photos {
        uuid id PK
        uuid assessment_id FK
        uuid source_global_id "unique"
        varchar file_name
        varchar content_type
        int size_bytes
        varchar storage_key "where the photo store keeps the file"
        timestamptz created_at
    }
```

Profiles are deleted with their user. Admins have no profile.

`assessments` holds one row per inspected point from the City's yearly file. The same
`asset_id` shows up many times, so it is never a key; a row is identified by
`season_year` plus `source_global_id`. Photos are deleted with their assessment. The
picture itself is not in the database: `storage_key` points to a file in the photo store
(`PHOTO_STORAGE_DIR`, local disk for now). Staff emails (`sfd_edit_by`) are never read
or stored.

## Migrations

| Revision | Change |
| --- | --- |
| `0001` | enable `postgis`, `pgcrypto` |
| `0002` | `users`, `resident_profiles`, `firefighter_profiles` |
| `0003` | `assessments`, `crew_photos` |

New migration: `uv run alembic revision --autogenerate -m "message"`

## Importing NAOS inspections

Loads the City's yearly geodatabase (a `.gdb.zip` file or an unzipped `.gdb` folder). The
sample file is not in this repository; keep your copy outside it.

```bash
cd backend
uv run python -m app.cli.import_naos <path> --year 2026 --dry-run   # read and count only
uv run python -m app.cli.import_naos <path> --year 2026             # write to the database
```

Running it again with the same file adds nothing: points are matched on season plus
GlobalID and photos on their own GlobalID. The output looks like:

```text
points: read 7040, inserted 7040, skipped 0
photos: read 136, inserted 136, skipped 0, orphaned 0
```

A photo whose point is missing is counted as orphaned, not saved, and gets a `warning:`
line. Photos are written under `PHOTO_STORAGE_DIR` as `crew/<assessment id>/<photo id>.jpg`.

### Automatic import with Docker

`docker compose up --build` starts the database and the API. Each time the API container
starts it applies the migrations, then imports the file it finds in `./data` (any
`*.gdb.zip`), then starts the API on port 8000. Because the import skips what is already
loaded, restarting is safe.

1. Put `Community_NAOS_Inspections.gdb.zip` in the repo's `data/` folder. Do not commit it:
   it is City data (about 80 MB).
2. Run `docker compose up --build` from the repo root.
3. Watch the `fhv-api` log for `points: read 7040, inserted 7040, skipped 0`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `NAOS_DATA_DIR` | `./data` | folder on your computer that holds the file |
| `NAOS_SEASON_YEAR` | `2026` | season the file belongs to |
| `AUTO_IMPORT` | `true` | set to `false` to skip the import |
| `API_PORT` | `8000` | port the API is published on |

With no file in the folder the import is skipped and the API starts normally. If the import
fails, the log shows the error and the API still starts. Photos live in the `photos` Docker
volume; `docker compose down -v` removes the database and the photos together.

`docker compose up -d db` still starts only the database, for working with `uv run` as before.

To run the test that uses the real file, point `NAOS_GDB_PATH` at it:

```bash
NAOS_GDB_PATH=/path/to/Community_NAOS_Inspections.gdb.zip uv run pytest
```
