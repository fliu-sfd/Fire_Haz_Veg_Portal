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
    auth/                       Sign-in, sign-up, account hooks and access helpers
    system/                     Health check example
  hooks/                        Generic hooks (useDebouncedValue, useLocalStorage)
  lib/api/                      Shared fetch client, ApiError, retry policy
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

The tests cover the API client, the admin users API and its response parsing, the retry policy, URL params, column visibility, formatting, and role-based navigation. `tests/setup/resolve-aliases.mjs` lets `node --test` load sources that import through `@/`. `npm start` serves a completed production build.

## Starter scope

Included: responsive shared layout, navigation, placeholder homeowner/staff pages, common UI components, loading/error/404 states, typed API client, and backend connection example.

Resident signup and sign-in are connected to FastAPI. Signup verifies the submitted property address and Asset ID against imported assessment data before creating an account-to-asset link. Still to implement as separate tasks: QR access, assessment-detail APIs, homeowner photo workflows, remote reviews, and property history.

At setup, npm audit reported five high-severity findings in the ESLint development dependency chain (`braces` through `micromatch`/`fast-glob`). Its suggested fix downgrades Next.js ESLint configuration to version 14; that incompatible downgrade was not applied. Review patched upstream releases as they become available.

References: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [environment variables](https://nextjs.org/docs/app/guides/environment-variables).
