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

## Create the first admin

The portal has two roles: `resident` and `admin`. Residents sign up on the website. The first
admin is created from the command line by a developer with access to the server. After that,
an admin can promote a resident in the Users page.

```powershell
uv run python -m app.cli.create_admin --email someone@example.com --name "Full Name"
```

With Docker, while the stack is running:

```powershell
docker compose exec api python -m app.cli.create_admin --email someone@example.com --name "Full Name"
```

The command asks for the password twice, without showing it. It is never an argument, so it
stays out of shell history. The name, email and password follow the same rules as signup. If
the email already belongs to an account, the command stops and changes nothing.

## Endpoints

- `GET /` - API name and version
- `GET /api/v1/health` - health check
- `GET /api/v1/health/db` - database + PostGIS check (503 if unreachable)
- `POST /api/v1/auth/signup` - resident self-signup. Body `{full_name, email, password}`; any
  other field, including `asset_id` and `property_address`, is a 422. Creates the account with
  no linked properties and signs the resident in
- `POST /api/v1/auth/login` - sets an HttpOnly JWT cookie and returns the user. A wrong email or
  password is a 401. A disabled account with the correct password is a 403 with
  `{"detail": {"code": "account_disabled", "message": "..."}}`, where `message` is the text an
  admin set (see "Editable messages"). No cookie is set in either case
- `POST /api/v1/auth/logout` - clears the auth cookie (204)
- `GET /api/v1/auth/me` - current user from the cookie (401 if not logged in)
- `GET /api/v1/residents/me/properties` - residents only (401 / 403 otherwise). The signed-in
  resident's linked properties with their latest inspection result
- `POST /api/v1/residents/me/properties` - residents only. Body `{asset_id}`. Links the Asset ID
  from the door tag, ignoring letter case and surrounding spaces, and returns the updated list.
  An account can have up to 25 properties. An Asset ID already on another account can still be
  linked (the rule lives in `can_link`, `app/services/resident_property_service.py`). Errors:

  | Status | Code | Field | When |
  |---|---|---|---|
  | 404 | `property_not_found` | `asset_id` | Asset ID is not in the inspection data |
  | 409 | `already_linked` | `asset_id` | Already on this account |
  | 409 | `too_many_properties` | | Account already has 25 properties |
  | 422 | | `asset_id` | Empty, too long, or has symbols (standard validation error) |

- `DELETE /api/v1/residents/me/properties/{asset_id}` - residents only. Removes the Asset ID from
  the signed-in resident and returns the updated list. Removing one that is not linked changes
  nothing. Assessments, photos and hazards stay. These routes only act on the user in the
  cookie. Each successful link or unlink logs the user id and the Asset ID
- `GET /api/v1/assessments/{asset_id}` - latest-season inspection details and safe crew-photo
  metadata. Residents can view their linked assets; administrators can view
  any asset. Missing and unauthorized assets both return 404
- `GET /api/v1/assessments/photos/{photo_id}` - protected crew-photo file. Uses the same
  property access rules and does not reveal whether an unauthorized photo exists
- `GET /api/v1/me/profile` - any signed-in role (401 otherwise). The signed-in user's own
  account: `id`, `full_name`, `email`, `phone`, `role`, `email_verified`, `created_at`,
  `last_login_at` and sorted `asset_ids` (empty for admins). Never the password hash
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
  details, role, status, `email_verified`, `last_login_at` and sorted `asset_ids`. Never the
  password hash
- `PATCH /api/v1/admin/users/{user_id}` - administrators only. Changes `full_name`, `email`,
  `phone` (`null` clears it), `role` (`resident` or `admin`) and `is_active`. Only fields in
  the body change; an empty body is a 422
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
  | 409 | `cannot_change_own_access` | An admin changes their own role or turns themselves off |
  | 409 | `last_admin` | The change would leave no active admin |
  | 409 | `unlink_assets_first` | A resident with linked assets is made an admin |
  | 404 | `property_not_found` | The asset ID is not in the inspection data |
  | 409 | `assets_residents_only` | Links managed for a user who is not a resident |

  Each change writes one log line with the admin id, the user id and the changed field names
  (never the values).

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

- `GET /api/v1/admin/settings/messages` - administrators only. `{"items": [...]}` with every
  editable message
- `GET /api/v1/admin/settings/messages/{key}` - administrators only. One message
- `PUT /api/v1/admin/settings/messages/{key}` - administrators only. Body `{message}`. Saves the
  text and returns the message
- `DELETE /api/v1/admin/settings/messages/{key}` - administrators only. Resets the message to
  its default and returns it. Safe to repeat

  All four return 401 signed out and 403 for residents. A message has `key`, `label`,
  `description`, `message`, `default_message`, `is_default`, `min_length`, `max_length`,
  `max_lines`, `updated_at` and `updated_by_name` (null if that admin was removed). Errors:

  | Status | Code | Field | When |
  |---|---|---|---|
  | 404 | `message_not_found` | | No message has this key |
  | 422 | `invalid_message` | `message` | The text breaks a rule (see "Editable messages") |
  | 422 | | | Body is not `{message: string}` (standard validation error) |

Protect an endpoint by adding a `user: CurrentUser` parameter (from `app/api/deps.py`).
The frontend must send requests with `credentials: "include"` so the cookie is sent.
Allowed browser origins come from `CORS_ORIGINS` in `.env`.

## Editable messages

Admins can reword messages the portal shows to people, under Settings in the portal. The
defaults and limits live in `app/services/editable_messages.py`. Edited text is stored in
`app_settings`, and with no saved row the default applies.

Text rules (`clean_message` in `app/schemas/validators.py`, mirrored in the frontend's
`features/settings/utils/message.ts`, so change both together):

- Spaces at both ends of the message and of each line are trimmed. Runs of spaces become one.
- Line breaks are kept. Three or more in a row become two.
- Control characters (anything below U+0020 except the line break) are removed.
- More than `max_lines` lines is rejected. Blank lines count.
- The length after cleaning must be between `min_length` and `max_length`.
- Plain text only. `<` and `>` are ordinary characters, so every place that shows a message must
  render it as plain text.

### Add another editable message

1. Add one entry to `EDITABLE_MESSAGES` in `app/services/editable_messages.py` with its key,
   label, description, default, and limits.
2. Where the message is shown, call `message_text(db, "<key>")` instead of writing the text in code.
3. If it needs a custom preview, add one entry to `frontend/src/features/settings/components/previews.tsx`.
   Otherwise it gets the plain preview.
4. Run the registry test (`uv run pytest tests/test_editable_messages_registry.py`). It checks
   the new entry is valid.

No new endpoint, table, migration, or page is needed.

## Quality checks

Tests marked `db` are skipped automatically when Postgres is not running.

```powershell
pytest
ruff check .
ruff format --check .
```

Create local settings in `.env`. Never commit `.env` or credentials.
