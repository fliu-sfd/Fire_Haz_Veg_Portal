# Test plan

Task #49 · Test plan and system test scripts · Author: Tejas Shah · Updated November 4, 2026

This plan says what is tested in the Fire Hazardous Vegetation Portal, how each kind of test
is run, and what the results were the last time everything was run. The step-by-step system
tests are in [system-test-scripts.md](system-test-scripts.md).

## 1. What is tested

| Area | Tested by |
| --- | --- |
| Accounts: sign-up, sign-in, sign-out, profile, password | backend API tests, frontend logic tests, ST-01 to ST-03 |
| Homeowner properties: linking an Asset ID, property cards, evidence state line (#44) | backend API tests, frontend logic tests, ST-04, ST-05, ST-11 |
| Assessment page and crew photos | backend API tests, ST-06 |
| Homeowner completion photos: upload, validation, edit, history | backend API tests, ST-07, ST-08 |
| Department review: inbox, approve, send back, comment rules | backend API tests, frontend logic tests, ST-09 to ST-11 |
| Hazard map state (Open, Pending review, Closed) and its agreement with the property card | backend API tests, ST-05, ST-07, ST-11 |
| Full assessment requests | backend API tests, ST-12 |
| Admin user list and editing | backend API tests, frontend logic tests, ST-13 |
| NAOS import and database setup | backend import, reader and CLI tests |

Not tested: see [section 7](#7-not-covered).

## 2. Test levels

**White box (tests written with the code).** Developers add these in the same pull request as
the code they cover.

| Level | Tool | Where | What it checks |
| --- | --- | --- | --- |
| Backend unit and API tests | pytest | `backend/tests/test_*.py` | Services, validation, models, importers, CLI tools, and every API route against a real PostgreSQL/PostGIS test database |
| Frontend logic tests | Node test runner (`node --test`) | `frontend/tests/*.test.mjs` | API response parsing, display rules, query parameters, form rules |
| Static checks | ruff, ESLint, TypeScript | backend and frontend | Style problems and type errors |

**Black box (tests against the specification).** The system test scripts in
[system-test-scripts.md](system-test-scripts.md) use only the browser, like a real user, and
check what the portal shows. They do not look at code or the database. The written scripts
are also available as an automated runner, `run_system_tests.py`, that performs the same
steps in a real browser.

## 3. How to run

Start the database from the repository root (it also creates the test database):

```bash
docker compose up -d db
```

Backend (from `backend/`):

```bash
uv sync --extra dev
uv run pytest            # all backend tests
uv run pytest tests/test_property_review_state.py     # one file
uv run ruff check .      # style checks
```

Frontend (from `frontend/`):

```bash
npm ci
npm test                 # frontend logic tests
npm run lint             # ESLint
npm run typecheck        # TypeScript
```

System tests: follow the setup at the top of [system-test-scripts.md](system-test-scripts.md),
then run the scripts by hand or run `python docs/testing/run_system_tests.py`.

Notes for a clean run:

- The backend tests that need PostgreSQL are skipped, not failed, when the database is not
  running. A run with a large "skipped" count means the database was off.
- The tests expect the database time zone to be UTC, which is the default in the project's
  Docker image. A local PostgreSQL set to another time zone makes 11 tests fail on time
  values. Set `ALTER DATABASE <name> SET timezone TO 'UTC';` on both databases if that happens.
- Four tests (3 in `test_geodatabase_reader.py`, 1 in `test_naos_import.py`) are skipped unless
  `NAOS_GDB_PATH` points to a real City inspection file. The file is not in the repository.

## 4. Results of the last full run

Run on November 4, 2026 on branch `dev` at the merge of pull request #39.

| Check | Result |
| --- | --- |
| Backend tests (`pytest`, PostgreSQL 16 with PostGIS) | 674 passed, 4 skipped (no City sample file), 0 failed |
| Backend style (`ruff check`) | no problems |
| Frontend logic tests (`npm test`) | 500 passed, 0 failed |
| ESLint (`npm run lint`) | no problems |
| TypeScript (`npm run typecheck`) | no errors |
| System tests, automated runner, Chromium, desktop size | 41 of 41 steps passed (scripts ST-01 to ST-13) |

The system tests ran against made-up data from `system-test-seed.sql`, not City data.

## 5. Test data

- Backend tests build their own rows in a separate test database and clean up after themselves.
- System tests use `system-test-seed.sql`: four invented properties (Asset IDs 9000001 to
  9000004) that cover one property with two issues, one with an issue and a clean point, one
  with no issues, and one that is never linked to the test account.
- Test accounts are created during the scripts. Use only made-up names and example.com
  emails. Do not put sponsor data or real resident details in the repository.

## 6. Pass and fail rules

- A change is ready for review when the backend and frontend suites pass with the database
  running, ruff, ESLint and TypeScript are clean, and any new behaviour has a new test.
- A release candidate additionally needs every system test step to pass, with the result and
  date written in the scripts document.
- A failing step is logged as a bug in Taiga with the script ID and step number, what was
  expected and what was seen. It is fixed on a branch from `dev`, and the failed script is
  run again.

## 7. Not covered

These have not been tested and should not be reported as passing:

- Real phones and tablets. System tests ran in desktop Chromium only; other browsers were
  not run.
- Import of the City's real NAOS file (the four skipped tests above).
- Load and performance testing.
- A formal accessibility audit.
- Email or text notifications. The portal does not send them.
- Printing a QR code door tag. QR codes are out of scope for this portal.
