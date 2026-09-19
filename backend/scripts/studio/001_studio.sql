-- Additive migration: only Studio tables, indexes and their access controls.
-- Follow LIVE_PILOT_RELEASE.md before enabling the limited pilot.
BEGIN;
SET LOCAL search_path TO public;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE IF NOT EXISTS studio_projects (
 id UUID PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id), scope_key TEXT NOT NULL,
 title TEXT NOT NULL, document JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio_projects_owner ON studio_projects(owner_id, scope_key, updated_at DESC);
CREATE TABLE IF NOT EXISTS studio_revisions (
 project_id UUID NOT NULL REFERENCES studio_projects(id), revision INTEGER NOT NULL, document JSONB NOT NULL,
 actor_id INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(project_id, revision)
);
CREATE TABLE IF NOT EXISTS studio_assets (
 id UUID PRIMARY KEY, project_id UUID NOT NULL REFERENCES studio_projects(id), filename TEXT NOT NULL,
 mime TEXT NOT NULL, size INTEGER NOT NULL, bytes BYTEA NOT NULL, extracted_text TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(size BETWEEN 1 AND 10485760)
);
CREATE INDEX IF NOT EXISTS studio_assets_project ON studio_assets(project_id);
CREATE TABLE IF NOT EXISTS studio_ai_jobs (
 id UUID PRIMARY KEY, project_id UUID NOT NULL REFERENCES studio_projects(id), owner_id INTEGER NOT NULL REFERENCES users(id),
 base_revision INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed','applied')),
 input JSONB NOT NULL, result JSONB, error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS studio_jobs_queue ON studio_ai_jobs(status,created_at);
CREATE INDEX IF NOT EXISTS studio_jobs_owner ON studio_ai_jobs(owner_id,created_at);
CREATE TABLE IF NOT EXISTS studio_releases (
 id UUID PRIMARY KEY, project_id UUID NOT NULL REFERENCES studio_projects(id), revision INTEGER NOT NULL,
 document JSONB NOT NULL, approved_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(project_id,revision)
);
CREATE TABLE IF NOT EXISTS studio_audit (
 id BIGSERIAL PRIMARY KEY, project_id UUID REFERENCES studio_projects(id), actor_id INTEGER REFERENCES users(id),
 action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Browser/PostgREST roles have no direct access. Access is through the OS backend,
-- which must additionally enforce owner and scope predicates on every resource.
ALTER TABLE studio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON studio_projects, studio_revisions, studio_assets, studio_ai_jobs, studio_releases, studio_audit FROM anon, authenticated;
-- Deliberately grants no role-wide access. During the limited live pilot,
-- grant studio.access through user_permissions for verified pilot accounts only.
COMMIT;
