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
```

Profiles are deleted with their user. Admins have no profile.

## Migrations

| Revision | Change |
| --- | --- |
| `0001` | enable `postgis`, `pgcrypto` |
| `0002` | `users`, `resident_profiles`, `firefighter_profiles` |

New migration: `uv run alembic revision --autogenerate -m "message"`
