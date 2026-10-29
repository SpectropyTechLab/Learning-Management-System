import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import ComprehensionPassageForm from "@/features/question-bank/components/ComprehensionPassageForm";
import type { CurriculumItem } from "@/types/questionBank";

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

export default function QuestionPassageCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "";
  const passagesListPath = useMemo(
    () =>
      returnTo
        ? `/question-bank/passages?returnTo=${encodeURIComponent(returnTo)}`
        : "/question-bank/passages",
    [returnTo]
  );
  const [programs, setPrograms] = useState<CurriculumItem[]>([]);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const res = await api.get("/programs");
        const payload = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        setPrograms(normalizeCurriculum(payload));
      } catch {
        setPrograms([]);
      }
    };
    loadPrograms();
  }, []);

  const handleSave = async (payload: Record<string, unknown>) => {
    try {
      await api.post("/comprehension-passages", payload);
      navigate(passagesListPath);
    } catch (error: any) {
      alert(error?.response?.data?.error || "Failed to create passage.");
    }
  };

  return (
    <QuestionBankLayout
      title="Create Passage"
      description="Create shared passage content for linked comprehension questions."
    >
      <ComprehensionPassageForm
        programs={programs}
        grades={[]}
        subjects={[]}
        chapters={[]}
        topics={[]}
        onClose={() => navigate(passagesListPath)}
        onSave={handleSave}
      />
    </QuestionBankLayout>
  );
}
