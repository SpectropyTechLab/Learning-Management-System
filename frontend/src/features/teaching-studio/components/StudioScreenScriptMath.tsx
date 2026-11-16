import type { ReactNode } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MATH_PARTS = /(\$\$[^$]+\$\$|\$[^$\n]+\$|\\\([^\n]+?\\\)|\\\[[^\n]+?\\\]|\\frac\{[^}]+\}\{[^}]+\}|[A-Za-z0-9()]+(?:\^|_)(?:\{[^}]+\}|-?[A-Za-z0-9]+)(?:[+=*/-][A-Za-z0-9()^_{}+-]+)*)/g;

const latexValue = (value: string) => {
  if (value.startsWith('$$') && value.endsWith('$$')) return value.slice(2, -2);
  if (value.startsWith('$') && value.endsWith('$')) return value.slice(1, -1);
  if ((value.startsWith('\\(') && value.endsWith('\\)')) || (value.startsWith('\\[') && value.endsWith('\\]'))) {
    return value.slice(2, -2);
  }
  return value;
};

export default function StudioScreenScriptMath({ text }: { text: string }) {
  const lines = String(text || '').split('\n');
  return <>{lines.map((line, lineIndex) => {
    const nodes: ReactNode[] = [];
    let cursor = 0;
    for (const match of line.matchAll(MATH_PARTS)) {
      const start = match.index ?? 0;
      if (start > cursor) nodes.push(line.slice(cursor, start));
      const source = match[0];
      nodes.push(<span
        key={`${lineIndex}-${start}`}
        className="mx-0.5 inline-block align-middle"
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(latexValue(source), {
            displayMode: source.startsWith('$$') || source.startsWith('\\['),
            throwOnError: false,
            strict: 'ignore',
            trust: false,
            output: 'htmlAndMathml',
          }),
        }}
      />);
      cursor = start + source.length;
    }
    if (cursor < line.length) nodes.push(line.slice(cursor));
    return <span key={lineIndex}>{nodes.length ? nodes : line}{lineIndex < lines.length - 1 ? <br /> : null}</span>;
  })}</>;
}
