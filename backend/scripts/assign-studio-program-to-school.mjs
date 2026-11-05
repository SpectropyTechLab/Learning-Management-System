import pool from '../config/db.js';
import { listPublishedSessions } from '../services/studioReleases.service.js';

const programId = Number(process.argv[2]);
const schoolId = Number(process.argv[3]);

if (![programId, schoolId].every((value) => Number.isInteger(value) && value > 0)) {
  console.error('Usage: node backend/scripts/assign-studio-program-to-school.mjs <program-id> <school-id>');
  process.exitCode = 1;
} else {
  try {
    const context = await pool.query(
      `SELECT p.id AS program_id, p.name AS program_name, p.client_id AS program_client_id,
              p.is_active, s.id AS school_id, s.name AS school_name, s.client_id AS school_client_id
       FROM programs p CROSS JOIN schools s
       WHERE p.id = $1 AND s.id = $2`,
      [programId, schoolId],
    );
    const row = context.rows[0];
    if (!row) throw new Error('Program or school was not found.');
    if (!row.is_active) throw new Error(`Program ${programId} is inactive.`);
    if (Number(row.program_client_id) !== Number(row.school_client_id)) {
      throw new Error('Program and school belong to different clients.');
    }

    const assigner = await pool.query(
      `SELECT id FROM users
       WHERE role IN ('client_admin', 'super_admin', 'content_authorizer')
         AND (role = 'super_admin' OR client_id = $1)
       ORDER BY CASE WHEN role = 'client_admin' THEN 0 WHEN role = 'content_authorizer' THEN 1 ELSE 2 END, id
       LIMIT 1`,
      [row.school_client_id],
    );

    await pool.query(
      `INSERT INTO question_bank_school_assignments (program_id, school_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (program_id, school_id)
       DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()`,
      [programId, schoolId, assigner.rows[0]?.id ?? null],
    );

    const teachers = await pool.query(
      `SELECT DISTINCT u.id, u.email, u.client_id, u.role
       FROM users u
       JOIN school_memberships sm ON sm.user_id = u.id
       WHERE sm.school_id = $1 AND sm.status = 'active'
         AND sm.role_scope = 'teacher' AND u.role = 'teacher'
       ORDER BY u.id`,
      [schoolId],
    );
    const visibility = [];
    for (const teacher of teachers.rows) {
      const sessions = await listPublishedSessions({ user: teacher });
      visibility.push({
        teacher: teacher.email,
        visible_session_ids: sessions.map((session) => session.session_id),
      });
    }

    console.log(JSON.stringify({
      assigned: true,
      program: { id: programId, name: row.program_name },
      school: { id: schoolId, name: row.school_name },
      teacher_visibility: visibility,
    }, null, 2));
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
