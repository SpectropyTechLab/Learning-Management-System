export type QuestionType =
  | "mcq_single"
  | "assertion_reasoning"
  | "mcq_multiple"
  | "numerical"
  | "true_false"
  | "short_answer"
  | "match_following"
  | "fill_in_blank"
  | "comprehensive";

export type ScoringMode = "all_or_nothing" | "partial" | "mixed";

export type DifficultyLevel = "easy" | "medium" | "hard";

export type QuestionStatus = "draft" | "approved" | "rejected";

export type QuestionGroupType = "direct" | "similar" | "previous_year" | "reference";

export type CorrectAnswer =
  | string
  | string[]
  | number
  | boolean
  | null
  | {
      answer_ids?: string[];
      answer?: boolean;
      value?: number;
      tolerance?: number;
      answers?: string[];
      case_sensitive?: boolean;
      pairs?: MatchFollowingPair[];
      blanks?: FillBlankAnswer[];
      raw?: string;
    };

export interface RichTextValue {
  html: string;
  json?: unknown;
}

export interface QuestionOption {
  id: string;
  text: RichTextValue;
  is_correct?: boolean;
}

export interface MatchFollowingOptions {
  left: QuestionOption[];
  right: QuestionOption[];
}

export interface MatchFollowingPair {
  left_id: string;
  right_id: string;
}

export interface FillBlankAnswer {
  id: string;
  answers: string[];
}

export interface ComprehensiveQuestion {
  id: string;
  question_type: Exclude<QuestionType, "comprehensive">;
  question_text: RichTextValue;
  options?: QuestionOption[] | MatchFollowingOptions;
  correct_answer?: CorrectAnswer;
  marks_positive?: number;
  marks_negative?: number;
}

export interface ComprehensionPassage {
  id: string | number;
  title: RichTextValue | null;
  passage_content: RichTextValue;
  program_id?: string | number | null;
  grade_id?: string | number | null;
  subject_id?: string | number | null;
  chapter_id?: string | number | null;
  topic_id?: string | number | null;
  created_at?: string;
  updated_at?: string;
}

export type QuestionCategory =
  | string
  | string[]
  | {
      label?: string;
      name?: string;
      value?: string;
      type?: string;
      tags?: string[];
      [key: string]: unknown;
    }
  | null;

export interface Question {
  id: string | number;
  question_type: QuestionType;
  question_text: RichTextValue;
  options?: QuestionOption[] | MatchFollowingOptions;
  correct_answer?: CorrectAnswer;
  solution?: RichTextValue | null;
  solution_video_url?: string | null;
  scoring_mode?: ScoringMode;
  comprehension_passage_id?: string | number | null;
  comprehension?: ComprehensionPassage | null;
  comprehension_passage?: RichTextValue | null;
  comprehension_questions?: ComprehensiveQuestion[];
  program_id?: string | number | null;
  grade_id?: string | number | null;
  subject_id?: string | number | null;
  chapter_id?: string | number | null;
  topic_id?: string | number | null;
  folder_id?: string | number | null;
  question_group_type?: QuestionGroupType | null;
  difficulty_level: DifficultyLevel;
  marks_positive: number;
  marks_negative: number;
  category?: QuestionCategory;
  exam_tags?: string[];
  status: QuestionStatus;
  created_by?: string;
  created_at?: string;
  review_note?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  canAddQuestion?: boolean;
}

export interface CurriculumItem {
  id: string | number;
  name: string;
  code?: string | null;
  program_id?: string | number | null;
  grade_id?: string | number | null;
  grade_number?: string | number | null;
  subject_id?: string | number | null;
  chapter_id?: string | number | null;
  school_id?: string | number | null;
  ownership_scope?: "platform" | "client" | "school";
  canEdit?: boolean;
  canDelete?: boolean;
}

export const formatSubjectDisplay = (
  subject: Pick<CurriculumItem, "id" | "name" | "grade_number">,
  options?: { includeId?: boolean }
) => {
  const gradeLabel =
    subject.grade_number !== undefined && subject.grade_number !== null && String(subject.grade_number).trim() !== ""
      ? `Grade ${subject.grade_number}`
      : null;

  const parts = [subject.name];
  if (gradeLabel) parts.push(`(${gradeLabel})`);
  if (options?.includeId) parts.push(`- ID ${subject.id}`);
  return parts.join(" ");
};

export const formatQuestionCategory = (category: QuestionCategory) => {
  if (category === undefined || category === null) return "";
  if (typeof category === "string") {
    const trimmed = category.trim();
    return trimmed.toLowerCase() === "direction" ? "direct" : trimmed;
  }
  if (Array.isArray(category)) {
    return category
      .map((entry) => {
        const trimmed = String(entry).trim();
        return trimmed.toLowerCase() === "direction" ? "direct" : trimmed;
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof category === "object") {
    const preferred =
      category.label ??
      category.name ??
      category.value ??
      category.type ??
      (Array.isArray(category.tags) ? category.tags.join(", ") : "");
    const trimmed = String(preferred ?? "").trim();
    return trimmed.toLowerCase() === "direction" ? "direct" : trimmed;
  }
  return String(category).trim();
};
