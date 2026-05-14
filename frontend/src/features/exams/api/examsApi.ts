import api from '@/lib/api';
import type {
  ExamSummary,
  ExamListResponse,
  ExamCreateFormState,
  ExamSection,
  BlueprintSummary,
  ExamBuilderSection,
  ExamPreviewPayload,
  ExamSectionSyllabusOptions,
  ExamSectionGenerationPlanInput,
  CurriculumOption,
} from '../types';

// ============================================
// EXAM LIST & RETRIEVAL
// ============================================

export interface ExamFilters {
  q?: string;
  status?: string;
  start_from?: string;
  start_to?: string;
  page?: number;
  page_size?: number;
}

export const fetchExams = async (
  filters: ExamFilters,
  page: number = 1,
  pageSize: number = 25
): Promise<ExamListResponse> => {
  const params = {
    ...filters,
    page,
    page_size: pageSize,
  };
  const res = await api.get('/exams', { params });
  return res.data as ExamListResponse;
};

export const fetchExamById = async (id: number): Promise<ExamSummary> => {
  const res = await api.get(`/exams/${id}`);
  return res.data as ExamSummary;
};

export const fetchExamPreview = async (id: number): Promise<ExamPreviewPayload> => {
  const res = await api.get(`/exams/${id}/preview`);
  return res.data as ExamPreviewPayload;
};

const triggerDocxDownload = (blobData: BlobPart, disposition: string | undefined, fallbackFilename: string) => {
  const blob = new Blob([blobData], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch?.[1] || fallbackFilename;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadExamPreviewDocx = async (id: number): Promise<void> => {
  const res = await api.get(`/exams/${id}/preview-docx`, {
    responseType: "blob",
  });

  const disposition = res.headers?.["content-disposition"] as string | undefined;
  triggerDocxDownload(res.data, disposition, `question-paper-${id}.docx`);
};

export const downloadExamQuestionsDocx = async (id: number): Promise<void> => {
  const res = await api.get(`/exams/${id}/preview/docx/questions`, {
    responseType: "blob",
  });
  const disposition = res.headers?.["content-disposition"] as string | undefined;
  triggerDocxDownload(res.data, disposition, `question-paper-${id}-questions.docx`);
};

export const downloadExamAnswersDocx = async (id: number): Promise<void> => {
  const res = await api.get(`/exams/${id}/preview/docx/answers`, {
    responseType: "blob",
  });
  const disposition = res.headers?.["content-disposition"] as string | undefined;
  triggerDocxDownload(res.data, disposition, `question-paper-${id}-answers.docx`);
};

export const downloadExamSolutionsDocx = async (id: number): Promise<void> => {
  const res = await api.get(`/exams/${id}/preview/docx/solutions`, {
    responseType: "blob",
  });
  const disposition = res.headers?.["content-disposition"] as string | undefined;
  triggerDocxDownload(res.data, disposition, `question-paper-${id}-solutions.docx`);
};

// ============================================
// EXAM CREATE, UPDATE, DELETE
// ============================================

export const createExam = async (payload: Record<string, unknown>): Promise<ExamSummary> => {
  const res = await api.post('/exams', payload);
  return (res.data?.exam ?? res.data) as ExamSummary;
};

export const updateExam = async (
  id: number,
  payload: Partial<ExamCreateFormState>
): Promise<ExamSummary> => {
  const res = await api.put(`/exams/${id}`, payload);
  return (res.data?.exam ?? res.data) as ExamSummary;
};

export const deleteExam = async (id: number): Promise<void> => {
  await api.delete(`/exams/${id}`);
};

// ============================================
// EXAM SECTIONS
// ============================================

export const createExamSection = async (
  examId: number,
  payload: Partial<ExamSection>
): Promise<ExamSection> => {
  const res = await api.post(`/exams/${examId}/sections`, payload);
  return res.data as ExamSection;
};

export const updateExamSection = async (
  examId: number,
  sectionId: number,
  payload: Partial<ExamSection>
): Promise<ExamSection> => {
  const res = await api.put(`/exams/${examId}/sections/${sectionId}`, payload);
  return res.data as ExamSection;
};

export const deleteExamSection = async (examId: number, sectionId: number): Promise<void> => {
  await api.delete(`/exams/${examId}/sections/${sectionId}`);
};

// ============================================
// EXAM QUESTIONS IN SECTIONS
// ============================================

export interface AddQuestionPayload {
  question_id: number;
  order_index?: number;
  marks_override?: number;
  negative_override?: number;
}

export const addQuestionToSection = async (
  examId: number,
  sectionId: number,
  payload: AddQuestionPayload
): Promise<void> => {
  await api.post(`/exams/${examId}/sections/${sectionId}/questions`, payload);
};

export const removeQuestionFromExamSection = async (
  examId: number,
  sectionId: number,
  questionId: number
): Promise<ExamBuilderSection> => {
  const res = await api.delete(`/exams/${examId}/sections/${sectionId}/questions/${questionId}`);
  return res.data as ExamBuilderSection;
};

export const clearExamSectionQuestionGroup = async (
  examId: number,
  sectionId: number,
  groupType: "direction" | "similar" | "previous_year" | "reference"
): Promise<ExamBuilderSection> => {
  const res = await api.delete(`/exams/${examId}/sections/${sectionId}/questions/group/${groupType}`);
  return res.data as ExamBuilderSection;
};

export interface ReplaceQuestionPayload {
  current_question_id: number;
  new_question_id: number;
}

export const replaceQuestionInSection = async (
  examId: number,
  sectionId: number,
  payload: ReplaceQuestionPayload
): Promise<ExamBuilderSection> => {
  const res = await api.put(`/exams/${examId}/sections/${sectionId}/questions/replace`, payload);
  return res.data as ExamBuilderSection;
};

// ============================================
// EXAM PUBLISHING
// ============================================

export const publishExam = async (id: number): Promise<ExamSummary> => {
  const res = await api.post(`/exams/${id}/publish`);
  return res.data as ExamSummary;
};

export interface BlueprintFilters {
  q?: string;
  status?: string;
}

export interface BlueprintPayload {
  name: string;
  school_id?: number | null;
  status?: string;
  client_id?: number | null;
  sections: Array<{
    section_name: string;
    required_question_count: number;
    direction_question_count: number;
    similar_question_count: number;
    previous_year_question_count: number;
    reference_question_count: number;
    display_order: number;
  }>;
}

export const fetchBlueprints = async (filters?: BlueprintFilters): Promise<BlueprintSummary[]> => {
  const res = await api.get('/blueprints', { params: filters });
  return Array.isArray(res.data) ? (res.data as BlueprintSummary[]) : [];
};

export const fetchBlueprintById = async (id: number): Promise<BlueprintSummary> => {
  const res = await api.get(`/blueprints/${id}`);
  return res.data as BlueprintSummary;
};

export const createBlueprint = async (payload: BlueprintPayload): Promise<BlueprintSummary> => {
  const res = await api.post('/blueprints', payload);
  return res.data as BlueprintSummary;
};

export const updateBlueprint = async (id: number, payload: Partial<BlueprintPayload>): Promise<BlueprintSummary> => {
  const res = await api.put(`/blueprints/${id}`, payload);
  return res.data as BlueprintSummary;
};

export const deleteBlueprint = async (id: number): Promise<void> => {
  await api.delete(`/blueprints/${id}`);
};

export const fetchPrograms = async (): Promise<CurriculumOption[]> => {
  const res = await api.get('/programs');
  return Array.isArray(res.data) ? (res.data as CurriculumOption[]) : [];
};

export const fetchGradesByProgram = async (programId: number): Promise<CurriculumOption[]> => {
  const res = await api.get(`/programs/${programId}/grades`);
  return Array.isArray(res.data) ? (res.data as CurriculumOption[]) : [];
};

export const fetchSubjectsByGrade = async (gradeId: number): Promise<CurriculumOption[]> => {
  const res = await api.get(`/grades/${gradeId}/subjects`);
  return Array.isArray(res.data) ? (res.data as CurriculumOption[]) : [];
};

export const fetchExamSectionSyllabusOptions = async (
  examId: number,
  sectionId: number,
  params?: { subject_id?: number; chapter_ids?: number[] }
): Promise<ExamSectionSyllabusOptions> => {
  const res = await api.get(`/exams/${examId}/sections/${sectionId}/syllabus-options`, {
    params: {
      subject_id: params?.subject_id,
      chapter_ids: params?.chapter_ids?.join(','),
    },
  });
  return res.data as ExamSectionSyllabusOptions;
};

export const configureExamSectionSyllabus = async (
  examId: number,
  sectionId: number,
  payload: {
    subject_id: number;
    chapter_ids: number[];
    topic_ids: number[];
  }
): Promise<ExamBuilderSection> => {
  const res = await api.put(`/exams/${examId}/sections/${sectionId}/configure`, payload);
  return res.data as ExamBuilderSection;
};

export const generateExamSectionQuestions = async (
  examId: number,
  sectionId: number,
  payload?: {
    generation_plan?: ExamSectionGenerationPlanInput;
  }
): Promise<ExamBuilderSection> => {
  const res = await api.post(`/exams/${examId}/sections/${sectionId}/generate`, payload ?? {});
  return res.data as ExamBuilderSection;
};

export const finalizeBlueprintExam = async (
  examId: number,
  payload?: { status?: string }
): Promise<ExamPreviewPayload> => {
  const res = await api.post(`/exams/${examId}/finalize`, payload ?? {});
  return res.data as ExamPreviewPayload;
};

// ============================================
// EXAM ATTEMPTS - STUDENT
// ============================================

export interface ExamAttempt {
  id: number;
  exam_id: number;
  student_id: number;
  attempt_number: number;
  started_at: string;
  submitted_at?: string;
  auto_submitted?: boolean;
  total_score?: number;
  total_correct?: number;
  total_wrong?: number;
  total_unattempted?: number;
  status: 'in_progress' | 'submitted' | 'graded';
}

export const startExamAttempt = async (examId: number): Promise<ExamAttempt> => {
  const res = await api.post(`/student/exams/${examId}/start`);
  return res.data as ExamAttempt;
};

// ============================================
// EXAM RESPONSES - SAVE ANSWERS
// ============================================

export interface ExamResponse {
  question_id: number;
  student_answer?: any;
  is_attempted?: boolean;
  is_marked_for_review?: boolean;
}

export const saveExamResponse = async (
  attemptId: number,
  responses: ExamResponse[]
): Promise<any> => {
  const res = await api.post(`/student/attempts/${attemptId}/save`, {
    responses,
  });
  return res.data;
};

// ============================================
// EXAM SUBMISSION & GRADING
// ============================================

export interface ExamSubmissionResult {
  message: string;
  attempt: ExamAttempt;
}

export const submitExamAttempt = async (attemptId: number): Promise<ExamSubmissionResult> => {
  const res = await api.post(`/student/attempts/${attemptId}/submit`);
  return res.data as ExamSubmissionResult;
};

// ============================================
// EXAM ATTEMPT STATE
// ============================================

export interface AttemptState {
  attempt: ExamAttempt;
  responses?: any[];
  exam?: ExamSummary;
}

export const getAttemptState = async (attemptId: number): Promise<AttemptState> => {
  const res = await api.get(`/student/attempts/${attemptId}`);
  return res.data as AttemptState;
};

// ============================================
// STUDENT EXAMS LIST
// ============================================

export const getStudentExams = async (): Promise<ExamSummary[]> => {
  const res = await api.get('/student/exams');
  return res.data as ExamSummary[];
};
