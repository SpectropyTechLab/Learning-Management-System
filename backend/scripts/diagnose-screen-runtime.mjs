import '../config/loadEnv.js';
import pool from '../config/db.js';

const query = (...args) => pool.query(...args);

const screenId = Number.parseInt(process.argv[2], 10);
if (!Number.isInteger(screenId) || screenId <= 0) {
  console.error('Usage: node scripts/diagnose-screen-runtime.mjs <screen-id>');
  process.exit(1);
}

const screenResult = await query(
  'SELECT id, session_id, title, screen_settings_json, revision_no FROM screens WHERE id = $1',
  [screenId],
);
if (!screenResult.rows[0]) {
  console.error(`Screen ${screenId} was not found.`);
  process.exit(1);
}

const elementsResult = await query(
  `SELECT element_key, element_type, content_json, position_json
   FROM screen_elements WHERE screen_id = $1 ORDER BY display_order, id`,
  [screenId],
);
const elements = elementsResult.rows;
const imported = elements.filter((element) => element.content_json?.importSource);
const grouped = elements.filter((element) => element.position_json?.groupId);
const resourceMappings = await query(
  'SELECT COUNT(*)::int AS count FROM resource_mappings WHERE screen_id = $1',
  [screenId],
);
const typeCounts = elements.reduce((counts, element) => {
  counts[element.element_type] = (counts[element.element_type] || 0) + 1;
  return counts;
}, {});
const zeroOrTiny = elements.filter((element) => {
  const position = element.position_json || {};
  return Number(position.width) < 8 || Number(position.height) < 8;
});
const oversized = elements.filter((element) => {
  const position = element.position_json || {};
  return Number(position.width) > 1920 || Number(position.height) > 1080;
});
const interactiveContent = elements.filter((element) => (
  element.content_json?.richTextHtml || element.content_json?.text || element.content_json?.kind
));

process.stdout.write(`${JSON.stringify({
  screen: screenResult.rows[0],
  elementCount: elements.length,
  typeCounts,
  importedCount: imported.length,
  groupMemberCount: grouped.length,
  resourceMappingCount: resourceMappings.rows[0]?.count || 0,
  tinyCount: zeroOrTiny.length,
  oversizedCount: oversized.length,
  interactiveContentCount: interactiveContent.length,
  zIndexRange: elements.length ? [
    Math.min(...elements.map((element) => Number(element.position_json?.zIndex) || 0)),
    Math.max(...elements.map((element) => Number(element.position_json?.zIndex) || 0)),
  ] : [0, 0],
  elements: elements.map((element) => ({
    id: element.element_key,
    type: element.element_type,
    name: element.content_json?.importSource?.metadata?.name || null,
    text: typeof element.content_json?.text === 'string' ? element.content_json.text.slice(0, 80) : null,
    richTextHtml: typeof element.content_json?.richTextHtml === 'string'
      ? element.content_json.richTextHtml.slice(0, 240)
      : null,
    kind: element.content_json?.kind || null,
    groupId: element.position_json?.groupId || null,
    position: element.position_json,
  })),
}, null, 2)}\n`);

await pool.end();
