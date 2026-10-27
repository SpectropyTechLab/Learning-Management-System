import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Question, QuestionDifficulty, QuestionType } from '../types';

type SubjectOption = { id: number; name: string };
type ChapterOption = { id: number; name: string };
type TopicOption = { id: number; name: string };

type OptionInput = { id: string; text: string; is_correct: boolean };

type Props = {
  initialQuestion?: Question | null;
  subjects: SubjectOption[];
  chapters: ChapterOption[];
  topics: TopicOption[];
  onSubjectChange: (subjectId: number | null) => void;
  onChapterChange: (chapterId: number | null) => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  submitLabel: string;
  disabled?: boolean;
};

const optionIds = ['A', 'B', 'C', 'D'];

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, '').trim();

const extractText = (input?: unknown) => {
  if (!input) return '';
  if (typeof input === 'string') return stripHtml(input);
  if (typeof input === 'object' && input && 'html' in input) {
    const html = String((input as { html?: string }).html ?? '');
    return stripHtml(html);
  }
  return '';
};

const wrapHtml = (text: string) => {
  const safe = text.trim();
  return safe ? `<p>${safe}</p>` : '';
};

const buildDefaultOptions = () =>
  optionIds.map((id) => ({ id, text: '', is_correct: false }));

export default function QuestionForm({
  initialQuestion,
  subjects,
  chapters,
  topics,
  onSubjectChange,
  onChapterChange,
  onSubmit,
  submitLabel,
  disabled = false,
}: Props) {
  const [questionType, setQuestionType] = useState<QuestionType>('mcq_single');
  const [questionText, setQuestionText] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('medium');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [marksPositive, setMarksPositive] = useState('4');
  const [marksNegative, setMarksNegative] = useState('0');
  const [options, setOptions] = useState<OptionInput[]>(buildDefaultOptions());
  const [mcqSingleAnswer, setMcqSingleAnswer] = useState('A');
  const [mcqMultipleAnswers, setMcqMultipleAnswers] = useState<string[]>([]);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<'true' | 'false'>('true');
  const [numericalValue, setNumericalValue] = useState('');
  const [numericalTolerance, setNumericalTolerance] = useState('0.01');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialQuestion) return;

    setQuestionType(initialQuestion.question_type);
    setQuestionText(extractText(initialQuestion.question_text));
    setSolutionText(extractText(initialQuestion.solution));
    setDifficulty(initialQuestion.difficulty_level);
    setSubjectId(String(initialQuestion.subject_id ?? ''));
    setChapterId(String(initialQuestion.chapter_id ?? ''));
    setTopicId(initialQuestion.topic_id ? String(initialQuestion.topic_id) : '');
    setMarksPositive(String(initialQuestion.marks_positive ?? 4));
    setMarksNegative(String(initialQuestion.marks_negative ?? 0));

    const optionPayload = Array.isArray(initialQuestion.options)
      ? initialQuestion.options
      : buildDefaultOptions();

    const mappedOptions = optionIds.map((id, idx) => {
      const option = optionPayload[idx] as { id?: string; text?: { html?: string } | string; is_correct?: boolean };
      return {
        id: option?.id ?? id,
        text: extractText(option?.text),
        is_correct: Boolean(option?.is_correct),
      };
    });
    setOptions(mappedOptions);

    if (initialQuestion.question_type === 'mcq_single') {
      const answer = (initialQuestion.correct_answer as { answer?: string })?.answer || 'A';
      setMcqSingleAnswer(answer);
    }
    if (initialQuestion.question_type === 'mcq_multiple') {
      const answers = (initialQuestion.correct_answer as { answers?: string[] })?.answers || [];
      setMcqMultipleAnswers(answers);
    }
    if (initialQuestion.question_type === 'true_false') {
      const answer = (initialQuestion.correct_answer as { answer?: boolean })?.answer ?? true;
      setTrueFalseAnswer(answer ? 'true' : 'false');
    }
    if (initialQuestion.question_type === 'numerical') {
      const correct = initialQuestion.correct_answer as { value?: number; tolerance?: number };
      if (correct?.value !== undefined) setNumericalValue(String(correct.value));
      if (correct?.tolerance !== undefined) setNumericalTolerance(String(correct.tolerance));
    }
  }, [initialQuestion]);

  useEffect(() => {
    if (subjectId) {
      onSubjectChange(Number(subjectId));
    } else {
      onSubjectChange(null);
    }
  }, [subjectId, onSubjectChange]);

  useEffect(() => {
    if (chapterId) {
      onChapterChange(Number(chapterId));
    } else {
      onChapterChange(null);
    }
  }, [chapterId, onChapterChange]);

  const canSubmit = useMemo(() => {
    return Boolean(subjectId && chapterId && questionText.trim());
  }, [subjectId, chapterId, questionText]);

  const handleOptionChange = (idx: number, value: string) => {
    setOptions((prev) => prev.map((opt, index) => (index === idx ? { ...opt, text: value } : opt)));
  };

  const handleMultipleToggle = (id: string) => {
    setMcqMultipleAnswers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const buildOptionsPayload = () =>
    options.map((opt) => ({
      id: opt.id,
      text: { html: wrapHtml(opt.text) },
      is_correct:
        questionType === 'mcq_single'
          ? opt.id === mcqSingleAnswer
          : questionType === 'mcq_multiple'
          ? mcqMultipleAnswers.includes(opt.id)
          : false,
    }));

  const buildCorrectAnswer = () => {
    if (questionType === 'mcq_single') {
      return { answer: mcqSingleAnswer };
    }
    if (questionType === 'mcq_multiple') {
      return { answers: mcqMultipleAnswers };
    }
    if (questionType === 'true_false') {
      return { answer: trueFalseAnswer === 'true' };
    }
    if (questionType === 'numerical') {
      return {
        value: Number(numericalValue),
        tolerance: Number(numericalTolerance),
      };
    }
    return {};
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!canSubmit) {
      setFormError('Please fill the required fields.');
      return;
    }

    const payload: Record<string, unknown> = {
      question_type: questionType,
      question_text: { html: wrapHtml(questionText) },
      correct_answer: buildCorrectAnswer(),
      subject_id: Number(subjectId),
      chapter_id: Number(chapterId),
      topic_id: topicId ? Number(topicId) : null,
      difficulty_level: difficulty,
      marks_positive: Number(marksPositive),
      marks_negative: Number(marksNegative),
      solution: solutionText ? { html: wrapHtml(solutionText) } : null,
    };

    if (questionType === 'mcq_single' || questionType === 'mcq_multiple') {
      payload.options = buildOptionsPayload();
    }

    try {
      await onSubmit(payload);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save question');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Question Details</h2>
        {formError ? <span className="text-sm text-red-600">{formError}</span> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500">Question Type</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
            disabled={disabled}
          >
            <option value="mcq_single">MCQ (Single)</option>
            <option value="assertion_reasoning">Assertion Reasoning</option>
            <option value="mcq_multiple">MCQ (Multiple)</option>
            <option value="true_false">True / False</option>
            <option value="numerical">Numerical</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500">Difficulty</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
            disabled={disabled}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500">Subject</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setChapterId('');
              setTopicId('');
            }}
            disabled={disabled}
          >
            <option value="">Select subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500">Chapter</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={chapterId}
            onChange={(e) => {
              setChapterId(e.target.value);
              setTopicId('');
            }}
            disabled={disabled || !subjectId}
          >
            <option value="">Select chapter</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500">Topic</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            disabled={disabled || !chapterId}
          >
            <option value="">Optional</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500">Marks (+)</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={marksPositive}
              onChange={(e) => setMarksPositive(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500">Negative (-)</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={marksNegative}
              onChange={(e) => setMarksNegative(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500">Question Text</label>
        <textarea
          className="mt-1 min-h-30 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Enter the question text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          disabled={disabled}
        />
      </div>

      {(questionType === 'mcq_single' || questionType === 'mcq_multiple') && (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-500">Options</label>
          {options.map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500">{opt.id}</span>
              <input
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={opt.text}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                disabled={disabled}
              />
              {questionType === 'mcq_single' ? (
                <input
                  type="radio"
                  name="mcq-single"
                  checked={mcqSingleAnswer === opt.id}
                  onChange={() => setMcqSingleAnswer(opt.id)}
                  disabled={disabled}
                />
              ) : (
                <input
                  type="checkbox"
                  checked={mcqMultipleAnswers.includes(opt.id)}
                  onChange={() => handleMultipleToggle(opt.id)}
                  disabled={disabled}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {questionType === 'true_false' && (
        <div>
          <label className="block text-xs font-semibold text-gray-500">Correct Answer</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={trueFalseAnswer}
            onChange={(e) => setTrueFalseAnswer(e.target.value as 'true' | 'false')}
            disabled={disabled}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      )}

      {questionType === 'numerical' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500">Correct Value</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={numericalValue}
              onChange={(e) => setNumericalValue(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500">Tolerance</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={numericalTolerance}
              onChange={(e) => setNumericalTolerance(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-500">Solution (Optional)</label>
        <textarea
          className="mt-1 min-h-22.5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Add solution explanation"
          value={solutionText}
          onChange={(e) => setSolutionText(e.target.value)}
          disabled={disabled}
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit || disabled}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
