# Authentication Backend Handoff

## Purpose

This document defines the backend work required to connect the current homeowner registration, staff registration, and shared sign-in interfaces to the FastAPI application.

The backend currently exposes only:

- `GET /`
- `GET /api/v1/health`

The authentication forms are complete but intentionally do not send or store data yet.

## Frontend routes already available

| Route | Audience | Notes |
| --- | --- | --- |
| `/sign-up/homeowner` | Homeowners | Publicly linked registration page. |
| `/sign-up/staff` | Fire department personnel | Not publicly linked. A direct URL is not a security boundary. |
| `/sign-in` | Homeowners and staff | One shared sign-in page for every role. |
| `/homeowner` | Authenticated homeowners | Intended post-login destination for the `homeowner` role. |
| `/dashboard` | Authenticated staff | Intended post-login destination for `firefighter` and `admin` roles. |

## Agreed account rules

- There are three roles: `homeowner`, `firefighter`, and `admin`.
- Homeowner registration assigns the `homeowner` role automatically. The client must not be allowed to choose it or submit another role.
- Staff registration requires a City work email and a department-issued access code.
- A role selected in the staff form is only a request. The backend must derive or authorize the final role from the access code or an administrator-controlled record. A user must never be able to grant themselves `admin` access.
- A homeowner account must be linked to a valid Property ID from an existing assessment or invitation record.
- Homeowners and staff use the same login endpoint. The authenticated role determines which frontend area they can access.
- Password confirmation is checked in the browser and must not be persisted or returned by the API.

## Frontend-to-API field mapping

The form currently uses camel-case field names. The proposed FastAPI contract uses snake case.

| Frontend field | API field | Used by | Backend requirement |
| --- | --- | --- | --- |
| `fullName` | `full_name` | Both registrations | Trim surrounding whitespace; 2–100 characters. |
| `email` | `email` | Registration and login | Validate as an email, normalize for comparison, and enforce a unique account email. |
| `propertyId` | `property_id` | Homeowner registration | Match an existing property assessment or invitation. Do not accept an arbitrary new property from registration. |
| `stationCrew` | `station_crew` | Staff registration | Required text; 1–100 characters. |
| `role` | `requested_role` | Staff registration | Enum: `firefighter` or `admin`. Validate against the authority assigned to the access code. |
| `accessCode` | `access_code` | Staff registration | Validate, expire, revoke, and rate-limit it. Never store the raw code in logs or the database. |
| `password` | `password` | Registration and login | Require at least 8 characters and cap the accepted length. Hash before storage. |
| `passwordConfirmation` | _Not sent_ | Both registrations | Frontend-only field. Never store it. |
| `rememberSession` | `remember_me` | Login | Boolean; controls session duration, not authorization. |

## Required API contract

All paths below are relative to the existing `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:8000/api/v1`.

### 1. Register a homeowner

`POST /auth/register/homeowner`

Request:

```json
{
  "full_name": "Alex Morgan",
  "email": "alex@example.com",
  "property_id": "PROP-001245",
  "password": "user supplied password"
}
```

Required behavior:

1. Validate and normalize the request.
2. Confirm the Property ID exists and is eligible for registration.
3. Prevent the same account/property link from being created twice.
4. Create the user with the role `homeowner`; do not accept a role from the request.
5. Hash the password before writing the user record.
6. Link the user to the property in the same database transaction.
7. Return `201 Created` without returning a password, password hash, or internal assessment details.

Example response:

```json
{
  "user": {
    "id": "4ced8aad-6f14-4ef8-b2c0-43ac9cde55fd",
    "full_name": "Alex Morgan",
    "email": "alex@example.com",
    "role": "homeowner"
  },
  "property_id": "PROP-001245"
}
```

### 2. Register a staff member

`POST /auth/register/staff`

Request:

```json
{
  "full_name": "Jordan Lee",
  "email": "jlee@scottsdaleaz.gov",
  "station_crew": "Station 2 / B Crew",
  "requested_role": "firefighter",
  "access_code": "department issued value",
  "password": "user supplied password"
}
```

Required behavior:

1. Validate the work-email rule using a configurable allowlist; do not hard-code it throughout the codebase.
2. Validate the access code using a constant-time comparison where applicable.
3. Confirm the code is active, unexpired, not revoked, and has uses remaining.
4. Determine the permitted role from backend-controlled data. Reject a role mismatch, especially an unauthorized `admin` request.
5. Create the staff account and consume or record the access-code use in one transaction.
6. Store the station/crew separately from authentication credentials.
7. Return `201 Created` without returning the access code or password data.

Example response:

```json
{
  "user": {
    "id": "dfe711c0-620c-4307-a8cc-10e54bc5f025",
    "full_name": "Jordan Lee",
    "email": "jlee@scottsdaleaz.gov",
    "role": "firefighter"
  },
  "station_crew": "Station 2 / B Crew"
}
```

### 3. Sign in

`POST /auth/login`

Request:

```json
{
  "email": "alex@example.com",
  "password": "user supplied password",
  "remember_me": false
}
```

Required behavior:

1. Compare normalized email addresses consistently.
2. Verify the password hash even when the email is unknown by using a dummy hash, reducing account-enumeration timing differences.
3. Return the same generic `401` response for an unknown email, incorrect password, or inactive account.
4. Create a new authenticated session and rotate any previous pre-authentication session identifier.
5. Return the safe user object. The frontend will route `homeowner` to `/homeowner` and staff roles to `/dashboard`.
6. Use `remember_me` only to choose an approved short or extended expiration period.

Example response:

```json
{
  "user": {
    "id": "4ced8aad-6f14-4ef8-b2c0-43ac9cde55fd",
    "full_name": "Alex Morgan",
    "email": "alex@example.com",
    "role": "homeowner"
  }
}
```

Recommended invalid-credentials response:

```json
{
  "detail": {
    "code": "invalid_credentials",
    "message": "Email or password is incorrect."
  }
}
```

### 4. Get the current account

`GET /auth/me`

- Requires an authenticated session.
- Returns the same safe user representation used by login.
- May include `property_ids` for a homeowner or `station_crew` for staff.
- Returns `401 Unauthorized` when the session is missing, expired, revoked, or invalid.

### 5. Sign out

`POST /auth/logout`

- Revoke/delete the server-side session or invalidate the refresh token.
- Clear the authentication cookie.
- Return `204 No Content`.
- The operation should be safe to repeat.

## Recommended data model

The exact database library is still a backend-team decision, but authentication needs persistent storage and migrations.

### `users`

- `id` — UUID primary key
- `email` — original/display form
- `normalized_email` — unique indexed comparison value
- `full_name`
- `password_hash`
- `role` — enum: `homeowner`, `firefighter`, `admin`
- `is_active`
- `created_at`
- `updated_at`
- `last_login_at` — nullable

### `property_user_links`

- `user_id` — foreign key to `users`
- `property_id` — foreign key to the authoritative property/assessment record
- `created_at`
- Unique constraint on the appropriate user/property pair

A link table is preferred over putting one `property_id` directly on `users`, because a future homeowner may need access to more than one property.

### `staff_profiles`

- `user_id` — unique foreign key to `users`
- `station_crew`
- Optional approval metadata such as `approved_by` and `approved_at`

### `staff_access_codes`

- `id`
- `code_digest` — never store the raw code
- `allowed_role`
- `expires_at`
- `max_uses`
- `use_count`
- `revoked_at` — nullable
- `created_by`
- `created_at`

### `sessions`

If opaque server-side sessions are used:

- Store only a hash/digest of the session identifier.
- Include `user_id`, creation/expiration timestamps, revocation timestamp, and last-used metadata.
- Support revocation at logout and when an account is disabled.

## Session and security requirements

For this browser-based portal, the recommended MVP is an opaque server-side session in an `HttpOnly` cookie. If JWTs are selected instead, do not store access or refresh tokens in `localStorage` or `sessionStorage`; use an `HttpOnly` cookie or a backend-for-frontend pattern.

- Use Argon2id through a maintained password-hashing library. Never encrypt passwords or hash them with a fast general-purpose hash such as SHA-256.
- Use HTTPS for every production authentication and authenticated request.
- Production cookies should use `Secure`, `HttpOnly`, `Path=/`, and an explicit `SameSite=Lax` or stricter policy. A `__Host-` cookie name is preferred when deployment topology permits it.
- Add CSRF protection for state-changing requests when cookie authentication is used. `SameSite` is defense in depth, not a complete CSRF strategy.
- Rate-limit login, both registration endpoints, and staff access-code attempts.
- Enforce authorization on every protected backend route. Hiding `/sign-up/staff` or `/dashboard` in the UI is not authorization.
- Never trust user IDs, roles, property IDs, or ownership claims sent by the browser without checking the authenticated account and database relationship.
- Do not write passwords, raw access codes, session identifiers, or full request bodies to application logs.
- Audit successful and failed staff registrations, role assignment changes, access-code use, login, logout, and administrator actions.
- Keep authentication secrets in environment variables or a secrets manager; never commit them.

## CORS and frontend integration

Local frontend and backend origins differ:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

If cookies are used, configure FastAPI `CORSMiddleware` with:

- An explicit frontend-origin allowlist, including `http://localhost:3000` for development
- `allow_credentials=True`
- Explicit allowed methods and headers
- No wildcard origin when credentials are enabled

The frontend API client must also be updated during integration to send `credentials: "include"`. That frontend change is not part of the current UI-only implementation.

## Error format and status codes

Use FastAPI's normal `422` response for schema-validation failures. For business-rule failures, use a consistent object:

```json
{
  "detail": {
    "code": "property_not_found",
    "message": "We could not match that Property ID.",
    "field": "property_id"
  }
}
```

Suggested status codes:

| Status | Use |
| --- | --- |
| `201` | Account created. |
| `204` | Logout completed. |
| `400` | Invalid, expired, revoked, consumed, or role-mismatched staff access code. |
| `401` | Invalid login or invalid/expired session. |
| `403` | Authenticated account lacks permission for the requested resource. |
| `404` | Property ID cannot be matched, if the team chooses to expose this distinction. |
| `409` | Email already registered or account/property link already exists. |
| `422` | Request does not satisfy the Pydantic schema. |
| `429` | Rate limit exceeded. |

Suggested stable error codes include:

- `email_already_registered`
- `property_not_found`
- `property_already_linked`
- `invalid_access_code`
- `access_code_role_mismatch`
- `invalid_credentials`
- `account_inactive`
- `not_authenticated`
- `permission_denied`
- `rate_limit_exceeded`

## Suggested FastAPI organization

Keep the existing `/api/v1` router and add authentication as a feature rather than putting everything in `main.py`:

```text
backend/app/
├── api/routes/auth.py
├── core/security.py
├── models/
│   ├── user.py
│   ├── staff_profile.py
│   └── session.py
├── schemas/auth.py
├── services/auth.py
└── repositories/
```

This is a suggested separation, not a required directory layout. Route handlers should validate HTTP input and delegate account creation, credential verification, access-code checks, and transactions to service/repository code.

## Minimum backend test coverage

- Homeowner registration succeeds with a valid unclaimed Property ID.
- Homeowner role cannot be overridden by request data.
- Invalid or already-linked Property IDs are rejected.
- Duplicate normalized emails are rejected, including case variants.
- Staff registration requires an approved work-email domain.
- Invalid, expired, revoked, or consumed access codes are rejected.
- A firefighter code cannot create an administrator account.
- Access-code use and staff creation are atomic under concurrent requests.
- Passwords and access codes are never stored as plain text.
- Valid credentials create a session; invalid credentials return the same generic `401` shape.
- Protected routes reject missing, expired, revoked, and wrong-role sessions.
- Homeowners cannot access staff data or another homeowner's property.
- Logout invalidates the session and clears the cookie.
- Login and access-code attempts are rate-limited.
- CORS accepts the configured frontend origin and rejects unapproved origins.

## Decisions still needed from the team

These decisions are not represented in the current UI and should be agreed before production implementation:

- Database and migration tooling
- Server-side opaque sessions versus a cookie-based JWT strategy
- Short and remembered-session expiration durations
- Exact approved staff email domains
- Who creates, distributes, revokes, and audits staff access codes
- Whether staff accounts activate immediately or require administrator approval
- Whether a Property ID can be linked to multiple homeowner accounts
- Email verification, password reset, and account-recovery workflows
- Production frontend/backend origins and cookie policy

## Definition of done

Backend authentication is ready for frontend integration when:

1. All five endpoints are implemented under `/api/v1/auth` and appear in FastAPI OpenAPI documentation.
2. Database migrations can create every required table and constraint from a clean database.
3. The security, authorization, CORS, error-format, and transaction requirements above are covered by automated tests.
4. `.env.example` documents every new non-secret configuration key without containing real secrets.
5. A frontend developer can register both account types, sign in, restore a session with `/auth/me`, and sign out using the documented contract.

## Security references

- [FastAPI: OAuth2, JWT, and password hashing](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [FastAPI: CORS](https://fastapi.tiangolo.com/tutorial/cors/)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
