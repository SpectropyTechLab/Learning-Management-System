import { query as dbQuery } from '../repositories/db.repository.js';

const SCHOOL_ROLES = new Set(['school_owner', 'teacher', 'student']);

const normalizeNullableText = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

const loadClientName = async (clientId) => {
  if (!clientId) return null;

  const result = await dbQuery(
    `SELECT name
     FROM clients
     WHERE id = $1
     LIMIT 1`,
    [clientId]
  );

  return normalizeNullableText(result.rows[0]?.name);
};

const loadSchoolName = async (userId) => {
  if (!userId) return null;

  const membershipResult = await dbQuery(
    `SELECT s.name
     FROM school_memberships sm
     JOIN schools s ON s.id = sm.school_id
     WHERE sm.user_id = $1
       AND sm.status = 'active'
     ORDER BY sm.is_primary DESC NULLS LAST, sm.id ASC
     LIMIT 1`,
    [userId]
  );

  const membershipSchoolName = normalizeNullableText(membershipResult.rows[0]?.name);
  if (membershipSchoolName) {
    return membershipSchoolName;
  }

  const batchResult = await dbQuery(
    `SELECT s.name
     FROM batch_members bm
     JOIN batches b ON b.id = bm.batch_id
     JOIN schools s ON s.id = b.school_id
     WHERE bm.user_id = $1
     ORDER BY bm.is_primary DESC NULLS LAST, bm.id ASC
     LIMIT 1`,
    [userId]
  );

  return normalizeNullableText(batchResult.rows[0]?.name);
};

export const enrichAuthUser = async (user) => {
  if (!user) return user;

  const [clientName, schoolName] = await Promise.all([
    loadClientName(user.client_id),
    SCHOOL_ROLES.has(String(user.role)) ? loadSchoolName(user.id) : Promise.resolve(null),
  ]);

  return {
    ...user,
    client_name: clientName,
    school_name: schoolName,
  };
};
