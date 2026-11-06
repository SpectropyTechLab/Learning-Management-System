import pool from '../config/db.js';
import {
  getSessionStatus,
  publishSession,
  reviewSession,
  submitSession,
} from '../services/studioSessionWorkflow.service.js';

const sessionId = Number(process.argv[2]);

if (!Number.isInteger(sessionId) || sessionId <= 0) {
  console.error('Usage: node backend/scripts/publish-studio-session.mjs <session-id>');
  process.exitCode = 1;
} else {
  try {
    const sessionResult = await pool.query(
      'SELECT id, client_id, title, status, revision_no FROM sessions WHERE id = $1',
      [sessionId],
    );
    const session = sessionResult.rows[0];
    if (!session) throw new Error(`Session ${sessionId} was not found.`);

    const userResult = await pool.query(
      `SELECT id, client_id, role, email
       FROM users
       WHERE role IN ('content_authorizer', 'super_admin')
         AND (role = 'super_admin' OR client_id = $1)
       ORDER BY CASE WHEN role = 'content_authorizer' THEN 0 ELSE 1 END, id
       LIMIT 1`,
      [session.client_id],
    );
    const user = userResult.rows[0];
    if (!user) throw new Error(`No Content Authorizer or super admin can publish Session ${sessionId}.`);

    let status = await getSessionStatus({ sessionId, user });
    console.log(`Session ${sessionId}: ${status.status} (revision ${status.revision_no})`);

    if (status.status === 'published') {
      console.log(`Session ${sessionId} is already published.`);
    } else {
      if (status.status === 'draft' || status.status === 'rejected') {
        await submitSession({ sessionId, user });
        console.log('Submitted.');
        status = await getSessionStatus({ sessionId, user });
      }

      if (status.status === 'submitted') {
        await reviewSession({
          sessionId,
          decision: 'approved',
          comment: 'Approved by backend publication verification script.',
          user,
        });
        console.log('Approved.');
        status = await getSessionStatus({ sessionId, user });
      }

      if (status.status !== 'approved') {
        throw new Error(`Session ${sessionId} cannot be published from status ${status.status}.`);
      }

      const release = await publishSession({ sessionId, user });
      console.log(`Published release ${release.release_number} (release ID ${release.id}).`);
    }

    const finalStatus = await getSessionStatus({ sessionId, user });
    console.log(JSON.stringify({
      session_id: finalStatus.session_id,
      status: finalStatus.status,
      workflow_state: finalStatus.workflow_state,
      revision_no: finalStatus.revision_no,
      published_at: finalStatus.published_at,
    }, null, 2));
  } catch (error) {
    console.error(error?.message || error);
    if (error?.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
