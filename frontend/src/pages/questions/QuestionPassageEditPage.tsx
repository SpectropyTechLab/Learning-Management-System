import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import ComprehensionPassageForm from "@/features/question-bank/components/ComprehensionPassageForm";
import type { ComprehensionPassage, CurriculumItem } from "@/types/questionBank";

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

const normalizeRichText = (value: any) => {
  if (typeof value === "string") return { html: value, json: null };
  if (value && typeof value === "object") {
    return { html: value.html ?? value.text ?? "", json: value.json ?? null };
  }
  return { html: "", json: null };
};

const normalizePassage = (item: any): ComprehensionPassage => ({
  id: (item.id ?? "") as string | number,
  title: normalizeRichText(item.title),
  passage_content: normalizeRichText(item.passage_content),
  program_id: item.program_id ?? null,
  grade_id: item.grade_id ?? null,
  subject_id: item.subject_id ?? null,
  chapter_id: item.chapter_id ?? null,
  topic_id: item.topic_id ?? null,
  created_at: item.created_at ?? undefined,
  updated_at: item.updated_at ?? undefined,
});

export default function QuestionPassageEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [passage, setPassage] = useState<ComprehensionPassage | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/comprehension-passages/${id}`);
        if (!mounted) return;
        setPassage(normalizePassage(res.data));
      } catch {
        if (!mounted) return;
        setPassage(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSave = async (payload: Record<string, unknown>) => {
    try {
      await api.put(`/comprehension-passages/${id}`, payload);
      navigate("/question-bank/passages");
    } catch (error: any) {
      alert(error?.response?.data?.error || "Failed to update passage.");
    }
  };

  return (
    <QuestionBankLayout
      title="Edit Passage"
      description="Update the shared passage content used by linked questions."
    >
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading passage...
        </div>
      ) : passage ? (
        <ComprehensionPassageForm
          initialPassage={passage}
          programs={programs}
          grades={[]}
          subjects={[]}
          chapters={[]}
          topics={[]}
          onClose={() => navigate("/question-bank/passages")}
          onSave={handleSave}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Passage not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}
