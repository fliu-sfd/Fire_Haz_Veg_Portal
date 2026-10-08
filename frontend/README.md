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
    homeowner/page.tsx          Homeowner workflow starter
    dashboard/page.tsx          Staff workflow starter
    loading.tsx                 Shared loading state
    error.tsx                   Shared error boundary
    not-found.tsx               404 page
  components/
    layout/site-header.tsx      Responsive shared navigation
    ui/                         Reusable Button and Card
  features/
    system/api.ts               Typed health endpoint service
    system/components/          Interactive connection example
  lib/api/client.ts             Shared fetch client and ApiError
tests/api-client.test.mjs       API client tests
```

## Team conventions

- Add routes under `src/app/<route>/page.tsx`. Pages are Server Components by default; add `"use client"` only when you need state, effects, events, or browser APIs.
- Put feature-specific UI and API services in `src/features/<feature>/`. For example, `features/assessments/api.ts` and `features/assessments/components/`.
- Put reusable UI in `src/components/ui/`. Import source files using `@/`, for example `@/components/ui/button`.
- Call the backend through `apiRequest` rather than copying fetch setup into pages. Agree endpoint paths, request bodies, and response shapes with the backend team before adding real services.
- TypeScript generics do not validate API responses at runtime. Validate external data in feature services, as the health example does.
- Keep `.env.local` out of source control. `NEXT_PUBLIC_` values are visible in the browser and bundled at build time; they must not contain secrets. Restart development or rebuild after changing the API URL.

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

The browser calls FastAPI directly, so configure its CORS origins for each frontend environment. If Next.js starts on a different port, adjust the allowed origin. Authentication is intentionally pending agreement with the city; the staff page is public and contains no real data. Implement authorization in FastAPI as well as frontend access controls before connecting real property records. Cookie authentication will also require explicit credentials and CORS configuration.

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

The API tests cover JSON requests, multipart uploads, validation errors, non-JSON errors, request signals, and invalid paths. `npm start` serves a completed production build.

## Starter scope

Included: responsive shared layout, navigation, placeholder homeowner/staff pages, common UI components, loading/error/404 states, typed API client, and backend connection example.

Still to implement as separate tasks: authentication, QR access, actual assessment data, forms, photo workflows, remote reviews, property history, and ArcGIS integration. No backend or mock property records are included.

At setup, npm audit reported five high-severity findings in the ESLint development dependency chain (`braces` through `micromatch`/`fast-glob`). Its suggested fix downgrades Next.js ESLint configuration to version 14; that incompatible downgrade was not applied. Review patched upstream releases as they become available.

References: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [environment variables](https://nextjs.org/docs/app/guides/environment-variables).
