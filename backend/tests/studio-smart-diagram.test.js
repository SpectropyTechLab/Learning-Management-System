import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

process.env.JWT_SECRET ||= 'studio-smart-diagram-test-secret';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: pool } = await import('../config/db.js');
const { saveScreen } = await import('../services/studioScreens.service.js');

const normalizedSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const author = { id: 8, role: 'content_authorizer', client_id: 12 };
const diagramContent = () => ({
  visualType: 'smart_diagram', schemaVersion: 1, category: 'hierarchy', layout: 'organization-chart',
  direction: 'ltr', themeId: 'spectropy', styleId: 'soft', connectorStyle: 'elbow',
  revealMode: 'level-at-once', reverseAnimation: false, altText: 'A teaching hierarchy', text: 'Hierarchy',
  nodes: [
    { id: 'root', text: 'Learning objective', level: 0, parentId: null, role: 'normal' },
    { id: 'child', text: 'Evidence', level: 1, parentId: 'root', role: 'normal' },
  ],
});

const screenRow = { id: 31, session_id: 21, client_id: 12, title: 'Diagram', layout_id: null, revision_no: 4, screen_settings_json: {}, session_status: 'draft', session_revision_no: 6 };

test('Smart Diagram save persists structured nodes through the canonical Screen API', async (t) => {
  let insertedContent = null;
  const client = {
    async query(text, params = []) {
      const sql = normalizedSql(text);
      if (['begin', 'commit', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('from screens s join sessions se') && sql.includes('for update')) return { rows: [screenRow] };
      if (sql.startsWith('update screens set title')) return { rows: [{ ...screenRow, revision_no: 5 }] };
      if (sql.startsWith('delete from screen_elements')) return { rows: [] };
      if (sql.startsWith('insert into screen_elements')) { insertedContent = JSON.parse(params[4]); return { rows: [] }; }
      if (sql.startsWith('update sessions set status')) return { rows: [{ id: 21, status: 'draft', revision_no: 7 }] };
      if (sql.includes('from screen_elements se')) return { rows: [{ id: 'diagram-1', slot_id: 'free-diagram-1', type: 'visual', content: insertedContent, position: { x: 200, y: 160, width: 1400, height: 700 }, resource_id: null }] };
      if (sql.startsWith('select tag from screen_tags') || sql.includes('from screen_branches') || sql.includes('from screen_zoom_links')) return { rows: [] };
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  t.after(() => { pool.connect = originalConnect; });
  const result = await saveScreen({
    screenId: 31, user: author,
    body: { revision_no: 4, title: 'Diagram', elements: [{ id: 'diagram-1', slotId: 'free-diagram-1', type: 'visual', content: diagramContent(), position: { x: 200, y: 160, width: 1400, height: 700 } }] },
  });
  assert.equal(result.elements[0].content.visualType, 'smart_diagram');
  assert.equal(result.elements[0].content.nodes[1].parentId, 'root');
  assert.equal(result.session_revision_no, 7);
});

test('Smart Diagram validation rejects duplicate and missing node relationships before writing', async (t) => {
  const client = {
    async query(text) {
      const sql = normalizedSql(text);
      if (['begin', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('from screens s join sessions se') && sql.includes('for update')) return { rows: [screenRow] };
      throw new Error(`Invalid diagram must stop before query: ${sql}`);
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  t.after(() => { pool.connect = originalConnect; });
  const invalid = diagramContent();
  invalid.nodes[1].id = 'root';
  await assert.rejects(
    saveScreen({ screenId: 31, user: author, body: { revision_no: 4, title: 'Diagram', elements: [{ id: 'diagram-1', type: 'visual', content: invalid, position: { x: 200, y: 160, width: 1400, height: 700 } }] } }),
    (error) => error?.status === 422 && /node ids must be unique/i.test(error.message),
  );
});

test('Screen persistence rejects unsafe element hyperlinks before writing content', async (t) => {
  const client = {
    async query(text) {
      const sql = normalizedSql(text);
      if (['begin', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('from screens s join sessions se') && sql.includes('for update')) return { rows: [screenRow] };
      throw new Error(`Unsafe hyperlink must stop before query: ${sql}`);
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  t.after(() => { pool.connect = originalConnect; });
  const content = diagramContent();
  content.hyperlink = { url: 'javascript:alert(1)', target: '_blank' };
  await assert.rejects(
    saveScreen({ screenId: 31, user: author, body: { revision_no: 4, title: 'Diagram', elements: [{ id: 'diagram-1', type: 'visual', content, position: { x: 200, y: 160, width: 1400, height: 700 } }] } }),
    (error) => error?.status === 422 && /protocol is not allowed/i.test(error.message),
  );
});

test('Smart Diagram is integrated in authoring, preview, clicker and teacher playback', () => {
  const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const editor = read('../../frontend/src/features/teaching-studio/TeachingStudioPage.tsx');
  const canvas = read('../../frontend/src/features/teaching-studio/components/BlankScreenCanvas.tsx');
  const player = read('../../frontend/src/features/teaching-studio/StudioSessionPlayerPage.tsx');
  const clicker = read('../../frontend/src/features/teaching-studio/components/studioClickerRuntime.ts');
  const catalog = read('../../frontend/src/features/teaching-studio/components/smartDiagramModel.ts');
  assert.match(editor, /StudioSmartDiagramPanel/);
  assert.match(editor, /convertDiagramToShapes/);
  assert.match(canvas, /presenterDiagramVisibleNodes/);
  assert.match(player, /<StudioSmartDiagram/);
  assert.match(clicker, /level-one-by-one/);
  for (const category of ['list', 'process', 'cycle', 'hierarchy', 'relationship', 'matrix', 'pyramid', 'picture']) assert.match(catalog, new RegExp(`'${category}'`));
});

test('Smart Diagram chooser provides visual thumbnails and a selected layout preview', () => {
  const panel = fs.readFileSync(new URL('../../frontend/src/features/teaching-studio/components/StudioSmartDiagramPanel.tsx', import.meta.url), 'utf8');
  const thumbnails = fs.readFileSync(new URL('../../frontend/src/features/teaching-studio/components/StudioDiagramThumbnail.tsx', import.meta.url), 'utf8');
  assert.match(panel, /DiagramThumbnail/);
  assert.match(panel, /Insert this diagram/);
  assert.match(panel, /previewLayoutId/);
  assert.match(panel, /onMouseEnter/);
  for (const layout of ['chevron-process', 'vertical-process', 'radial-cycle', 'horizontal-hierarchy', 'inverted-pyramid', 'alternating-timeline', 'balance-comparison', 'fishbone', 'basic-funnel'])
    assert.match(thumbnails, new RegExp(`'${layout}'`));
});

test('Smart Diagram catalog provides PowerPoint-depth layout choices per category', () => {
  const catalog = fs.readFileSync(new URL('../../frontend/src/features/teaching-studio/components/smartDiagramModel.ts', import.meta.url), 'utf8');
  for (const category of ['list', 'process', 'cycle', 'hierarchy', 'relationship', 'matrix', 'pyramid', 'picture', 'timeline', 'comparison', "'cause-effect'", 'funnel']) {
    const match = catalog.match(new RegExp(`\\n\\s*${category}: \\[(.*?)\\],`));
    assert.ok(match, `missing expanded ${category} catalog`);
    assert.ok((match[1].match(/'/g) || []).length / 2 >= 10, `${category} must add at least ten layouts`);
  }
  assert.match(catalog, /variant: index \+ 1/);
  assert.match(catalog, /const variant = definition\?\.variant/);
});
