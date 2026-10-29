export type QuestionType =
  | 'mcq_single'
  | 'assertion_reasoning'
  | 'mcq_multiple'
  | 'numerical'
  | 'true_false'
  | 'short_answer'
  | 'match_following'
  | 'fill_in_blank'
  | 'comprehensive';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'approved' | 'rejected' | 'archived';
export type ScoringMode = 'all_or_nothing' | 'partial' | 'mixed';

export interface QuestionText {
  html?: string | null;
  latex?: string | null;
  images?: Array<{ url: string; alt?: string | null }>;
  [key: string]: unknown;
}

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
  question_type: Exclude<QuestionType, 'comprehensive'>;
  question_text: RichTextValue;
  options?: QuestionOption[] | MatchFollowingOptions;
  correct_answer?: unknown;
  marks_positive?: number;
  marks_negative?: number;
}

export interface ComprehensionPassage {
  id: number;
  title: RichTextValue | null;
  passage_content: RichTextValue;
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
  id: number;
  client_id: number | null;
  school_id: number | null;
  question_type: QuestionType;
  question_text: RichTextValue;
  options?: QuestionOption[] | MatchFollowingOptions;
  correct_answer: unknown;
  solution?: unknown;
  solution_video_url?: string | null;
  scoring_mode?: ScoringMode;
  comprehension_passage_id?: number | null;
  comprehension?: ComprehensionPassage | null;
  comprehension_passage?: RichTextValue | null;
  comprehension_questions?: ComprehensiveQuestion[];
  subject_id: number;
  chapter_id: number;
  topic_id: number | null;
  difficulty_level: QuestionDifficulty;
  category?: QuestionCategory;
  exam_tags?: string[];
  marks_positive: number;
  marks_negative: number;
  status: QuestionStatus;
  created_by: number;
  approved_by?: number | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionListResponse {
  data: Question[];
  page: number;
  page_size: number;
  total: number;
}

export interface QuestionFilters {
  q?: string;
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
  question_type?: QuestionType | '';
  difficulty_level?: QuestionDifficulty | '';
  status?: QuestionStatus | '';
  created_by?: string;
  school_id?: string;
}
