import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import Pagination from "@/components/ui/Pagination";
import ExamShell from "@/features/exams/components/ExamShell";
import ExamFilters from "@/features/exams/components/ExamFilters";
import ExamListTable from "@/features/exams/components/ExamListTable";
import type { ExamFiltersState, ExamSummary } from "@/features/exams/types";
import { getExamPermissions } from "@/features/exams/utils/examPermissions";

interface CourseOption {
  id: number;
  title: string;
  description?: string | null;
  published?: boolean | null;
}

interface ExamEditForm {
  title: string;
  description: string;
  instructions: string;
  total_duration_minutes: string;
  start_datetime: string;
  end_datetime: string;
  max_attempts: string;
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const readApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const data = asRecord(error.response?.data);
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  return fallback;
};

const normalizeNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const normalizeId = (...values: unknown[]): string | number => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return `${Math.random()}`;
};

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const resolveExamId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const toDateTimeLocalValue = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const normalizeExam = (item: unknown): ExamSummary => {
  const source = asRecord(item);
  const rawTags = Array.isArray(source.tags)
    ? source.tags
    : Array.isArray(source.exam_tags)
      ? source.exam_tags
      : null;
  const tags =
    rawTags?.map((tag) => String(tag)).filter((tag) => tag.trim().length > 0) ?? null;

  const rawCourseNames = Array.isArray(source.course_names)
    ? source.course_names
    : Array.isArray(source.assigned_course_names)
      ? source.assigned_course_names
      : Array.isArray(source.course_titles)
        ? source.course_titles
        : null;
  const courseNames =
    rawCourseNames
      ?.map((name) => String(name).trim())
      .filter((name) => name.length > 0) ?? null;

  const courseCount = normalizeNumber(
    source.course_count ?? source.courses_count ?? source.courseCount
  );

  return {
    id: normalizeId(source.id, source.exam_id),
    title: String(source.title ?? source.name ?? "Untitled exam"),
    description: typeof source.description === "string" ? source.description : null,
    start_datetime:
      typeof source.start_datetime === "string"
        ? source.start_datetime
        : typeof source.startDate === "string"
          ? source.startDate
          : typeof source.start_time === "string"
            ? source.start_time
            : null,
    end_datetime:
      typeof source.end_datetime === "string"
        ? source.end_datetime
        : typeof source.endDate === "string"
          ? source.endDate
          : typeof source.end_time === "string"
            ? source.end_time
            : null,
    duration_minutes: normalizeNumber(
      source.duration_minutes ??
      source.total_duration_minutes ??
      source.duration ??
      source.durationMinutes
    ),
    status:
      typeof source.status === "string"
        ? source.status
        : typeof source.state === "string"
          ? source.state
          : null,
    course_count: courseCount ?? (courseNames ? courseNames.length : null),
    course_names: courseNames,
    attempts_count: normalizeNumber(
      source.attempts_count ?? source.attempt_count ?? source.total_attempts ?? source.attempts ?? source.attemptCount
    ),
    created_by_name:
      typeof source.created_by_name === "string"
        ? source.created_by_name
        : typeof source.createdByName === "string"
          ? source.createdByName
          : null,
    tags,
  };
};
const normalizeCourse = (item: unknown): CourseOption | null => {
  const source = asRecord(item);
  const id = Number(source.id);
  if (!Number.isInteger(id) || id <= 0) return null;

  return {
    id,
    title: String(source.title ?? "Untitled course"),
    description: typeof source.description === "string" ? source.description : null,
    published: typeof source.published === "boolean" ? source.published : null,
  };
};

export default function ExamListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const examPermissions = useMemo(() => getExamPermissions(user), [user]);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ExamFiltersState>({
    search: "",
    status: "",
    startFrom: "",
    startTo: "",
  });

  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [total, setTotal] = useState(0);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamSummary | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [publishExamTarget, setPublishExamTarget] = useState<ExamSummary | null>(null);
  const [publishSaving, setPublishSaving] = useState(false);
  const [editForm, setEditForm] = useState<ExamEditForm>({
    title: "",
    description: "",
    instructions: "",
    total_duration_minutes: "",
    start_datetime: "",
    end_datetime: "",
    max_attempts: "1",
  });

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        page_size: pageSize,
      };
      if (filters.search.trim()) params.q = filters.search.trim();
      if (filters.status) params.status = filters.status;
      if (filters.startFrom) params.start_from = filters.startFrom;
      if (filters.startTo) params.start_to = filters.startTo;

      const res = await api.get("/exams", { params });
      const payload = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      const totalCount = Number(res.data?.total ?? res.data?.meta?.total ?? payload.length);

      setExams(payload.map(normalizeExam));
      setTotal(Number.isNaN(totalCount) ? payload.length : totalCount);
    } catch (err: unknown) {
      const message = readApiErrorMessage(err, "Failed to load exams.");
      setExams([]);
      setTotal(0);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isMounted) return;
      await loadExams();
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [loadExams]);

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter(
        (value) => typeof value === "string" && value.trim() !== ""
      ).length,
    [filters]
  );

  const loadAssignmentData = useCallback(async (exam: ExamSummary) => {
    setAssignLoading(true);
    setAssignError(null);
    try {
      const [coursesRes, assignedRes] = await Promise.all([
        api.get("/course/courses"),
        api.get(`/exams/${exam.id}/courses`),
      ]);

      const allCoursesPayload = Array.isArray(coursesRes.data) ? coursesRes.data : [];
      const normalizedCourses = allCoursesPayload
        .map(normalizeCourse)
        .filter((course): course is CourseOption => Boolean(course));

      const assignedPayload = Array.isArray(assignedRes.data?.courses)
        ? assignedRes.data.courses
        : Array.isArray(assignedRes.data)
          ? assignedRes.data
          : [];

      const assignedIds: number[] = assignedPayload
        .map((item: unknown) => {
          const source = asRecord(item);
          return Number(source.id ?? source.course_id);
        })
        .filter(isPositiveInteger);

      const uniqueAssignedIds = Array.from(new Set<number>(assignedIds));

      setCourses(normalizedCourses);
      setSelectedCourseIds(uniqueAssignedIds);
    } catch (err: unknown) {
      const message = readApiErrorMessage(err, "Failed to load assignment data.");
      setAssignError(message);
      setCourses([]);
      setSelectedCourseIds([]);
    } finally {
      setAssignLoading(false);
    }
  }, []);

  const openAssignModal = useCallback(async (exam: ExamSummary) => {
    setSelectedExam(exam);
    setAssignOpen(true);
    await loadAssignmentData(exam);
  }, [loadAssignmentData]);

  const closeAssignModal = () => {
    if (assignSaving) return;
    setAssignOpen(false);
    setAssignError(null);
    setSelectedExam(null);
    setCourses([]);
    setSelectedCourseIds([]);
  };

  const toggleCourseSelection = (courseId: number) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const saveAssignments = async () => {
    if (!examPermissions.canAssign) {
      toast.error("You don't have permission to assign exams.");
      return;
    }
    if (!selectedExam) return;
    setAssignSaving(true);
    setAssignError(null);
    try {
      await api.put(`/exams/${selectedExam.id}/courses`, {
        course_ids: selectedCourseIds,
      });
      toast.success("Exam course assignment updated.");
      await loadExams();
      closeAssignModal();
    } catch (err: unknown) {
      const message = readApiErrorMessage(err, "Failed to save assignments.");
      setAssignError(message);
    } finally {
      setAssignSaving(false);
    }
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditLoading(false);
    setEditError(null);
    setEditingExamId(null);
    setEditForm({
      title: "",
      description: "",
      instructions: "",
      total_duration_minutes: "",
      start_datetime: "",
      end_datetime: "",
      max_attempts: "1",
    });
  };

  const openEditModal = async (exam: ExamSummary) => {
    const examId = resolveExamId(exam.id);
    if (!examId) {
      toast.error("Invalid exam id.");
      return;
    }

    setEditOpen(true);
    setEditLoading(true);
    setEditError(null);
    setEditingExamId(examId);

    try {
      const response = await api.get(`/exams/${examId}`);
      const payload = asRecord(response.data);
      const durationValue = normalizeNumber(
        payload.total_duration_minutes ?? payload.duration_minutes ?? payload.duration
      );
      const maxAttemptsValue = normalizeNumber(payload.max_attempts);

      setEditForm({
        title:
          typeof payload.title === "string" && payload.title.trim()
            ? payload.title
            : exam.title,
        description:
          typeof payload.description === "string"
            ? payload.description
            : exam.description ?? "",
        instructions:
          typeof payload.instructions === "string"
            ? payload.instructions
            : "",
        total_duration_minutes:
          durationValue !== null ? String(durationValue) : "",
        start_datetime: toDateTimeLocalValue(payload.start_datetime ?? exam.start_datetime),
        end_datetime: toDateTimeLocalValue(payload.end_datetime ?? exam.end_datetime),
        max_attempts: maxAttemptsValue !== null ? String(maxAttemptsValue) : "1",
      });
    } catch (err: unknown) {
      const message = readApiErrorMessage(err, "Failed to load exam details.");
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  };

  const saveEditedExam = async () => {
    if (!examPermissions.canUpdate) {
      toast.error("You don't have permission to update exams.");
      return;
    }
    if (!editingExamId) return;

    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) {
      setEditError("Title is required.");
      return;
    }

    const duration = Number(editForm.total_duration_minutes);
    if (!Number.isFinite(duration) || duration <= 0) {
      setEditError("Duration must be greater than 0.");
      return;
    }

    const maxAttempts = Number(editForm.max_attempts);
    if (!Number.isFinite(maxAttempts) || maxAttempts <= 0) {
      setEditError("Max attempts must be greater than 0.");
      return;
    }

    if (!editForm.start_datetime || !editForm.end_datetime) {
      setEditError("Start and end datetime are required.");
      return;
    }

    const startIso = new Date(editForm.start_datetime).toISOString();
    const endIso = new Date(editForm.end_datetime).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      setEditError("End datetime must be after start datetime.");
      return;
    }

    setEditSaving(true);
    setEditError(null);

    try {
      await api.put(`/exams/${editingExamId}`, {
        title: trimmedTitle,
        description: editForm.description.trim() || null,
        instructions: editForm.instructions.trim() || null,
        total_duration_minutes: duration,
        start_datetime: startIso,
        end_datetime: endIso,
        max_attempts: maxAttempts,
      });
      toast.success("Exam updated successfully.");
      closeEditModal();
      await loadExams();
    } catch (err: unknown) {
      const message = readApiErrorMessage(err, "Failed to update exam.");
      setEditError(message);
    } finally {
      setEditSaving(false);
    }
  };

  const openPublishModal = (exam: ExamSummary) => {
    setPublishExamTarget(exam);
  };

  const deleteExamById = async (exam: ExamSummary) => {
    if (!examPermissions.canDelete) {
      toast.error("You don't have permission to delete exams.");
      return;
    }
    const examId = resolveExamId(exam.id);
    if (!examId) {
      toast.error("Invalid exam id.");
      return;
    }
    const confirmed = window.confirm(`Delete exam "${exam.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/exams/${examId}`);
      toast.success("Exam deleted successfully.");
      await loadExams();
    } catch (err: unknown) {
      const message = readApiErrorMessage(err, "Failed to delete exam.");
      toast.error(message);
    }
  };

  const closePublishModal = () => {
    if (publishSaving) return;
    setPublishExamTarget(null);
  };

  const publishExamById = async (exam: ExamSummary) => {
    if (!examPermissions.canPublish) {
      toast.error("You don't have permission to publish exams.");
      return;
    }

    const examId = resolveExamId(exam.id);
    if (!examId) {
      toast.error("Invalid exam id.");
      return;
    }

    setPublishSaving(true);
    try {
      await api.post(`/exams/${examId}/publish`);
      toast.success("Exam published successfully.");
      setPublishExamTarget(null);
      await loadExams();
    } catch (err: unknown) {
      const message = readApiErrorMessage(err, "Failed to publish exam.");
      toast.error(message);
    } finally {
      setPublishSaving(false);
    }
  };

  const handleAction = (action: string, exam: ExamSummary) => {
    if (action === "builder") {
      if (!examPermissions.canUpdate) {
        toast.error("You don't have permission to update exams.");
        return;
      }
      navigate(`/exams/${exam.id}/builder`);
      return;
    }

    if (action === "assign") {
      if (!examPermissions.canAssign) {
        toast.error("You don't have permission to assign exams.");
        return;
      }
      openAssignModal(exam);
      return;
    }

    if (action === "edit") {
      if (!examPermissions.canUpdate) {
        toast.error("You don't have permission to update exams.");
        return;
      }
      void openEditModal(exam);
      return;
    }

    if (action === "delete") {
      void deleteExamById(exam);
      return;
    }

    if (action === "publish") {
      setPublishExamTarget(exam);
      return;
    }

    const label = action.charAt(0).toUpperCase() + action.slice(1);
    toast(`${label} for ${exam.title} is coming soon.`);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "",
      startFrom: "",
      startTo: "",
    });
  };

  return (
    <>
      <ExamShell
        title="Exam List"
        description="Manage exams, monitor status, and maintain exam records."
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">All Exams</h2>
              <p className="text-sm text-slate-500">{total} exams found</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {examPermissions.canCreate && (
                <button
                  type="button"
                  onClick={() => navigate("/exams/blueprints")}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Manage Blueprints
                </button>
              )}
              {examPermissions.canCreate && (
                <button
                  type="button"
                  onClick={() => navigate("/exams/new")}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Create Exam
                </button>
              )}
            </div>
          </div>

          <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-800">
              <span>Filters</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {activeFilterCount > 0 ? `${activeFilterCount} active` : "Optional"}
              </span>
            </summary>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <ExamFilters
                filters={filters}
                onChange={setFilters}
                onClear={handleClearFilters}
              />
            </div>
          </details>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Loading exams...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              {error}
            </div>
          ) : exams.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No exams match the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              <ExamListTable
                exams={exams}
                onAction={handleAction}
                permissions={examPermissions}
                onStatusClick={openPublishModal}
              />
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </ExamShell>

      {assignOpen && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Assign Courses</h3>
                <p className="mt-1 text-sm text-slate-600">{selectedExam.title}</p>
              </div>
              <button
                type="button"
                onClick={closeAssignModal}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
                disabled={assignSaving}
              >
                Close
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {assignLoading ? (
                <p className="text-sm text-slate-600">Loading course assignments...</p>
              ) : assignError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {assignError}
                </div>
              ) : courses.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No courses found to assign.
                </div>
              ) : (
                <div className="space-y-2">
                  {courses.map((course) => {
                    const checked = selectedCourseIds.includes(course.id);
                    return (
                      <label
                        key={course.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          checked={checked}
                          onChange={() => toggleCourseSelection(course.id)}
                          disabled={assignSaving}
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                          {course.description && (
                            <p className="mt-1 text-xs text-slate-600 line-clamp-2">{course.description}</p>
                          )}
                          {course.published === false && (
                            <p className="mt-1 text-[11px] font-medium text-amber-700">Unpublished course</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <p className="text-xs text-slate-500">
                {selectedCourseIds.length} course{selectedCourseIds.length === 1 ? "" : "s"} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={assignSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAssignments}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={assignSaving || assignLoading}
                >
                  {assignSaving ? "Saving..." : "Save Assignment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit Exam</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Update exam details and save changes.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
                disabled={editSaving}
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              {editLoading ? (
                <p className="text-sm text-slate-600">Loading exam details...</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      disabled={editSaving}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500">Class/Grade Heading</label>
                    <textarea
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      disabled={editSaving}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500">Instructions</label>
                    <textarea
                      value={editForm.instructions}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, instructions: event.target.value }))
                      }
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      disabled={editSaving}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Duration (minutes)</label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.total_duration_minutes}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          total_duration_minutes: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      disabled={editSaving}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Max Attempts</label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.max_attempts}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, max_attempts: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      disabled={editSaving}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={editForm.start_datetime}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, start_datetime: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      disabled={editSaving}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={editForm.end_datetime}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, end_datetime: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      disabled={editSaving}
                    />
                  </div>
                </div>
              )}

              {editError && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {editError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditedExam}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={editSaving || editLoading}
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {publishExamTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Publish Exam?</h3>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Publish <span className="font-semibold text-slate-900">{publishExamTarget.title}</span> so it becomes live like the course publish flow.
            </p>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closePublishModal}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                disabled={publishSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void publishExamById(publishExamTarget)}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={publishSaving}
              >
                {publishSaving ? "Publishing..." : "Yes, Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

