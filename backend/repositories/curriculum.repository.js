// backend/repositories/curriculum.repository.js
import { query as dbQuery } from './db.repository.js';

const PLATFORM_PROGRAM_OWNER_CLIENT_ID = 17;

export const fetchPrograms = async ({ clientId, sharedProgramIds = [], assignedProgramIds = [], schoolIds = [], writableOnly = false, assignedOnly = false } = {}) => {
  const params = [];
  let query = `SELECT * FROM programs`;
  if (assignedOnly) {
    const conditions = [];
    if (assignedProgramIds.length > 0) {
      params.push(assignedProgramIds);
      conditions.push(`id = ANY($${params.length}::int[])`);
    }
    if (schoolIds.length > 0) {
      params.push(schoolIds);
      conditions.push(`school_id = ANY($${params.length}::int[])`);
    }
    if (conditions.length === 0) conditions.push(`1 = 0`);
    query += ` WHERE ${conditions.join(' OR ')}`;
  } else if (clientId) {
    params.push(clientId);
    const conditions = [];
    if (writableOnly && schoolIds.length > 0) {
      params.push(schoolIds);
      conditions.push(`(client_id = $1 AND school_id = ANY($2))`);
    } else if (writableOnly) {
      conditions.push(`(client_id = $1 AND school_id IS NULL)`);
    } else if (schoolIds.length > 0) {
      params.push(schoolIds);
      conditions.push(`(client_id = $1 AND school_id = ANY($2))`);
    } else {
      conditions.push(`client_id = $1`);
    }
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      conditions.push(`(client_id = $${params.length - 1} AND id = ANY($${params.length}))`);
    }
    if (assignedProgramIds.length > 0) {
      params.push(assignedProgramIds);
      conditions.push(`id = ANY($${params.length})`);
    }
    query += ` WHERE ${conditions.join(' OR ')}`;
  }
  query += ` ORDER BY name`;
  return dbQuery(query, params);
};

export const fetchProgramById = async ({ id, clientId, sharedProgramIds = [], assignedProgramIds = [], schoolIds = [] }) => {
  const params = [id];
  let query = `SELECT * FROM programs WHERE id = $1`;
  if (clientId) {
    params.push(clientId);
    const conditions = [];
    if (schoolIds.length > 0) {
      params.push(schoolIds);
      conditions.push(`(client_id = $2 AND school_id = ANY($3))`);
    } else {
      conditions.push(`client_id = $2`);
    }
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      conditions.push(`(client_id = $${params.length - 1} AND id = ANY($${params.length}))`);
    }
    if (assignedProgramIds.length > 0) {
      params.push(assignedProgramIds);
      conditions.push(`id = ANY($${params.length})`);
    }
    query += ` AND (${conditions.join(' OR ')})`;
  }
  return dbQuery(query, params);
};

export const insertProgram = async ({ clientId, schoolId = null, name, code, is_active }) => {
  return dbQuery(
    `
    INSERT INTO programs (client_id, school_id, name, code, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [clientId, schoolId, name, code, is_active]
  );
};

export const updateProgram = async ({ id, clientId, updates }) => {
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([column, value]) => {
    setClauses.push(`${column} = $${idx++}`);
    values.push(value);
  });

  values.push(id);
  let query = `UPDATE programs SET ${setClauses.join(', ')} WHERE id = $${idx++}`;
  if (clientId) {
    query += ` AND client_id = $${idx++}`;
    values.push(clientId);
  }
  query += ` RETURNING *`;
  return dbQuery(query, values);
};

export const deleteProgram = async ({ id, clientId }) => {
  const params = [id];
  let query = `DELETE FROM programs WHERE id = $1`;
  if (clientId) {
    query += ` AND client_id = $2`;
    params.push(clientId);
  }
  query += ` RETURNING id`;
  return dbQuery(query, params);
};

export const fetchProgramContext = async (programId) => {
  return dbQuery(`SELECT id, client_id, school_id FROM programs WHERE id = $1`, [programId]);
};

export const countQuestionsByProgram = async (programId) => {
  return dbQuery(
    `
    SELECT COUNT(*)::int AS total
    FROM questions q
    JOIN subjects s ON s.id = q.subject_id
    JOIN grades g ON g.id = s.grade_id
    WHERE g.program_id = $1
    `,
    [programId]
  );
};

export const fetchGradesByProgram = async ({ programId, clientId, sharedProgramIds = [] }) => {
  const params = [programId];
  let query = `
    SELECT g.*, p.client_id, p.school_id
    FROM grades g
    JOIN programs p ON p.id = g.program_id
    WHERE g.program_id = $1
  `;
  if (clientId) {
    params.push(clientId);
    query += ` AND (p.client_id = $2`;
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      query += ` OR (p.client_id = $3 AND p.id = ANY($4))`;
    }
    query += `)`;
  }
  query += ` ORDER BY g.grade_number`;
  return dbQuery(query, params);
};

export const fetchGradeById = async ({ id, clientId, sharedProgramIds = [] }) => {
  const params = [id];
  let query = `
    SELECT g.*, p.client_id, p.school_id
    FROM grades g
    JOIN programs p ON p.id = g.program_id
    WHERE g.id = $1
  `;
  if (clientId) {
    params.push(clientId);
    query += ` AND (p.client_id = $2`;
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      query += ` OR (p.client_id = $3 AND p.id = ANY($4))`;
    }
    query += `)`;
  }
  return dbQuery(query, params);
};

export const insertGrade = async ({ programId, grade_number, is_active }) => {
  return dbQuery(
    `
    INSERT INTO grades (program_id, grade_number, is_active)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [programId, grade_number, is_active]
  );
};

export const updateGrade = async ({ id, updates }) => {
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([column, value]) => {
    setClauses.push(`${column} = $${idx++}`);
    values.push(value);
  });

  values.push(id);
  const query = `UPDATE grades SET ${setClauses.join(', ')} WHERE id = $${idx++} RETURNING *`;
  return dbQuery(query, values);
};

export const deleteGrade = async (id) => {
  return dbQuery(`DELETE FROM grades WHERE id = $1 RETURNING id`, [id]);
};

export const fetchGradeContext = async (gradeId) => {
  return dbQuery(
    `
    SELECT g.id, g.program_id, p.client_id, p.school_id
    FROM grades g
    JOIN programs p ON p.id = g.program_id
    WHERE g.id = $1
    `,
    [gradeId]
  );
};

export const fetchSubjectsByGrade = async ({ gradeId, clientId, sharedProgramIds = [] }) => {
  const params = [gradeId];
  let query = `
    SELECT s.*, g.grade_number, g.program_id, p.school_id
    FROM subjects s
    JOIN grades g ON g.id = s.grade_id
    JOIN programs p ON p.id = g.program_id
    WHERE s.grade_id = $1
  `;
  if (clientId) {
    params.push(clientId);
    query += ` AND (p.client_id = $2`;
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      query += ` OR (p.client_id = $3 AND p.id = ANY($4))`;
    }
    query += `)`;
  }
  query += ` ORDER BY s.display_order, s.name`;
  return dbQuery(query, params);
};

export const fetchSubjects = async (clientId, gradeId = null, sharedProgramIds = []) => {
  const params = [];
  const conditions = [];
  let query = `
    SELECT s.*, g.grade_number, g.program_id, p.school_id
    FROM subjects s
    LEFT JOIN grades g ON g.id = s.grade_id
    LEFT JOIN programs p ON p.id = g.program_id
  `;
  if (clientId) {
    params.push(clientId);
    let clientCondition = `s.client_id = $1`;
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      clientCondition += ` OR (s.client_id = $2 AND g.program_id = ANY($3))`;
    }
    conditions.push(`(${clientCondition})`);
  }
  if (gradeId) {
    conditions.push(`s.grade_id = $${params.length + 1}`);
    params.push(gradeId);
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ` ORDER BY s.display_order, s.name`;
  return dbQuery(query, params);
};

export const fetchSubjectById = async (id, clientId, sharedProgramIds = []) => {
  const params = [id];
  let query = `
    SELECT s.*, g.grade_number, g.program_id, p.school_id
    FROM subjects s
    LEFT JOIN grades g ON g.id = s.grade_id
    LEFT JOIN programs p ON p.id = g.program_id
    WHERE s.id = $1
  `;
  if (clientId) {
    params.push(clientId);
    query += ` AND (s.client_id = $2`;
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      query += ` OR (s.client_id = $3 AND g.program_id = ANY($4))`;
    }
    query += `)`;
  }
  return dbQuery(query, params);
};

export const insertSubject = async ({
  clientId,
  grade_id,
  name,
  code,
  description,
  display_order,
  is_active,
}) => {
  return dbQuery(
    `
    INSERT INTO subjects (client_id, grade_id, name, code, description, display_order, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    `,
    [clientId, grade_id, name, code, description, display_order, is_active]
  );
};

export const updateSubject = async ({ id, clientId, updates }) => {
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([column, value]) => {
    setClauses.push(`${column} = $${idx++}`);
    values.push(value);
  });

  values.push(id);
  let query = `UPDATE subjects SET ${setClauses.join(', ')} WHERE id = $${idx++}`;
  if (clientId) {
    query += ` AND client_id = $${idx++}`;
    values.push(clientId);
  }
  query += ` RETURNING id`;
  return dbQuery(query, values);
};

export const deleteSubject = async ({ id, clientId }) => {
  const params = [id];
  let query = `DELETE FROM subjects WHERE id = $1`;
  if (clientId) {
    query += ` AND client_id = $2`;
    params.push(clientId);
  }
  query += ` RETURNING id`;
  return dbQuery(query, params);
};

export const fetchSubjectContext = async (subjectId) => {
  return dbQuery(
    `
    SELECT s.id, s.client_id, p.school_id
    FROM subjects s
    LEFT JOIN grades g ON g.id = s.grade_id
    LEFT JOIN programs p ON p.id = g.program_id
    WHERE s.id = $1
    `,
    [subjectId]
  );
};

export const fetchChaptersBySubject = async ({ subjectId, clientId, sharedProgramIds = [] }) => {
  const params = [subjectId];
  let query = `
    SELECT c.*, s.client_id, p.school_id
    FROM chapters c
    JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    LEFT JOIN programs p ON p.id = g.program_id
    WHERE s.id = $1
  `;
  if (clientId) {
    params.push(clientId);
    query += ` AND (s.client_id = $2`;
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      query += ` OR (s.client_id = $3 AND g.program_id = ANY($4))`;
    }
    query += `)`;
  }
  query += ` ORDER BY c.chapter_number`;
  return dbQuery(query, params);
};

export const fetchChapterById = async ({ id, clientId, sharedProgramIds = [] }) => {
  const params = [id];
  let query = `
    SELECT c.*, s.client_id, p.school_id
    FROM chapters c
    JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    LEFT JOIN programs p ON p.id = g.program_id
    WHERE c.id = $1
  `;
  if (clientId) {
    params.push(clientId);
    query += ` AND (s.client_id = $2`;
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      query += ` OR (s.client_id = $3 AND g.program_id = ANY($4))`;
    }
    query += `)`;
  }
  return dbQuery(query, params);
};

export const insertChapter = async ({ subjectId, name, chapter_number, description, is_active }) => {
  return dbQuery(
    `
    INSERT INTO chapters (subject_id, name, chapter_number, description, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [subjectId, name, chapter_number, description, is_active]
  );
};

export const updateChapter = async ({ id, updates }) => {
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([column, value]) => {
    setClauses.push(`${column} = $${idx++}`);
    values.push(value);
  });

  values.push(id);
  const query = `UPDATE chapters SET ${setClauses.join(', ')} WHERE id = $${idx++} RETURNING *`;
  return dbQuery(query, values);
};

export const deleteChapter = async (id) => {
  return dbQuery(`DELETE FROM chapters WHERE id = $1 RETURNING id`, [id]);
};

export const fetchChapterContext = async (chapterId) => {
  return dbQuery(
    `
    SELECT c.id, s.client_id, p.school_id
    FROM chapters c
    JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    LEFT JOIN programs p ON p.id = g.program_id
    WHERE c.id = $1
    `,
    [chapterId]
  );
};

export const fetchTopicsByChapter = async ({ chapterId, clientId, sharedProgramIds = [] }) => {
  const params = [chapterId];
  let query = `
    SELECT t.*, s.client_id, p.school_id
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    LEFT JOIN programs p ON p.id = g.program_id
    WHERE c.id = $1
  `;
  if (clientId) {
    params.push(clientId);
    query += ` AND (s.client_id = $2`;
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      query += ` OR (s.client_id = $3 AND g.program_id = ANY($4))`;
    }
    query += `)`;
  }
  query += ` ORDER BY t.topic_number`;
  return dbQuery(query, params);
};

export const fetchTopicById = async ({ id, clientId, sharedProgramIds = [] }) => {
  const params = [id];
  let query = `
    SELECT t.*, s.client_id, p.school_id
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    LEFT JOIN programs p ON p.id = g.program_id
    WHERE t.id = $1
  `;
  if (clientId) {
    params.push(clientId);
    query += ` AND (s.client_id = $2`;
    if (sharedProgramIds.length > 0) {
      params.push(PLATFORM_PROGRAM_OWNER_CLIENT_ID, sharedProgramIds);
      query += ` OR (s.client_id = $3 AND g.program_id = ANY($4))`;
    }
    query += `)`;
  }
  return dbQuery(query, params);
};

export const insertTopic = async ({ chapterId, name, topic_number, is_active }) => {
  return dbQuery(
    `
    INSERT INTO topics (chapter_id, name, topic_number, is_active)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [chapterId, name, topic_number, is_active]
  );
};

export const updateTopic = async ({ id, updates }) => {
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([column, value]) => {
    setClauses.push(`${column} = $${idx++}`);
    values.push(value);
  });

  values.push(id);
  const query = `UPDATE topics SET ${setClauses.join(', ')} WHERE id = $${idx++} RETURNING *`;
  return dbQuery(query, values);
};

export const deleteTopic = async (id) => {
  return dbQuery(`DELETE FROM topics WHERE id = $1 RETURNING id`, [id]);
};

export const fetchTopicContext = async (topicId) => {
  return dbQuery(
    `
    SELECT t.id, s.client_id, p.school_id
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    LEFT JOIN programs p ON p.id = g.program_id
    WHERE t.id = $1
    `,
    [topicId]
  );
};
