# Vegetation Assessment Frontend

Reusable frontend boilerplate for Team 4's capstone. Built with Next.js App Router, React, TypeScript, and Tailwind CSS. FastAPI remains a separate service.

## Run locally

Use Node.js 24 LTS (`nvm use` if you have nvm) and npm.

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The UI runs without a backend; the connection check reports an error until FastAPI is available. The committed lockfile keeps dependency versions consistent across teammates.

## Structure

```text
src/
  app/                          Next.js routes and layouts
    page.tsx                    Overview and connection example
    homeowner/page.tsx          Homeowner portal
    dashboard/page.tsx          Staff portal
    dashboard/users/            Admin users list (page.tsx + client wiring)
    dashboard/hazards/          Admin hazard map (page.tsx + client wiring)
    loading.tsx                 Shared loading state
    error.tsx                   Shared error boundary
    not-found.tsx               404 page
  components/
    layout/                     Public header, signed-in shell, sidebar
      nav-config.ts             Grouped, role-based sidebar navigation
    providers/swr-provider.tsx  SWR defaults for the signed-in area
    ui/                         Custom Button/Card/fields plus shadcn/ui primitives
  features/
    admin/                      Admin pages
      api.ts, types.ts          listUsers and response parsing
      utils/                    Pure helpers: URL params, columns, formatting, errors
      hooks/                    useUsers, useUsersQueryState, useColumnVisibility, useUsersPage
      components/               Users table, toolbar, column menu, states
    hazards/                    Admin hazard map
      api.ts, types.ts          listHazards, getHazardFilters and response parsing
      utils/                    URL params, labels and colors, map bounds, tile config, errors
      hooks/                    useHazards, useHazardFilters, useHazardQueryState, useHazardsPage
      components/               Leaflet map, markers, popup, filter bar, legend, states
    auth/                       Sign-in, sign-up, account hooks and access helpers
    system/                     Health check example
  hooks/                        Generic hooks (useDebouncedValue, useLocalStorage)
  lib/api/                      Shared fetch client, ApiError, retry policy, response guards
  lib/utils.ts                  cn() class name helper
tests/                          node --test suites (tests/setup resolves the @/ alias)
```

## Team conventions

- Add routes under `src/app/<route>/page.tsx`. Pages are Server Components by default; add `"use client"` only when you need state, effects, events, or browser APIs.
- Put feature-specific UI and API services in `src/features/<feature>/`. For example, `features/assessments/api.ts` and `features/assessments/components/`.
- Put reusable UI in `src/components/ui/`. Import source files using `@/`, for example `@/components/ui/button`.
- Call the backend through `apiRequest` rather than copying fetch setup into pages. Agree endpoint paths, request bodies, and response shapes with the backend team before adding real services.
- TypeScript generics do not validate API responses at runtime. Validate external data in feature services, as the health example does.
- Keep `.env.local` out of source control. `NEXT_PUBLIC_` values are visible in the browser and bundled at build time; they must not contain secrets. Restart development or rebuild after changing the API URL.

## Frontend data-fetching conventions

New features should follow the same layers as `features/admin`:

- **API functions** (`features/<feature>/api.ts`) call `apiRequest`, build query strings, validate responses at runtime and convert snake_case to camelCase. They do not import React or SWR.
- **Pure helpers** (`features/<feature>/utils/`) hold parsing, defaults and formatting. They have no React, DOM or network code, so `node --test` can cover them.
- **Data hooks** (`features/<feature>/hooks/use-*.ts`) wrap `useSWR` with a stable key built from normalized params and map errors to friendly messages. A page-level hook composes them into one view model.
- **Components** are presentational: they take data and callbacks as props and never call `apiRequest`, `useSWR`, `useRouter` or `useSearchParams`, check roles, or parse data.
- **Route files** stay thin and wire the page hook to components.

SWR configuration:

- **Global** (`components/providers/swr-provider.tsx`, mounted around the signed-in shell only): a cache scoped to the shell, `revalidateOnFocus: false`, a 5 s `dedupingInterval`, and an `onErrorRetry` that retries only network and 5xx errors (up to 3 times, with backoff). 401, 403 and 422 never retry.
- **Per hook**: the fetcher, and options such as `keepPreviousData: true` on the users list so rows stay visible while the next page loads.
- **Sign out** clears every cached response, and leaving the signed-in area unmounts the cache, so the next person on the browser never sees the previous user's data. The cache is never persisted.
- In development, React StrictMode mounts the provider twice, so the first `/auth/me` on a page can be requested twice. Production builds make one request.

## Hazard map

`/dashboard/hazards` shows the latest season's hazards from `GET /admin/hazards`, one marker per asset. Notes for anyone changing it:

- **Client-only map.** Leaflet needs `window`, so `hazard-map-loader.tsx` loads the map with `next/dynamic` and `ssr: false`. Next only allows that inside a Client Component. The loader shows a skeleton of the same size.
- **Markers.** Markers are `L.divIcon`s styled in `hazard-map.module.css`, one shared icon per state. Leaflet's default marker images break under bundlers. Each state has its own color and glyph, so color is never the only cue.
- **Popups.** Popup content is React (`HazardPopupContent`). Never build popup HTML from strings: comments are free text from the field.
- **Filters.** Filters live in the URL (`state` and `crew` repeat, plus `property_type`) and the same params go to the API. Defaults are left out.
  - The map refits only when results for new filters arrive (`fitKey`), never on a background revalidation.
  - The property type control hides while only one type exists.
- **Keyboard.** Leaflet opens a popup on Enter. The marker handler adds Space, and the map wrapper closes popups on Escape and returns focus to the marker. Zoom and "Fit to results" are React buttons placed before the map, so Tab reaches them ahead of the markers.
- **Basemap.** Tiles come from `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION` (see `utils/map-config.ts`) and default to OpenStreetMap for development. Its usage policy discourages heavy production use, so pick a production provider before launch. Never put an API key in a `NEXT_PUBLIC_` variable.

## shadcn/ui

`components.json` configures shadcn/ui (new-york style, Tailwind v4, lucide icons). Added so far: `table`, `input`, `select`, `badge`, `skeleton`, `dropdown-menu`, `sheet`, `tooltip` and `separator`.

- `button.tsx` and `card.tsx` in `components/ui/` are the portal's own components and are not shadcn. Do not run `shadcn add button` or `shadcn add card` without `--path`, or the CLI will offer to overwrite them.
- shadcn's semantic tokens (`primary`, `muted`, `border`, ...) map onto the City palette in `globals.css`. Their default border color applies only to `[data-slot]` elements, so existing pages keep Tailwind's defaults.
- `dark:` is class-based and the portal sets no `.dark` class, so shadcn's dark styles stay off even when the OS is in dark mode.
- shadcn CLI 4.22 adds an unrelated `cn` npm package and imports `cn` from it. After adding a component, remove that package and import `cn` from `@/lib/utils`.

## FastAPI connection

Set `NEXT_PUBLIC_API_URL` in `.env.local` to your backend base URL, defaulting to `http://localhost:8000/api/v1`. Service paths are appended to that base URL.

The example connection button calls the repository’s existing `GET /api/v1/health` endpoint and expects `{ "status": "ok" }`. The backend on `dev` does not yet configure CORS; the backend team must add middleware in `backend/app/main.py` for direct browser requests. Example configuration to add to the existing application inside `create_app()`:

```python
from fastapi.middleware.cors import CORSMiddleware

# Inside create_app(), after constructing application:
application.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)
```

The browser calls FastAPI directly, so configure its CORS origins for each frontend environment. If Next.js starts on a different port, adjust the allowed origin. The shared API client sends credentials so the HttpOnly authentication cookie works across the local frontend and backend origins.

Example service patterns (paths and types must match your agreed backend contract):

```ts
import { apiRequest, ApiError } from "@/lib/api/client";

type Assessment = { id: string; address: string };

export function createAssessment(address: string) {
  return apiRequest<Assessment>("/assessments", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

export function uploadPhoto(assessmentId: string, photo: File) {
  const body = new FormData();
  body.append("photo", photo);
  return apiRequest<void>(`/assessments/${encodeURIComponent(assessmentId)}/photos`, {
    method: "POST",
    body,
  }); // This example expects HTTP 204.
}

// In a submit handler, catch ApiError for error.status and error.detail.
// Network failures and timeouts are also thrown; show a friendly retry message.
```

The client supplies a 10-second timeout when no signal is provided. A supplied signal replaces that default, so combine cancellation and timeout with `AbortSignal.any` if you need both. Do not manually set Content-Type for FormData uploads.

## Checks and production

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Development and builds use Webpack with Tailwind’s PostCSS integration.

The tests cover the API client, the admin users and hazards APIs and their response parsing, hazard map helpers, the retry policy, URL params, column visibility, formatting, and role-based navigation. `tests/setup/resolve-aliases.mjs` lets `node --test` load sources that import through `@/`. `npm start` serves a completed production build.

## Starter scope

Included: responsive shared layout, navigation, placeholder homeowner/staff pages, common UI components, loading/error/404 states, typed API client, and backend connection example.

Resident signup and sign-in are connected to FastAPI. Signup uses the door tag's Asset ID; the address is optional and omitted when blank. `/homeowner` loads linked properties from `GET /api/v1/residents/me/properties`, including their latest inspection result and date. This requires the backend property-link changes from `feature/42-property-link` until those changes are merged into `dev`. Still to implement as separate tasks: QR access, assessment-detail APIs, homeowner photo workflows, remote reviews, and property history.

## Homeowner acceptance check with the real stack

The mocked-fetch tests check the API client contract; completion also requires this check against the real API and database.

1. Use a backend containing `feature/42-property-link`. Get `Community_NAOS_Inspections.gdb.zip` from Tejas and place it in the repository's `data/` directory. Do not commit the data file.
2. Start Docker, then run `docker compose up --build` from the repository root. Wait for the import to finish; `docker compose logs api` should report `points: inserted 7040` on the first import. An already imported database may skip the import.
3. Find a real ID with `docker compose exec db psql -U fhv -d fire_hazard_veg -c "select distinct asset_id from assessments limit 5;"`.
4. Run `npm run dev` here and open `http://localhost:3000`. Use the keyboard to complete homeowner signup with a fresh email, that Asset ID, and no address. Confirm that `/homeowner` shows the linked property, its latest result, and inspection date. Compare the card with the API response in the browser's Network panel. Repeat with an address filled in.
5. Sign out and try another fresh email with a made-up Asset ID. Confirm the message is "We could not find that Asset ID. Check the number on your door tag." Verify that the failed signup created no user with `docker compose exec db psql -U fhv -d fire_hazard_veg -c "select count(*) from users where email = 'the-failed-signup-email@example.com';"`.
6. Confirm sign-out returns to `/sign-in`, opening `/homeowner` while signed out redirects there, and a staff account opening `/homeowner` goes to `/dashboard`.
7. Check loading with browser network throttling and the error/retry state by stopping and restarting the API after the account has loaded. Use development database fixtures for a resident with no links and a linked property with no assessment. Confirm "No properties are linked to this account yet." and "Not inspected yet" respectively. These fixtures supplement the imported-data check above.
8. Run `npm run lint`, `npm run typecheck`, and `npm test`. All must pass. Check that every signup field has a label and that the form and retry button work with the keyboard.

At setup, npm audit reported five high-severity findings in the ESLint development dependency chain (`braces` through `micromatch`/`fast-glob`). Its suggested fix downgrades Next.js ESLint configuration to version 14; that incompatible downgrade was not applied. Review patched upstream releases as they become available.

References: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [environment variables](https://nextjs.org/docs/app/guides/environment-variables).
