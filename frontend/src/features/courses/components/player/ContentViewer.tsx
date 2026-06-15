import { useParams, useNavigate } from "react-router-dom";
import { buildExamContentRouteSearch, buildExamContentRouteState } from "@/features/exam-runtime/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import api from "@/lib/api";
import ScormPlayer from "@/features/courses/components/player/ScormPlayer";
import PdfViewer from "@/features/courses/components/player/PdfViewer";
import UniversalContentViewer from "@/features/courses/components/player/UniversalContentViewer";
import { getStudentExams, startOrResumeExam } from "@/features/exam-runtime/api";
import { computeStudentExamStatus } from "@/features/exams/utils/studentExamStatus";
import type { StudentExam, StudentExamStatus } from "@/features/exams/types/studentExam";
import type { JSX } from "react/jsx-runtime";

interface ContentItem {
  id: number;
  item_type: string;
  title: string;
  content_url?: string | null;
  metadata?: Record<string, unknown> | null;
  course_id?: number | null;
}

interface ContentViewerProps {
  item?: ContentItem | null;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const statusLabelMap: Record<StudentExamStatus, string> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
  max_attempts_reached: "Attempts Exhausted",
  expired: "Expired",
  unknown: "Unknown",
};

const statusClassMap: Record<StudentExamStatus, string> = {
  upcoming: "bg-sky-100 text-sky-700 border-sky-200",
  ongoing: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  max_attempts_reached: "bg-amber-100 text-amber-700 border-amber-200",
  expired: "bg-rose-100 text-rose-700 border-rose-200",
  unknown: "bg-slate-100 text-slate-700 border-slate-200",
};

const resolveMaxAttempts = (exam: StudentExam): number => {
  if (typeof exam.max_attempts === "number" && Number.isFinite(exam.max_attempts) && exam.max_attempts > 0) {
    return exam.max_attempts;
  }
  return 1;
};

const isResultReleased = (exam: StudentExam): boolean => {
  if (exam.show_result_immediately) return true;
  if (!exam.end_datetime) return false;
  const endDate = new Date(exam.end_datetime);
  if (Number.isNaN(endDate.getTime())) return false;
  return new Date() >= endDate;
};

const isExamWindowOpen = (exam: StudentExam, now: Date = new Date()): boolean => {
  if (!exam.start_datetime || !exam.end_datetime) return false;
  const start = new Date(exam.start_datetime);
  const end = new Date(exam.end_datetime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  return now >= start && now <= end;
};

const canRetakeExam = (exam: StudentExam, status: StudentExamStatus): boolean => {
  if (status !== "completed") return false;
  if (exam.in_progress_attempt_id || exam.has_in_progress_attempt) return false;

  const examStatus = String(exam.status ?? "").toLowerCase();
  if (examStatus && !["published", "active"].includes(examStatus)) return false;

  const attemptsUsed = exam.attempt_count ?? 0;
  if (attemptsUsed >= resolveMaxAttempts(exam)) return false;

  return isExamWindowOpen(exam);
};

const extractExamId = (item: ContentItem | null): number | null => {
  if (!item) return null;

  const metadata = item.metadata;
  if (metadata && typeof metadata === "object") {
    const fromMetadata = Number((metadata as Record<string, unknown>).exam_id);
    if (Number.isInteger(fromMetadata) && fromMetadata > 0) {
      return fromMetadata;
    }
  }

  const raw = typeof item.content_url === "string" ? item.content_url.trim() : "";
  if (!raw) return null;

  const prefixed = raw.match(/^exam:(\d+)$/i);
  if (prefixed) {
    const parsed = Number(prefixed[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  const direct = Number(raw);
  if (Number.isInteger(direct) && direct > 0) {
    return direct;
  }

  return null;
};

export default function ContentViewer({ item }: ContentViewerProps) {
  const { contentId, courseId } = useParams<{ contentId: string; courseId?: string }>();
  const navigate = useNavigate();

  const [content, setContent] = useState<ContentItem | null>(item || null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [exam, setExam] = useState<StudentExam | null>(null);
  const [examLoading, setExamLoading] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);
  const [startingExam, setStartingExam] = useState(false);

  const examId = useMemo(() => extractExamId(content), [content]);
  const examRouteContext = useMemo(
    () => ({
      courseId: courseId ? Number(courseId) : content?.course_id ?? null,
      contentId: content?.id ?? (contentId ? Number(contentId) : null),
    }),
    [content?.course_id, content?.id, contentId, courseId]
  );
  const examRouteSearch = useMemo(() => buildExamContentRouteSearch(examRouteContext), [examRouteContext]);
  const examRouteState = useMemo(() => buildExamContentRouteState(examRouteContext), [examRouteContext]);

  const handleSignedUrl = useCallback(async (nextContent: ContentItem) => {
    if (!nextContent.content_url || nextContent.item_type === "link" || nextContent.item_type === "exam") {
      setLoading(false);
      return;
    }

    try {
      const signedRes = await api.get(`/scorm/signed-url?path=${encodeURIComponent(nextContent.content_url)}`);
      setMediaUrl(signedRes.data.url);
    } catch (err) {
      console.error("Failed to get signed URL:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContentFromAPI = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setMediaUrl(null);

      const res = await api.get(`/student/content/${id}`);
      const data: ContentItem = res.data;
      setContent(data);

      await handleSignedUrl(data);
    } catch (err) {
      console.error("Failed to fetch content:", err);
      setLoading(false);
    }
  }, [handleSignedUrl]);

  const loadExamInfo = useCallback(async () => {
    if (!content || content.item_type !== "exam") {
      setExam(null);
      setExamError(null);
      return;
    }

    if (!examId) {
      setExam(null);
      setExamError("Exam mapping is missing for this content item.");
      return;
    }

    setExamLoading(true);
    setExamError(null);
    try {
      const exams = await getStudentExams();
      const matchedExam = exams.find((entry) => entry.id === examId) ?? null;
      if (!matchedExam) {
        setExam(null);
        setExamError("This exam is assigned");
        return;
      }
      setExam(matchedExam);
    } catch (err) {
      console.error("Failed to load exam details:", err);
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to load exam details.";
        setExamError(String(message));
      } else {
        setExamError("Unable to load exam details.");
      }
      setExam(null);
    } finally {
      setExamLoading(false);
    }
  }, [content, examId]);

  useEffect(() => {
    if (item) {
      setLoading(true);
      setMediaUrl(null);
      setContent(item);
      void handleSignedUrl(item);
      return;
    }

    if (contentId) {
      void fetchContentFromAPI(contentId);
    }
  }, [contentId, item, fetchContentFromAPI, handleSignedUrl]);

  useEffect(() => {
    if (!content || content.item_type !== "exam") {
      setExam(null);
      setExamError(null);
      setExamLoading(false);
      return;
    }

    void loadExamInfo();
  }, [content?.id, content?.item_type, examId, loadExamInfo]);

  const handleStartOrResume = useCallback(async () => {
    if (!exam || startingExam) return;

    setStartingExam(true);
    try {
      const runtimeState = await startOrResumeExam(exam.id);
      const attemptId = runtimeState?.attempt?.id;
      if (!attemptId) {
        toast.error("Could not open exam attempt. Please try again.");
        return;
      }
      navigate(`/student/exams/attempt/${attemptId}${examRouteSearch}`, { state: examRouteState });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to start exam.";
        toast.error(String(message));
      } else {
        toast.error("Unable to start exam.");
      }
    } finally {
      setStartingExam(false);
    }
  }, [exam, examRouteSearch, examRouteState, navigate, startingExam]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (!content) return <p className="p-6 text-red-500">Content not found.</p>;

  const { item_type, title } = content;
  if (item_type === "exam") {
    if (examLoading) {
      return (
        <div className="mx-auto mt-8 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading exam details...
        </div>
      );
    }

    if (examError) {
      return (
        <div className="mx-auto mt-8 w-full max-w-2xl rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-medium text-emerald-700">{examError}</p>
        </div>
      );
    }

    if (!exam) {
      return (
        <div className="mx-auto mt-8 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Exam details are not available.
        </div>
      );
    }

    const status = computeStudentExamStatus(exam);
    const canResume = Boolean(exam.in_progress_attempt_id || exam.has_in_progress_attempt);
    const canRetake = canRetakeExam(exam, status);
    const canStart = canResume || status === "ongoing" || canRetake;
    const ctaLabel = canResume ? "Resume Exam" : canRetake ? "Retake Exam" : "Start Exam";
    const attemptsUsed = exam.attempt_count ?? 0;
    const maxAttempts = resolveMaxAttempts(exam);
    const showResultButton = status === "completed" && isResultReleased(exam);

    return (
      <div className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{exam.title || title}</h2>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClassMap[status]}`}
          >
            {statusLabelMap[status]}
          </span>
        </div>

        {exam.description && <p className="mt-3 text-sm text-slate-600">{exam.description}</p>}

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Start</dt>
            <dd className="text-right font-medium text-slate-800">{formatDateTime(exam.start_datetime)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">End</dt>
            <dd className="text-right font-medium text-slate-800">{formatDateTime(exam.end_datetime)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Duration</dt>
            <dd className="font-medium text-slate-800">
              {exam.total_duration_minutes !== null ? `${exam.total_duration_minutes} mins` : "--"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Attempts</dt>
            <dd className="font-medium text-slate-800">
              {attemptsUsed} / {maxAttempts}
            </dd>
          </div>
        </dl>

        <div className="mt-5 space-y-2">
          {canStart ? (
            <button
              type="button"
              onClick={() => {
                void handleStartOrResume();
              }}
              disabled={startingExam}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startingExam ? "Opening..." : ctaLabel}
            </button>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
              {status === "upcoming"
                ? "Exam not started yet."
                : status === "expired"
                  ? "Exam window has closed."
                  : status === "max_attempts_reached"
                    ? "Maximum attempts reached."
                    : "Exam is not available right now."}
            </div>
          )}

          {showResultButton && (
            <button
              type="button"
              onClick={() => navigate(`/student/exams/${exam.id}/result${examRouteSearch}`, { state: examRouteState })}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View Result
            </button>
          )}
        </div>
      </div>
    );
  }

  let viewerElement: JSX.Element;

  switch (item_type) {
    case "video":
      viewerElement = mediaUrl ? (
        <video controls className={valcss}>
          <source src={mediaUrl} type="video/mp4" />
        </video>
      ) : (
        <p>Loading video...</p>
      );
      break;

    case "audio":
      viewerElement = mediaUrl ? (
        <audio controls className={valcss}>
          <source src={mediaUrl} type="audio/mpeg" />
        </audio>
      ) : (
        <p>Loading audio...</p>
      );
      break;

    case "pdf":
      viewerElement = mediaUrl ? <PdfViewer url={mediaUrl} title={title} /> : <p>Loading PDF...</p>;
      break;

    case "scorm":
      viewerElement = (
        <div className="h-full w-full">
          <ScormPlayer contentUrl={content.content_url!} contentId={content.id} />
        </div>
      );
      break;

    case "link":
      viewerElement = <UniversalContentViewer type="link" title={title} url={content.content_url!} />;
      break;

    case "html":
      viewerElement = mediaUrl ? <UniversalContentViewer type="html" title={title} url={mediaUrl} /> : <p>Loading HTML...</p>;
      break;

    case "text":
      viewerElement = mediaUrl ? <UniversalContentViewer type="text" title={title} url={mediaUrl} /> : <p>Loading text...</p>;
      break;

    default:
      viewerElement = <div className="rounded border bg-gray-50 p-4">{title}</div>;
  }

  return (
    <div className={`mx-auto flex h-full w-full flex-1 flex-col ${item_type === "pdf" ? "p-0" : "items-center justify-center p-2"}`}>
      {viewerElement}
    </div>
  );
}
