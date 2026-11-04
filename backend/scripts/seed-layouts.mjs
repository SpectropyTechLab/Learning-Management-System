import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '..', 'seed', 'layouts.seed.json');

const main = async () => {
  const seed = JSON.parse(await fs.readFile(filePath, 'utf8'));
  const layouts = Array.isArray(seed.layouts) ? seed.layouts : [];
  const defaults = seed.defaults || {};
  if (layouts.length !== 14) throw new Error(`Expected 14 default layouts, found ${layouts.length}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const layout of layouts) {
      const values = { ...defaults, ...layout };
      const existing = await client.query(
        `SELECT id FROM layouts
         WHERE client_id IS NULL AND LOWER(layout_key) = LOWER($1) AND version_no = $2
         FOR UPDATE`,
        [values.layout_key, values.version_no],
      );
      const params = [
        values.name, values.description ?? null, JSON.stringify(values.layout_data_json),
        values.thumbnail_url ?? null, values.is_default === true, values.is_active !== false,
        values.created_by ?? null, values.canvas_width, values.canvas_height, values.safe_margin,
      ];
      if (existing.rows[0]) {
        await client.query(
          `UPDATE layouts SET
             name = $1, description = $2, layout_data_json = $3::jsonb,
             thumbnail_url = $4, is_default = $5, is_active = $6, created_by = $7,
             canvas_width = $8, canvas_height = $9, safe_margin = $10
           WHERE id = $11`,
          [...params, existing.rows[0].id],
        );
      } else {
        await client.query(
          `INSERT INTO layouts (
             client_id, layout_key, version_no, name, description, layout_data_json,
             thumbnail_url, is_default, is_active, created_by,
             canvas_width, canvas_height, safe_margin
           ) VALUES (NULL, $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12)`,
          [values.layout_key, values.version_no, ...params],
        );
      }
    }
    await client.query('COMMIT');
    console.log(`Seeded ${layouts.length} global default layouts from ${filePath}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error('Layout seed failed:', error.message);
  process.exit(1);
});
