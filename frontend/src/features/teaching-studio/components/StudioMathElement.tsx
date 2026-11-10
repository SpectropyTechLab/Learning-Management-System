import { useEffect, useMemo, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  latex: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
  onRequestSize?: (requiredWidthRatio: number, requiredHeightRatio: number) => void;
}

export default function StudioMathElement({
  latex,
  color = '#0f2747',
  backgroundColor = 'transparent',
  fontSize = 42,
  alignment = 'center',
  onRequestSize,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const requestSizeRef = useRef(onRequestSize);
  requestSizeRef.current = onRequestSize;
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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content || container.clientWidth <= 0 || container.clientHeight <= 0) return;
      const measurement = content.cloneNode(true) as HTMLDivElement;
      Object.assign(measurement.style, {
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: 'max-content',
        maxWidth: 'none',
        overflow: 'visible',
        visibility: 'hidden',
        pointerEvents: 'none',
        color,
        fontSize: `${fontSize}px`,
      });
      document.body.appendChild(measurement);
      const requiredWidth = measurement.scrollWidth + 24;
      const requiredHeight = measurement.scrollHeight + 24;
      measurement.remove();
      if (requiredWidth > 0 && requiredHeight > 0) {
        requestSizeRef.current?.(
          requiredWidth / container.clientWidth,
          requiredHeight / container.clientHeight,
        );
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [color, fontSize, latex, markup]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none flex h-full w-full items-center overflow-hidden p-3 ${alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center'}`}
      style={{ color, backgroundColor, fontSize }}
      aria-label={`Equation: ${latex}`}
    >
      <div ref={contentRef} className="max-w-full overflow-hidden">
        {markup ? <div dangerouslySetInnerHTML={{ __html: markup }} /> : <span>{latex}</span>}
      </div>
    </div>
  );
}
