-- Separate entitlements for Question Bank and Exams

CREATE TABLE IF NOT EXISTS question_bank_entitlements (
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
  CONSTRAINT question_bank_entitlements_scope_check CHECK (
    (entitlement_type = 'feature' AND feature_key IS NOT NULL AND program_id IS NULL)
    OR (entitlement_type = 'program' AND program_id IS NOT NULL AND feature_key IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_question_bank_entitlements_feature_unique
  ON question_bank_entitlements(client_id, entitlement_type, feature_key)
  WHERE entitlement_type = 'feature';

CREATE UNIQUE INDEX IF NOT EXISTS idx_question_bank_entitlements_program_unique
  ON question_bank_entitlements(client_id, entitlement_type, program_id)
  WHERE entitlement_type = 'program';

CREATE INDEX IF NOT EXISTS idx_question_bank_entitlements_client
  ON question_bank_entitlements(client_id);

DROP TRIGGER IF EXISTS trg_question_bank_entitlements_updated ON question_bank_entitlements;
CREATE TRIGGER trg_question_bank_entitlements_updated
BEFORE UPDATE ON question_bank_entitlements
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

ALTER TABLE question_bank_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS question_bank_entitlements_tenant_isolation ON question_bank_entitlements;
CREATE POLICY question_bank_entitlements_tenant_isolation ON question_bank_entitlements
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());


CREATE TABLE IF NOT EXISTS exam_entitlements (
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
  CONSTRAINT exam_entitlements_scope_check CHECK (
    (entitlement_type = 'feature' AND feature_key IS NOT NULL AND program_id IS NULL)
    OR (entitlement_type = 'program' AND program_id IS NOT NULL AND feature_key IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_entitlements_feature_unique
  ON exam_entitlements(client_id, entitlement_type, feature_key)
  WHERE entitlement_type = 'feature';

CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_entitlements_program_unique
  ON exam_entitlements(client_id, entitlement_type, program_id)
  WHERE entitlement_type = 'program';

CREATE INDEX IF NOT EXISTS idx_exam_entitlements_client
  ON exam_entitlements(client_id);

DROP TRIGGER IF EXISTS trg_exam_entitlements_updated ON exam_entitlements;
CREATE TRIGGER trg_exam_entitlements_updated
BEFORE UPDATE ON exam_entitlements
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

ALTER TABLE exam_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS exam_entitlements_tenant_isolation ON exam_entitlements;
CREATE POLICY exam_entitlements_tenant_isolation ON exam_entitlements
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());
