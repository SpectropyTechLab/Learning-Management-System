# Supabase Local Reconciliation Guide

## Current state on 28 October 2026

The repository is initialized for local Supabase because `supabase/config.toml` exists. It is not currently a running or current clone of the hosted project.

- Supabase CLI dependency: installed, version 2.120.0.
- Docker command: installed.
- Docker daemon: not running.
- Local migrations: October 14 `citext` plus a hosted `public` schema snapshot.
- Local snapshot tables: 54.
- Current monolithic repository schema tables: 61.
- Tables present in the repository schema but absent from the local migration snapshot: `boards`, `subtopics`, `layouts`, `sessions`, `screens`, `resources`, and `resource_mappings`.
- Cloud changes made after October 14 cannot be measured without linking and pulling the current hosted schema.
- `supabase/config.toml` enables seeding and references `supabase/seed.sql`; a comment-only seed file is included so local startup/reset has a valid target.

## Safety rules

- Pull and review the hosted schema before adding Studio migrations.
- Never use `supabase db reset --linked` against the production project. It drops and rebuilds the linked remote schema.
- Never run `db push` until the generated migration has been reviewed and tested locally.
- Do not commit database passwords, access tokens, service-role keys, or generated local credentials.
- Take a hosted backup or confirm the platform backup policy before any production migration.

## One-time preparation

1. Start Docker Desktop and wait until its engine reports running.
2. From the repository root, verify:

   ```powershell
   docker version
   npx supabase --version
   ```

3. Obtain the hosted Supabase project reference and database password from the project owner. The project reference is available in the Supabase dashboard under project settings.
4. Authenticate the CLI using `npx supabase login`, or set `SUPABASE_ACCESS_TOKEN` only for the current terminal session.
5. Link this repository:

   ```powershell
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

   Enter the database password when prompted. Do not place it in a command committed to shell history or source control.

## Pull the current cloud schema safely

Create a working branch or commit current work first. Then run:

```powershell
npx supabase db pull cloud_sync_20261028
```

This should create a new migration under `supabase/migrations`. Review it for:

- every table and column added through the hosted dashboard after October 14;
- changed foreign keys, unique constraints, defaults, triggers, functions, grants, and RLS policies;
- storage schema customizations if any;
- destructive drops or type changes;
- conflicts with the proposed Studio tables and current integer tenant IDs.

If the CLI reports migration-history disagreement, stop and review the hosted `supabase_migrations.schema_migrations` history before accepting a repair. Do not answer prompts mechanically.

## Rebuild the local database

Start the local stack:

```powershell
npx supabase start
npx supabase status
```

The default local Studio address in this repository is `http://localhost:54323`.

After the pulled migration is reviewed, rebuild only the local database:

```powershell
npx supabase db reset --local
```

This destroys local database data and reapplies local migrations and seed data. It must not include `--linked`.

## Application configuration

Use the local API URL and keys printed by `npx supabase status` in untracked local environment files. Also configure the backend PostgreSQL connection and a development-only JWT secret. Never copy the hosted service-role key into frontend configuration.

## Verification before Studio migrations

1. Confirm every pulled migration applies from an empty local database.
2. Compare table and policy counts with the hosted project.
3. Run existing backend tests and authentication/curriculum smoke tests.
4. Dump the local `public` schema and compare it with the reviewed migration result.
5. Only then create the forward Studio migration for Days 3-5.

## Ongoing team workflow

- Make database changes locally through versioned migration files.
- Review migrations in pull requests with the application changes that depend on them.
- Test `db reset --local` regularly so a clean environment remains reproducible.
- Use `npx supabase db push --dry-run` before any approved remote deployment.
- Pull dashboard-made emergency changes back into version control immediately.
