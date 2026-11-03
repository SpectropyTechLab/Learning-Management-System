import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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

export default function SlideCanvas({ layout, slide, showGuides = false, selectedObjectId, onSelectObject, objectOverlays = {} }: {
  layout: Layout | null;
  slide: Slide;
  showGuides?: boolean;
  selectedObjectId?: string | null;
  onSelectObject?: (objectId: string) => void;
  objectOverlays?: Record<string, ReactNode>;
}) {
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
  return <div ref={containerRef} className="flex h-full min-h-[240px] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-200 p-2" data-testid="slide-viewport">
    {scale > 0 && <div className="relative shrink-0 overflow-hidden bg-white shadow-xl" style={{ width: MASTER.width * scale, height: MASTER.height * scale }}>
      <svg role="img" aria-label={layout ? `${layout.name} teaching slide preview` : 'Blank teaching screen'} viewBox={`0 0 ${MASTER.width} ${MASTER.height}`} width="100%" height="100%" className="absolute inset-0" data-scale={scale}>
      <rect width={MASTER.width} height={MASTER.height} fill="#ffffff" />
      <rect x="45" y="30" width="1830" height="1020" rx="24" fill="#f9fcff" stroke="#d6e3f0" strokeWidth="3" />
      {showGuides && <>
        <rect x={MASTER.safeMargin} y={MASTER.safeMargin} width={MASTER.width - 2 * MASTER.safeMargin} height={MASTER.height - 2 * MASTER.safeMargin} fill="none" stroke="#d18f12" strokeWidth="3" strokeDasharray="12 10" />
        <rect {...MASTER.header} fill="none" stroke="#65a3d4" strokeWidth="2" strokeDasharray="8 7" />
        <rect {...MASTER.content} fill="none" stroke="#65a3d4" strokeWidth="2" strokeDasharray="8 7" />
      </>}
      {(layout?.slots ?? []).map((field) => {
        const object = slide.objects.find((item) => item.slotId === field.id);
        if (!showGuides && !object) return null;
        const tone = colors[object?.type ?? field.allowed[0]] ?? colors.text;
        const isImage = object && ['visual', 'media'].includes(object.type) && object.url;
        return <g key={field.id} data-slot={field.id} role={object ? 'button' : undefined} tabIndex={object ? 0 : undefined} onClick={() => object && onSelectObject?.(object.id)} onKeyDown={(event) => { if (object && (event.key === 'Enter' || event.key === ' ')) onSelectObject?.(object.id); }} className={object && onSelectObject ? 'cursor-pointer' : undefined}>
          <rect {...field.bounds} rx={field.region === 'footer' ? 12 : 22} fill={tone.fill} stroke={object?.id === selectedObjectId ? '#1d4ed8' : tone.stroke} strokeWidth={object?.id === selectedObjectId ? 8 : 3} />
          {isImage && <image href={object.url} x={field.bounds.x + 12} y={field.bounds.y + 12} width={field.bounds.width - 24} height={field.bounds.height - (object.caption ? 70 : 24)} preserveAspectRatio="xMidYMid meet"><title>{object.altText || object.text || field.label}</title></image>}
          {object && !isImage && <FittedText slot={field} text={object.text || field.label} ink={tone.ink} />}
          {isImage && object.caption && <text x={field.bounds.x + 24} y={field.bounds.y + field.bounds.height - 22} fontSize="25" fill="#334155">{object.caption}</text>}
          {showGuides && <text x={field.bounds.x + 14} y={field.bounds.y + field.bounds.height - 18} fontSize="20" fill="#64748b">{field.label}</text>}
        </g>;
      })}
      {errors.length > 0 && <text x="90" y="1060" fill="#b91c1c" fontSize="22">Layout validation: {errors.join('; ')}</text>}
      </svg>
      {(layout?.slots ?? []).map((slot) => {
        const object = slide.objects.find((item) => item.slotId === slot.id);
        const overlay = object ? objectOverlays[object.id] : null;
        if (!object || !overlay) return null;
        return <div
          key={`overlay-${object.id}`}
          className={`absolute overflow-hidden rounded-md border-2 ${object.id === selectedObjectId ? 'border-blue-700' : 'border-transparent'}`}
          style={{
            left: `${(slot.bounds.x / MASTER.width) * 100}%`,
            top: `${(slot.bounds.y / MASTER.height) * 100}%`,
            width: `${(slot.bounds.width / MASTER.width) * 100}%`,
            height: `${(slot.bounds.height / MASTER.height) * 100}%`,
          }}
        >
          {overlay}
        </div>;
      })}
    </div>}
  </div>;
}
