import type {
  RenderableQuestion,
  MatchFollowingOptionsLike,
  QuestionOptionLike,
  RichTextLike,
} from "@/components/questions/QuestionRenderer";

export type ExamStatus = "draft" | "active" | "completed";

export type BlueprintStatus = "active" | "inactive" | "archived";
export type QuestionGroupType = "direction" | "similar" | "previous_year" | "reference";

export interface GeneratedQuestionOption {
  id?: string | number;
  text?: { html?: string | null; text?: string | null } | string | null;
  is_correct?: boolean;
}

export interface GeneratedMatchFollowingOptions {
  left?: GeneratedQuestionOption[];
  right?: GeneratedQuestionOption[];
}

export interface ExamSectionGenerationPlanTopic {
  topic_id: number;
  topic_name?: string;
  topic_number?: number | null;
  direction: number;
  similar: number;
  previous_year: number;
  reference: number;
  total?: number;
}

export interface ExamSectionGenerationPlanInput {
  topics: Array<{
    topic_id: number;
    direction: number;
    similar: number;
    previous_year: number;
    reference: number;
  }>;
}

export interface ExamSectionGenerationPlanTotals {
  direction: number;
  similar: number;
  previous_year: number;
  reference: number;
  total: number;
}

export interface ExamSectionGenerationPlan {
  section_id?: number;
  section_title?: string;
  required_question_count?: number;
  total_planned_questions?: number;
  available_question_count?: number;
  topics: ExamSectionGenerationPlanTopic[];
  totals: ExamSectionGenerationPlanTotals;
  available_counts: ExamSectionGenerationPlanTotals;
}

export interface BlueprintSection {
  id: number;
  blueprint_id?: number;
  section_name: string;
  required_question_count: number;
  direction_question_count: number;
  similar_question_count: number;
  previous_year_question_count: number;
  reference_question_count: number;
  display_order: number;
}

export interface BlueprintSummary {
  id: number;
  client_id?: number | null;
  school_id?: number | null;
  name: string;
  status: BlueprintStatus | string;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  section_count?: number;
  total_required_questions?: number;
  sections: BlueprintSection[];
}

export interface GeneratedExamQuestion {
  question_id: number;
  order_index: number;
  question_group_type: QuestionGroupType | null;
  question_type: string;
  question_text: { html?: string; text?: string } | string | null;
  options?: GeneratedQuestionOption[] | GeneratedMatchFollowingOptions | null;
  correct_answer?: unknown;
  solution?: RichTextLike;
  subject_id?: number | null;
  chapter_id?: number | null;
  topic_id?: number | null;
  difficulty_level?: string;
  status?: string | null;
  comprehension?: RenderableQuestion["comprehension"];
}

export interface ExamBuilderSection {
  id: number;
  exam_id: number;
  title: string;
  order_index?: number | null;
  instructions?: string | null;
  marks_per_question?: number | null;
  negative_marks?: number | null;
  question_count?: number | null;
  blueprint_section_id?: number | null;
  required_question_count?: number | null;
  direction_question_count?: number | null;
  similar_question_count?: number | null;
  previous_year_question_count?: number | null;
  reference_question_count?: number | null;
  selected_subject_id?: number | null;
  selected_subject_name?: string | null;
  completion_status?: "pending" | "configured" | "generated" | "completed" | string;
  syllabus_locked?: boolean;
  chapter_ids?: number[];
  topic_ids?: number[];
  chapters?: Array<{ id: number; name: string; chapter_number?: number }>;
  topics?: Array<{ id: number; name: string; chapter_id?: number; topic_number?: number }>;
  question_groups?: Record<QuestionGroupType, GeneratedExamQuestion[]>;
}

export interface CurriculumOption {
  id: number;
  name: string;
  grade_number?: number | string | null;
  program_id?: number | null;
  grade_id?: number | null;
  subject_id?: number | null;
  chapter_id?: number | null;
  topic_number?: number | null;
  chapter_number?: number | null;
}

export interface ExamSectionSyllabusOptions {
  program_id: number;
  section_id: number;
  selected_subject_id: number | null;
  subjects: CurriculumOption[];
  chapters: CurriculumOption[];
  topics: CurriculumOption[];
}

export interface ExamSectionGenerationPlanTopicRow {
  topic_id: number;
  topic_name: string;
  topic_number?: number | null;
  direction: number;
  similar: number;
  reference: number;
  previous_year: number;
  total: number;
}

export interface ExamSectionGenerationPlan {
  section_id: number;
  section_title: string;
  required_question_count: number;
  total_planned_questions: number;
  available_question_count: number;
  topics: ExamSectionGenerationPlanTopicRow[];
  totals: {
    direction: number;
    similar: number;
    reference: number;
    previous_year: number;
    total: number;
  };
  available_counts: {
    direction: number;
    similar: number;
    reference: number;
    previous_year: number;
    total: number;
  };
}

export interface ExamPreviewPayload {
  exam: ExamSummary & {
    client_id?: number | null;
    school_id?: number | null;
    program_id?: number | null;
    program_name?: string | null;
    blueprint_id?: number | null;
    total_duration_minutes?: number | null;
    max_attempts?: number | null;
  };
  template_resolution?: {
    template_key?: string | null;
    template_version?: string | null;
    source_file?: string | null;
    exam_type?: "WT" | "UT" | "GT" | null;
    strict_mode?: boolean;
    fallback_used?: boolean;
    fallback_template_key?: string | null;
  };
  render_blocks?: Array<{
    section_id: number;
    section_title: string;
    section_label?: string;
    order_index?: number;
    instructions?: string;
    question_count?: number;
    required_question_count?: number;
    question_groups?: Record<QuestionGroupType, GeneratedExamQuestion[]>;
    render_metadata?: {
      marks_per_question?: number | null;
      negative_marks?: number | null;
      completion_status?: string | null;
      selected_subject_name?: string | null;
    };
  }>;
  validation?: {
    can_save_draft: boolean;
    can_finalize: boolean;
    has_warnings: boolean;
    warnings: string[];
    blocking_reasons: string[];
  };
  blueprint: BlueprintSummary | null;
  sections: ExamBuilderSection[];
  totals: {
    section_count: number;
    question_count: number;
    required_question_count: number;
    completed_section_count: number;
  };
  all_sections_completed: boolean;
}

export interface ExamSummary {
  id: number | string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  duration_minutes?: number | null;
  total_duration_minutes?: number | null;
  max_attempts?: number | null;
  status?: ExamStatus | string | null;
  course_count?: number | null;
  course_names?: string[] | null;
  attempts_count?: number | null;
  created_by_name?: string | null;
  tags?: string[] | null;
  program_id?: number | null;
  blueprint_id?: number | null;
}

export interface ExamFiltersState {
  search: string;
  status: "" | ExamStatus;
  startFrom: string;
  startTo: string;
}

export interface ExamListResponse {
  data?: ExamSummary[];
  total?: number;
  meta?: {
    page?: number;
    total?: number;
  };
}
export interface ExamCreateFormState {
  title: string;
  description: string;
  program_id: string;
  blueprint_id: string;
  total_duration_minutes: string;
  start_datetime: string;
  end_datetime: string;
  instructions: string;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result_immediately: boolean;
  max_attempts: string;
  show_score: boolean;
  show_pass_or_fail: boolean;
  show_percentile: boolean;
  show_analytics: boolean;
  show_solutions_to_user: boolean;
  pass_percentage: string;
  variable_marks: boolean;
  marks_per_question: string;
  negative_marks: string;
  roundoff_marks: boolean;
  allow_retaking_exam: boolean;
  maximum_allowed_retakes: string;
  allow_retaking_only_for_failed_attempt: boolean;
  interval_between_retakes_minutes: string;
}
export interface ExamSection {
  id: number;
  exam_id: number;
  title: string;
  order_index?: number | null;
  instructions?: string | null;
  marks_per_question?: number | null;
  negative_marks?: number | null;
  question_count?: number | null;
}


