export interface ProgramUpload {
  id: number;
  program_id: number;
  grade_id: number;
  subject_id: number;
  uploaded_by_user_id: number;
  file_name: string;
  file_storage_path: string;
  version_no: number;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  source_type?: string;
  grade_number?: number | null;
  subject_name?: string | null;
  subject_code?: string | null;
}

export interface ProgramOption {
  id: number;
  name: string;
  code?: string | null;
}

export interface GradeOption {
  id: number;
  program_id: number;
  grade_number: number;
}

export interface SubjectOption {
  id: number;
  grade_id: number;
  program_id: number;
  name: string;
  code?: string | null;
}

export interface MicroScheduleRow {
  id: number;
  micro_schedule_upload_id: number;
  program_id: number;
  row_no: number;
  serial_no?: number | null;
  grade_label: string;
  subject_label: string;
  session_label: string;
  session_no: number;
  chapter_label: string;
  learning_goal?: string | null;
  topic_label?: string | null;
}

export interface LessonPlannerSession {
  id: number;
  lesson_planner_upload_id: number;
  program_id: number;
  session_no: number;
  session_label: string;
  part_type: 'teaching' | 'board_exam';
  duration_minutes?: number | null;
  title: string;
  chapter_label?: string | null;
  topic_label?: string | null;
  learning_objectives?: string[];
  materials_needed?: string | null;
  worksheet_questions_covered?: string | null;
  shortcuts_introduced?: string | null;
  common_errors_addressed?: string | null;
  homework?: string | null;
  next_session_preview?: string | null;
  pedagogy_note?: string | null;
  teacher_script_text?: string | null;
}

export interface ProgramSessionTemplate {
  id: number;
  program_id: number;
  template_version_no: number;
  grade_label: string;
  subject_label: string;
  session_no: number;
  session_label: string;
  chapter_label?: string | null;
  learning_goal?: string | null;
  topic_label?: string | null;
  planner_title?: string | null;
  part_type: 'teaching' | 'board_exam';
  duration_minutes?: number | null;
  mapping_status: 'matched' | 'unmatched_micro' | 'unmatched_planner' | 'conflict';
  issue_details?: Record<string, unknown>;
  is_published: boolean;
  published_at?: string | null;
}

export interface ClientEntitlement {
  id: number;
  client_id: number;
  entitlement_type: 'feature' | 'program';
  feature_key?: string | null;
  program_id?: number | null;
  enabled: boolean;
  assigned_by_user_id: number;
  assigned_at: string;
}

export interface TeachingSession {
  id: number;
  client_id: number;
  school_id: number;
  batch_id?: number | null;
  program_id: number;
  program_session_template_id?: number | null;
  grade_label: string;
  subject_label: string;
  chapter_label?: string | null;
  session_no: number;
  session_label: string;
  part_type: 'teaching' | 'board_exam';
  planned_date: string;
  period_slot?: string | null;
  duration_minutes?: number | null;
  teacher_user_id?: number | null;
  learning_goal?: string | null;
  topic_label?: string | null;
  planner_title?: string | null;
  status: 'not_started' | 'completed' | 'partially_completed' | 'not_completed' | 'update_pending' | 'lagging';
  completion_percentage: number;
  actual_date?: string | null;
  topics_covered?: string | null;
  pending_topics?: string | null;
  reason_code?: string | null;
  remarks?: string | null;
}

export interface TeachingSessionUpdate {
  id: number;
  teaching_session_id: number;
  teacher_user_id: number;
  status_submitted: 'completed' | 'partially_completed' | 'not_completed';
  completion_percentage: number;
  actual_date?: string | null;
  topics_covered?: string | null;
  pending_topics?: string | null;
  reason_code?: string | null;
  remarks?: string | null;
  created_at: string;
}

export interface TeacherTrackerPermission {
  id: number;
  client_id: number;
  teacher_user_id: number;
  school_id?: number | null;
  batch_id?: number | null;
  program_id?: number | null;
  can_view_tracker: boolean;
  can_update_tracker: boolean;
  granted_by_user_id: number;
  created_at: string;
}

export interface TeachingAnalyticsSummary {
  total_sessions: number;
  completed_sessions: number;
  partial_sessions: number;
  not_completed_sessions: number;
  update_pending_sessions: number;
  lagging_sessions: number;
  average_completion_percentage: number | string;
}
