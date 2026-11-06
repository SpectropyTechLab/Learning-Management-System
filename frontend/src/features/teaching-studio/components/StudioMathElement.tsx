import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  latex: string;
  color?: string;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
}

export default function StudioMathElement({
  latex,
  color = '#0f2747',
  fontSize = 42,
  alignment = 'center',
}: Props) {
  const markup = useMemo(() => {
    try {
      return katex.renderToString(latex || String.raw`\square`, {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
        trust: false,
        output: 'htmlAndMathml',
      });
    } catch {
      return '';
    }
  }, [latex]);

  return (
    <div
      className={`pointer-events-none flex h-full w-full items-center overflow-hidden p-3 ${alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center'}`}
      style={{ color, fontSize }}
      aria-label={`Equation: ${latex}`}
    >
      {markup ? (
        <div className="max-w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: markup }} />
      ) : (
        <span>{latex}</span>
      )}
    </div>
  );
}
