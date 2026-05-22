import { useEffect, useRef } from "react";
import { typesetMathJax } from "@/components/ui/mathjax";
import { sanitizeHtml } from "@/utils/htmlSanitizer";
import katex from "katex";
import "katex/dist/katex.min.css";

export type RichTextLike =
  | { html?: string | null; text?: string | null }
  | string
  | null
  | undefined;

export type QuestionOptionLike = {
  id?: string | number;
  text?: RichTextLike;
  is_correct?: boolean;
};

export type MatchFollowingOptionsLike = {
  left?: QuestionOptionLike[];
  right?: QuestionOptionLike[];
};

type ComprehensiveQuestionLike = {
  id?: string | number;
  question_type?: string;
  question_text?: RichTextLike;
  options?: QuestionOptionLike[] | MatchFollowingOptionsLike;
  correct_answer?: unknown;
  marks_positive?: number;
  marks_negative?: number;
};

type LinkedPassageLike = {
  id?: string | number;
  title?: RichTextLike;
  passage_content?: RichTextLike;
};

type QuestionCategoryLike =
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
  | null
  | undefined;

export interface RenderableQuestion {
  question_type?: string;
  question_text?: RichTextLike;
  options?: QuestionOptionLike[] | MatchFollowingOptionsLike | null;
  correct_answer?: unknown;
  solution?: RichTextLike | null;
  comprehension?: LinkedPassageLike | null;
  comprehension_passage?: RichTextLike | null;
  comprehension_questions?: ComprehensiveQuestionLike[] | null;
  difficulty_level?: string | null;
  marks_positive?: number;
  marks_negative?: number;
  category?: QuestionCategoryLike;
}

interface QuestionRendererProps {
  question: RenderableQuestion;
  showAnswer?: boolean;
  showMeta?: boolean;
  showSolution?: boolean;
  showOptions?: boolean;
  showComprehension?: boolean;
  showEmptyState?: boolean;
  contentClassName?: string;
  className?: string;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq_single: "MCQ Single",
  assertion_reasoning: "Assertion Reasoning",
  mcq_multiple: "MCQ Multiple",
  numerical: "Numerical",
  true_false: "True/False",
  short_answer: "Short Answer",
  match_following: "Match the Following",
  fill_in_blank: "Fill in the Blank",
  comprehensive: "Comprehensive",
};

const normalizeLatexDelimitersForRender = (input: string) => {
  if (!input) return "";
  let next = String(input);

  // Collapse repeated escaping: \\( ... \\) or \\\\( ... \\\\) => \( ... \)
  for (let i = 0; i < 3; i += 1) {
    const updated = next
      .replace(/\\\\\(/g, "\\(")
      .replace(/\\\\\)/g, "\\)")
      .replace(/\\\\\[/g, "\\[")
      .replace(/\\\\\]/g, "\\]")
      .replace(/\\\\\{/g, "\\{")
      .replace(/\\\\\}/g, "\\}");
    if (updated === next) break;
    next = updated;
  }

  return next;
};

const getHtml = (value: RichTextLike) => {
  if (!value) return "";
  if (typeof value === "string") return normalizeLatexDelimitersForRender(value);
  if (typeof value === "object" && "html" in value) {
    return normalizeLatexDelimitersForRender(String(value.html ?? value.text ?? ""));
  }
  if (typeof value === "object" && "text" in value) {
    return normalizeLatexDelimitersForRender(String(value.text ?? ""));
  }
  return "";
};

const wrapTablesInHtml = (html: string) => {
  if (!html || typeof window === "undefined") return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc.querySelectorAll("table").forEach((table) => {
      const parent = table.parentElement;
      if (parent && parent.classList.contains("question-table-wrap")) return;
      const wrapper = doc.createElement("div");
      wrapper.className = "question-table-wrap";
      parent?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
    return doc.body.innerHTML;
  } catch (error) {
    return html;
  }
};

const renderLatexWithKatex = (html: string) => {
  if (!html || typeof window === "undefined") return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const skipTags = new Set(["script", "style", "textarea", "code", "pre"]);
    const latexPattern =
      /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g;

    const renderTextNode = (textNode: Text) => {
      const content = textNode.nodeValue ?? "";
      if (!content || !latexPattern.test(content)) return;
      latexPattern.lastIndex = 0;

      const fragment = doc.createDocumentFragment();
      let lastIndex = 0;
      for (const match of content.matchAll(latexPattern)) {
        const index = match.index ?? 0;
        if (index > lastIndex) {
          fragment.appendChild(doc.createTextNode(content.slice(lastIndex, index)));
        }

        const expression = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";
        const displayMode = Boolean(match[1] || match[3]);
        const span = doc.createElement("span");
        span.className = displayMode ? "katex-display-wrap" : "katex-inline-wrap";
        try {
          span.innerHTML = katex.renderToString(expression.trim(), {
            throwOnError: false,
            displayMode,
            output: "htmlAndMathml",
          });
        } catch {
          span.textContent = match[0];
        }
        fragment.appendChild(span);
        lastIndex = index + match[0].length;
      }

      if (lastIndex < content.length) {
        fragment.appendChild(doc.createTextNode(content.slice(lastIndex)));
      }
      textNode.parentNode?.replaceChild(fragment, textNode);
    };

    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (skipTags.has(el.tagName.toLowerCase())) return;
      }
      const children = Array.from(node.childNodes);
      if (node.nodeType === Node.TEXT_NODE) {
        renderTextNode(node as Text);
        return;
      }
      children.forEach(walk);
    };

    walk(doc.body);
    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

const renderHtml = (value: RichTextLike) => {
  const sanitized = sanitizeHtml(wrapTablesInHtml(getHtml(value)));
  // Important: run KaTeX AFTER sanitization so its generated layout styles are preserved.
  return { __html: renderLatexWithKatex(sanitized) };
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "").trim();

const formatOptionLabel = (option: QuestionOptionLike, index: number) => {
  const letter = String.fromCharCode(65 + index);
  const text = stripHtml(getHtml(option.text));
  return text ? `${letter}. ${text}` : letter;
};

const isMatchFollowingOptions = (
  options: QuestionOptionLike[] | MatchFollowingOptionsLike | null | undefined
): options is MatchFollowingOptionsLike =>
  Boolean(options && !Array.isArray(options) && (options.left || options.right));

const resolveOptionIndex = (options: QuestionOptionLike[], id: string) => {
  const optionIndexById = new Map(
    options.map((option, index) => [String(option.id ?? index), index])
  );
  const direct = optionIndexById.get(id);
  if (direct !== undefined) return direct;

  const normalized = id.trim();
  const embeddedLetterMatch = normalized.match(/[\(\[\{]\s*([A-H])\s*[\)\]\}]/i);
  if (embeddedLetterMatch?.[1]) {
    const index = embeddedLetterMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return index;
  }

  const labelledPrefixMatch = normalized.match(
    /^\(?\s*([A-H])\s*\)?(?:[\)\].:;,\-])*(?:\s+.*)?$/i
  );
  if (labelledPrefixMatch?.[1]) {
    const index = labelledPrefixMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return index;
  }

  const optionWordMatch = normalized.match(/\b(?:option|opt)\s*([A-H])\b/i);
  if (optionWordMatch?.[1]) {
    const index = optionWordMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return index;
  }

  if (/^[a-z]$/i.test(normalized)) {
    const index = normalized.toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return index;
  }

  if (/^\d+$/.test(normalized)) {
    const num = Number(normalized);
    if (num >= 1 && num <= options.length) return num - 1;
    if (num >= 0 && num < options.length) return num;
  }

  return undefined;
};

const resolveLabelsFromIds = (options: QuestionOptionLike[], ids: string[]) => {
  const labels = ids
    .map((id) => resolveOptionIndex(options, String(id)))
    .filter((index) => index !== undefined)
    .map((index) => formatOptionLabel(options[index as number], index as number));
  return labels.length ? labels : null;
};

const resolveCorrectFromOptions = (
  options: QuestionOptionLike[] | undefined,
  answer: unknown
) => {
  if (!options || options.length === 0) return null;
  if (typeof answer === "string") {
    const index = resolveOptionIndex(options, answer);
    if (index !== undefined) return formatOptionLabel(options[index], index);
  }

  if (typeof answer === "object" && answer) {
    const typed = answer as Record<string, unknown>;
    if (Array.isArray(typed.answer_ids)) {
      const labels = resolveLabelsFromIds(options, typed.answer_ids.map(String));
      if (labels) return labels.join(", ");
    }
    if (Array.isArray(typed.answers)) {
      const labels = resolveLabelsFromIds(options, typed.answers.map(String));
      if (labels) return labels.join(", ");
    }
    if (typeof typed.answer === "string") {
      const index = resolveOptionIndex(options, typed.answer);
      if (index !== undefined) return formatOptionLabel(options[index], index);
    }
  }
  if (Array.isArray(answer)) {
    const labels = resolveLabelsFromIds(options, answer.map(String));
    if (labels) return labels.join(", ");
  }

  const fallback = options
    .map((option, index) => (option.is_correct ? formatOptionLabel(option, index) : null))
    .filter(Boolean) as string[];
  if (fallback.length) return fallback.join(", ");

  return null;
};

const resolveMatchOptionIndex = (options: QuestionOptionLike[] | undefined, id: string) => {
  if (!options || options.length === 0) return undefined;
  const byId = new Map(options.map((option, index) => [String(option.id ?? index), index]));
  const direct = byId.get(id);
  if (direct !== undefined) return direct;

  const normalized = id.trim();
  if (/^[a-z]$/i.test(normalized)) {
    const index = normalized.toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return index;
  }
  if (/^\d+$/.test(normalized)) {
    const num = Number(normalized);
    if (num >= 1 && num <= options.length) return num - 1;
    if (num >= 0 && num < options.length) return num;
  }
  return undefined;
};

const formatMatchPairMappings = (
  matchOptions: MatchFollowingOptionsLike,
  answer: unknown
) => {
  if (!matchOptions.left?.length || !matchOptions.right?.length || !answer || typeof answer !== "object") {
    return null;
  }

  const typed = answer as Record<string, unknown>;
  const pairs = Array.isArray(typed.pairs) ? typed.pairs : [];
  if (!pairs.length) return null;

  const labels = pairs
    .map((pair) => {
      if (!pair || typeof pair !== "object") return null;
      const record = pair as Record<string, unknown>;
      const leftIndex = resolveMatchOptionIndex(matchOptions.left, String(record.left_id ?? ""));
      const rightIndex = resolveMatchOptionIndex(matchOptions.right, String(record.right_id ?? ""));
      if (leftIndex === undefined || rightIndex === undefined) return null;
      const leftLabel = String.fromCharCode(65 + leftIndex);
      const rightLabel = String(rightIndex + 1);
      return `${leftLabel}-${rightLabel}`;
    })
    .filter(Boolean) as string[];

  return labels.length ? labels.join(", ") : null;
};

const resolveCorrectOptionIndexes = (
  options: QuestionOptionLike[] | undefined,
  answer: unknown
) => {
  const indexes = new Set<number>();
  if (!options || options.length === 0) return indexes;

  const addIndex = (value: unknown) => {
    if (value === null || value === undefined) return;
    const index = resolveOptionIndex(options, String(value));
    if (index !== undefined) indexes.add(index);
  };

  if (typeof answer === "string") {
    answer
      .split(/[;,|]/)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => addIndex(token));
  } else if (Array.isArray(answer)) {
    answer.forEach((item) => addIndex(item));
  } else if (typeof answer === "object" && answer) {
    const typed = answer as Record<string, unknown>;
    if (Array.isArray(typed.answer_ids)) typed.answer_ids.forEach((item) => addIndex(item));
    if (Array.isArray(typed.answers)) typed.answers.forEach((item) => addIndex(item));
    if (typed.answer !== undefined) addIndex(typed.answer);
  }

  if (indexes.size === 0) {
    options.forEach((option, index) => {
      if (option.is_correct) indexes.add(index);
    });
  }

  return indexes;
};

const formatCorrectAnswer = (question: RenderableQuestion) => {
  const answer = question.correct_answer;
  if (answer === null || answer === undefined) return "";
  if (question.question_type === "match_following" && isMatchFollowingOptions(question.options)) {
    const mappedPairs = formatMatchPairMappings(question.options, answer);
    if (mappedPairs) return mappedPairs;
  }
  if (Array.isArray(question.options)) {
    const fromOptions = resolveCorrectFromOptions(question.options, answer);
    if (fromOptions) return fromOptions;
  }
  if (typeof answer === "string" || typeof answer === "number" || typeof answer === "boolean") {
    return String(answer);
  }
  if (typeof answer === "object") {
    const typed = answer as Record<string, unknown>;
    if (Array.isArray(typed.answer_ids)) return typed.answer_ids.join(", ");
    if (typed.answer !== undefined) return String(typed.answer);
    if (typed.value !== undefined) {
      const tolerance = typed.tolerance ?? 0;
      return `Value: ${typed.value} (+/-${tolerance})`;
    }
    if (Array.isArray(typed.answers)) return typed.answers.join(", ");
    if (Array.isArray(typed.pairs)) return `${typed.pairs.length} pairs`;
    if (Array.isArray(typed.blanks)) return `${typed.blanks.length} blanks`;
    if (typed.raw !== undefined) return String(typed.raw);
  }
  return "Available";
};

const formatCategoryLabel = (category: QuestionCategoryLike) => {
  if (category === undefined || category === null) return "";
  if (typeof category === "string") return category.trim();
  if (Array.isArray(category)) {
    return category
      .map((entry) => String(entry).trim())
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
    return String(preferred ?? "").trim();
  }
  return String(category).trim();
};

export default function QuestionRenderer({
  question,
  showAnswer = false,
  showMeta = true,
  showSolution = false,
  showOptions = true,
  showComprehension = true,
  showEmptyState = true,
  contentClassName,
  className,
}: QuestionRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const questionHtml = getHtml(question.question_text);
  const linkedPassageHtml = getHtml(question.comprehension?.passage_content);
  const linkedPassageTitleHtml = getHtml(question.comprehension?.title);
  const passageHtml = getHtml(question.comprehension_passage);
  const solutionHtml = getHtml(question.solution);

  useEffect(() => {
    let mounted = true;
    const typeset = async () => {
      if (!mounted || !containerRef.current) return;
      await typesetMathJax([containerRef.current]);
    };
    typeset();
    return () => {
      mounted = false;
    };
  }, [
    question,
    questionHtml,
    linkedPassageHtml,
    linkedPassageTitleHtml,
    passageHtml,
    solutionHtml,
    question.options,
    question.comprehension_questions,
  ]);

  const typeLabel =
    (question.question_type && QUESTION_TYPE_LABELS[question.question_type]) || "Question";
  const difficultyLabel = question.difficulty_level
    ? question.difficulty_level.toUpperCase()
    : "N/A";
  const marksPositive = question.marks_positive ?? 0;
  const marksNegative = question.marks_negative ?? 0;
  const categoryLabel = formatCategoryLabel(question.category);

  const renderOptions = () => {
    if (!showOptions) return null;
    if (Array.isArray(question.options) && question.options.length) {
      const correctIndexes = resolveCorrectOptionIndexes(question.options, question.correct_answer);
      return (
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          {question.options.map((option, index) => (
            <div
              key={option.id ?? Math.random().toString(36)}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    showAnswer && correctIndexes.has(index)
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span dangerouslySetInnerHTML={renderHtml(option.text)} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (question.question_type === "match_following" && question.options) {
      const matchOptions = question.options as MatchFollowingOptionsLike;
      return (
        <div className="mt-4 text-sm text-slate-700">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-slate-500">Left</div>
              {matchOptions.left?.map((item, index) => (
                <div key={item.id ?? `left-${index}`} className="mt-2 rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span dangerouslySetInnerHTML={renderHtml(item.text)} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Right</div>
              {matchOptions.right?.map((item, index) => (
                <div key={item.id ?? `right-${index}`} className="mt-2 rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {index + 1}
                    </span>
                    <span dangerouslySetInnerHTML={renderHtml(item.text)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderComprehensive = () => {
    if (!showComprehension) return null;
    if (question.comprehension?.passage_content) {
      return (
        <div className="mt-4 space-y-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-slate-700">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Linked Passage
          </div>
          {linkedPassageTitleHtml ? (
            <div className="text-sm font-semibold text-slate-900" dangerouslySetInnerHTML={renderHtml(question.comprehension?.title)} />
          ) : null}
          <div dangerouslySetInnerHTML={renderHtml(question.comprehension?.passage_content)} />
        </div>
      );
    }
    if (question.question_type !== "comprehensive" || !question.comprehension_passage) return null;

    return (
      <div className="mt-4 space-y-3 text-sm text-slate-700">
        <div>
          <div className="text-xs font-semibold text-slate-500">Passage</div>
          <div className="mt-2" dangerouslySetInnerHTML={renderHtml(question.comprehension_passage)} />
        </div>
        {question.comprehension_questions?.length ? (
          <div>
            <div className="text-xs font-semibold text-slate-500">Sub-Questions</div>
            <div className="mt-2 space-y-2">
              {question.comprehension_questions.map((sub) => (
                <div key={sub.id ?? Math.random().toString(36)} className="rounded-lg border border-slate-200 px-3 py-2">
                  <QuestionRenderer
                    question={{
                      question_type: sub.question_type,
                      question_text: sub.question_text,
                      options: sub.options,
                      correct_answer: sub.correct_answer,
                      marks_positive: sub.marks_positive,
                      marks_negative: sub.marks_negative,
                    }}
                    showMeta={false}
                    showComprehension={false}
                    showSolution={false}
                    showAnswer={showAnswer}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const optionsContent = renderOptions();
  const comprehensiveContent = renderComprehensive();
  const questionContentClassName =
    contentClassName ??
    (showMeta && !comprehensiveContent ? "mt-4 text-sm text-slate-800" : "text-sm text-slate-800");
  const showEmptyOptions =
    showEmptyState &&
    !optionsContent &&
    !comprehensiveContent &&
    question.question_type !== "short_answer" &&
    question.question_type !== "numerical";

  return (
    <div ref={containerRef} className={`question-render ${className ?? ""}`.trim()}>
      {showMeta && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">{typeLabel}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">{difficultyLabel}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
            +{marksPositive} / -{marksNegative}
          </span>
          {categoryLabel ? (
            <span className="rounded-full bg-violet-100 px-2 py-1 font-semibold text-violet-700">
              {categoryLabel}
            </span>
          ) : null}
        </div>
      )}

      {comprehensiveContent}

      <div className={comprehensiveContent ? "mt-4" : undefined}>
        <div
          className={questionContentClassName}
          dangerouslySetInnerHTML={renderHtml(question.question_text)}
        />
      </div>

      {optionsContent}

      {showEmptyOptions ? (
        <div className="mt-4 text-sm text-slate-500">This question does not have options.</div>
      ) : null}

      {showSolution && solutionHtml ? (
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-500">Solution</div>
          <div className="mt-2 text-sm text-slate-700" dangerouslySetInnerHTML={renderHtml(question.solution)} />
        </div>
      ) : null}

      {showAnswer && question.correct_answer !== null && question.correct_answer !== undefined ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Correct answer: {formatCorrectAnswer(question)}
        </div>
      ) : null}
    </div>
  );
}
