import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import router from '../routes/studioDocuments.routes.js';
import {
  SCREEN_SCRIPT_FIELDS,
  SESSION_PLAN_FIELDS,
  parseScreenScriptDocx,
  parseSessionPlanDocx,
} from '../services/studioDocumentParser.service.js';

const routePaths = () => router.stack.filter((layer) => layer.route).map((layer) => ({
  path: layer.route.path,
  methods: Object.keys(layer.route.methods),
}));

const docxFile = async (lines, name) => ({
  buffer: await Packer.toBuffer(new Document({ sections: [{ children: lines.map((line) => new Paragraph(line)) }] })),
  originalname: name,
  mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});

test('Day 10 migration keeps originals and adds editable/per-Screen/chapter document contracts', () => {
  const sql = fs.readFileSync(new URL('../../supabase/migrations/20261102100000_studio_day10_documents.sql', import.meta.url), 'utf8');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS structured_content JSONB/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.screen_script_revisions/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.chapter_curriculum_documents/i);
  assert.match(sql, /screen_script_revisions_json/i);
});

test('Day 10 routes expose preview, confirm, manual and original-download operations', () => {
  const routes = routePaths();
  const has = (path, method) => routes.some((route) => route.path === path && route.methods.includes(method));
  assert.equal(has('/studio/sessions/:sessionId/session-plan/import-preview', 'post'), true);
  assert.equal(has('/studio/sessions/:sessionId/session-plan/import', 'post'), true);
  assert.equal(has('/studio/sessions/:sessionId/session-plan/content', 'patch'), true);
  assert.equal(has('/studio/sessions/:sessionId/screen-scripts/import-preview', 'post'), true);
  assert.equal(has('/studio/sessions/:sessionId/screens/:screenId/script', 'put'), true);
  assert.equal(has('/studio/chapters/:chapterId/curriculum-document/download', 'get'), true);
});

test('Screen save contract can change a layout version and revalidate remapped elements', () => {
  const source = fs.readFileSync(new URL('../services/studioScreens.service.js', import.meta.url), 'utf8');
  assert.match(source, /requestedLayoutId = body\.layout_id === undefined/i);
  assert.match(source, /layout_id = \$3, creation_mode = \$4/i);
  assert.match(source, /normalizeElements\(body\.elements, layout\)/i);
  assert.match(source, /assertTenant\(layout\.client_id, user\)/i);
});

test('Session Plan DOCX parser returns the eleven structured fields', async () => {
  const headings = [
    'Time / duration', 'Screen mapped', 'Learning objective / evidence', 'Pedagogy',
    'Resources / assets', 'Teacher action / to-do', 'Narration / dialogue cue',
    'Student action / reflection', 'Bloom / skills', 'References', 'Remarks / assessment',
  ];
  const values = ['00:00-03:00', 'S01-01Mirror Mystery', 'Predict', 'Inquiry', 'Mirrors',
    'Ask', 'Look at the mirrors', 'Respond', 'Understand', 'NCERT', 'Observe'];
  const parsed = await parseSessionPlanDocx(await docxFile([...headings, ...values, 'TIME CHECK: 3 minutes'], 'plan.docx'));
  assert.equal(parsed.rows.length, 1);
  assert.deepEqual(Object.keys(parsed.rows[0]), SESSION_PLAN_FIELDS);
  assert.equal(parsed.rows[0].screen_mapped, 'S01-01Mirror Mystery');
});

test('Screen Script DOCX parser stops before later production-prompt duplicates', async () => {
  const headings = [
    'Visual, animation and interaction assets', 'Word-for-word teacher narration',
    'Adaptive branch scripts', 'Student evidence and return route',
    'PYQ / examination extension', 'Teacher presenter notes / production checks',
  ];
  const lines = ['3. Screen-by-screen teacher scripts and branch specifications', 'S01-01 | Mirror Mystery',
    '00:00-03:00 | Pedagogy: Inquiry'];
  headings.forEach((heading, index) => lines.push(heading, `Value ${index + 1}`));
  lines.push('4. Exit assessment and adaptive mastery rules', 'S01-01 | Duplicate production prompt');
  const parsed = await parseScreenScriptDocx(await docxFile(lines, 'scripts.docx'));
  assert.equal(parsed.scripts.length, 1);
  assert.equal(parsed.scripts[0].screen_key, 'S01-01');
  assert.deepEqual(SCREEN_SCRIPT_FIELDS.every((field) => parsed.scripts[0][field]), true);
});
test('Screen Script v2 parser preserves required sections and table cells', async () => {
  const table = (heading) => [
    new Paragraph({ text: heading, heading: HeadingLevel.HEADING_3 }),
    new Table({ rows: [
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Column A')] }), new TableCell({ children: [new Paragraph('Column B')] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Value A')] }), new TableCell({ children: [new Paragraph('Value B')] })] }),
    ] }),
  ];
  const children = [
    new Paragraph({ text: '3. Screen-by-screen teacher scripts and branch specifications', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: 'S01-01 | Inertia', heading: HeadingLevel.HEADING_2 }),
    new Paragraph('00:00–04:00 | Pedagogy: inquiry'),
    ...table('Layout Skeleton (in detail)'),
    ...table('Title'),
    ...table('Overall Screen Content'),
    ...table('Animation Timeline'),
    ...table('Teacher Narration — Dialogue & Sections'),
    new Paragraph({ text: '4. Exit assessment', heading: HeadingLevel.HEADING_1 }),
    ...table('Source verification register'),
  ];
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children }] }));
  const parsed = await parseScreenScriptDocx({ buffer, originalname: 'v2.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  assert.equal(parsed.schema_version, 2);
  assert.equal(parsed.scripts.length, 1);
  assert.equal(parsed.scripts[0].validation.status, 'valid');
  assert.equal(parsed.scripts[0].sections.length, 5);
  assert.deepEqual(parsed.scripts[0].sections[0].blocks[0].columns, ['Column A', 'Column B']);
  assert.deepEqual(parsed.scripts[0].sections[0].blocks[0].rows, [['Value A', 'Value B']]);
});
