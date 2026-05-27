-- ===============================
--  Learning Management System (LMS)
--  PostgreSQL Schema (v1.0)
-- ===============================

-- Enable case-insensitive text for emails
CREATE EXTENSION IF NOT EXISTS citext;

-- =====================================
-- 1. USERS TABLE
-- =====================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email CITEXT UNIQUE NOT NULL CHECK (email ~* '^.+@.+\..+$'),
  full_name TEXT NOT NULL CHECK (LENGTH(full_name) > 0),
  password_hash TEXT NOT NULL, -- bcrypt hash only
  role VARCHAR(30) NOT NULL
    CHECK (role IN ('super_admin', 'content_authorizer', 'client_admin',
                    'school_owner', 'teacher', 'student')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- =====================================
-- 2. ADMIN PERMISSIONS
-- =====================================
CREATE TABLE admin_permissions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_manage_courses BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  can_issue_certificates BOOLEAN DEFAULT FALSE,
  can_view_reports BOOLEAN DEFAULT FALSE,
  can_manage_scorm BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id)
);

-- =====================================
-- 3. COURSES
-- =====================================
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (LENGTH(title) > 0),
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 4. CONTENT ITEMS (Hierarchical Structure)
-- =====================================
CREATE TABLE content_items (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('folder', 'video', 'text', 'pdf', 'scorm', 'audio', 'html', 'link', 'exam')),
  title TEXT NOT NULL,
  content_url TEXT, -- For video/pdf/text/SCORM file location
  order_index INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::JSONB, -- Extra info (duration, file size, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_content_course ON content_items(course_id);
CREATE INDEX idx_content_parent ON content_items(parent_id);

-- =====================================
-- 5. ENROLLMENTS
-- =====================================
CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

CREATE INDEX idx_enroll_student ON enrollments(student_id);
CREATE INDEX idx_enroll_course ON enrollments(course_id);

-- =====================================
-- 6. SCORM ATTEMPTS (Tracking Runtime Data)
-- =====================================
CREATE TABLE student_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL DEFAULT 1,
  score_raw NUMERIC(5,2),
  completion_status VARCHAR(20)
    CHECK (completion_status IN ('not attempted', 'incomplete', 'completed', 'passed', 'failed')),
  suspend_data TEXT, -- SCORM suspend data for resume support
  total_time INTERVAL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, content_item_id, attempt_no)
);



-- =====================================
-- 7. CERTIFICATES (Auto-Issued)
-- =====================================
CREATE TABLE certificates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  certificate_url TEXT,
  UNIQUE(user_id, course_id)
);

-- =====================================
-- 8. TRIGGER (Auto-update updated_at)
-- =====================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_courses_updated
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_content_updated
BEFORE UPDATE ON content_items
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- END OF SCHEMA
-- =====================================


--drop the enrollments table 
-- Modify enrollments to support both students and teachers
--Your current table only tracks students. But teachers also need to be assigned to courses (especially if they didn’t create it).
DROP TABLE IF EXISTS enrollments;
-- Create new flexible enrollments table
CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('teacher', 'student')),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id) -- One role per course per user
);

CREATE INDEX idx_enroll_user ON enrollments(user_id);
CREATE INDEX idx_enroll_course ON enrollments(course_id);


-- Drop old constraint bez it does not accept the audio
ALTER TABLE content_items DROP CONSTRAINT content_items_item_type_check;

-- Add new one with 'audio', 'html', and 'link'
ALTER TABLE content_items
ADD CONSTRAINT content_items_item_type_check
CHECK (
  item_type = ANY (ARRAY['folder', 'video', 'text', 'pdf', 'scorm', 'audio', 'html', 'link', 'exam']::text[])
);

-- Find enrollments with invalid user_id
SELECT e.id, e.user_id, e.course_id
FROM enrollments e
LEFT JOIN users u ON e.user_id = u.id
WHERE u.id IS NULL;

-- Find enrollments with invalid course_id
SELECT e.id, e.user_id, e.course_id
FROM enrollments e
LEFT JOIN courses c ON e.course_id = c.id
WHERE c.id IS NULL;



-- ===============================
-- SPECTROPY LMS Schema Migration
-- v1.0 → v1.1
-- ===============================

-- =====================================
-- 1. CREATE NEW TABLES
-- =====================================

-- 1.1 CLIENTS (formerly tenants concept)
-- Purpose: Stores organizations/institutions using the platform
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  settings JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for auto-updating updated_at
CREATE TRIGGER trg_clients_updated
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.2 SCHOOLS
-- Purpose: Stores schools/campuses/branches within a client
CREATE TABLE schools (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  school_code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  board VARCHAR(50),
  affiliation_no VARCHAR(100),
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  phone VARCHAR(50),
  email VARCHAR(255),
  principal_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, school_code)
);

CREATE INDEX idx_schools_client ON schools(client_id);
CREATE INDEX idx_schools_status ON schools(status);

CREATE TRIGGER trg_schools_updated
BEFORE UPDATE ON schools
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.3 SCHOOL_MEMBERSHIPS
-- Purpose: Junction table linking users to schools with role scope
CREATE TABLE school_memberships (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_scope VARCHAR(30) NOT NULL CHECK (role_scope IN ('school_owner', 'teacher', 'student', 'admin')),
  is_primary BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, user_id)
);

CREATE INDEX idx_school_memberships_school ON school_memberships(school_id);
CREATE INDEX idx_school_memberships_user ON school_memberships(user_id);
CREATE INDEX idx_school_memberships_role ON school_memberships(role_scope);

CREATE TRIGGER trg_school_memberships_updated
BEFORE UPDATE ON school_memberships
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.4 BATCHES
-- Purpose: Stores batches/groups within a school
CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  metadata JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_client ON batches(client_id);
CREATE INDEX idx_batches_school ON batches(school_id);
CREATE INDEX idx_batches_active ON batches(is_active);

CREATE TRIGGER trg_batches_updated
BEFORE UPDATE ON batches
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.5 BATCH_MEMBERS
-- Purpose: Links users to batches
CREATE TABLE batch_members (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, user_id)
);

CREATE INDEX idx_batch_members_batch ON batch_members(batch_id);
CREATE INDEX idx_batch_members_user ON batch_members(user_id);

-- =====================================
-- 1.6 CONTENT_PACKS
-- Purpose: Bundles content items for licensing
CREATE TABLE content_packs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_content_packs_updated
BEFORE UPDATE ON content_packs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.7 CONTENT_PACK_ITEMS
-- Purpose: Junction table linking courses to packs
CREATE TABLE content_pack_items (
  pack_id INTEGER NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (pack_id, item_id)
);

CREATE INDEX idx_content_pack_items_pack ON content_pack_items(pack_id);
CREATE INDEX idx_content_pack_items_item ON content_pack_items(item_id);

-- =====================================
-- 1.8 CONTENT_ENTITLEMENTS
-- Purpose: Time-bound content licensing for clients
CREATE TABLE content_entitlements (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  pack_id INTEGER REFERENCES content_packs(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'grace', 'expired', 'revoked')),
  granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT content_or_pack_required CHECK (content_id IS NOT NULL OR pack_id IS NOT NULL)
);

CREATE INDEX idx_content_entitlements_client ON content_entitlements(client_id);
CREATE INDEX idx_content_entitlements_status ON content_entitlements(status);
CREATE INDEX idx_content_entitlements_dates ON content_entitlements(start_at, end_at);

-- =====================================
-- 1.9 ROLE_PERMISSIONS
-- Purpose: Configurable permissions per role
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  granted BOOLEAN DEFAULT TRUE,
  UNIQUE(client_id, role, permission)
);

CREATE INDEX idx_role_permissions_client ON role_permissions(client_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);

-- 1.9A USER_PERMISSIONS
-- Purpose: Per-user permission overrides
CREATE TABLE user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  granted BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, permission)
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);

-- =====================================
-- 1.10 AUDIT_LOGS
-- Purpose: Tracks all important actions in the system
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_client ON audit_logs(client_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =====================================
-- 1.11 SUBJECTS
-- Purpose: Master list of subjects for question bank
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subjects_client ON subjects(client_id);
CREATE UNIQUE INDEX idx_subjects_code ON subjects(COALESCE(client_id, 0), code);

-- =====================================
-- 1.12 CHAPTERS
-- Purpose: Chapters within a subject
CREATE TABLE chapters (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  chapter_number INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chapters_subject ON chapters(subject_id);
CREATE UNIQUE INDEX idx_chapters_number ON chapters(subject_id, chapter_number);

-- =====================================
-- 1.13 TOPICS
-- Purpose: Topics within a chapter
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  topic_number INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topics_chapter ON topics(chapter_id);

-- =====================================
-- 1.13A COMPREHENSION_PASSAGES
-- Purpose: Shared passage content linked to normal answerable questions
CREATE TABLE comprehension_passages (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  title JSONB NOT NULL,
  passage_content JSONB NOT NULL,
  program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
  grade_id INTEGER REFERENCES grades(id) ON DELETE SET NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  legacy_question_id INTEGER UNIQUE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comprehension_passages_client ON comprehension_passages(client_id);
CREATE INDEX idx_comprehension_passages_school ON comprehension_passages(school_id);
CREATE INDEX idx_comprehension_passages_subject ON comprehension_passages(subject_id);
CREATE INDEX idx_comprehension_passages_chapter ON comprehension_passages(chapter_id);

CREATE TRIGGER trg_comprehension_passages_updated
BEFORE UPDATE ON comprehension_passages
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.14 QUESTIONS
-- Purpose: Question bank
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    question_type VARCHAR(20) NOT NULL CHECK (
      question_type IN (
        'mcq_single',
        'mcq_multiple',
        'numerical',
        'true_false',
        'short_answer',
        'match_following',
        'fill_in_blank',
        'comprehensive'
      )
    ),
    question_text JSONB NOT NULL,
    options JSONB,
    correct_answer JSONB NOT NULL,
    solution JSONB,
    solution_video_url TEXT,
    scoring_mode VARCHAR(20) NOT NULL DEFAULT 'all_or_nothing' CHECK (
      scoring_mode IN ('all_or_nothing', 'partial', 'mixed')
    ),
    comprehension_passage JSONB,
    comprehension_questions JSONB,
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
  chapter_id INTEGER NOT NULL REFERENCES chapters(id),
  topic_id INTEGER REFERENCES topics(id),
  comprehension_passage_id INTEGER REFERENCES comprehension_passages(id) ON DELETE SET NULL,
  difficulty_level VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (
    difficulty_level IN ('easy', 'medium', 'hard')
  ),
  exam_tags TEXT[] DEFAULT '{}'::TEXT[],
  marks_positive DECIMAL(5,2) DEFAULT 4,
  marks_negative DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (
    status IN ('draft', 'approved', 'rejected', 'archived')
  ),
  created_by INTEGER NOT NULL REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_client ON questions(client_id);
CREATE INDEX idx_questions_school ON questions(school_id);
CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_chapter ON questions(chapter_id);
CREATE INDEX idx_questions_comprehension_passage_id ON questions(comprehension_passage_id);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_exam_tags ON questions USING GIN(exam_tags);

CREATE TRIGGER trg_questions_updated
BEFORE UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.15 EXAMS
-- Purpose: Exam definitions
CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  total_duration_minutes INTEGER NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  shuffle_questions BOOLEAN DEFAULT FALSE,
  shuffle_options BOOLEAN DEFAULT FALSE,
  show_result_immediately BOOLEAN DEFAULT TRUE,
  max_attempts INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'active', 'completed')
  ),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_client ON exams(client_id);
CREATE INDEX idx_exams_school ON exams(school_id);
CREATE INDEX idx_exams_status ON exams(status);

CREATE TRIGGER trg_exams_updated
BEFORE UPDATE ON exams
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.16 EXAM_SECTIONS
-- Purpose: Sections within an exam
CREATE TABLE exam_sections (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  order_index INTEGER NOT NULL,
  instructions TEXT,
  marks_per_question DECIMAL(5,2) DEFAULT 4,
  negative_marks DECIMAL(5,2) DEFAULT 1
);

CREATE INDEX idx_exam_sections_exam ON exam_sections(exam_id);

-- =====================================
-- 1.17 EXAM_QUESTIONS
-- Purpose: Junction table linking sections to questions
CREATE TABLE exam_questions (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  order_index INTEGER NOT NULL,
  marks_override DECIMAL(5,2),
  negative_override DECIMAL(5,2),
  UNIQUE(section_id, question_id)
);

CREATE INDEX idx_exam_questions_section ON exam_questions(section_id);

-- =====================================
-- 1.18 EXAM_ATTEMPTS
-- Purpose: Student attempts for an exam
CREATE TABLE exam_attempts (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  auto_submitted BOOLEAN DEFAULT FALSE,
  total_score DECIMAL(10,2),
  total_correct INTEGER,
  total_wrong INTEGER,
  total_unattempted INTEGER,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'submitted', 'graded')
  ),
  UNIQUE(exam_id, student_id, attempt_number)
);

CREATE INDEX idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_student ON exam_attempts(student_id);

-- =====================================
-- 1.19 EXAM_RESPONSES
-- Purpose: Per-question responses in an attempt
CREATE TABLE exam_responses (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  section_id INTEGER NOT NULL REFERENCES exam_sections(id),
  student_answer JSONB,
  is_correct BOOLEAN,
  marks_awarded DECIMAL(5,2),
  is_marked_for_review BOOLEAN DEFAULT FALSE,
  is_attempted BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMPTZ,
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX idx_exam_responses_attempt ON exam_responses(attempt_id);

-- =====================================
-- 2. MODIFY EXISTING TABLES
-- =====================================

-- 2.1 MODIFY USERS TABLE
-- Add client_id column and update role constraint

-- Add client_id column (nullable for platform-level roles)
-- Add client_id (which organization does user belong to)
ALTER TABLE users ADD COLUMN client_id INTEGER REFERENCES clients(id);

-- Add user_id for client-specific identification (like employee ID)
ALTER TABLE users ADD COLUMN user_id VARCHAR(100);


-- Add unique constraint for user_id within client
ALTER TABLE users ADD CONSTRAINT users_client_user_id_unique UNIQUE(client_id, user_id);

-- Create index for client_id
CREATE INDEX IF NOT EXISTS idx_users_client ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================
-- 2.2 MODIFY COURSES TABLE
-- Add client_id and school_id columns

-- Add client_id column
ALTER TABLE courses ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE;

-- Add school_id column (nullable - courses can be at client level)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_client ON courses(client_id);
CREATE INDEX IF NOT EXISTS idx_courses_school ON courses(school_id);

-- =====================================
-- 3. FIX EXISTING INDEX NAMES
-- =====================================

-- Fix the incorrect index name in original schema (scorm_attempts vs student_attempts)
DROP INDEX IF EXISTS idx_scorm_user;
DROP INDEX IF EXISTS idx_scorm_content;

CREATE INDEX IF NOT EXISTS idx_student_attempts_user ON student_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_content ON student_attempts(content_item_id);

-- =====================================
-- 4. INSERT DEFAULT ROLE PERMISSIONS
-- =====================================

-- Global default permissions (client_id = NULL)
INSERT INTO role_permissions (client_id, role, permission, granted) VALUES
-- Super Admin - Full platform access
(NULL, 'super_admin', 'users.create', TRUE),
(NULL, 'super_admin', 'users.read', TRUE),
(NULL, 'super_admin', 'users.update', TRUE),
(NULL, 'super_admin', 'users.delete', TRUE),
(NULL, 'super_admin', 'schools.create', TRUE),
(NULL, 'super_admin', 'schools.read', TRUE),
(NULL, 'super_admin', 'schools.update', TRUE),
(NULL, 'super_admin', 'schools.delete', TRUE),
(NULL, 'super_admin', 'courses.create', TRUE),
(NULL, 'super_admin', 'courses.read', TRUE),
(NULL, 'super_admin', 'courses.update', TRUE),
(NULL, 'super_admin', 'courses.delete', TRUE),
(NULL, 'super_admin', 'courses.publish', TRUE),
(NULL, 'super_admin', 'batches.create', TRUE),
(NULL, 'super_admin', 'batches.read', TRUE),
(NULL, 'super_admin', 'batches.update', TRUE),
(NULL, 'super_admin', 'batches.delete', TRUE),
(NULL, 'super_admin', 'enrollments.enroll', TRUE),
(NULL, 'super_admin', 'enrollments.remove', TRUE),
(NULL, 'super_admin', 'reports.view', TRUE),
(NULL, 'super_admin', 'reports.export', TRUE),
(NULL, 'super_admin', 'certificates.issue', TRUE),
(NULL, 'super_admin', 'certificates.view', TRUE),

-- Content Authorizer - Content management only
(NULL, 'content_authorizer', 'courses.create', TRUE),
(NULL, 'content_authorizer', 'courses.read', TRUE),
(NULL, 'content_authorizer', 'courses.update', TRUE),
(NULL, 'content_authorizer', 'courses.publish', TRUE),

-- Client Admin - Full client access
(NULL, 'client_admin', 'users.create', TRUE),
(NULL, 'client_admin', 'users.read', TRUE),
(NULL, 'client_admin', 'users.update', TRUE),
(NULL, 'client_admin', 'users.delete', TRUE),
(NULL, 'client_admin', 'schools.create', TRUE),
(NULL, 'client_admin', 'schools.read', TRUE),
(NULL, 'client_admin', 'schools.update', TRUE),
(NULL, 'client_admin', 'schools.delete', TRUE),
(NULL, 'client_admin', 'courses.create', TRUE),
(NULL, 'client_admin', 'courses.read', TRUE),
(NULL, 'client_admin', 'courses.update', TRUE),
(NULL, 'client_admin', 'courses.delete', TRUE),
(NULL, 'client_admin', 'courses.publish', TRUE),
(NULL, 'client_admin', 'batches.create', TRUE),
(NULL, 'client_admin', 'batches.read', TRUE),
(NULL, 'client_admin', 'batches.update', TRUE),
(NULL, 'client_admin', 'batches.delete', TRUE),
(NULL, 'client_admin', 'enrollments.enroll', TRUE),
(NULL, 'client_admin', 'enrollments.remove', TRUE),
(NULL, 'client_admin', 'reports.view', TRUE),
(NULL, 'client_admin', 'reports.export', TRUE),
(NULL, 'client_admin', 'certificates.issue', TRUE),
(NULL, 'client_admin', 'certificates.view', TRUE),

-- School Owner - School-level access
(NULL, 'school_owner', 'users.create', TRUE),
(NULL, 'school_owner', 'users.read', TRUE),
(NULL, 'school_owner', 'users.update', TRUE),
(NULL, 'school_owner', 'schools.read', TRUE),
(NULL, 'school_owner', 'schools.update', TRUE),
(NULL, 'school_owner', 'courses.create', TRUE),
(NULL, 'school_owner', 'courses.read', TRUE),
(NULL, 'school_owner', 'courses.update', TRUE),
(NULL, 'school_owner', 'batches.create', TRUE),
(NULL, 'school_owner', 'batches.read', TRUE),
(NULL, 'school_owner', 'batches.update', TRUE),
(NULL, 'school_owner', 'batches.delete', TRUE),
(NULL, 'school_owner', 'enrollments.enroll', TRUE),
(NULL, 'school_owner', 'enrollments.remove', TRUE),
(NULL, 'school_owner', 'reports.view', TRUE),
(NULL, 'school_owner', 'certificates.view', TRUE),

-- Teacher - Batch-level access
(NULL, 'teacher', 'users.read', TRUE),
(NULL, 'teacher', 'courses.read', TRUE),
(NULL, 'teacher', 'batches.read', TRUE),
(NULL, 'teacher', 'enrollments.enroll', TRUE),
(NULL, 'teacher', 'enrollments.remove', TRUE),
(NULL, 'teacher', 'reports.view', TRUE),
(NULL, 'teacher', 'certificates.view', TRUE),

-- Student - Self access only
(NULL, 'student', 'courses.read', TRUE),
(NULL, 'student', 'certificates.view', TRUE)
ON CONFLICT (client_id, role, permission) DO NOTHING;

-- =====================================
-- 5. HELPER FUNCTIONS
-- =====================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id INTEGER,
  p_permission VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR(30);
  v_client_id INTEGER;
  v_granted BOOLEAN;
BEGIN
  -- Get user's role and client_id
  SELECT role, client_id INTO v_role, v_client_id
  FROM users WHERE id = p_user_id;
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check client-specific permission first, then global default
  SELECT granted INTO v_granted
  FROM role_permissions
  WHERE role = v_role 
    AND permission = p_permission
    AND (client_id = v_client_id OR client_id IS NULL)
  ORDER BY client_id NULLS LAST
  LIMIT 1;
  
  RETURN COALESCE(v_granted, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit(
  p_client_id INTEGER,
  p_actor_id INTEGER,
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_entity_id VARCHAR(50),
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_log_id BIGINT;
BEGIN
  INSERT INTO audit_logs (
    client_id, actor_id, action, entity_type, entity_id,
    before_state, after_state, ip_address, user_agent
  ) VALUES (
    p_client_id, p_actor_id, p_action, p_entity_type, p_entity_id,
    p_before_state, p_after_state, p_ip_address, p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check content entitlement
CREATE OR REPLACE FUNCTION client_has_content_access(
  p_client_id INTEGER,
  p_content_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM content_entitlements ce
    LEFT JOIN content_pack_items cpi ON ce.pack_id = cpi.pack_id
    LEFT JOIN content_items ci ON ci.course_id = cpi.item_id
    WHERE ce.client_id = p_client_id
      AND ce.status = 'active'
      AND NOW() BETWEEN ce.start_at AND ce.end_at
      AND (ce.content_id = p_content_id OR ci.id = p_content_id)
    ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- 6. VIEWS FOR COMMON QUERIES
-- =====================================

-- View: User's complete hierarchy info
CREATE OR REPLACE VIEW user_hierarchy AS
SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  u.role,
  u.client_id,
  c.name AS client_name,
  c.slug AS client_slug,
  sm.school_id,
  s.name AS school_name,
  s.school_code,
  sm.role_scope,
  sm.is_primary AS is_primary_school
FROM users u
LEFT JOIN clients c ON u.client_id = c.id
LEFT JOIN school_memberships sm ON u.id = sm.user_id AND sm.status = 'active'
LEFT JOIN schools s ON sm.school_id = s.id;

-- =====================================
-- 6.1 FIX ROLE LENGTH FOR NEW ROLES
-- =====================================
-- NOTE: View depends on users.role, so drop/recreate when altering type.
DROP VIEW IF EXISTS user_hierarchy;

ALTER TABLE users
ALTER COLUMN role TYPE VARCHAR(30);

CREATE OR REPLACE VIEW user_hierarchy AS
SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  u.role,
  u.client_id,
  c.name AS client_name,
  c.slug AS client_slug,
  sm.school_id,
  s.name AS school_name,
  s.school_code,
  sm.role_scope,
  sm.is_primary AS is_primary_school
FROM users u
LEFT JOIN clients c ON u.client_id = c.id
LEFT JOIN school_memberships sm ON u.id = sm.user_id AND sm.status = 'active'
LEFT JOIN schools s ON sm.school_id = s.id;

-- View: Content with entitlement status per client
CREATE OR REPLACE VIEW client_content_access AS
SELECT 
  ci.id AS content_id,
  ci.title AS content_title,
  ci.item_type,
  co.id AS course_id,
  co.title AS course_title,
  ce.client_id,
  c.name AS client_name,
  ce.status AS entitlement_status,
  ce.start_at,
  ce.end_at,
  CASE 
    WHEN ce.status = 'active' AND NOW() BETWEEN ce.start_at AND ce.end_at THEN TRUE
    ELSE FALSE
  END AS has_active_access
FROM content_items ci
JOIN courses co ON ci.course_id = co.id
LEFT JOIN content_pack_items cpi ON ci.course_id = cpi.item_id
LEFT JOIN content_entitlements ce ON (ce.content_id = ci.id OR ce.pack_id = cpi.pack_id)
LEFT JOIN clients c ON ce.client_id = c.id;

-- =====================================
-- 7. SAMPLE DATA FOR TESTING
-- =====================================

-- Insert sample client
INSERT INTO clients (name, slug, timezone, settings, is_active) VALUES
('Future Academy', 'future-academy', 'Asia/Kolkata', '{"theme": "default", "features": {"scorm": true}}'::JSONB, TRUE),
('Narayana Coaching', 'narayana', 'Asia/Kolkata', '{"theme": "blue"}'::JSONB, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample schools
INSERT INTO schools (client_id, school_code, name, board, city, state, status) VALUES
(1, 'MAIN', 'Future Academy Main Campus', 'CBSE', 'Hyderabad', 'Telangana', 'active'),
(1, 'NORTH', 'Future Academy North Branch', 'CBSE', 'Secunderabad', 'Telangana', 'active'),
(2, 'HQ', 'Narayana HQ Campus', 'CBSE', 'Hyderabad', 'Telangana', 'active')
ON CONFLICT (client_id, school_code) DO NOTHING;

-- Insert sample subjects
INSERT INTO subjects (client_id, name, code, description, display_order, is_active)
SELECT 1, 'Mathematics', 'MATH', 'Core mathematics', 1, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE COALESCE(client_id, 0) = 1 AND code = 'MATH'
);

-- Insert sample chapters
INSERT INTO chapters (subject_id, name, chapter_number, description, is_active)
SELECT s.id, 'Algebra Basics', 1, 'Linear equations and expressions', TRUE
FROM subjects s
WHERE s.client_id = 1 AND s.code = 'MATH'
ON CONFLICT (subject_id, chapter_number) DO NOTHING;

-- Insert sample topics
INSERT INTO topics (chapter_id, name, topic_number, is_active)
SELECT c.id, 'Linear Equations', 1, TRUE
FROM chapters c
JOIN subjects s ON s.id = c.subject_id
WHERE s.client_id = 1 AND s.code = 'MATH' AND c.chapter_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM topics t WHERE t.chapter_id = c.id AND t.topic_number = 1
  );

-- Insert sample question (only if a user exists)
WITH creator AS (
  SELECT id FROM users ORDER BY id LIMIT 1
),
subject AS (
  SELECT id FROM subjects WHERE client_id = 1 AND code = 'MATH' LIMIT 1
),
chapter AS (
  SELECT id FROM chapters WHERE subject_id = (SELECT id FROM subject) AND chapter_number = 1 LIMIT 1
),
topic AS (
  SELECT id FROM topics WHERE chapter_id = (SELECT id FROM chapter) AND topic_number = 1 LIMIT 1
)
INSERT INTO questions (
  client_id, school_id, question_type, question_text, options, correct_answer,
  solution, solution_video_url, subject_id, chapter_id, topic_id,
  difficulty_level, exam_tags, marks_positive, marks_negative, status,
  created_by, approved_by, approved_at, rejection_reason, created_at, updated_at
)
SELECT
  1,
  1,
  'mcq_single',
  '{"text":"What is 2 + 2?"}'::JSONB,
  '{"A":"3","B":"4","C":"5","D":"6"}'::JSONB,
  '["B"]'::JSONB,
  '{"text":"2 + 2 = 4"}'::JSONB,
  NULL,
  subject.id,
  chapter.id,
  topic.id,
  'easy',
  ARRAY['practice'],
  4,
  0,
  'approved',
  creator.id,
  creator.id,
  NOW(),
  NULL,
  NOW(),
  NOW()
FROM creator
CROSS JOIN subject
CROSS JOIN chapter
CROSS JOIN topic
WHERE creator.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM questions q
    WHERE q.question_text = '{"text":"What is 2 + 2?"}'::JSONB
      AND q.subject_id = subject.id
  );

-- Insert sample exam + section + question link (only if a user exists)
WITH creator AS (
  SELECT id FROM users ORDER BY id LIMIT 1
),
ins_exam AS (
  INSERT INTO exams (
    client_id, school_id, title, description, total_duration_minutes,
    start_datetime, end_datetime, shuffle_questions, shuffle_options,
    show_result_immediately, max_attempts, status, created_by, created_at, updated_at
  )
  SELECT
    1,
    1,
    'Sample Midterm',
    'Demo exam for question bank',
    60,
    NOW(),
    NOW() + INTERVAL '7 days',
    FALSE,
    FALSE,
    TRUE,
    1,
    'published',
    creator.id,
    NOW(),
    NOW()
  FROM creator
  WHERE creator.id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM exams e WHERE e.client_id = 1 AND e.title = 'Sample Midterm'
    )
  RETURNING id
),
ins_section AS (
  INSERT INTO exam_sections (exam_id, title, order_index, instructions, marks_per_question, negative_marks)
  SELECT id, 'Section A', 1, 'Answer all questions', 4, 1
  FROM ins_exam
  RETURNING id, exam_id
)
INSERT INTO exam_questions (section_id, question_id, order_index)
SELECT s.id, q.id, 1
FROM ins_section s
JOIN questions q ON q.question_text = '{"text":"What is 2 + 2?"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions eq WHERE eq.section_id = s.id AND eq.question_id = q.id
);

-- Update existing super_admin user to have proper role
UPDATE users SET role = 'super_admin', client_id = NULL 
WHERE email = 'super@lms.com';

-- =====================================
-- END OF MIGRATION SCRIPT
-- =====================================

-- =====================================
-- 7.1 REFRESH TOKENS (Auth Sessions)
-- =====================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by TEXT,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- =====================================
-- 8. ROW LEVEL SECURITY (SUPABASE)
-- Requires JWT claims: client_id, role
-- =====================================

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION app_client_id()
RETURNS INTEGER AS $$
  SELECT NULLIF((auth.jwt() ->> 'client_id'), '')::INTEGER;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_role()
RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', '');
$$ LANGUAGE sql STABLE;

-- CLIENTS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clients_tenant_isolation ON clients
  FOR ALL
  USING (app_role() = 'super_admin' OR id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR id = app_client_id());

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- ADMIN PERMISSIONS (scoped by user's client)
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_permissions_tenant_isolation ON admin_permissions
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = admin_id AND u.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = admin_id AND u.client_id = app_client_id()
    )
  );

-- SCHOOLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY schools_tenant_isolation ON schools
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- SCHOOL MEMBERSHIPS (scoped by school->client)
ALTER TABLE school_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY school_memberships_tenant_isolation ON school_memberships
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM schools s
      WHERE s.id = school_id AND s.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM schools s
      WHERE s.id = school_id AND s.client_id = app_client_id()
    )
  );

-- BATCHES
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY batches_tenant_isolation ON batches
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- BATCH MEMBERS (scoped by batch->client)
ALTER TABLE batch_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY batch_members_tenant_isolation ON batch_members
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM batches b
      WHERE b.id = batch_id AND b.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM batches b
      WHERE b.id = batch_id AND b.client_id = app_client_id()
    )
  );

-- COURSES
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY courses_tenant_isolation ON courses
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- CONTENT ITEMS (scoped by course->client)
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_items_tenant_isolation ON content_items
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  );

-- ENROLLMENTS (scoped by course->client)
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrollments_tenant_isolation ON enrollments
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  );

-- STUDENT ATTEMPTS (scoped by content->course->client)
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_attempts_tenant_isolation ON student_attempts
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM content_items ci
      JOIN courses c ON ci.course_id = c.id
      WHERE ci.id = content_item_id AND c.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM content_items ci
      JOIN courses c ON ci.course_id = c.id
      WHERE ci.id = content_item_id AND c.client_id = app_client_id()
    )
  );

-- CERTIFICATES (scoped by course->client)
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY certificates_tenant_isolation ON certificates
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  );

-- CONTENT PACKS (platform-only by default)
ALTER TABLE content_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_packs_platform_only ON content_packs
  FOR ALL
  USING (app_role() = 'super_admin')
  WITH CHECK (app_role() = 'super_admin');

-- CONTENT PACK ITEMS (platform-only by default)
ALTER TABLE content_pack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_pack_items_platform_only ON content_pack_items
  FOR ALL
  USING (app_role() = 'super_admin')
  WITH CHECK (app_role() = 'super_admin');

-- CONTENT ENTITLEMENTS
ALTER TABLE content_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_entitlements_tenant_isolation ON content_entitlements
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- ROLE PERMISSIONS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_permissions_select ON role_permissions
  FOR SELECT
  USING (app_role() = 'super_admin' OR client_id = app_client_id() OR client_id IS NULL);
CREATE POLICY role_permissions_insert ON role_permissions
  FOR INSERT
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());
CREATE POLICY role_permissions_update ON role_permissions
  FOR UPDATE
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());
CREATE POLICY role_permissions_delete ON role_permissions
  FOR DELETE
  USING (app_role() = 'super_admin' OR client_id = app_client_id());

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_permissions_select ON user_permissions
  FOR SELECT
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id AND u.client_id = app_client_id()
    )
  );
CREATE POLICY user_permissions_insert ON user_permissions
  FOR INSERT
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id AND u.client_id = app_client_id()
    )
  );
CREATE POLICY user_permissions_update ON user_permissions
  FOR UPDATE
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id AND u.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id AND u.client_id = app_client_id()
    )
  );
CREATE POLICY user_permissions_delete ON user_permissions
  FOR DELETE
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id AND u.client_id = app_client_id()
    )
  );

-- AUDIT LOGS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- SUBJECTS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY subjects_tenant_isolation ON subjects
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- CHAPTERS (scoped by subject->client)
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY chapters_tenant_isolation ON chapters
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_id AND s.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_id AND s.client_id = app_client_id()
    )
  );

-- TOPICS (scoped by chapter->subject->client)
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY topics_tenant_isolation ON topics
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM chapters ch
      JOIN subjects s ON ch.subject_id = s.id
      WHERE ch.id = chapter_id AND s.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM chapters ch
      JOIN subjects s ON ch.subject_id = s.id
      WHERE ch.id = chapter_id AND s.client_id = app_client_id()
    )
  );

-- QUESTIONS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY questions_tenant_isolation ON questions
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- EXAMS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY exams_tenant_isolation ON exams
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- EXAM SECTIONS (scoped by exam->client)
ALTER TABLE exam_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_sections_tenant_isolation ON exam_sections
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.client_id = app_client_id()
    )
  );

-- EXAM QUESTIONS (scoped by exam->client)
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_questions_tenant_isolation ON exam_questions
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM exam_sections es
      JOIN exams e ON es.exam_id = e.id
      WHERE es.id = section_id AND e.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM exam_sections es
      JOIN exams e ON es.exam_id = e.id
      WHERE es.id = section_id AND e.client_id = app_client_id()
    )
  );

-- EXAM ATTEMPTS (scoped by exam->client)
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_attempts_tenant_isolation ON exam_attempts
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.client_id = app_client_id()
    )
  );

-- EXAM RESPONSES (scoped by exam->client)
ALTER TABLE exam_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_responses_tenant_isolation ON exam_responses
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      WHERE ea.id = attempt_id AND e.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      WHERE ea.id = attempt_id AND e.client_id = app_client_id()
    )
  );

-- =====================================
-- 7. TEACHER SESSION TRACKER MVP
-- =====================================

-- 7.1 PROGRAM_MICRO_SCHEDULE_UPLOADS
-- Purpose: Stores uploaded micro schedule files for shared programs
CREATE TABLE IF NOT EXISTS program_micro_schedule_uploads (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL,
  uploaded_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  file_storage_path TEXT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1 CHECK (version_no > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'processed', 'published', 'failed', 'archived')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_program_micro_schedule_uploads_program
  ON program_micro_schedule_uploads(program_id);
CREATE INDEX IF NOT EXISTS idx_program_micro_schedule_uploads_status
  ON program_micro_schedule_uploads(status);

CREATE TRIGGER trg_program_micro_schedule_uploads_updated
BEFORE UPDATE ON program_micro_schedule_uploads
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- 7.2 PROGRAM_MICRO_SCHEDULE_ROWS
-- Purpose: Parsed row-wise micro schedule data
CREATE TABLE IF NOT EXISTS program_micro_schedule_rows (
  id BIGSERIAL PRIMARY KEY,
  micro_schedule_upload_id INTEGER NOT NULL REFERENCES program_micro_schedule_uploads(id) ON DELETE CASCADE,
  program_id INTEGER NOT NULL,
  row_no INTEGER NOT NULL CHECK (row_no > 0),
  serial_no INTEGER,
  grade_label VARCHAR(100) NOT NULL,
  subject_label VARCHAR(150) NOT NULL,
  session_label VARCHAR(100) NOT NULL,
  session_no INTEGER NOT NULL CHECK (session_no > 0),
  chapter_label VARCHAR(255) NOT NULL,
  learning_goal TEXT,
  topic_label TEXT,
  raw_row_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  normalized_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(micro_schedule_upload_id, row_no)
);

CREATE INDEX IF NOT EXISTS idx_program_micro_schedule_rows_upload
  ON program_micro_schedule_rows(micro_schedule_upload_id);
CREATE INDEX IF NOT EXISTS idx_program_micro_schedule_rows_mapping
  ON program_micro_schedule_rows(program_id, session_no, chapter_label);

-- 7.3 PROGRAM_LESSON_PLANNER_UPLOADS
-- Purpose: Stores uploaded lesson planner files for shared programs
CREATE TABLE IF NOT EXISTS program_lesson_planner_uploads (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL,
  uploaded_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  file_storage_path TEXT NOT NULL,
  source_type VARCHAR(20) NOT NULL DEFAULT 'docx' CHECK (
    source_type IN ('docx', 'pdf', 'excel')
  ),
  version_no INTEGER NOT NULL DEFAULT 1 CHECK (version_no > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'processed', 'published', 'failed', 'archived')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, source_type, version_no)
);

CREATE INDEX IF NOT EXISTS idx_program_lesson_planner_uploads_program
  ON program_lesson_planner_uploads(program_id);
CREATE INDEX IF NOT EXISTS idx_program_lesson_planner_uploads_status
  ON program_lesson_planner_uploads(status);

CREATE TRIGGER trg_program_lesson_planner_uploads_updated
BEFORE UPDATE ON program_lesson_planner_uploads
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- 7.4 PROGRAM_LESSON_PLANNER_SESSIONS
-- Purpose: Parsed session-wise planner content
CREATE TABLE IF NOT EXISTS program_lesson_planner_sessions (
  id BIGSERIAL PRIMARY KEY,
  lesson_planner_upload_id INTEGER NOT NULL REFERENCES program_lesson_planner_uploads(id) ON DELETE CASCADE,
  program_id INTEGER NOT NULL,
  session_no INTEGER NOT NULL CHECK (session_no > 0),
  session_label VARCHAR(100) NOT NULL,
  part_type VARCHAR(20) NOT NULL DEFAULT 'teaching' CHECK (
    part_type IN ('teaching', 'board_exam')
  ),
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  title TEXT NOT NULL,
  chapter_label VARCHAR(255),
  topic_label TEXT,
  learning_objectives JSONB DEFAULT '[]'::JSONB,
  materials_needed TEXT,
  worksheet_questions_covered TEXT,
  shortcuts_introduced TEXT,
  common_errors_addressed TEXT,
  homework TEXT,
  next_session_preview TEXT,
  pedagogy_note TEXT,
  minute_plan_json JSONB DEFAULT '[]'::JSONB,
  teacher_script_text TEXT,
  raw_source_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  normalized_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_planner_upload_id, session_no, part_type)
);

CREATE INDEX IF NOT EXISTS idx_program_lesson_planner_sessions_upload
  ON program_lesson_planner_sessions(lesson_planner_upload_id);
CREATE INDEX IF NOT EXISTS idx_program_lesson_planner_sessions_mapping
  ON program_lesson_planner_sessions(program_id, session_no, chapter_label);

-- 7.5 PROGRAM_SESSION_TEMPLATES
-- Purpose: Final mapped template records plus mapping issue state
CREATE TABLE IF NOT EXISTS program_session_templates (
  id BIGSERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL,
  template_version_no INTEGER NOT NULL DEFAULT 1 CHECK (template_version_no > 0),
  grade_label VARCHAR(100) NOT NULL,
  subject_label VARCHAR(150) NOT NULL,
  session_no INTEGER NOT NULL CHECK (session_no > 0),
  session_label VARCHAR(100) NOT NULL,
  chapter_label VARCHAR(255),
  learning_goal TEXT,
  topic_label TEXT,
  planner_title TEXT,
  part_type VARCHAR(20) NOT NULL DEFAULT 'teaching' CHECK (
    part_type IN ('teaching', 'board_exam')
  ),
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  learning_objectives JSONB DEFAULT '[]'::JSONB,
  materials_needed TEXT,
  worksheet_questions_covered TEXT,
  shortcuts_introduced TEXT,
  common_errors_addressed TEXT,
  homework TEXT,
  next_session_preview TEXT,
  pedagogy_note TEXT,
  minute_plan_json JSONB DEFAULT '[]'::JSONB,
  teacher_script_text TEXT,
  micro_schedule_row_id BIGINT REFERENCES program_micro_schedule_rows(id) ON DELETE SET NULL,
  lesson_planner_session_id BIGINT REFERENCES program_lesson_planner_sessions(id) ON DELETE SET NULL,
  mapping_status VARCHAR(20) NOT NULL DEFAULT 'matched' CHECK (
    mapping_status IN ('matched', 'unmatched_micro', 'unmatched_planner', 'conflict')
  ),
  issue_details JSONB DEFAULT '{}'::JSONB,
  is_published BOOLEAN DEFAULT FALSE,
  published_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_session_templates_program
  ON program_session_templates(program_id, template_version_no);
CREATE INDEX IF NOT EXISTS idx_program_session_templates_mapping
  ON program_session_templates(mapping_status, is_published);

CREATE TRIGGER trg_program_session_templates_updated
BEFORE UPDATE ON program_session_templates
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- 7.6 CLIENT_ENTITLEMENTS
-- Purpose: Stores tracker feature enablement and program access by client
CREATE TABLE IF NOT EXISTS client_entitlements (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  entitlement_type VARCHAR(20) NOT NULL CHECK (
    entitlement_type IN ('feature', 'program')
  ),
  feature_key VARCHAR(100),
  program_id INTEGER,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT client_entitlements_scope_check CHECK (
    (entitlement_type = 'feature' AND feature_key IS NOT NULL AND program_id IS NULL)
    OR (entitlement_type = 'program' AND program_id IS NOT NULL AND feature_key IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_entitlements_feature_unique
  ON client_entitlements(client_id, entitlement_type, feature_key)
  WHERE entitlement_type = 'feature';
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_entitlements_program_unique
  ON client_entitlements(client_id, entitlement_type, program_id)
  WHERE entitlement_type = 'program';
CREATE INDEX IF NOT EXISTS idx_client_entitlements_client
  ON client_entitlements(client_id);

CREATE TRIGGER trg_client_entitlements_updated
BEFORE UPDATE ON client_entitlements
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- 7.7 QUESTION_BANK_ENTITLEMENTS
-- Purpose: Stores Question Bank feature enablement and program access by client
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

-- 7.8 EXAM_ENTITLEMENTS
-- Purpose: Stores Exams feature enablement and program access by client
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

-- 7.9 TEACHING_SESSIONS
-- Purpose: Live client-scoped teaching sessions derived from shared templates
CREATE TABLE IF NOT EXISTS teaching_sessions (
  id BIGSERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  program_id INTEGER NOT NULL,
  program_session_template_id BIGINT REFERENCES program_session_templates(id) ON DELETE SET NULL,
  grade_label VARCHAR(100) NOT NULL,
  subject_label VARCHAR(150) NOT NULL,
  chapter_label VARCHAR(255),
  session_no INTEGER NOT NULL CHECK (session_no > 0),
  session_label VARCHAR(100) NOT NULL,
  part_type VARCHAR(20) NOT NULL DEFAULT 'teaching' CHECK (
    part_type IN ('teaching', 'board_exam')
  ),
  planned_date DATE NOT NULL,
  period_slot VARCHAR(100),
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  teacher_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  learning_goal TEXT,
  topic_label TEXT,
  planner_title TEXT,
  learning_objectives JSONB DEFAULT '[]'::JSONB,
  materials_needed TEXT,
  worksheet_questions_covered TEXT,
  shortcuts_introduced TEXT,
  common_errors_addressed TEXT,
  homework TEXT,
  next_session_preview TEXT,
  pedagogy_note TEXT,
  minute_plan_json JSONB DEFAULT '[]'::JSONB,
  teacher_script_text TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'completed', 'partially_completed', 'not_completed', 'update_pending', 'lagging')
  ),
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  actual_date DATE,
  topics_covered TEXT,
  pending_topics TEXT,
  reason_code VARCHAR(100),
  remarks TEXT,
  last_updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teaching_sessions_client_date
  ON teaching_sessions(client_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_teaching_sessions_school_date
  ON teaching_sessions(school_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_teaching_sessions_teacher_date
  ON teaching_sessions(teacher_user_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_teaching_sessions_status
  ON teaching_sessions(status);

CREATE TRIGGER trg_teaching_sessions_updated
BEFORE UPDATE ON teaching_sessions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- 7.8 TEACHING_SESSION_UPDATES
-- Purpose: Audit trail of teacher session updates
CREATE TABLE IF NOT EXISTS teaching_session_updates (
  id BIGSERIAL PRIMARY KEY,
  teaching_session_id BIGINT NOT NULL REFERENCES teaching_sessions(id) ON DELETE CASCADE,
  teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status_submitted VARCHAR(20) NOT NULL CHECK (
    status_submitted IN ('completed', 'partially_completed', 'not_completed')
  ),
  completion_percentage INTEGER NOT NULL CHECK (completion_percentage BETWEEN 0 AND 100),
  actual_date DATE,
  topics_covered TEXT,
  pending_topics TEXT,
  reason_code VARCHAR(100),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teaching_session_updates_session
  ON teaching_session_updates(teaching_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teaching_session_updates_teacher
  ON teaching_session_updates(teacher_user_id, created_at DESC);

-- 7.9 TEACHER_SESSION_TRACKER_PERMISSIONS
-- Purpose: Client-scoped tracker access grants for teachers
CREATE TABLE IF NOT EXISTS teacher_session_tracker_permissions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  program_id INTEGER,
  can_view_tracker BOOLEAN NOT NULL DEFAULT TRUE,
  can_update_tracker BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, teacher_user_id, school_id, batch_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_tracker_permissions_client
  ON teacher_session_tracker_permissions(client_id);
CREATE INDEX IF NOT EXISTS idx_teacher_tracker_permissions_teacher
  ON teacher_session_tracker_permissions(teacher_user_id);

CREATE TRIGGER trg_teacher_session_tracker_permissions_updated
BEFORE UPDATE ON teacher_session_tracker_permissions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- 7.10 TRACKER ROLE PERMISSIONS
INSERT INTO role_permissions (client_id, role, permission, granted) VALUES
(NULL, 'super_admin', 'teaching_sessions.feature_enable', TRUE),
(NULL, 'super_admin', 'teaching_sessions.program_publish', TRUE),
(NULL, 'content_authorizer', 'teaching_sessions.program_upload', TRUE),
(NULL, 'content_authorizer', 'teaching_sessions.program_publish', TRUE),
(NULL, 'client_admin', 'teaching_sessions.client_setup', TRUE),
(NULL, 'client_admin', 'teaching_sessions.assign_teacher', TRUE),
(NULL, 'client_admin', 'teaching_sessions.read_client', TRUE),
(NULL, 'client_admin', 'teaching_sessions.analytics_client', TRUE),
(NULL, 'school_owner', 'teaching_sessions.read_school', TRUE),
(NULL, 'school_owner', 'teaching_sessions.analytics_school', TRUE),
(NULL, 'teacher', 'teaching_sessions.read_own', TRUE),
(NULL, 'teacher', 'teaching_sessions.update_own', TRUE),
(NULL, 'teacher', 'teaching_sessions.analytics_own', TRUE)
ON CONFLICT (client_id, role, permission) DO NOTHING;

-- 7.11 TRACKER ROW LEVEL SECURITY

-- Platform planning tables: available to super_admin and content_authorizer
ALTER TABLE program_micro_schedule_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_micro_schedule_uploads_platform_only ON program_micro_schedule_uploads
  FOR ALL
  USING (app_role() IN ('super_admin', 'content_authorizer'))
  WITH CHECK (app_role() IN ('super_admin', 'content_authorizer'));

ALTER TABLE program_micro_schedule_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_micro_schedule_rows_platform_only ON program_micro_schedule_rows
  FOR ALL
  USING (app_role() IN ('super_admin', 'content_authorizer'))
  WITH CHECK (app_role() IN ('super_admin', 'content_authorizer'));

ALTER TABLE program_lesson_planner_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_lesson_planner_uploads_platform_only ON program_lesson_planner_uploads
  FOR ALL
  USING (app_role() IN ('super_admin', 'content_authorizer'))
  WITH CHECK (app_role() IN ('super_admin', 'content_authorizer'));

ALTER TABLE program_lesson_planner_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_lesson_planner_sessions_platform_only ON program_lesson_planner_sessions
  FOR ALL
  USING (app_role() IN ('super_admin', 'content_authorizer'))
  WITH CHECK (app_role() IN ('super_admin', 'content_authorizer'));

ALTER TABLE program_session_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_session_templates_platform_read_publish ON program_session_templates
  FOR ALL
  USING (app_role() IN ('super_admin', 'content_authorizer'))
  WITH CHECK (app_role() IN ('super_admin', 'content_authorizer'));

-- Client-scoped tables
ALTER TABLE client_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_entitlements_tenant_isolation ON client_entitlements
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

ALTER TABLE question_bank_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY question_bank_entitlements_tenant_isolation ON question_bank_entitlements
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

ALTER TABLE exam_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_entitlements_tenant_isolation ON exam_entitlements
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

ALTER TABLE teaching_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY teaching_sessions_tenant_isolation ON teaching_sessions
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

ALTER TABLE teaching_session_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY teaching_session_updates_tenant_isolation ON teaching_session_updates
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM teaching_sessions ts
      WHERE ts.id = teaching_session_id AND ts.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM teaching_sessions ts
      WHERE ts.id = teaching_session_id AND ts.client_id = app_client_id()
    )
  );

ALTER TABLE teacher_session_tracker_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY teacher_session_tracker_permissions_tenant_isolation ON teacher_session_tracker_permissions
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());


