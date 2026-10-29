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
- `GET /api/v1/me/profile` - any signed-in role (401 otherwise). The signed-in user's own
  account: `id`, `full_name`, `email`, `phone`, `role`, `email_verified`, `created_at`,
  `last_login_at`, sorted `asset_ids` (empty for staff) and `firefighter` (`employee_id`,
  `station_code`, only for firefighters) or `null`. Never the password hash
- `PATCH /api/v1/me/profile` - any signed-in role. Changes your own `full_name` and `phone`
  (`null` clears it). Only fields in the body change; an empty body or any other field
  (`email`, `role`, ...) is a 422. Returns the updated profile
- `POST /api/v1/me/password` - any signed-in role. Body `{current_password, new_password}`.
  The new password follows the signup rules. Returns 204 and a fresh auth cookie with the
  same lifetime as the current sign-in (remember me or not). Errors:

  | Status | Code | Field | When |
  |---|---|---|---|
  | 400 | `wrong_current_password` | `current_password` | Current password is wrong (400, not 401, so the session stays) |
  | 422 | `password_unchanged` | `new_password` | New password equals the current one |
  | 422 | `password_personal` | `new_password` | New password contains your name or email |

  The `/me` routes only ever act on the user in the cookie; no user id is accepted. Each
  successful write logs the user id and the changed field names (`full_name`, `phone`,
  `password`), never the values.
- `GET /api/v1/admin/users` - administrators only (401 / 403 otherwise). Lists users with
  `q` (name, email or asset ID), `role`, `is_active` (`true` / `false`), `sort`
  (`full_name`, `email`, `role`, `asset_ids`, `created_at`, `last_login_at`, `is_active`),
  `order` (`asc` / `desc`), `limit` (1-100, default 25) and `offset`. Users who never
  signed in sort last in both directions. Each item has `is_active` and `last_login_at`
- `GET /api/v1/admin/users/{user_id}` - administrators only. One user for the edit panel:
  details, role, status, `email_verified`, `last_login_at`, sorted `asset_ids`, and
  `firefighter` (`employee_id`, `station_code`) or `null`. Never the password hash
- `PATCH /api/v1/admin/users/{user_id}` - administrators only. Changes `full_name`, `email`,
  `phone` (`null` clears it), `role`, `is_active` and `firefighter` (`employee_id`,
  `station_code`; replaces both). Only fields in the body change; an empty body is a 422
- `POST /api/v1/admin/users/{user_id}/assets` - administrators only. Body `{"asset_id": ...}`
  links a resident to an asset ID found in the inspection data. Linking twice is a no-op
- `DELETE /api/v1/admin/users/{user_id}/assets/{asset_id}` - administrators only. Unlinks
  the asset. Unlinking one that is not linked is a no-op

  Each write returns the updated user in the same shape as the `GET`. Rule errors use
  `detail: {code, message, field?}`:

  | Status | Code | When |
  |---|---|---|
  | 404 | `user_not_found` | No user with that id |
  | 409 | `email_taken` | Another account has the email (case-insensitive) |
  | 409 | `employee_id_taken` | Another firefighter has the employee ID |
  | 409 | `cannot_change_own_access` | An admin changes their own role or turns themselves off |
  | 409 | `last_admin` | The change would leave no active admin |
  | 422 | `firefighter_details_required` | Role set to firefighter with no profile and no `firefighter` |
  | 409 | `unlink_assets_first` | A resident with linked assets is moved to another role |
  | 422 | `firefighter_not_applicable` | `firefighter` sent for a user who ends up not a firefighter |
  | 404 | `property_not_found` | The asset ID is not in the inspection data |
  | 409 | `assets_residents_only` | Links managed for a user who is not a resident |

  A firefighter who changes role keeps their profile row, and it is reused if they become a
  firefighter again. Each change writes one log line with the admin id, the user id and the
  changed field names (never the values).

  **Sessions:** `get_current_user` reads the user row on every request, so a disabled user
  gets 401 on their next request and a role change applies on the next request too.
  Changing a password sets `users.password_changed_at`, and any token issued before it gets
  401, so other devices are signed out. JWT `iat` is whole seconds, so the comparison uses
  `password_changed_at` truncated to the second. The browser that made the change gets a
  new cookie in the same response and stays signed in.
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
