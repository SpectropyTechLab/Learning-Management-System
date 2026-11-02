# Day 9 local manager demo

This runbook uses only the local Supabase project. Do not replace the local URLs with hosted credentials.

## One-time preparation

1. Start Docker Desktop.
2. From the repository root, verify Supabase with `npx supabase status`.
3. From `backend`, run `npm run studio:day9:demo:seed`.

The seed is repeatable. It creates or refreshes one local Content Authorizer, one representative curriculum chain, one Studio Session, and three ordered blank Screens.

## Start the application

Backend terminal:

```text
cd C:\Work\Spectropy\Teaching_Studio\Learning-Management-System-Workspace\backend
npm run dev
```

Frontend terminal:

```text
cd C:\Work\Spectropy\Teaching_Studio\Learning-Management-System-Workspace\frontend
npm run dev
```

Open `http://127.0.0.1:5100/login`.

Local-only login:

- Email: `studio.demo@spectropy.local`
- Password: `StudioDemo@2026`

## Demonstration path

1. Sign in as the Content Authorizer.
2. Open Teaching Studio.
3. Select:
   - CBSE Demo Board
   - Techno Mathematics Demo
   - Grade 8
   - Mathematics
   - Fractions
   - Equivalent Fractions
   - Visual Equivalence
4. Open `Understanding Equivalent Fractions`.
5. Show the ordered Screens: Welcome, Explore the Model, Guided Practice.
6. Create or open a blank Screen after Rahul's Day 9 editor work is integrated.
7. Change a parent curriculum selection and show that downstream choices clear after Poojitha's Day 9 selection work is integrated.

## Readiness checks

- Backend health: `http://127.0.0.1:5000/health`
- Frontend: `http://127.0.0.1:5100`
- Local Supabase Studio: `http://127.0.0.1:54323`

The backend health response should report `status`, `database`, and `supabase` as `ok`.

## Stop after the demo

Press `Ctrl+C` once in each backend and frontend terminal. Leave Docker running only if the team still needs local Supabase.

## Current integration boundary

Developer 1 support is ready. The final Day 9 visual acceptance must wait until Poojitha's hierarchy/session UI and Rahul's editor shell are merged and verified together. Until then, the current Teaching Studio route may still display the older pilot/catalog page even though the complete local API path is working.
