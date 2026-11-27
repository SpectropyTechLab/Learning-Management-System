import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (relativePath) => fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const migration = read('../../supabase/migrations/20261127100000_studio_gap_bridge_foundations.sql');

test('Gap Bridge foundation migration separates main and child Screen identity', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS screen_kind VARCHAR\(30\) NOT NULL DEFAULT 'main'/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS parent_screen_id INTEGER/);
  assert.match(migration, /ALTER COLUMN screen_number DROP NOT NULL/);
  assert.match(migration, /DROP CONSTRAINT IF EXISTS screens_session_id_screen_number_key/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS screens_main_session_number_uq[\s\S]*WHERE screen_kind = 'main'/);
  assert.match(migration, /screen_kind = 'gap_bridge_child'[\s\S]*parent_screen_id IS NOT NULL[\s\S]*screen_number IS NULL/);
  assert.match(migration, /studio_validate_screen_hierarchy/);
  assert.match(migration, /child and parent Screens must belong to the same Session/);
  assert.match(migration, /cannot own another child Screen/);
});

test('Gap Bridge foundation migration enforces exclusive child or external targets', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.gap_bridges/);
  assert.match(migration, /target_kind VARCHAR\(20\) NOT NULL CHECK \(target_kind IN \('child', 'external'\)\)/);
  assert.match(migration, /target_kind = 'child'[\s\S]*child_screen_id IS NOT NULL[\s\S]*external_session_id IS NULL[\s\S]*external_screen_id IS NULL/);
  assert.match(migration, /target_kind = 'external'[\s\S]*child_screen_id IS NULL[\s\S]*external_session_id IS NOT NULL[\s\S]*external_screen_id IS NOT NULL/);
  assert.match(migration, /external_session_id <> source_session_id/);
  assert.match(migration, /gap_bridges_source_name_uq[\s\S]*LOWER\(BTRIM\(name\)\)/);
  assert.match(migration, /gap_bridges_child_owner_uq/);
  assert.match(migration, /UNIQUE \(source_screen_id, display_order\)/);
  assert.match(migration, /studio_validate_gap_bridge_child_ownership/);
  assert.match(migration, /A Gap Bridge child Screen cannot own Gap Bridges/);
  assert.match(migration, /owning mapping must name the same parent/);
  assert.match(migration, /DEFERRABLE INITIALLY DEFERRED/g);
});

test('Gap Bridge external locators remain soft while source and child ownership stay relational', () => {
  assert.match(migration, /gap_bridges_source_session_fkey[\s\S]*REFERENCES public\.screens\(id, session_id\) ON DELETE CASCADE/);
  assert.match(migration, /child_screen_id INTEGER REFERENCES public\.screens\(id\) ON DELETE CASCADE/);
  assert.doesNotMatch(migration, /FOREIGN KEY \(external_screen_id\)/);
  assert.doesNotMatch(migration, /external_screen_id INTEGER REFERENCES/);
  assert.match(migration, /Soft stable Screen locator resolved against external_session_id latest publication at runtime/);
});

test('Gap Bridge tables follow Studio database access boundaries', () => {
  assert.match(migration, /ALTER TABLE public\.gap_bridges ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.gap_bridges FROM anon, authenticated, service_role/);
  assert.match(migration, /REVOKE ALL ON SEQUENCE public\.gap_bridges_id_seq FROM anon, authenticated, service_role/);
});

test('existing linear Screen workflows explicitly exclude Gap Bridge children', () => {
  const screens = read('../services/studioScreens.service.js');
  const layouts = read('../services/studioLayouts.service.js');
  const documents = read('../services/studioDocuments.service.js');
  const workflow = read('../services/studioSessionWorkflow.service.js');
  const releases = read('../services/studioReleases.service.js');
  const discovery = read('../services/studioDiscovery.service.js');
  const sessions = read('../services/studioSessions.service.js');

  assert.match(screens, /SELECT \* FROM screens[\s\S]*session_id = \$1 AND screen_kind = 'main'/);
  assert.match(screens, /screen_ids must contain every main Screen in the Session exactly once/);
  assert.match(screens, /WHERE session_id = \$1 AND screen_kind = 'main'[\s\S]*ORDER BY id FOR UPDATE/);
  assert.match(screens, /id = ANY\(\$2::int\[\]\)[\s\S]*screen_kind = 'main'|screen_kind = 'main'[\s\S]*id = ANY\(\$2::int\[\]\)/);
  assert.match(layouts, /MAX\(screen_number\)[\s\S]*screen_kind = 'main'/);
  assert.match(documents, /Session Plan[\s\S]*screen_kind = 'main'/);
  assert.match(workflow, /FROM screens[\s\S]*screen_kind = 'main'/);
  assert.match(releases, /const loadScreens[\s\S]*sc\.screen_kind = 'main'/);
  assert.match(discovery, /discoverCurrentScreens[\s\S]*sc\.screen_kind = 'main'/);
  assert.match(sessions, /sc\.screen_kind = 'main'\) AS screen_count/);
});

test('Session and curriculum deletion intentionally remove both main and child Screens', () => {
  const sessions = read('../services/studioSessions.service.js');
  const curriculum = read('../services/curriculum.service.js');
  assert.match(sessions, /DELETE FROM screens WHERE session_id = \$1/);
  assert.match(curriculum, /DELETE FROM screens WHERE session_id = ANY\(\$1::int\[\]\)/);
});

test('direct Screen deletion preserves the Gap Bridge child ownership boundary', () => {
  const screens = read('../services/studioScreens.service.js');
  assert.match(screens, /screen\.screen_kind === 'gap_bridge_child'/);
  assert.match(screens, /Delete this child Screen through its Gap Bridge/);
  assert.match(screens, /parent_screen_id = \$1 AND screen_kind = 'gap_bridge_child'/);
  assert.match(screens, /DELETE FROM screen_script_revisions[\s\S]*parent_screen_id = \$1/);
});
