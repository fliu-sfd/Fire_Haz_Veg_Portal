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

### Backend, November 19, 2026 (#46)

Run on branch `dev` at the merge of pull request #44, with `NAOS_GDB_PATH` set to the City's
sample file (`data/Community_NAOS_Inspections.gdb.zip`), so no test was skipped.

| Check | Result |
| --- | --- |
| Backend tests (`pytest`, PostgreSQL 16 with PostGIS) | 689 passed, 0 skipped, 0 failed |
| Backend style (`ruff check`) | no problems |
| Backend formatting (`ruff format --check`) | no changes needed |
| Line coverage (`uv run --with pytest-cov pytest --cov=app`) | 99% (29 of 2,379 lines not run) |

The lines not run are mostly the command-line entry points, the production-only settings
checks, and error branches for damaged City files.

This run added 11 tests: two requests writing the same row at once (`test_write_conflicts.py`),
and in `test_submissions_api.py`, editing or reviewing evidence that a newer submission has
replaced and photo files that cannot be saved or deleted.

### Frontend, November 20, 2026 (#88)

Verified by Hruday Pabbisetty on `feature/88-frontend-tests`, based on `dev` commit
`2809d39d723293ed913266ce9cd0694b8217c320`. The tested frontend files are in commit
`0108c8096397c95c3d152fd84ba25a1eb5ca8600`. Environment: Windows, Node.js 24.12.0,
npm 11.6.2. Commands ran from `frontend/` after installing the locked dependencies.

| Check | Result |
| --- | --- |
| Dependency installation (`npm ci --no-audit --no-fund`) | passed |
| Frontend logic tests (`npm test`) | 510 passed, 0 failed, 0 skipped |
| ESLint (`npm run lint`) | no errors or warnings |
| TypeScript (`npm run typecheck`: `next typegen && tsc --noEmit`) | no errors |
| Production build (`npm run build`) | passed on retry, with a Next.js security warning |
| Dependency audit (`npm audit --json`) | 9 vulnerabilities: 8 moderate, 1 high; exit code 1 |

All 505 existing tests passed before adding five regression tests. The new tests cover the
default 2,000-character limit for every quick reason, trailing whitespace at that limit,
editing or removing an inserted reason, sending quick reasons and custom text together,
and approving with a blank optional comment. The review request tests use mocked fetch
responses and check the decision, evidence version, and comment sent to the API.

Next.js stopped the build at its security reminder. The documented retry completed
with the same dependencies and configuration, and kept the warning. Next.js 16.4.2 has
[published security advisories](https://github.com/vercel/next.js/releases/tag/v16.4.5).
The dependency findings remain open; upgrade the affected packages and rerun validation
before deployment. No dependency versions were changed for this task.

All requested frontend checks passed without application code changes. This run checked
frontend logic, static checks, and the build; it did not rerun backend tests or browser
system tests. Those results keep their original dates in this section.

### Frontend and system tests, November 4, 2026

Run on November 4, 2026 on branch `dev` at the merge of pull request #39.

| Check | Result |
| --- | --- |
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
- Load and performance testing.
- A formal accessibility audit.
- Email or text notifications. The portal does not send them.
- Printing a QR code door tag. QR codes are out of scope for this portal.
