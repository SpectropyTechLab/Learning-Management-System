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

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

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

## Team Collaboration And Releases

All feature work is merged into `development` through pull requests and verified
in the isolated staging environment before a release pull request is opened to
`main`. Do not push directly to either long-lived branch or point preview
deployments at production services or data.

See [Collaboration and deployment workflow](docs/engineering/collaboration-and-deployment.md)
for branch synchronization, required checks, staging configuration, database
migration rules, release approval, and rollback procedures.

## Environment

Real environment files are intentionally not tracked. Copy the sanitized
`.env.local.example` file in each application to `.env.local`, then provide the
local values needed for that environment. Store staging and production values
in the Vercel, Render, Supabase, or GitHub environment settings.

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
