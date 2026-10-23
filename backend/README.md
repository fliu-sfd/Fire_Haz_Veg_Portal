# Backend

FastAPI backend for the Fire Hazardous Vegetation Portal.

## Requirements

- Python 3.11 or newer
- `uv` (recommended) or `pip`

## Database

The backend uses PostgreSQL 16 with PostGIS. Start it from the repo root
(requires Docker Desktop):

```powershell
docker compose up -d db
```

Then run migrations from `backend/`:

```powershell
uv run alembic upgrade head
```

To run the API in Docker as well, with migrations and the NAOS import done on
start, use `docker compose up --build` (details in the import section of
[`../docs/database.md`](../docs/database.md)).

See [`../docs/database.md`](../docs/database.md) for credentials, schema,
and how to reset the database.

## Setup with uv

```powershell
cd backend
uv sync --extra dev
Copy-Item .env.example .env
uv run fastapi dev app/main.py
```

## Setup with pip

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
fastapi dev app/main.py
```

The API is available at `http://127.0.0.1:8000`. Interactive API
documentation is available at `http://127.0.0.1:8000/docs`.

## Endpoints

- `GET /` - API name and version
- `GET /api/v1/health` - health check
- `GET /api/v1/health/db` - database + PostGIS check (503 if unreachable)
- `POST /api/v1/auth/signup` - resident self-signup; verifies `property_address` + `asset_id` against imported assessments, creates the property link, and signs the resident in
- `POST /api/v1/auth/login` - sets an HttpOnly JWT cookie and returns the user (401 bad credentials, 403 disabled)
- `POST /api/v1/auth/logout` - clears the auth cookie (204)
- `GET /api/v1/auth/me` - current user from the cookie (401 if not logged in)
- `GET /api/v1/admin/users` - administrators only (401 / 403 otherwise). Lists users with
  `q` (name, email or asset ID), `role`, `sort` (`full_name`, `email`, `role`, `asset_ids`,
  `created_at`), `order` (`asc` / `desc`), `limit` (1-100, default 25) and `offset`
- `GET /api/v1/admin/hazards` - administrators only. Hazards for the map: one item per
  `asset_id` with an `ISSUES` row in the latest season, at the centroid of its issue points,
  with the latest issue row's crew, date, comments and address. Repeatable `state`
  (`open`, `pending_review`, `closed`) and `crew`, plus `property_type` (`naos` /
  `residential`). Not paged; capped at 5000 items, and `total` is the count before the cap.
  Every hazard is `open` until the review workflow exists. More filters:
  - `q` (up to 100 characters): case-insensitive "contains" match on asset ID or address.
    `%` and `_` are plain characters.
  - `inspected_from` / `inspected_to` (`YYYY-MM-DD`, inclusive): compared with the latest
    inspection's date in `America/Phoenix`. With either bound set, hazards with no
    inspection time are left out. `inspected_from` after `inspected_to` is a 422.
  - `has_photo` (`true` / `false`) and `needs_attention` (`true` / `false`).

  Each item also has:
  - `photo_count`: crew photos on the asset's `ISSUES` rows. Only the count is returned,
    never photo IDs, names or storage keys.
  - `age_days`: whole days from the latest inspection to today, both as `America/Phoenix`
    dates. Never below 0, and `null` with no inspection time.
  - `attention_reasons`: `no_photo` (no crew photo rows; `photo_flag` is ignored as
    unreliable) and/or `no_comment` (the latest issue row has no comment), in that order.
    The record "needs attention" when this list is not empty.

  `summary` counts every match before the cap. `by_state` applies every filter except
  `state`, and `needs_attention` applies every filter except `needs_attention`
- `GET /api/v1/admin/hazards/filters` - administrators only. The season's crews and
  property types, for the map's filter controls

Protect an endpoint by adding a `user: CurrentUser` parameter (from `app/api/deps.py`).
The frontend must send requests with `credentials: "include"` so the cookie is sent.
Allowed browser origins come from `CORS_ORIGINS` in `.env`.

## Quality checks

Tests marked `db` are skipped automatically when Postgres is not running.

```powershell
pytest
ruff check .
ruff format --check .
```

Create local settings in `.env`. Never commit `.env` or credentials.
