import katex from 'katex';
import 'katex/dist/katex.min.css';
import StudioShapeElement from './StudioShapeElement';
import type { InlineShapeData } from './studioInlineShape';

interface Props {
  text: string;
  color?: string;
  fontSize?: number;
}

const inlineContentPattern = /\\\((.+?)\\\)|\[\[shape:(.+?)\]\]/gs;

export const inlineEquationParts = (text: string) => {
  inlineContentPattern.lastIndex = 0;
  const parts: Array<{ kind: 'text' | 'math' | 'shape'; value: string }> = [];
  let cursor = 0;
  for (const match of text.matchAll(inlineContentPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ kind: 'text', value: text.slice(cursor, index) });
    parts.push({ kind: match[1] !== undefined ? 'math' : 'shape', value: match[1] ?? match[2] });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) parts.push({ kind: 'text', value: text.slice(cursor) });
  return parts;
};

export const hasInlineEquation = (text: string) => {
  inlineContentPattern.lastIndex = 0;
  return inlineContentPattern.test(text);
};

export default function StudioRichTextElement({ text, color = '#25436b', fontSize = 18 }: Props) {
  const parts = inlineEquationParts(text);

  return <div className="pointer-events-none h-full w-full overflow-hidden p-3 font-medium leading-relaxed" style={{ color, fontSize }}>
    {parts.map((part, index) => {
      if (part.kind === 'text') return <span key={index} className="whitespace-pre-wrap">{part.value}</span>;
      if (part.kind === 'math') return <span key={index} className="mx-1 inline-block align-middle" dangerouslySetInnerHTML={{ __html: katex.renderToString(part.value, { displayMode: false, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' }) }} />;
      try {
        const shape = JSON.parse(decodeURIComponent(part.value)) as InlineShapeData;
        return <span key={index} className="mx-1 inline-block h-[1.5em] w-[2.5em] align-middle"><StudioShapeElement {...shape} /></span>;
      } catch {
        return null;
      }
    })}
  </div>;
}
