import '../config/loadEnv.js';
import pool from '../config/db.js';

const sessionId = Number.parseInt(process.argv[2], 10);
if (!Number.isInteger(sessionId) || sessionId <= 0) {
  console.error('Usage: node scripts/diagnose-session-runtime.mjs <session-id>');
  process.exit(1);
}

const result = await pool.query(
  `SELECT s.id, s.title, s.display_order, s.revision_no,
          COUNT(se.id)::int AS element_count,
          COUNT(se.id) FILTER (WHERE se.content_json ? 'importSource')::int AS imported_count,
          MIN((se.position_json->>'zIndex')::numeric) AS minimum_z,
          MAX((se.position_json->>'zIndex')::numeric) AS maximum_z
   FROM screens s
   LEFT JOIN screen_elements se ON se.screen_id = s.id
   WHERE s.session_id = $1
   GROUP BY s.id
   ORDER BY s.display_order, s.id`,
  [sessionId],
);

process.stdout.write(`${JSON.stringify({ sessionId, screens: result.rows }, null, 2)}\n`);
await pool.end();
