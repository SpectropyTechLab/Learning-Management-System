import { query as dbQuery } from './db.repository.js';

const MODULE_TABLES = {
  question_bank: 'question_bank_entitlements',
  exams: 'exam_entitlements',
};

const ensuredTables = new Set();

const resolveTableName = (moduleKey) => {
  const tableName = MODULE_TABLES[moduleKey];
  if (!tableName) {
    throw new Error(`Unsupported module entitlement table for module "${moduleKey}"`);
  }
  return tableName;
};

export const ensureModuleEntitlementsTable = async (moduleKey) => {
  const tableName = resolveTableName(moduleKey);
  if (ensuredTables.has(tableName)) return tableName;

  await dbQuery(
    `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      entitlement_type VARCHAR(20) NOT NULL CHECK (
        entitlement_type IN ('feature', 'program')
      ),
      feature_key VARCHAR(100),
      program_id INTEGER REFERENCES programs(id) ON DELETE CASCADE,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      assigned_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT ${tableName}_scope_check CHECK (
        (entitlement_type = 'feature' AND feature_key IS NOT NULL AND program_id IS NULL)
        OR (entitlement_type = 'program' AND program_id IS NOT NULL AND feature_key IS NULL)
      )
    )
    `
  );

  await dbQuery(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_feature_unique
      ON ${tableName}(client_id, entitlement_type, feature_key)
      WHERE entitlement_type = 'feature'
    `
  );
  await dbQuery(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_program_unique
      ON ${tableName}(client_id, entitlement_type, program_id)
      WHERE entitlement_type = 'program'
    `
  );
  await dbQuery(
    `
    CREATE INDEX IF NOT EXISTS idx_${tableName}_client
      ON ${tableName}(client_id)
    `
  );
  await dbQuery(
    `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_${tableName}_updated'
      ) THEN
        CREATE TRIGGER trg_${tableName}_updated
        BEFORE UPDATE ON ${tableName}
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
      END IF;
    END
    $$;
    `
  );

  ensuredTables.add(tableName);
  return tableName;
};

export const listModuleEntitlements = async (moduleKey, { clientId = null } = {}) => {
  const tableName = await ensureModuleEntitlementsTable(moduleKey);
  return dbQuery(
    `
    SELECT *
    FROM ${tableName}
    WHERE ($1::int IS NULL OR client_id = $1)
    ORDER BY assigned_at DESC, id DESC
    `,
    [clientId]
  );
};

export const insertModuleEntitlement = async (
  moduleKey,
  { clientId, entitlementType, featureKey, programId, enabled, assignedByUserId }
) => {
  const tableName = await ensureModuleEntitlementsTable(moduleKey);
  return dbQuery(
    `
    INSERT INTO ${tableName}
      (client_id, entitlement_type, feature_key, program_id, enabled, assigned_by_user_id, assigned_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
    `,
    [clientId, entitlementType, featureKey, programId, enabled, assignedByUserId]
  );
};

export const updateModuleEntitlement = async (moduleKey, { id, enabled }) => {
  const tableName = await ensureModuleEntitlementsTable(moduleKey);
  return dbQuery(
    `
    UPDATE ${tableName}
    SET enabled = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [enabled, id]
  );
};

export const fetchModuleEntitlementById = async (moduleKey, id) => {
  const tableName = await ensureModuleEntitlementsTable(moduleKey);
  return dbQuery(`SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`, [id]);
};

export const fetchFeatureEntitlement = async (moduleKey, { clientId, featureKey }) => {
  const tableName = await ensureModuleEntitlementsTable(moduleKey);
  return dbQuery(
    `
    SELECT *
    FROM ${tableName}
    WHERE client_id = $1
      AND entitlement_type = 'feature'
      AND feature_key = $2
      AND enabled = TRUE
    ORDER BY id DESC
    LIMIT 1
    `,
    [clientId, featureKey]
  );
};

export const fetchProgramEntitlement = async (moduleKey, { clientId, programId }) => {
  const tableName = await ensureModuleEntitlementsTable(moduleKey);
  return dbQuery(
    `
    SELECT *
    FROM ${tableName}
    WHERE client_id = $1
      AND entitlement_type = 'program'
      AND program_id = $2
      AND enabled = TRUE
    ORDER BY id DESC
    LIMIT 1
    `,
    [clientId, programId]
  );
};

export const listEnabledProgramIds = async (moduleKey, { clientId }) => {
  const tableName = await ensureModuleEntitlementsTable(moduleKey);
  return dbQuery(
    `
    SELECT program_id
    FROM ${tableName}
    WHERE client_id = $1
      AND entitlement_type = 'program'
      AND enabled = TRUE
      AND program_id IS NOT NULL
    ORDER BY program_id ASC
    `,
    [clientId]
  );
};
