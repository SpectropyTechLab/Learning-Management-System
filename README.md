# Learning Management System

This repository contains:

- `frontend`: React 19 + TypeScript + Vite application
- `backend`: Express API server

## Prerequisites

- Node.js 20+
- npm 10+

## Install

Run installs once for both apps:

```powershell
npm.cmd run install:all
```

You can also install them separately:

```powershell
npm.cmd --prefix frontend install
npm.cmd --prefix backend install
```

## Run In Development

Start the backend in one terminal:

```powershell
npm.cmd run dev:backend
```

Start the frontend in a second terminal:

```powershell
npm.cmd run dev:frontend
```

Default local ports used by the codebase:

- Frontend: `http://localhost:5100`
- Backend: `http://localhost:5000`

## Fully Local LMS Testing

The existing `backend/.env` targets the hosted Supabase project. For local testing, use the separate, Git-ignored `backend/.env.local`; `LOCAL_DEV=true` refuses non-local database or Supabase URLs. Do not run the API against the hosted database when creating test content.

1. Start Docker Desktop and wait for its engine to be ready.
2. Install locked dependencies in the repository root, `frontend`, and `backend` with `npm.cmd ci` in each directory.
3. From the repository root, run `npx.cmd supabase start`. The first run downloads the local database, API, and Storage images. The committed migrations recreate the public schema exported from the hosted project **without table rows**.
4. Run `node backend/scripts/setup-local-env.mjs` once. It writes local service URLs and random test-account passwords to `backend/.env.local`. Existing `.env.local` files are preserved.
5. From `backend`, run `node update-superadmin.mjs` and `node scripts/setup-local-storage.mjs` to create two local users and the local Storage buckets.
6. Start the backend with `npm.cmd run dev:backend` from the root and the frontend with `npm.cmd run dev:frontend` in another terminal. Open `http://localhost:5100`; the sample Teaching Studio route is `/teaching-studio` after login.

The local admin email is `admin@local.test`. Read its password from `SUPER_ADMIN_PASSWORD` in your ignored `backend/.env.local`. The local authorizer uses `author@local.test` and `CONTENT_AUTH_PASSWORD`.

The setup script makes only the `local-lms` and `local-teaching-sessions` test buckets public in the local Supabase instance, so existing LMS media URLs work during local testing. Do not put sensitive real data in these buckets.

`npx.cmd supabase db reset --local` recreates and clears **only the local** database from migrations. Do not add `--linked`: that flag targets the hosted project. For a fresh hosted schema later, export only `public` with `node backend/scripts/dump-public-schema.mjs <output.sql>` from `backend`; review the result before replacing the committed migration. Student records and Storage objects are not copied by that command.

## Build And Verify

Build the frontend production bundle:

```powershell
npm.cmd run build
```

Run backend tests:

```powershell
npm.cmd test
```

Run lint checks:

```powershell
npm.cmd run lint
```

## Environment

The repository already contains local `.env` files in both `frontend` and `backend`.

Frontend variables used by the app include:

- `VITE_API_BASE_URL`
- `VITE_AUTH_COOKIE_SAMESITE`
- `VITE_AUTH_COOKIE_DOMAIN`

Backend variables used by the app include:

- `PORT`
- `CORS_ORIGIN`
- `JWT_SECRET`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_BUCKET`

## Current Status

Current verification on this workspace:

- Frontend production build passes
- Backend tests pass
- Backend lint has warnings only
- Frontend lint currently fails with a large number of existing type/lint issues, mostly `no-explicit-any` and unused variables

## PowerShell Note

If PowerShell blocks `npm` with an execution-policy error, use `npm.cmd` instead of `npm`.
