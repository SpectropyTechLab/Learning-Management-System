import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  text: string;
  color?: string;
  fontSize?: number;
}

const inlineEquationPattern = /\\\((.+?)\\\)/gs;

export const inlineEquationParts = (text: string) => {
  inlineEquationPattern.lastIndex = 0;
  const parts: Array<{ kind: 'text' | 'math'; value: string }> = [];
  let cursor = 0;
  for (const match of text.matchAll(inlineEquationPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ kind: 'text', value: text.slice(cursor, index) });
    parts.push({ kind: 'math', value: match[1] });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) parts.push({ kind: 'text', value: text.slice(cursor) });
  return parts;
};

export const hasInlineEquation = (text: string) => {
  inlineEquationPattern.lastIndex = 0;
  return inlineEquationPattern.test(text);
};

export default function StudioRichTextElement({ text, color = '#25436b', fontSize = 18 }: Props) {
  const parts = inlineEquationParts(text);

  return <div className="pointer-events-none h-full w-full overflow-hidden p-3 font-medium leading-relaxed" style={{ color, fontSize }}>
    {parts.map((part, index) => part.kind === 'text'
      ? <span key={index} className="whitespace-pre-wrap">{part.value}</span>
      : <span key={index} className="mx-1 inline-block align-middle" dangerouslySetInnerHTML={{ __html: katex.renderToString(part.value, { displayMode: false, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' }) }} />)}
  </div>;
}
