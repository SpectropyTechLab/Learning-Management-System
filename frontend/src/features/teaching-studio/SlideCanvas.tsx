import { useEffect, useRef, useState } from 'react';
import { MASTER, fitScale, validateSlide } from './layouts';
import type { Layout, Slide, Slot } from './layouts';

const colors: Record<string, { fill: string; stroke: string; ink: string }> = {
  title: { fill: '#eaf2fd', stroke: '#c9ddf6', ink: '#173b65' },
  visual: { fill: '#ddefe9', stroke: '#9bd5c5', ink: '#176a54' },
  text: { fill: '#f7edda', stroke: '#eddbb8', ink: '#714d19' },
  question: { fill: '#e5edfb', stroke: '#bfceed', ink: '#25436b' },
  response: { fill: '#f2f8fc', stroke: '#a8c6da', ink: '#25436b' },
  steps: { fill: '#e7f0fb', stroke: '#b8c9e5', ink: '#25436b' },
  workspace: { fill: '#f5f9fc', stroke: '#b8c9e5', ink: '#25436b' },
  footer: { fill: '#e5edf6', stroke: '#c8d6e6', ink: '#25436b' },
};

function FittedText({ slot, text, ink }: { slot: Slot; text: string; ink: string }) {
  const { x, y, width, height } = slot.bounds;
  const fontSize = slot.region === 'header' ? 62 : slot.region === 'footer' ? 27 : 40;
  const maxChars = Math.max(20, Math.floor((width - 80) / (fontSize * 0.55)));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= maxChars) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  const visible = lines.slice(0, Math.max(1, Math.floor((height - 80) / (fontSize * 1.3))));
  return <text x={x + 40} y={y + (slot.region === 'footer' ? 35 : 78)} fill={ink} fontSize={fontSize} fontWeight={slot.region === 'header' ? 700 : 500}>
    {visible.map((line, index) => <tspan key={index} x={x + 40} dy={index ? fontSize * 1.3 : 0}>{line}</tspan>)}
  </text>;
}

export default function SlideCanvas({ layout, slide, showGuides = false }: { layout: Layout; slide: Slide; showGuides?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = fitScale(available.width, available.height);
  const errors = validateSlide(layout, slide);
  return <div ref={containerRef} className="flex h-[min(70vh,760px)] min-h-[240px] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-200 p-2" data-testid="slide-viewport">
    {scale > 0 && <svg role="img" aria-label={`${layout.name} teaching slide preview`} viewBox={`0 0 ${MASTER.width} ${MASTER.height}`} width={MASTER.width * scale} height={MASTER.height * scale} className="shrink-0 shadow-xl" data-scale={scale}>
      <rect width={MASTER.width} height={MASTER.height} fill="#ffffff" />
      <rect x="45" y="30" width="1830" height="1020" rx="24" fill="#f9fcff" stroke="#d6e3f0" strokeWidth="3" />
      {showGuides && <>
        <rect x={MASTER.safeMargin} y={MASTER.safeMargin} width={MASTER.width - 2 * MASTER.safeMargin} height={MASTER.height - 2 * MASTER.safeMargin} fill="none" stroke="#d18f12" strokeWidth="3" strokeDasharray="12 10" />
        <rect {...MASTER.header} fill="none" stroke="#65a3d4" strokeWidth="2" strokeDasharray="8 7" />
        <rect {...MASTER.content} fill="none" stroke="#65a3d4" strokeWidth="2" strokeDasharray="8 7" />
      </>}
      {layout.slots.map((field) => {
        const object = slide.objects.find((item) => item.slotId === field.id);
        const tone = colors[object?.type ?? field.allowed[0]] ?? colors.text;
        return <g key={field.id} data-slot={field.id}>
          <rect {...field.bounds} rx={field.region === 'footer' ? 12 : 22} fill={tone.fill} stroke={tone.stroke} strokeWidth="3" />
          {object && <FittedText slot={field} text={object.text} ink={tone.ink} />}
          {showGuides && <text x={field.bounds.x + 14} y={field.bounds.y + field.bounds.height - 18} fontSize="20" fill="#64748b">{field.label}</text>}
        </g>;
      })}
      {errors.length > 0 && <text x="90" y="1060" fill="#b91c1c" fontSize="22">Layout validation: {errors.join('; ')}</text>}
    </svg>}
  </div>;
}
