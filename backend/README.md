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

## Quality checks

Tests marked `db` are skipped automatically when Postgres is not running.

```powershell
pytest
ruff check .
ruff format --check .
```

Create local settings in `.env`. Never commit `.env` or credentials.
