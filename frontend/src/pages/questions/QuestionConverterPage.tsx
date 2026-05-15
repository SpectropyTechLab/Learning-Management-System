import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

type InsertSummary = {
  success: boolean;
  inserted: number;
  failed: number;
  totalDetected: number;
  errors: Array<{ row?: number; message?: string }>;
};

const CATEGORY_OPTIONS = [
  { value: "direct", label: "Direct" },
  { value: "similar", label: "Similar" },
  { value: "previous_year", label: "Previous Year" },
  { value: "reference", label: "Reference" },
] as const;

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.program_id ?? item.grade_id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name:
        item.name ??
        (item.grade_number !== undefined && item.grade_number !== null ? `Grade ${item.grade_number}` : null) ??
        item.title ??
        item.subject_name ??
        "Untitled",
      program_id: item.program_id ?? item.programId ?? null,
      grade_id: item.grade_id ?? item.gradeId ?? null,
      grade_number: item.grade_number ?? item.gradeNumber ?? null,
      subject_id: item.subject_id ?? item.subjectId ?? null,
      chapter_id: item.chapter_id ?? item.chapterId ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

const parseBlobError = async (blob: Blob) => {
  try {
    const text = await blob.text();
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      return parsed.error ?? parsed.message ?? "Request failed.";
    } catch {
      const fallback = String(text || "").trim();
      return fallback.length > 0 ? fallback : "Request failed.";
    }
  } catch {
    return "Request failed.";
  }
};

const isUploadFileChangedError = (error: unknown) => {
  const maybe = error as { message?: string; code?: string; toString?: () => string };
  const combined = [
    typeof maybe?.message === "string" ? maybe.message : "",
    typeof maybe?.code === "string" ? maybe.code : "",
    typeof maybe?.toString === "function" ? maybe.toString() : "",
  ]
    .join(" ")
    .toLowerCase();
  return combined.includes("err_upload_file_changed");
};

export default function QuestionConverterPage() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [programId, setProgramId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]["value"]>("direct");
  const [marksPositive, setMarksPositive] = useState("4");
  const [marksNegative, setMarksNegative] = useState("0");

  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [grades, setGrades] = useState<CurriculumItem[]>([]);
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);
  const [topics, setTopics] = useState<CurriculumItem[]>([]);

  const [busyAction, setBusyAction] = useState<"" | "download" | "insert">("");
  const [statusMessage, setStatusMessage] = useState("");
  const [summary, setSummary] = useState<InsertSummary | null>(null);

  const canSubmit = useMemo(
    () => Boolean(sourceFile && programId && gradeId && subjectId && chapterId && topicId),
    [chapterId, gradeId, programId, sourceFile, subjectId, topicId]
  );

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const programRes = await api.get("/programs");

        const programPayload = Array.isArray(programRes.data)
          ? programRes.data
          : Array.isArray(programRes.data?.data)
            ? programRes.data.data
            : [];
        setPrograms(normalizeCurriculum(programPayload));
      } catch {
        setPrograms([]);
      }
    };

    loadInitial();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadGrades = async () => {
      if (!programId) {
        setGrades([]);
        setSubjects([]);
        setChapters([]);
        setTopics([]);
        return;
      }

      try {
        const res = await api.get(`/programs/${programId}/grades`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!cancelled) setGrades(normalizeCurriculum(payload));
      } catch {
        if (!cancelled) setGrades([]);
      }
    };

    loadGrades();
    return () => {
      cancelled = true;
    };
  }, [programId]);

  useEffect(() => {
    let cancelled = false;

    const loadSubjects = async () => {
      if (!gradeId) {
        setSubjects([]);
        setChapters([]);
        setTopics([]);
        return;
      }

      try {
        const res = await api.get(`/grades/${gradeId}/subjects`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!cancelled) setSubjects(normalizeCurriculum(payload));
      } catch {
        if (!cancelled) setSubjects([]);
      }
    };

    loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [gradeId]);

  useEffect(() => {
    let cancelled = false;

    const loadChapters = async () => {
      if (!subjectId) {
        setChapters([]);
        setTopics([]);
        return;
      }

      try {
        const res = await api.get(`/subjects/${subjectId}/chapters`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!cancelled) setChapters(normalizeCurriculum(payload));
      } catch {
        if (!cancelled) setChapters([]);
      }
    };

    loadChapters();
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  useEffect(() => {
    let cancelled = false;

    const loadTopics = async () => {
      if (!chapterId) {
        setTopics([]);
        return;
      }

      try {
        const res = await api.get(`/chapters/${chapterId}/topics`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!cancelled) setTopics(normalizeCurriculum(payload));
      } catch {
        if (!cancelled) setTopics([]);
      }
    };

    loadTopics();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const buildFormData = () => {
    if (!sourceFile) return null;

    const formData = new FormData();
    formData.append("file", sourceFile);
    formData.append("program_id", programId);
    formData.append("grade_id", gradeId);
    formData.append("subject_id", subjectId);
    formData.append("chapter_id", chapterId);
    formData.append("topic_id", topicId);
    formData.append("marks_positive", marksPositive);
    formData.append("marks_negative", marksNegative);
    if (category.trim()) formData.append("category", category.trim());
    return formData;
  };

  const handleDownload = async () => {
    if (!canSubmit) {
      setStatusMessage("Choose a DOCX file and complete the required curriculum metadata first.");
      return;
    }

    const formData = buildFormData();
    if (!formData) return;

    setBusyAction("download");
    setSummary(null);
    setStatusMessage("");

    try {
      const res = await api.post("/questions/converter/download", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "question-bank-converter-output.docx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMessage("Converted output file downloaded successfully.");
    } catch (error) {
      if (isUploadFileChangedError(error)) {
        setStatusMessage("Selected file changed after selection. Please re-select the DOCX file and try again.");
        setSourceFile(null);
        return;
      }
      const blob = (error as { response?: { data?: Blob } })?.response?.data;
      setStatusMessage(blob instanceof Blob ? await parseBlobError(blob) : "Failed to download converted output.");
    } finally {
      setBusyAction("");
    }
  };

  const handleInsert = async () => {
    if (!canSubmit) {
      setStatusMessage("Choose a DOCX file and complete the required curriculum metadata first.");
      return;
    }

    const formData = buildFormData();
    if (!formData) return;

    setBusyAction("insert");
    setSummary(null);
    setStatusMessage("");

    try {
      const res = await api.post<InsertSummary>("/questions/converter/insert", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSummary(res.data);
      setStatusMessage(
        res.data.failed > 0
          ? `Inserted ${res.data.inserted} of ${res.data.totalDetected} detected questions.`
          : `Inserted all ${res.data.inserted} detected questions successfully.`
      );
    } catch (error) {
      if (isUploadFileChangedError(error)) {
        setStatusMessage("Selected file changed after selection. Please re-select the DOCX file and try again.");
        setSourceFile(null);
        return;
      }
      const message =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setStatusMessage(typeof message === "string" ? message : "Failed to insert converted questions.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <QuestionBankLayout
      title="Converter"
      description="Convert supported DOCX manuals or worksheet-style source files into question-bank rows, then download the output or insert the questions directly."
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Source File</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a supported DOCX source file that contains numbered questions, options, and answer/solution content.
          </p>

          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <input
              type="file"
              accept=".docx"
              onChange={(event) => setSourceFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <p className="mt-3 text-xs text-slate-500">
              Supported source format: `.docx`. The converter can parse both section-based mentor manuals and worksheet-style DOCX files, while preserving equations, symbols, images, options, answer keys, and solution blocks on the backend.
            </p>
            {sourceFile ? (
              <p className="mt-2 text-xs font-semibold text-slate-700">Selected: {sourceFile.name}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Manual Metadata</h2>
          <p className="mt-1 text-sm text-slate-500">
            These values are applied to every converted question before download or insertion.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-xs font-semibold text-slate-500">Program</label>
              <select
                value={programId}
                onChange={(event) => {
                  setProgramId(event.target.value);
                  setGradeId("");
                  setSubjectId("");
                  setChapterId("");
                  setTopicId("");
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {programs.map((program) => (
                  <option key={program.id} value={String(program.id)}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Grade</label>
              <select
                value={gradeId}
                onChange={(event) => {
                  setGradeId(event.target.value);
                  setSubjectId("");
                  setChapterId("");
                  setTopicId("");
                }}
                disabled={!programId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={String(grade.id)}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Subject</label>
              <select
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setChapterId("");
                  setTopicId("");
                }}
                disabled={!gradeId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Chapter</label>
              <select
                value={chapterId}
                onChange={(event) => {
                  setChapterId(event.target.value);
                  setTopicId("");
                }}
                disabled={!subjectId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={String(chapter.id)}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Topic</label>
              <select
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                disabled={!chapterId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={String(topic.id)}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-1">
            <div>
              <label className="text-xs font-semibold text-slate-500">Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as (typeof CATEGORY_OPTIONS)[number]["value"])}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Marks+</label>
              <input
                type="number"
                value={marksPositive}
                onChange={(event) => setMarksPositive(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Marks-</label>
              <input
                type="number"
                value={marksNegative}
                onChange={(event) => setMarksNegative(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={busyAction !== "" || !canSubmit}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "download" ? "Preparing Output..." : "Download Output File"}
            </button>
            <button
              type="button"
              onClick={handleInsert}
              disabled={busyAction !== "" || !canSubmit}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "insert" ? "Inserting..." : "Insert Questions Into DB"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Complete the required metadata above before running either action.
          </p>
        </section>

        {statusMessage ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Status</h2>
            <p className="mt-2 text-sm text-slate-600">{statusMessage}</p>
          </section>
        ) : null}

        {summary ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Insert Summary</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-500">Detected</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{summary.totalDetected}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-xs font-semibold text-emerald-700">Inserted</div>
                <div className="mt-2 text-2xl font-bold text-emerald-800">{summary.inserted}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <div className="text-xs font-semibold text-rose-700">Failed</div>
                <div className="mt-2 text-2xl font-bold text-rose-800">{summary.failed}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-500">Status</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {summary.success ? "Completed" : "Completed with errors"}
                </div>
              </div>
            </div>

            {summary.errors.length > 0 ? (
              <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <h3 className="text-sm font-semibold text-rose-800">Row Errors</h3>
                <ul className="mt-3 space-y-2 text-sm text-rose-700">
                  {summary.errors.map((error, index) => (
                    <li key={`${error.row ?? "row"}-${index}`}>{error.message ?? "Unknown conversion error"}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </QuestionBankLayout>
  );
}
