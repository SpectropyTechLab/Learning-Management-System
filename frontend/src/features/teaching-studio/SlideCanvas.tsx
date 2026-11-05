import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { MASTER, fitScale, validateSlide } from './layouts';
import type { Layout, Rect, Slide, Slot } from './layouts';
import type { AuthorDrawingStroke } from './types';

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
  return (
    <text x={x + 40} y={y + (slot.region === 'footer' ? 35 : 78)} fill={ink} fontSize={fontSize} fontWeight={slot.region === 'header' ? 700 : 500}>
      {visible.map((line, index) => (
        <tspan key={index} x={x + 40} dy={index ? fontSize * 1.3 : 0}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

type GeometryInteraction = {
  objectId: string;
  mode: 'move' | 'resize';
  startClientX: number;
  startClientY: number;
  startBounds: Rect;
  currentBounds: Rect;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);

export default function SlideCanvas({ layout, slide, showGuides = false, selectedObjectId, onSelectObject, onChangeObjectBounds, objectOverlays = {}, fixedDrawingStrokes = [], drawingStrokes = [], drawingEnabled = false, drawingTool = 'pen', drawingColor = '#ef4444', drawingWidth = 6, onDrawingChange }: {
  layout: Layout | null;
  slide: Slide;
  showGuides?: boolean;
  selectedObjectId?: string | null;
  onSelectObject?: (objectId: string) => void;
  onChangeObjectBounds?: (objectId: string, bounds: Rect) => void;
  objectOverlays?: Record<string, ReactNode>;
  fixedDrawingStrokes?: AuthorDrawingStroke[];
  drawingStrokes?: AuthorDrawingStroke[];
  drawingEnabled?: boolean;
  drawingTool?: 'pen' | 'eraser';
  drawingColor?: string;
  drawingWidth?: number;
  onDrawingChange?: (strokes: AuthorDrawingStroke[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [interaction, setInteraction] = useState<GeometryInteraction | null>(null);
  const [currentStroke, setCurrentStroke] = useState<AuthorDrawingStroke | null>(null);
  const [drawingPointerActive, setDrawingPointerActive] = useState(false);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = fitScale(available.width, available.height);
  const errors = validateSlide(layout, slide);
  const boundsFor = (object: Slide['objects'][number] | undefined, slot: Slot): Rect => {
    if (interaction && object?.id === interaction.objectId) return interaction.currentBounds;
    return object?.position ?? slot.bounds;
  };

  useEffect(() => {
    if (!interaction || scale <= 0) return;
    const move = (event: PointerEvent) => {
      const deltaX = (event.clientX - interaction.startClientX) / scale;
      const deltaY = (event.clientY - interaction.startClientY) / scale;
      const start = interaction.startBounds;
      const currentBounds = interaction.mode === 'move'
        ? {
          ...start,
          x: Math.round(clamp(start.x + deltaX, 0, MASTER.width - start.width)),
          y: Math.round(clamp(start.y + deltaY, 0, MASTER.height - start.height)),
        }
        : {
          ...start,
          width: Math.round(clamp(start.width + deltaX, 80, MASTER.width - start.x)),
          height: Math.round(clamp(start.height + deltaY, 60, MASTER.height - start.y)),
        };
      setInteraction((current) => current ? { ...current, currentBounds } : null);
    };
    const finish = () => {
      onChangeObjectBounds?.(interaction.objectId, interaction.currentBounds);
      setInteraction(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
    };
  }, [interaction, onChangeObjectBounds, scale]);

  const beginInteraction = (event: React.PointerEvent, objectId: string, mode: GeometryInteraction['mode'], bounds: Rect) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectObject?.(objectId);
    setInteraction({ objectId, mode, startClientX: event.clientX, startClientY: event.clientY, startBounds: bounds, currentBounds: bounds });
  };

  const drawingPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * MASTER.width),
      y: Math.round(((event.clientY - rect.top) / rect.height) * MASTER.height),
    };
  };

  const eraseAt = (point: { x: number; y: number }) => {
    const radius = Math.max(24, drawingWidth * 3);
    const next = drawingStrokes.filter((stroke) => !stroke.points.some((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) <= radius));
    if (next.length !== drawingStrokes.length) onDrawingChange?.(next);
  };

  const beginDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingEnabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = drawingPoint(event);
    setDrawingPointerActive(true);
    if (drawingTool === 'eraser') eraseAt(point);
    else setCurrentStroke({ id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`, color: drawingColor, width: drawingWidth, points: [point] });
  };

  const continueDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingPointerActive) return;
    const point = drawingPoint(event);
    if (drawingTool === 'eraser') eraseAt(point);
    else setCurrentStroke((stroke) => stroke ? { ...stroke, points: [...stroke.points, point] } : null);
  };

  const finishDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingPointerActive) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (currentStroke?.points.length) onDrawingChange?.([...drawingStrokes, currentStroke]);
    setCurrentStroke(null);
    setDrawingPointerActive(false);
  };

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
        const bounds = boundsFor(object, field);
        const renderedField = { ...field, bounds };
        const tone = colors[object?.type ?? field.allowed[0]] ?? colors.text;
        const isImage = object && ['visual', 'media'].includes(object.type) && object.url;
        return <g key={field.id} data-slot={field.id} role={object ? 'button' : undefined} tabIndex={object ? 0 : undefined} onClick={() => object && onSelectObject?.(object.id)} onKeyDown={(event) => { if (object && (event.key === 'Enter' || event.key === ' ')) onSelectObject?.(object.id); }} className={object && onSelectObject ? 'cursor-pointer' : undefined}>
          <rect {...bounds} rx={field.region === 'footer' ? 12 : 22} fill={tone.fill} stroke={object?.id === selectedObjectId ? '#1d4ed8' : tone.stroke} strokeWidth={object?.id === selectedObjectId ? 8 : 3} />
          {isImage && <image href={object.url} x={bounds.x + 12} y={bounds.y + 12} width={bounds.width - 24} height={bounds.height - (object.caption ? 70 : 24)} preserveAspectRatio="xMidYMid meet"><title>{object.altText || object.text || field.label}</title></image>}
          {object && !isImage && <FittedText slot={renderedField} text={object.text || field.label} ink={tone.ink} />}
          {isImage && object.caption && <text x={bounds.x + 24} y={bounds.y + bounds.height - 22} fontSize="25" fill="#334155">{object.caption}</text>}
          {showGuides && <text x={bounds.x + 14} y={bounds.y + bounds.height - 18} fontSize="20" fill="#64748b">{field.label}</text>}
        </g>;
      })}
      {errors.length > 0 && <text x="90" y="1060" fill="#b91c1c" fontSize="22">Layout validation: {errors.join('; ')}</text>}
      </svg>
      {(layout?.slots ?? []).map((slot) => {
        const object = slide.objects.find((item) => item.slotId === slot.id);
        const overlay = object ? objectOverlays[object.id] : null;
        if (!object || !overlay) return null;
        const bounds = boundsFor(object, slot);
        return <div
          key={`overlay-${object.id}`}
          className={`absolute overflow-hidden rounded-md border-2 ${object.id === selectedObjectId ? 'border-blue-700' : 'border-transparent'}`}
          style={{
            left: `${(bounds.x / MASTER.width) * 100}%`,
            top: `${(bounds.y / MASTER.height) * 100}%`,
            width: `${(bounds.width / MASTER.width) * 100}%`,
            height: `${(bounds.height / MASTER.height) * 100}%`,
          }}
        >
          {overlay}
        </div>;
      })}
      <svg
        viewBox={`0 0 ${MASTER.width} ${MASTER.height}`}
        className={`absolute inset-0 z-10 h-full w-full touch-none ${drawingEnabled ? 'cursor-crosshair' : 'pointer-events-none'}`}
        onPointerDown={beginDrawing}
        onPointerMove={continueDrawing}
        onPointerUp={finishDrawing}
        onPointerCancel={finishDrawing}
        aria-label="Authored drawing layer"
      >
        {fixedDrawingStrokes.map((stroke) => <polyline key={`fixed-${stroke.id}`} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
        {[...drawingStrokes, ...(currentStroke ? [currentStroke] : [])].map((stroke) => <polyline key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
      {!drawingEnabled && onChangeObjectBounds && (layout?.slots ?? []).map((slot) => {
        const object = slide.objects.find((item) => item.slotId === slot.id);
        if (!object || object.id !== selectedObjectId) return null;
        const bounds = boundsFor(object, slot);
        return <div key={`controls-${object.id}`} className="pointer-events-none absolute z-20" style={{ left: `${(bounds.x / MASTER.width) * 100}%`, top: `${(bounds.y / MASTER.height) * 100}%`, width: `${(bounds.width / MASTER.width) * 100}%`, height: `${(bounds.height / MASTER.height) * 100}%` }}>
          <button type="button" onPointerDown={(event) => beginInteraction(event, object.id, 'move', bounds)} className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full bg-blue-700 px-3 py-1 text-xs font-bold text-white shadow" title="Drag to move element">Move</button>
          <button type="button" onPointerDown={(event) => beginInteraction(event, object.id, 'resize', bounds)} className="pointer-events-auto absolute bottom-0 right-0 h-5 w-5 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-sm border-2 border-white bg-blue-700 shadow" title="Drag to resize element" aria-label="Resize element" />
        </div>;
      })}
    </div>}
  </div>;
}
