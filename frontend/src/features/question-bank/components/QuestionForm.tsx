
import { useEffect, useMemo, useState } from "react";
import type {
  ComprehensionPassage,
  CorrectAnswer,
  CurriculumItem,
  FillBlankAnswer,
  MatchFollowingOptions,
  MatchFollowingPair,
  Question,
  QuestionGroupType,
  QuestionOption,
  QuestionType,
  RichTextValue,
  ScoringMode,
} from "@/types/questionBank";
import { formatSubjectDisplay } from "@/types/questionBank";
import RichTextEditor from "@/components/ui/RichTextEditor";
import api from "@/lib/api";

interface QuestionFormProps {
  open?: boolean;
  variant?: "modal" | "page";
  initialQuestion?: Question | null;
  programs: CurriculumItem[];
  grades: CurriculumItem[];
  subjects: CurriculumItem[];
  chapters: CurriculumItem[];
  topics: CurriculumItem[];
  onClose: () => void;
  onSave: (payload: Omit<Question, "id">, isEdit: boolean) => void | Promise<void>;
}

type ComprehensionMode = "new" | "existing";

const QUESTION_GROUP_TYPE_OPTIONS: Array<{ value: QuestionGroupType; label: string }> = [
  { value: "direct", label: "Direct" },
  { value: "similar", label: "Similar" },
  { value: "previous_year", label: "Previous Year" },
  { value: "reference", label: "Reference" },
];

const normalizeCategorySelection = (category: Question["category"] | undefined): QuestionGroupType | "" => {
  if (typeof category !== "string") return "";
  const normalized = category.trim().toLowerCase() === "direction" ? "direct" : category.trim();
  return QUESTION_GROUP_TYPE_OPTIONS.some((option) => option.value === normalized) ? (normalized as QuestionGroupType) : "";
};

const makeId = () => `opt-${Math.random().toString(36).slice(2, 8)}`;

const emptyRichText = (): RichTextValue => ({ html: "", json: null });

const normalizeRichText = (value: unknown): RichTextValue => {
  if (!value) return emptyRichText();
  if (typeof value === "string") return { html: value, json: null };
  if (typeof value === "object" && value && "html" in value) {
    const html = String((value as { html?: string }).html ?? "");
    const json = (value as { json?: unknown }).json ?? null;
    return { html, json };
  }
  return { html: String(value), json: null };
};

const stripHtml = (value: RichTextValue) => value.html.replace(/<[^>]*>/g, "").trim();

const hasRichContent = (value: RichTextValue) => {
  const html = String(value?.html ?? "");
  if (!html.trim()) return false;
  if (/<img\b/i.test(html)) return true;
  return stripHtml(value).length > 0;
};

const toNullableNumber = (value: string) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const makeDefaultOptions = () =>
  Array.from({ length: 4 }).map(() => ({ id: makeId(), text: emptyRichText() }));

const makeDefaultMatchSide = () =>
  Array.from({ length: 4 }).map(() => ({ id: makeId(), text: emptyRichText() }));

type MatchOptionWithSide = QuestionOption & { side?: "left" | "right" };

const getArrayOptions = (options: Question["options"] | undefined): QuestionOption[] =>
  Array.isArray(options) ? options : [];

const normalizeMatchOptions = (options: unknown): MatchFollowingOptions | null => {
  if (options && typeof options === "object" && !Array.isArray(options)) {
    const typed = options as { left?: QuestionOption[]; right?: QuestionOption[] };
    if (Array.isArray(typed.left) && Array.isArray(typed.right)) {
      return {
        left: typed.left.map((opt, index) => ({
          id: String(opt.id ?? `left-${index + 1}`),
          text: normalizeRichText(opt.text),
        })),
        right: typed.right.map((opt, index) => ({
          id: String(opt.id ?? `right-${index + 1}`),
          text: normalizeRichText(opt.text),
        })),
      };
    }
  }

  if (Array.isArray(options)) {
    const left = options
      .filter((opt): opt is MatchOptionWithSide => Boolean(opt && typeof opt === "object" && opt.side === "left"))
      .map((opt, index) => ({
        id: String(opt.id ?? `left-${index + 1}`),
        text: normalizeRichText(opt.text ?? opt),
      }));
    const right = options
      .filter((opt): opt is MatchOptionWithSide => Boolean(opt && typeof opt === "object" && opt.side === "right"))
      .map((opt, index) => ({
        id: String(opt.id ?? `right-${index + 1}`),
        text: normalizeRichText(opt.text ?? opt),
      }));

    if (left.length || right.length) {
      return { left, right };
    }
  }

  return null;
};

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.program_id ?? item.grade_id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name:
        item.name ??
        (item.grade_number !== undefined && item.grade_number !== null
          ? `Grade ${item.grade_number}`
          : null) ??
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

const normalizePassages = (items: any[]): ComprehensionPassage[] =>
  items
    .map((item) => ({
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
    }))
    .filter((item): item is ComprehensionPassage => item.id !== "");

export default function QuestionForm({
  open = true,
  variant = "page",
  initialQuestion,
  programs,
  grades,
  subjects,
  chapters,
  topics,
  onClose,
  onSave,
}: QuestionFormProps) {
  const [questionType, setQuestionType] = useState<QuestionType>("mcq_single");
  const [questionText, setQuestionText] = useState<RichTextValue>(emptyRichText());
  const [options, setOptions] = useState<QuestionOption[]>(makeDefaultOptions());
  const [correctAnswer, setCorrectAnswer] = useState<string | string[] | null>(null);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState(true);
  const [numericalValue, setNumericalValue] = useState<number | "">("");
  const [numericalTolerance, setNumericalTolerance] = useState<number>(0.01);
  const [shortAnswers, setShortAnswers] = useState("");
  const [shortCaseSensitive, setShortCaseSensitive] = useState(false);
  const [matchLeft, setMatchLeft] = useState<QuestionOption[]>(makeDefaultMatchSide());
  const [matchRight, setMatchRight] = useState<QuestionOption[]>(makeDefaultMatchSide());
  const [matchPairs, setMatchPairs] = useState<MatchFollowingPair[]>([]);
  const [fillBlanks, setFillBlanks] = useState<FillBlankAnswer[]>([]);
  const [hasComprehension, setHasComprehension] = useState(false);
  const [comprehensionMode, setComprehensionMode] = useState<ComprehensionMode>("new");
  const [comprehensionPassageId, setComprehensionPassageId] = useState("");
  const [comprehensionPassages, setComprehensionPassages] = useState<ComprehensionPassage[]>([]);
  const [comprehensionTitle, setComprehensionTitle] = useState<RichTextValue>(emptyRichText());
  const [comprehensionContent, setComprehensionContent] = useState<RichTextValue>(emptyRichText());
  const [solutionText, setSolutionText] = useState<RichTextValue>(emptyRichText());
  const [programId, setProgramId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [questionGroupType, setQuestionGroupType] = useState<Question["question_group_type"] | "">("");
  const [difficulty, setDifficulty] = useState<Question["difficulty_level"]>("easy");
  const [marksPositive, setMarksPositive] = useState(4);
  const [marksNegative, setMarksNegative] = useState(1);
  const [tags, setTags] = useState("");
  const [scoringMode, setScoringMode] = useState<ScoringMode>("all_or_nothing");
  const [dynamicGrades, setDynamicGrades] = useState<CurriculumItem[]>([]);
  const [dynamicSubjects, setDynamicSubjects] = useState<CurriculumItem[]>([]);
  const [dynamicChapters, setDynamicChapters] = useState<CurriculumItem[]>([]);
  const [dynamicTopics, setDynamicTopics] = useState<CurriculumItem[]>([]);
  const [saving, setSaving] = useState(false);

  const availableGrades = useMemo(
    () => {
      const source = programId ? dynamicGrades : grades;
      return source.filter((grade) => !programId || String(grade.program_id) === programId);
    },
    [dynamicGrades, grades, programId]
  );
  const availableSubjects = useMemo(
    () => {
      const source = gradeId ? dynamicSubjects : subjects;
      return source.filter((subject) => !gradeId || String(subject.grade_id) === gradeId);
    },
    [dynamicSubjects, gradeId, subjects]
  );
  const availableChapters = useMemo(
    () => {
      const source = subjectId ? dynamicChapters : chapters;
      return source.filter((chapter) => !subjectId || String(chapter.subject_id) === subjectId);
    },
    [chapters, dynamicChapters, subjectId]
  );
  const availableTopics = useMemo(
    () => {
      const source = chapterId ? dynamicTopics : topics;
      return source.filter((topic) => !chapterId || String(topic.chapter_id) === chapterId);
    },
    [chapterId, dynamicTopics, topics]
  );

  const upsertPassage = (nextPassage: ComprehensionPassage) => {
    setComprehensionPassages((prev) => {
      const nextKey = String(nextPassage.id);
      const filtered = prev.filter((item) => String(item.id) !== nextKey);
      return [nextPassage, ...filtered];
    });
  };

  useEffect(() => {
    let isMounted = true;
    const loadGrades = async () => {
      if (!programId) {
        if (isMounted) {
          setDynamicGrades([]);
          setDynamicSubjects([]);
          setDynamicChapters([]);
          setDynamicTopics([]);
        }
        return;
      }
      try {
        const res = await api.get(`/programs/${programId}/grades`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!isMounted) return;
        setDynamicGrades(normalizeCurriculum(payload));
      } catch {
        if (!isMounted) return;
        setDynamicGrades([]);
      }
    };

    loadGrades();
    return () => {
      isMounted = false;
    };
  }, [programId]);

  useEffect(() => {
    let isMounted = true;
    const loadSubjects = async () => {
      if (!gradeId) {
        if (isMounted) {
          setDynamicSubjects([]);
          setDynamicChapters([]);
          setDynamicTopics([]);
        }
        return;
      }
      try {
        const res = await api.get(`/grades/${gradeId}/subjects`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!isMounted) return;
        setDynamicSubjects(normalizeCurriculum(payload));
      } catch {
        if (!isMounted) return;
        setDynamicSubjects([]);
      }
    };

    loadSubjects();
    return () => {
      isMounted = false;
    };
  }, [gradeId]);

  useEffect(() => {
    let isMounted = true;
    const loadChapters = async () => {
      if (!subjectId) {
        if (isMounted) {
          setDynamicChapters([]);
          setDynamicTopics([]);
        }
        return;
      }
      try {
        const res = await api.get(`/subjects/${subjectId}/chapters`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!isMounted) return;
        setDynamicChapters(normalizeCurriculum(payload));
      } catch {
        if (!isMounted) return;
        setDynamicChapters([]);
        setDynamicTopics([]);
      }
    };

    loadChapters();
    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  useEffect(() => {
    let isMounted = true;
    const loadTopics = async () => {
      if (!chapterId) {
        if (isMounted) setDynamicTopics([]);
        return;
      }
      try {
        const res = await api.get(`/chapters/${chapterId}/topics`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!isMounted) return;
        setDynamicTopics(normalizeCurriculum(payload));
      } catch {
        if (!isMounted) return;
        setDynamicTopics([]);
      }
    };

    loadTopics();
    return () => {
      isMounted = false;
    };
  }, [chapterId]);

  useEffect(() => {
    let isMounted = true;
    const loadPassages = async () => {
      try {
        const res = await api.get("/comprehension-passages", {
          params: { page: 1, page_size: 200 },
        });
        const payload = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        if (!isMounted) return;
        setComprehensionPassages(normalizePassages(payload));
      } catch {
        if (!isMounted) return;
        setComprehensionPassages([]);
      }
    };

    loadPassages();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!initialQuestion?.comprehension?.id) return;

    const normalizedPassage: ComprehensionPassage = {
      id: initialQuestion.comprehension.id,
      title: normalizeRichText(initialQuestion.comprehension.title),
      passage_content: normalizeRichText(initialQuestion.comprehension.passage_content),
      program_id: initialQuestion.program_id ?? null,
      grade_id: initialQuestion.grade_id ?? null,
      subject_id: initialQuestion.subject_id ?? null,
      chapter_id: initialQuestion.chapter_id ?? null,
      topic_id: initialQuestion.topic_id ?? null,
    };

    setComprehensionPassages((prev) => {
      if (prev.some((item) => String(item.id) === String(normalizedPassage.id))) {
        return prev;
      }
      return [normalizedPassage, ...prev];
    });
  }, [initialQuestion]);

  useEffect(() => {
    if (!open) return;
    if (initialQuestion) {
      setQuestionType(initialQuestion.question_type);
      setQuestionText(normalizeRichText(initialQuestion.question_text));
      if (Array.isArray(initialQuestion.options)) {
        setOptions(
          initialQuestion.options.map((option) => ({
            id: option.id,
            text: normalizeRichText(option.text),
            is_correct: option.is_correct,
          }))
        );
      } else {
        setOptions(makeDefaultOptions());
      }

      const correct = initialQuestion.correct_answer as CorrectAnswer;
      if (initialQuestion.question_type === "mcq_single" || initialQuestion.question_type === "assertion_reasoning") {
        if (typeof correct === "string") {
          setCorrectAnswer(correct);
        } else if (typeof correct === "object" && correct && "answer_ids" in correct) {
          setCorrectAnswer((correct as { answer_ids?: string[] }).answer_ids?.[0] ?? null);
        } else {
          const selected = getArrayOptions(initialQuestion.options).find((opt) => opt.is_correct);
          setCorrectAnswer(selected?.id ?? null);
        }
      }
      if (initialQuestion.question_type === "mcq_multiple") {
        if (Array.isArray(correct)) {
          setCorrectAnswer(correct);
        } else if (typeof correct === "object" && correct && "answer_ids" in correct) {
          setCorrectAnswer((correct as { answer_ids?: string[] }).answer_ids ?? []);
        } else {
          const selected = getArrayOptions(initialQuestion.options)
            .filter((opt) => opt.is_correct)
            .map((opt) => opt.id);
          setCorrectAnswer(selected);
        }
      }
      if (initialQuestion.question_type === "true_false") {
        if (typeof correct === "boolean") {
          setTrueFalseAnswer(correct);
        } else if (typeof correct === "object" && correct && "answer" in correct) {
          setTrueFalseAnswer(Boolean((correct as { answer?: boolean }).answer));
        }
      }
      if (initialQuestion.question_type === "numerical") {
        if (typeof correct === "object" && correct && "value" in correct) {
          setNumericalValue((correct as { value?: number }).value ?? "");
          setNumericalTolerance((correct as { tolerance?: number }).tolerance ?? 0.01);
        }
      }
      if (initialQuestion.question_type === "short_answer") {
        if (typeof correct === "object" && correct && "answers" in correct) {
          const answers = (correct as { answers?: string[] }).answers ?? [];
          setShortAnswers(answers.join(", "));
          setShortCaseSensitive(Boolean((correct as { case_sensitive?: boolean }).case_sensitive));
        }
      }
      if (initialQuestion.question_type === "match_following") {
        const matchOptions = normalizeMatchOptions(initialQuestion.options);
        if (matchOptions?.left && matchOptions?.right) {
          setMatchLeft(matchOptions.left);
          setMatchRight(matchOptions.right);
        } else {
          setMatchLeft(makeDefaultMatchSide());
          setMatchRight(makeDefaultMatchSide());
        }
        if (typeof correct === "object" && correct && "pairs" in correct) {
          setMatchPairs((correct as { pairs?: MatchFollowingPair[] }).pairs ?? []);
        }
      }
      if (initialQuestion.question_type === "fill_in_blank") {
        if (typeof correct === "object" && correct && "blanks" in correct) {
          setFillBlanks((correct as { blanks?: FillBlankAnswer[] }).blanks ?? []);
        }
      }
      setSolutionText(normalizeRichText(initialQuestion.solution));
      setHasComprehension(Boolean(initialQuestion.comprehension_passage_id || initialQuestion.comprehension?.id));
      setComprehensionMode(initialQuestion.comprehension_passage_id ? "existing" : "new");
      setComprehensionPassageId(initialQuestion.comprehension_passage_id ? String(initialQuestion.comprehension_passage_id) : "");
      setComprehensionTitle(normalizeRichText(initialQuestion.comprehension?.title));
      setComprehensionContent(normalizeRichText(initialQuestion.comprehension?.passage_content));

      setProgramId(initialQuestion.program_id ? String(initialQuestion.program_id) : "");
      setGradeId(initialQuestion.grade_id ? String(initialQuestion.grade_id) : "");
      setSubjectId(initialQuestion.subject_id ? String(initialQuestion.subject_id) : "");
      setChapterId(initialQuestion.chapter_id ? String(initialQuestion.chapter_id) : "");
      setTopicId(initialQuestion.topic_id ? String(initialQuestion.topic_id) : "");
      setQuestionGroupType(
        normalizeCategorySelection(initialQuestion.category) || initialQuestion.question_group_type || ""
      );
      setDifficulty(initialQuestion.difficulty_level);
      setMarksPositive(initialQuestion.marks_positive);
      setMarksNegative(initialQuestion.marks_negative);
      setTags(initialQuestion.exam_tags?.join(", ") ?? "");
      setScoringMode(initialQuestion.scoring_mode ?? "all_or_nothing");
      return;
    }

    setQuestionType("mcq_single");
    setQuestionText(emptyRichText());
    setOptions(makeDefaultOptions());
    setCorrectAnswer(null);
    setTrueFalseAnswer(true);
    setNumericalValue("");
    setNumericalTolerance(0.01);
    setShortAnswers("");
    setShortCaseSensitive(false);
    setMatchLeft(makeDefaultMatchSide());
    setMatchRight(makeDefaultMatchSide());
    setMatchPairs([]);
    setFillBlanks([]);
    setHasComprehension(false);
    setComprehensionMode("new");
    setComprehensionPassageId("");
    setComprehensionTitle(emptyRichText());
    setComprehensionContent(emptyRichText());
    setSolutionText(emptyRichText());
    setProgramId("");
    setGradeId("");
    setSubjectId("");
    setChapterId("");
    setTopicId("");
    setQuestionGroupType("");
    setDifficulty("easy");
    setMarksPositive(4);
    setMarksNegative(1);
    setTags("");
    setScoringMode("all_or_nothing");
  }, [open, initialQuestion]);

  useEffect(() => {
    if (!hasComprehension || comprehensionMode !== "existing" || !comprehensionPassageId) return;

    const selectedPassage = comprehensionPassages.find(
      (item) => String(item.id) === String(comprehensionPassageId)
    );

    if (!selectedPassage) return;
    setComprehensionTitle(normalizeRichText(selectedPassage.title));
    setComprehensionContent(normalizeRichText(selectedPassage.passage_content));
  }, [comprehensionMode, comprehensionPassageId, comprehensionPassages, hasComprehension]);
  const handleTypeChange = (nextType: QuestionType) => {
    setQuestionType(nextType);
    if (nextType === "mcq_single" || nextType === "assertion_reasoning" || nextType === "mcq_multiple") {
      if (options.length === 0) setOptions(makeDefaultOptions());
      if ((nextType === "mcq_single" || nextType === "assertion_reasoning") && Array.isArray(correctAnswer)) {
        setCorrectAnswer(correctAnswer[0] ?? null);
      }
      if (nextType === "mcq_multiple" && typeof correctAnswer === "string") {
        setCorrectAnswer(correctAnswer ? [correctAnswer] : []);
      }
    }
    if (nextType === "true_false") setTrueFalseAnswer(true);
    if (nextType === "numerical") {
      setNumericalValue("");
      setNumericalTolerance(0.01);
    }
  };

  const updateOptionText = (id: string, value: RichTextValue) => {
    setOptions((prev) => prev.map((option) => (option.id === id ? { ...option, text: value } : option)));
  };

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((option) => option.id !== id));
    if ((questionType === "mcq_single" || questionType === "assertion_reasoning") && correctAnswer === id) {
      setCorrectAnswer(null);
    }
    if (questionType === "mcq_multiple" && Array.isArray(correctAnswer)) {
      setCorrectAnswer(correctAnswer.filter((optionId) => optionId !== id));
    }
  };

  const toggleMultiCorrect = (id: string) => {
    setCorrectAnswer((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      if (next.includes(id)) return next.filter((opt) => opt !== id);
      next.push(id);
      return next;
    });
  };

  const updateMatchOption = (
    side: "left" | "right",
    id: string,
    value: RichTextValue
  ) => {
    const updater = side === "left" ? setMatchLeft : setMatchRight;
    updater((prev) => prev.map((opt) => (opt.id === id ? { ...opt, text: value } : opt)));
  };

  const addMatchPair = () => {
    if (!matchLeft.length || !matchRight.length) return;
    setMatchPairs((prev) => [
      ...prev,
      { left_id: matchLeft[0].id, right_id: matchRight[0].id },
    ]);
  };

  const updateMatchPair = (index: number, key: "left_id" | "right_id", value: string) => {
    setMatchPairs((prev) =>
      prev.map((pair, idx) => (idx === index ? { ...pair, [key]: value } : pair))
    );
  };

  const removeMatchPair = (index: number) => {
    setMatchPairs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addBlank = () => {
    setFillBlanks((prev) => [...prev, { id: `blank${prev.length + 1}`, answers: [] }]);
  };

  const updateBlankAnswers = (index: number, value: string) => {
    const answers = value
      .split(",")
      .map((ans) => ans.trim())
      .filter(Boolean);
    setFillBlanks((prev) => prev.map((blank, idx) => (idx === index ? { ...blank, answers } : blank)));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!subjectId) {
      alert("Subject is required.");
      return;
    }
    if (!chapterId) {
      alert("Chapter is required.");
      return;
    }

    if (!hasRichContent(questionText)) {
      alert("Question must contain text or an image.");
      return;
    }

    if (
      (questionType === "mcq_single" || questionType === "assertion_reasoning" || questionType === "mcq_multiple") &&
      options.some((option) => !hasRichContent(option.text))
    ) {
      alert("All options must contain text or an image.");
      return;
    }
    if ((questionType === "mcq_single" || questionType === "assertion_reasoning") && !correctAnswer) {
      alert("Select the correct option.");
      return;
    }
    if (questionType === "mcq_multiple" && (!Array.isArray(correctAnswer) || correctAnswer.length === 0)) {
      alert("Select at least one correct option.");
      return;
    }
    if (questionType === "short_answer") {
      const answers = shortAnswers
        .split(",")
        .map((ans) => ans.trim())
        .filter(Boolean);
      if (answers.length === 0) {
        alert("Add at least one short answer.");
        return;
      }
    }
    if (questionType === "match_following" && matchPairs.length === 0) {
      alert("Add at least one match pair.");
      return;
    }

    const parsedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const normalizedFillBlanks = fillBlanks
      .map((blank) => ({
        ...blank,
        answers: blank.answers.map((answer) => answer.trim()).filter(Boolean),
      }))
      .filter((blank) => blank.answers.length > 0);

    if (questionType === "fill_in_blank" && normalizedFillBlanks.length === 0) {
      alert("Add at least one blank with one or more answers.");
      return;
    }

    if (hasComprehension) {
      if (comprehensionMode === "existing" && !comprehensionPassageId) {
        alert("Select an existing passage or switch to Add New Passage.");
        return;
      }
      if (!stripHtml(comprehensionTitle)) {
        alert("Passage title is required.");
        return;
      }
      if (!stripHtml(comprehensionContent)) {
        alert("Passage content is required.");
        return;
      }
    }

    let finalOptions: QuestionOption[] | MatchFollowingOptions | undefined = undefined;
    let finalCorrectAnswer: CorrectAnswer = null;

    if (questionType === "mcq_single" || questionType === "assertion_reasoning" || questionType === "mcq_multiple") {
      finalOptions = options.map((option) => ({
        ...option,
        is_correct:
          questionType === "mcq_single" || questionType === "assertion_reasoning"
            ? option.id === correctAnswer
            : Array.isArray(correctAnswer)
            ? correctAnswer.includes(option.id)
            : false,
      }));
      const answerIds =
        questionType === "mcq_single" || questionType === "assertion_reasoning"
          ? typeof correctAnswer === "string"
            ? [correctAnswer]
            : []
          : Array.isArray(correctAnswer)
          ? correctAnswer
          : [];
      finalCorrectAnswer = { answer_ids: answerIds };
    }

    if (questionType === "true_false") {
      finalCorrectAnswer = { answer: trueFalseAnswer };
    }

    if (questionType === "numerical") {
      finalCorrectAnswer = {
        value: Number(numericalValue) || 0,
        tolerance: Number(numericalTolerance) || 0,
      };
    }

    if (questionType === "short_answer") {
      const answers = shortAnswers
        .split(",")
        .map((ans) => ans.trim())
        .filter(Boolean);
      finalCorrectAnswer = { answers, case_sensitive: shortCaseSensitive };
    }

    if (questionType === "match_following") {
      finalOptions = [
        ...matchLeft.map((option) => ({ ...option, side: "left" as const })),
        ...matchRight.map((option) => ({ ...option, side: "right" as const })),
      ];
      finalCorrectAnswer = { pairs: matchPairs };
    }

    if (questionType === "fill_in_blank") {
      finalCorrectAnswer = { blanks: normalizedFillBlanks };
    }

    const scopePayload = {
      program_id: toNullableNumber(programId),
      grade_id: toNullableNumber(gradeId),
      subject_id: toNullableNumber(subjectId),
      chapter_id: toNullableNumber(chapterId),
      topic_id: toNullableNumber(topicId),
    };

    setSaving(true);
    try {
      let resolvedComprehensionPassageId: number | null = null;

      if (hasComprehension) {
        const passagePayload = {
          title: comprehensionTitle,
          passage_content: comprehensionContent,
          ...scopePayload,
        };

        if (comprehensionMode === "existing") {
          const existingPassageId = toNullableNumber(comprehensionPassageId);
          if (existingPassageId === null) {
            alert("Select an existing passage.");
            return;
          }

          const response = await api.put(`/comprehension-passages/${existingPassageId}`, passagePayload);
          resolvedComprehensionPassageId = existingPassageId;
          upsertPassage({
            id: response.data?.id ?? existingPassageId,
            title: normalizeRichText(response.data?.title ?? comprehensionTitle),
            passage_content: normalizeRichText(response.data?.passage_content ?? comprehensionContent),
            program_id: response.data?.program_id ?? scopePayload.program_id ?? null,
            grade_id: response.data?.grade_id ?? scopePayload.grade_id ?? null,
            subject_id: response.data?.subject_id ?? scopePayload.subject_id ?? null,
            chapter_id: response.data?.chapter_id ?? scopePayload.chapter_id ?? null,
            topic_id: response.data?.topic_id ?? scopePayload.topic_id ?? null,
            created_at: response.data?.created_at ?? undefined,
            updated_at: response.data?.updated_at ?? undefined,
          });
        } else {
          const response = await api.post("/comprehension-passages", passagePayload);
          const createdPassageId = Number(response.data?.id);
          if (!Number.isFinite(createdPassageId)) {
            throw new Error("Failed to create comprehension passage");
          }

          resolvedComprehensionPassageId = createdPassageId;
          setComprehensionPassageId(String(createdPassageId));
          setComprehensionMode("existing");
          upsertPassage({
            id: createdPassageId,
            title: normalizeRichText(response.data?.title ?? comprehensionTitle),
            passage_content: normalizeRichText(response.data?.passage_content ?? comprehensionContent),
            program_id: response.data?.program_id ?? scopePayload.program_id ?? null,
            grade_id: response.data?.grade_id ?? scopePayload.grade_id ?? null,
            subject_id: response.data?.subject_id ?? scopePayload.subject_id ?? null,
            chapter_id: response.data?.chapter_id ?? scopePayload.chapter_id ?? null,
            topic_id: response.data?.topic_id ?? scopePayload.topic_id ?? null,
            created_at: response.data?.created_at ?? undefined,
            updated_at: response.data?.updated_at ?? undefined,
          });
        }
      }

      await onSave(
        {
          question_type: questionType,
          question_text: questionText,
          options: finalOptions,
          correct_answer: finalCorrectAnswer,
          scoring_mode: scoringMode,
          comprehension_passage_id: resolvedComprehensionPassageId,
          ...scopePayload,
          category: questionGroupType || null,
          difficulty_level: difficulty,
          marks_positive: Number(marksPositive) || 0,
          marks_negative: Number(marksNegative) || 0,
          exam_tags: parsedTags,
          solution: hasRichContent(solutionText) ? solutionText : null,
          created_by: initialQuestion?.created_by,
          created_at: initialQuestion?.created_at,
          status: initialQuestion?.status ?? "draft",
          review_note: initialQuestion?.review_note,
        },
        Boolean(initialQuestion)
      );
    } catch (error) {
      const message =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { error?: unknown } } }).response?.data?.error
          : null;
      if (typeof message === "string") {
        alert(message);
      } else if (error instanceof Error && error.message) {
        alert(error.message);
      } else {
        alert("Failed to save the question.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const formContent = (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Question Type</label>
          <select
            value={questionType}
            onChange={(event) => handleTypeChange(event.target.value as QuestionType)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="mcq_single">MCQ Single</option>
            <option value="assertion_reasoning">Assertion Reasoning</option>
            <option value="mcq_multiple">MCQ Multiple</option>
            <option value="short_answer">Short Answer</option>
            <option value="numerical">Numeric Response</option>
            <option value="true_false">True/False</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Difficulty</label>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Question["difficulty_level"])}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Category</label>
          <select
            value={questionGroupType ?? ""}
            onChange={(event) => setQuestionGroupType((event.target.value as QuestionGroupType) || "")}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="">Select</option>
            {QUESTION_GROUP_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500">Scoring Mode</label>
        <select
          value={scoringMode}
          onChange={(event) => setScoringMode(event.target.value as ScoringMode)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="all_or_nothing">All or Nothing</option>
          <option value="partial">Partial</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Comprehensive Passage
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Turn this on to place a passage before the question and keep both editable here.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700">
            <input
              type="checkbox"
              checked={hasComprehension}
              onChange={(event) => setHasComprehension(event.target.checked)}
            />
            Add Comprehensive
          </label>
        </div>

        {hasComprehension ? (
          <div className="mt-4 space-y-4 rounded-xl border border-sky-200 bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setComprehensionMode("new");
                  setComprehensionPassageId("");
                  setComprehensionTitle(emptyRichText());
                  setComprehensionContent(emptyRichText());
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  comprehensionMode === "new"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Add New Passage
              </button>
              <button
                type="button"
                onClick={() => {
                  setComprehensionMode("existing");
                  if (!comprehensionPassageId) {
                    setComprehensionTitle(emptyRichText());
                    setComprehensionContent(emptyRichText());
                  }
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  comprehensionMode === "existing"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Attach Existing Passage
              </button>
            </div>

            {comprehensionMode === "existing" ? (
              <div>
                <label className="text-xs font-semibold text-slate-500">Choose Existing Passage</label>
                <select
                  value={comprehensionPassageId}
                  onChange={(event) => setComprehensionPassageId(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                >
                  <option value="">Select a saved passage</option>
                  {comprehensionPassages.map((passage) => (
                    <option key={passage.id} value={String(passage.id)}>
                      {stripHtml(passage.title ?? emptyRichText()) || `Passage ${passage.id}`}
                    </option>
                  ))}
                </select>
                {!comprehensionPassages.length ? (
                  <p className="mt-2 text-xs text-amber-700">
                    No saved passages found yet. Switch to Add New Passage to create one here.
                  </p>
                ) : comprehensionPassageId ? (
                  <p className="mt-2 text-xs text-slate-500">
                    The selected passage is loaded below. Saving this question will also update that passage.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Select a saved passage to load it into the editor below.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Create a new passage here. Saving the question will create the passage and link it automatically.
              </p>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-500">Passage Title</label>
              <div className="mt-2">
                <RichTextEditor
                  value={comprehensionTitle}
                  onChange={setComprehensionTitle}
                  placeholder="Enter passage title"
                  height={120}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Passage Content</label>
              <div className="mt-2">
                <RichTextEditor
                  value={comprehensionContent}
                  onChange={setComprehensionContent}
                  placeholder="Enter the passage shown before the question"
                  height={240}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500">Question Text</label>
        <div className="mt-2">
          <RichTextEditor
            value={questionText}
            onChange={setQuestionText}
            placeholder="Enter the question text"
            height={200}
          />
        </div>
      </div>

      {(questionType === "mcq_single" || questionType === "assertion_reasoning" || questionType === "mcq_multiple") && (
        <div>
          <label className="text-xs font-semibold text-slate-500">Options</label>
          <div className="mt-2 space-y-3">
            {options.map((option, index) => (
              <div key={option.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
                {questionType === "mcq_single" || questionType === "assertion_reasoning" ? (
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <input
                      type="radio"
                      name="correct"
                      checked={correctAnswer === option.id}
                      onChange={() => setCorrectAnswer(option.id)}
                    />
                    Mark as correct
                  </label>
                ) : (
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <input
                      type="checkbox"
                      checked={Array.isArray(correctAnswer) && correctAnswer.includes(option.id)}
                      onChange={() => toggleMultiCorrect(option.id)}
                    />
                    Mark as correct
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => removeOption(option.id)}
                  className="self-end rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                >
                  Remove
                </button>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Option {index + 1}</label>
                  <div className="mt-2">
                    <RichTextEditor
                      value={option.text}
                      onChange={(value) => updateOptionText(option.id, value)}
                      placeholder={`Option ${index + 1}`}
                      height={120}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, { id: makeId(), text: emptyRichText() }])}
            className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            Add option
          </button>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-slate-500">Solution (Optional)</label>
        <div className="mt-2">
          <RichTextEditor
            value={solutionText}
            onChange={setSolutionText}
            placeholder="Add the solution or explanation"
            height={160}
          />
        </div>
      </div>

      {questionType === "short_answer" && (
        <div>
          <label className="text-xs font-semibold text-slate-500">Accepted Answers (comma separated)</label>
          <input
            type="text"
            value={shortAnswers}
            onChange={(event) => setShortAnswers(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="e.g. Newton, Isaac Newton"
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={shortCaseSensitive}
              onChange={(event) => setShortCaseSensitive(event.target.checked)}
            />
            Case sensitive
          </label>
        </div>
      )}

      {questionType === "numerical" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Correct Answer</label>
            <input
              type="number"
              value={numericalValue}
              onChange={(event) => setNumericalValue(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              placeholder="Enter numeric answer"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Tolerance</label>
            <input
              type="number"
              value={numericalTolerance}
              onChange={(event) => setNumericalTolerance(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>
      )}

      {questionType === "true_false" && (
        <div>
          <label className="text-xs font-semibold text-slate-500">Correct Answer</label>
          <select
            value={String(trueFalseAnswer)}
            onChange={(event) => setTrueFalseAnswer(event.target.value === "true")}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      )}
      {questionType === "match_following" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Left Items</label>
              <div className="mt-2 space-y-2">
                {matchLeft.map((item, index) => (
                  <RichTextEditor
                    key={item.id}
                    value={item.text}
                    onChange={(value) => updateMatchOption("left", item.id, value)}
                    placeholder={`Left ${index + 1}`}
                    height={90}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Right Items</label>
              <div className="mt-2 space-y-2">
                {matchRight.map((item, index) => (
                  <RichTextEditor
                    key={item.id}
                    value={item.text}
                    onChange={(value) => updateMatchOption("right", item.id, value)}
                    placeholder={`Right ${index + 1}`}
                    height={90}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Pairs</label>
            <div className="mt-2 space-y-2">
              {matchPairs.map((pair, index) => (
                <div key={`${pair.left_id}-${pair.right_id}-${index}`} className="flex items-center gap-2">
                  <select
                    value={pair.left_id}
                    onChange={(event) => updateMatchPair(index, "left_id", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  >
                    {matchLeft.map((item) => (
                      <option key={item.id} value={item.id}>
                        {stripHtml(item.text) || item.id}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400">→</span>
                  <select
                    value={pair.right_id}
                    onChange={(event) => updateMatchPair(index, "right_id", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  >
                    {matchRight.map((item) => (
                      <option key={item.id} value={item.id}>
                        {stripHtml(item.text) || item.id}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMatchPair(index)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addMatchPair}
              className="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Add pair
            </button>
          </div>
        </div>
      )}

      {questionType === "fill_in_blank" && (
        <div>
          <label className="text-xs font-semibold text-slate-500">Blanks</label>
          <p className="text-xs text-slate-400">
            Use placeholders like {"{{blank1}}"} in the question text.
          </p>
          <div className="mt-2 space-y-2">
            {fillBlanks.map((blank, index) => (
              <div key={blank.id} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">{blank.id}</span>
                <input
                  type="text"
                  value={blank.answers.join(", ")}
                  onChange={(event) => updateBlankAnswers(index, event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  placeholder="Accepted answers, comma separated"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addBlank}
            className="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            Add blank
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-5">
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
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
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
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">Select</option>
            {availableGrades.map((grade) => (
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
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">Select</option>
            {availableSubjects.map((subject) => (
              <option key={subject.id} value={String(subject.id)}>
                {formatSubjectDisplay(subject, { includeId: true })}
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
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">Select</option>
            {availableChapters.map((chapter) => (
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
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Select</option>
            {availableTopics.map((topic) => (
              <option key={topic.id} value={String(topic.id)}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Marks (Positive)</label>
          <input
            type="number"
            value={marksPositive}
            onChange={(event) => setMarksPositive(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Marks (Negative)</label>
          <input
            type="number"
            value={marksNegative}
            onChange={(event) => setMarksNegative(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Exam Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="JEE, NEET, Board"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {saving ? "Saving..." : initialQuestion ? "Save Changes" : "Create Question"}
        </button>
      </div>
    </form>
  );

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {initialQuestion ? "Edit Question" : "Create New Question"}
              </h2>
              <p className="text-xs text-slate-500">
                Keep questions concise and aligned to the syllabus.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {initialQuestion ? "Edit Question" : "Create New Question"}
          </h2>
          <p className="text-xs text-slate-500">
            Keep questions concise and aligned to the syllabus.
          </p>
        </div>
      </div>
      {formContent}
    </div>
  );
}
