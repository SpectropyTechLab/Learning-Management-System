import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Move as MoveIcon, RotateCw } from 'lucide-react';
import { MASTER, fitScale, validateSlide } from './layouts';
import type { Layout, Rect, Slide, Slot } from './layouts';
import type { AuthorDrawingStroke, StudioDrawingTool } from './types';
import { studioAnimationClass } from './components/studioAnimation';
import { studioTransitionStyle } from './components/studioTransition';

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
const textObjectTypes = new Set(['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data']);
const hasVisibleObjectBorder = (object: Slide['objects'][number]) => {
  const color = String(object.borderColor ?? '').trim().toLowerCase();
  return Number(object.borderWidth ?? 0) > 0 && Boolean(color) && color !== 'transparent';
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
    <text
      x={x + 40}
      y={y + (slot.region === 'footer' ? 35 : 78)}
      fill={ink}
      fontSize={fontSize}
      fontWeight={slot.region === 'header' ? 700 : 500}
    >
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
  mode: 'move' | 'rotate' | 'resize-n' | 'resize-ne' | 'resize-e' | 'resize-se' | 'resize-s' | 'resize-sw' | 'resize-w' | 'resize-nw';
  startClientX: number;
  startClientY: number;
  startBounds: Rect;
  currentBounds: Rect;
  startRotation?: number;
  currentRotation?: number;
  centerClientX?: number;
  centerClientY?: number;
  startPointerAngle?: number;
};

type PendingMove = {
  pointerId: number;
  objectId: string;
  startClientX: number;
  startClientY: number;
  bounds: Rect;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

function DrawingStrokeMark({ stroke, keyPrefix = '' }: { stroke: AuthorDrawingStroke; keyPrefix?: string }) {
  if (stroke.tool === 'laser') return null;
  const points = stroke.points.map((point) => `${point.x},${point.y}`).join(' ');
  if (stroke.tool === 'fountain' && stroke.points.length > 1) {
    return <g>
      {stroke.points.slice(1).map((point, index) => {
        const previous = stroke.points[index];
        const progress = (index + 1) / Math.max(1, stroke.points.length - 1);
        const edgeTaper = Math.min(1, progress * 5, (1 - progress) * 5 + 0.2);
        const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
        const speedFactor = Math.max(0.55, Math.min(1.25, 18 / Math.max(6, distance)));
        return <line key={`${keyPrefix}${stroke.id}-segment-${index}`} x1={previous.x} y1={previous.y} x2={point.x} y2={point.y} stroke={stroke.color} strokeWidth={Math.max(1, stroke.width * edgeTaper * speedFactor)} strokeOpacity={stroke.opacity ?? 1} strokeLinecap="round" />;
      })}
    </g>;
  }
  return <polyline
    points={points}
    fill="none"
    stroke={stroke.color}
    strokeWidth={stroke.width}
    strokeOpacity={stroke.tool === 'pencil' ? Math.min(stroke.opacity ?? 1, 0.68) : stroke.opacity ?? 1}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeDasharray={stroke.tool === 'pencil' ? `${Math.max(1, stroke.width * 0.75)} ${Math.max(0.5, stroke.width * 0.22)}` : undefined}
    style={stroke.tool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined}
  />;
}

export default function SlideCanvas({
  layout,
  slide,
  showGuides = false,
  compactViewport = false,
  immersiveViewport = false,
  allowCanvasOverflow = false,
  showTextEditorOutlines = false,
  selectedObjectId,
  selectedObjectIds = [],
  geometryControlsHiddenForObjectId,
  overflowVisibleForObjectId,
  selectedSlotId,
  onSelectObject,
  onSelectSlot,
  onClearSelection,
  onChangeObjectBounds,
  onChangeObjectRotation,
  objectOverlays = {},
  objectAnimationStyles = {},
  objectAnimationKeys = {},
  transition,
  fixedDrawingStrokes = [],
  drawingStrokes = [],
  drawingEnabled = false,
  interactionOverlayEnabled = false,
  drawingTool = 'pen',
  drawingColor = '#ef4444',
  drawingWidth = 6,
  drawingOpacity = 1,
  onDrawingChange,
  onRemoveObject,
  zoom = 1,
  backgroundColor = '#f9fcff',
  onCanvasDoubleClick,
  onCanvasClick,
}: {
  layout: Layout | null;
  slide: Slide;
  showGuides?: boolean;
  compactViewport?: boolean;
  immersiveViewport?: boolean;
  allowCanvasOverflow?: boolean;
  showTextEditorOutlines?: boolean;
  selectedObjectId?: string | null;
  selectedObjectIds?: string[];
  geometryControlsHiddenForObjectId?: string | null;
  overflowVisibleForObjectId?: string | null;
  selectedSlotId?: string | null;
  onSelectObject?: (objectId: string, additive?: boolean) => void;
  onSelectSlot?: (slotId: string) => void;
  onClearSelection?: () => void;
  onChangeObjectBounds?: (objectId: string, bounds: Rect) => void;
  onChangeObjectRotation?: (objectId: string, rotation: number) => void;
  objectOverlays?: Record<string, ReactNode>;
  objectAnimationStyles?: Record<string, CSSProperties>;
  objectAnimationKeys?: Record<string, string | number>;
  transition?: Record<string, unknown>;
  fixedDrawingStrokes?: AuthorDrawingStroke[];
  drawingStrokes?: AuthorDrawingStroke[];
  drawingEnabled?: boolean;
  interactionOverlayEnabled?: boolean;
  drawingTool?: StudioDrawingTool;
  drawingColor?: string;
  drawingWidth?: number;
  drawingOpacity?: number;
  onDrawingChange?: (strokes: AuthorDrawingStroke[]) => void;
  onRemoveObject?: (objectId: string) => void;
  zoom?: number;
  backgroundColor?: string;
  onCanvasDoubleClick?: (point: { x: number; y: number }) => void;
  onCanvasClick?: (point: { x: number; y: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [interaction, setInteraction] = useState<GeometryInteraction | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const [currentStroke, setCurrentStroke] = useState<AuthorDrawingStroke | null>(null);
  const [laserPoint, setLaserPoint] = useState<{ x: number; y: number } | null>(null);
  const [drawingPointerActive, setDrawingPointerActive] = useState(false);
  const geometryGestureActive = interaction !== null;
  useEffect(() => {
    if (!geometryGestureActive) return;
    const root = document.documentElement;
    const previousUserSelect = root.style.userSelect;
    root.style.userSelect = 'none';
    window.getSelection()?.removeAllRanges();
    return () => { root.style.userSelect = previousUserSelect; };
  }, [geometryGestureActive]);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = fitScale(available.width, available.height) * Math.max(0.25, zoom);
  const errors = validateSlide(layout, slide);
  const boundsFor = (object: Slide['objects'][number] | undefined, slot: Slot): Rect => {
    if (interaction && object?.id === interaction.objectId) return interaction.currentBounds;
    return object?.position ?? slot.bounds;
  };
  const rotationFor = (object: Slide['objects'][number] | undefined) =>
    interaction?.mode === 'rotate' && object?.id === interaction.objectId
      ? interaction.currentRotation ?? object.rotation ?? 0
      : object?.rotation ?? 0;

  useEffect(() => {
    if (!interaction || scale <= 0) return;
    const move = (event: PointerEvent) => {
      const deltaX = (event.clientX - interaction.startClientX) / scale;
      const deltaY = (event.clientY - interaction.startClientY) / scale;
      const start = interaction.startBounds;
      let currentBounds: Rect;
      if (interaction.mode === 'rotate') {
        const pointerAngle = Math.atan2(
          event.clientY - (interaction.centerClientY ?? 0),
          event.clientX - (interaction.centerClientX ?? 0),
        ) * 180 / Math.PI;
        const rotation = Math.round((interaction.startRotation ?? 0) + pointerAngle - (interaction.startPointerAngle ?? pointerAngle));
        setInteraction((current) => current ? { ...current, currentRotation: rotation } : null);
        return;
      }
      if (interaction.mode === 'move') {
        const maximumY = start.y + start.height > MASTER.height
          ? MASTER.height - 60
          : MASTER.height - start.height;
        currentBounds = {
          ...start,
          x: Math.round(clamp(start.x + deltaX, 0, MASTER.width - start.width)),
          y: Math.round(clamp(start.y + deltaY, 0, Math.max(0, maximumY))),
        };
      } else {
        const direction = interaction.mode.replace('resize-', '');
        const north = direction.includes('n');
        const south = direction.includes('s');
        const east = direction.includes('e');
        const west = direction.includes('w');
        const right = start.x + start.width;
        const bottom = start.y + start.height;
        let x = west ? clamp(start.x + deltaX, 0, right - 80) : start.x;
        let y = north ? clamp(start.y + deltaY, 0, bottom - 60) : start.y;
        let width = west
          ? right - x
          : east ? clamp(start.width + deltaX, 80, MASTER.width - start.x) : start.width;
        let height = north
          ? bottom - y
          : south ? clamp(start.height + deltaY, 60, MASTER.height - start.y) : start.height;
        if (event.shiftKey) {
          const horizontalScale = width / start.width;
          const verticalScale = height / start.height;
          const scaleFromHorizontal = east || west;
          const scaleFromVertical = north || south;
          const scaleFactor = scaleFromHorizontal && scaleFromVertical
            ? (Math.abs(horizontalScale - 1) >= Math.abs(verticalScale - 1) ? horizontalScale : verticalScale)
            : scaleFromHorizontal ? horizontalScale : verticalScale;
          const maximumWidth = west ? right : MASTER.width - start.x;
          const maximumHeight = north ? bottom : MASTER.height - start.y;
          const constrainedScale = clamp(scaleFactor, Math.max(80 / start.width, 60 / start.height), Math.min(maximumWidth / start.width, maximumHeight / start.height));
          width = Math.round(start.width * constrainedScale);
          height = Math.round(start.height * constrainedScale);
          x = west ? right - width : east ? start.x : Math.round(start.x + (start.width - width) / 2);
          y = north ? bottom - height : south ? start.y : Math.round(start.y + (start.height - height) / 2);
        }
        currentBounds = {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        };
      }
      setInteraction((current) => (current ? { ...current, currentBounds } : null));
    };
    const finish = () => {
      if (interaction.mode === 'rotate')
        onChangeObjectRotation?.(interaction.objectId, interaction.currentRotation ?? interaction.startRotation ?? 0);
      else onChangeObjectBounds?.(interaction.objectId, interaction.currentBounds);
      setInteraction(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [interaction, onChangeObjectBounds, onChangeObjectRotation, scale]);

  const beginInteraction = (
    event: React.PointerEvent,
    objectId: string,
    mode: GeometryInteraction['mode'],
    bounds: Rect,
    locked = false,
  ) => {
    if (locked) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onSelectObject?.(objectId);
    setInteraction({
      objectId,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBounds: bounds,
      currentBounds: bounds,
    });
  };

  const beginRotation = (
    event: React.PointerEvent,
    objectId: string,
    bounds: Rect,
    rotation: number,
    locked = false,
  ) => {
    if (locked || !onChangeObjectRotation) return;
    event.preventDefault();
    event.stopPropagation();
    const frame = (event.currentTarget.parentElement as HTMLElement | null)?.getBoundingClientRect();
    const centerClientX = frame ? frame.left + frame.width / 2 : event.clientX;
    const centerClientY = frame ? frame.top + frame.height / 2 : event.clientY;
    const startPointerAngle = Math.atan2(event.clientY - centerClientY, event.clientX - centerClientX) * 180 / Math.PI;
    onSelectObject?.(objectId);
    setInteraction({
      objectId,
      mode: 'rotate',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBounds: bounds,
      currentBounds: bounds,
      startRotation: rotation,
      currentRotation: rotation,
      centerClientX,
      centerClientY,
      startPointerAngle,
    });
  };

  const queueDirectMove = (
    event: React.PointerEvent<SVGGElement | HTMLDivElement>,
    objectId: string,
    bounds: Rect,
    locked = false,
  ) => {
    if (locked || !onChangeObjectBounds || drawingEnabled || event.button !== 0) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('button, a, input, textarea, select, [contenteditable="true"], [data-canvas-interactive="true"]')
    ) return;
    event.preventDefault();
    pendingMoveRef.current = {
      pointerId: event.pointerId,
      objectId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      bounds,
    };
  };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const pending = pendingMoveRef.current;
      if (!pending || pending.pointerId !== event.pointerId || scale <= 0) return;
      const movementX = event.clientX - pending.startClientX;
      const movementY = event.clientY - pending.startClientY;
      if (Math.hypot(movementX, movementY) < 6) return;
      event.preventDefault();
      const currentBounds = {
        ...pending.bounds,
        x: Math.round(clamp(pending.bounds.x + movementX / scale, 0, MASTER.width - pending.bounds.width)),
        y: Math.round(clamp(
          pending.bounds.y + movementY / scale,
          0,
          Math.max(0, pending.bounds.y + pending.bounds.height > MASTER.height ? MASTER.height - 60 : MASTER.height - pending.bounds.height),
        )),
      };
      onSelectObject?.(pending.objectId);
      setInteraction({
        objectId: pending.objectId,
        mode: 'move',
        startClientX: pending.startClientX,
        startClientY: pending.startClientY,
        startBounds: pending.bounds,
        currentBounds,
      });
      pendingMoveRef.current = null;
    };
    const clear = (event: PointerEvent) => {
      if (pendingMoveRef.current?.pointerId === event.pointerId) pendingMoveRef.current = null;
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', clear);
    window.addEventListener('pointercancel', clear);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('pointercancel', clear);
    };
  }, [onSelectObject, scale]);

  const drawingPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * MASTER.width),
      y: Math.round(((event.clientY - rect.top) / rect.height) * MASTER.height),
    };
  };

  const eraseAt = (point: { x: number; y: number }) => {
    const radius = Math.max(24, drawingWidth * 3);
    const next = drawingStrokes.filter(
      (stroke) =>
        !stroke.points.some(
          (candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) <= radius,
        ),
    );
    if (next.length !== drawingStrokes.length) onDrawingChange?.(next);
  };

  const eraseObjectAt = (point: { x: number; y: number }) => {
    const target = [...slide.objects]
      .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))
      .find((object) => {
        if (object.locked) return false;
        const slot = layout?.slots.find((candidate) => candidate.id === object.slotId);
        if (!slot) return false;
        const bounds = boundsFor(object, slot);
        return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
      });
    if (target) onRemoveObject?.(target.id);
  };

  const beginDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingEnabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = drawingPoint(event);
    setDrawingPointerActive(true);
    if (drawingTool === 'eraser') eraseAt(point);
    else if (drawingTool === 'object-eraser') eraseObjectAt(point);
    else if (drawingTool === 'laser') setLaserPoint(point);
    else
      setCurrentStroke({
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        color: drawingColor,
        width: drawingTool === 'highlighter' ? drawingWidth * 3 : drawingTool === 'pencil' ? Math.max(1, drawingWidth * 0.65) : drawingWidth,
        tool: drawingTool,
        opacity: drawingTool === 'highlighter' ? Math.min(drawingOpacity, 0.35) : drawingOpacity,
        points: [point],
      });
  };

  const continueDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingPointerActive) return;
    const point = drawingPoint(event);
    if (drawingTool === 'eraser') eraseAt(point);
    else if (drawingTool === 'object-eraser') return;
    else if (drawingTool === 'laser') setLaserPoint(point);
    else
      setCurrentStroke((stroke) =>
        stroke ? { ...stroke, points: [...stroke.points, point] } : null,
      );
  };

  const finishDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingPointerActive) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (currentStroke?.points.length) onDrawingChange?.([...drawingStrokes, currentStroke]);
    setCurrentStroke(null);
    setLaserPoint(null);
    setDrawingPointerActive(false);
  };

  return (
    <div
      ref={containerRef}
      className={`flex h-full min-h-[240px] w-full ${zoom > 1 ? 'items-start justify-start' : 'items-center justify-center'} ${zoom > 1 || allowCanvasOverflow ? 'overflow-auto' : 'overflow-hidden'} ${immersiveViewport ? 'rounded-none bg-blue-50 p-0' : `rounded-xl bg-slate-200 ${compactViewport ? 'p-1' : 'p-2'}`}`}
      data-testid="slide-viewport"
    >
      {scale > 0 && (
        <div
          className="relative shrink-0"
          style={{ width: MASTER.width * scale, height: MASTER.height * scale }}
        >
        <div
          data-testid="slide-surface"
          className={`absolute left-0 top-0 bg-transparent shadow-xl ${allowCanvasOverflow ? 'overflow-visible' : 'overflow-hidden'}`}
          onClick={(event) => {
            const target = event.target;
            if (target instanceof Element && target.closest('[data-element-id]')) return;
            const rect = event.currentTarget.getBoundingClientRect();
            onCanvasClick?.({
              x: Math.round(((event.clientX - rect.left) / rect.width) * MASTER.width),
              y: Math.round(((event.clientY - rect.top) / rect.height) * MASTER.height),
            });
            onClearSelection?.();
          }}
          onDoubleClick={(event) => {
            const target = event.target;
            if (target instanceof Element && target.closest('[data-element-id]')) return;
            const rect = event.currentTarget.getBoundingClientRect();
            onCanvasDoubleClick?.({
              x: Math.round(((event.clientX - rect.left) / rect.width) * MASTER.width),
              y: Math.round(((event.clientY - rect.top) / rect.height) * MASTER.height),
            });
          }}
          style={{
            width: MASTER.width,
            height: MASTER.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <div
            data-testid="slide-transition-layer"
            className={`absolute inset-0 ${allowCanvasOverflow ? 'overflow-visible' : 'overflow-hidden'}`}
            style={{ backgroundColor, ...studioTransitionStyle(transition) }}
          >
          <svg
            role="img"
            aria-label={layout ? `${layout.name} teaching slide preview` : 'Blank teaching screen'}
            viewBox={`0 0 ${MASTER.width} ${MASTER.height}`}
            width="100%"
            height="100%"
            className="absolute inset-0"
            data-scale={scale}
          >
            <rect width={MASTER.width} height={MASTER.height} fill={backgroundColor} />
            {showGuides && (
              <>
                <rect
                  x={MASTER.safeMargin}
                  y={MASTER.safeMargin}
                  width={MASTER.width - 2 * MASTER.safeMargin}
                  height={MASTER.height - 2 * MASTER.safeMargin}
                  fill="none"
                  stroke="#d18f12"
                  strokeWidth="3"
                  strokeDasharray="12 10"
                />
                <rect
                  {...MASTER.header}
                  fill="none"
                  stroke="#65a3d4"
                  strokeWidth="2"
                  strokeDasharray="8 7"
                />
                <rect
                  {...MASTER.content}
                  fill="none"
                  stroke="#65a3d4"
                  strokeWidth="2"
                  strokeDasharray="8 7"
                />
              </>
            )}
            {(layout?.slots ?? []).map((field) => {
              const object = slide.objects.find((item) => item.slotId === field.id);
              const selectedEmptySlot = !object && field.id === selectedSlotId;
              if (!showGuides && !object && !onSelectSlot) return null;
              const bounds = boundsFor(object, field);
              const renderedField = { ...field, bounds };
              const tone = colors[object?.type ?? field.allowed[0]] ?? colors.text;
              const objectSelected = Boolean(object && (object.id === selectedObjectId || selectedObjectIds.includes(object.id)));
              const selectedWithoutBorder = Boolean(objectSelected && !hasVisibleObjectBorder(object));
              // Resource overlays (3D, video, protected images, and packages) own
              // their complete visual surface. Rendering the legacy SVG image URL
              // underneath a transparent overlay exposes the browser's broken-image
              // placeholder when that URL is not an actual image.
              const isImage = object
                && ['visual', 'media'].includes(object.type)
                && object.url
                && !objectOverlays[object.id];
              const animation = object?.animation;
              const animateSvgObject = object && !objectOverlays[object.id];
              return (
                <g
                  key={field.id}
                  data-slot={field.id}
                  data-element-id={object?.id}
                  transform={object ? `rotate(${rotationFor(object)} ${bounds.x + bounds.width / 2} ${bounds.y + bounds.height / 2})` : undefined}
                  role={object ? 'button' : undefined}
                  tabIndex={object ? 0 : undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (object) onSelectObject?.(object.id, event.ctrlKey || event.metaKey || event.shiftKey);
                    else onSelectSlot?.(field.id);
                  }}
                  onPointerDown={(event) => object && queueDirectMove(event, object.id, bounds, object.locked)}
                  onKeyDown={(event) => {
                    if (object && (event.key === 'Enter' || event.key === ' '))
                      onSelectObject?.(object.id);
                  }}
                  className={`${(object && onSelectObject) || (!object && onSelectSlot) ? 'cursor-pointer' : ''} ${animateSvgObject ? studioAnimationClass(String(animation?.effect || 'none')) : ''}`}
                  style={
                    animateSvgObject
                      ? {
                          animationDuration: `${Number(animation?.duration) || 0.8}s`,
                          animationDelay: `${Number(animation?.delay) || 0}s`,
                          animationFillMode: 'both',
                        }
                      : undefined
                  }
                >
                  {!objectOverlays[object?.id ?? ''] && (
                    <rect
                      {...bounds}
                      rx={field.region === 'footer' ? 12 : 22}
                      fill={!object && !showGuides ? selectedEmptySlot ? '#dbeafe55' : 'transparent' : object?.backgroundColor ?? tone.fill}
                      stroke={selectedEmptySlot ? '#2563eb' : !object && !showGuides ? 'transparent' : objectSelected ? '#1d4ed8' : object?.borderColor ?? tone.stroke}
                      strokeWidth={objectSelected || selectedEmptySlot ? 8 : Math.max(0, object?.borderWidth ?? 1) * 3}
                      strokeDasharray={selectedWithoutBorder ? '14 10' : undefined}
                    />
                  )}
                  {isImage && (
                    <image
                      href={object.url}
                      x={bounds.x + 12}
                      y={bounds.y + 12}
                      width={bounds.width - 24}
                      height={bounds.height - (object.caption ? 70 : 24)}
                      preserveAspectRatio="none"
                    >
                      <title>{object.altText || object.text || field.label}</title>
                    </image>
                  )}
                  {object && Boolean(object.text) && !isImage && !objectOverlays[object.id] && (
                    <FittedText
                      slot={renderedField}
                      text={object.text}
                      ink={tone.ink}
                    />
                  )}
                  {isImage && object.caption && (
                    <text
                      x={bounds.x + 24}
                      y={bounds.y + bounds.height - 22}
                      fontSize="25"
                      fill="#334155"
                    >
                      {object.caption}
                    </text>
                  )}
                  {showGuides && !object && (
                    <text
                      x={bounds.x + 14}
                      y={bounds.y + bounds.height - 18}
                      fontSize="20"
                      fill="#64748b"
                    >
                      {field.label}
                    </text>
                  )}
                </g>
              );
            })}
            {errors.length > 0 && (
              <text x="90" y="1060" fill="#b91c1c" fontSize="22">
                Layout validation: {errors.join('; ')}
              </text>
            )}
          </svg>
          {(layout?.slots ?? []).map((slot) => {
            const object = slide.objects.find((item) => item.slotId === slot.id);
            const overlay = object ? objectOverlays[object.id] : null;
            if (!object || !overlay) return null;
            const bounds = boundsFor(object, slot);
            const selected = object.id === selectedObjectId || selectedObjectIds.includes(object.id);
            const selectedWithoutBorder = selected && !hasVisibleObjectBorder(object);
            const textEditorOutline = showTextEditorOutlines && textObjectTypes.has(object.type) &&
              (selected || object.text.trim().length === 0);
            return (
              <div
                key={`overlay-${object.id}-${objectAnimationKeys[object.id] ?? 'static'}`}
                data-element-id={object.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectObject?.(object.id, event.ctrlKey || event.metaKey || event.shiftKey);
                }}
                onPointerDownCapture={(event) => queueDirectMove(event, object.id, bounds, object.locked)}
                className={`absolute touch-none rounded-md border-solid ${object.id === overflowVisibleForObjectId || allowCanvasOverflow && textObjectTypes.has(object.type) ? 'overflow-visible' : 'overflow-hidden'} ${onChangeObjectBounds && !drawingEnabled ? 'cursor-move' : ''} ${textEditorOutline ? `outline outline-2 outline-dotted ${selected ? 'outline-blue-600' : 'outline-slate-400'}` : selected ? selectedWithoutBorder ? 'border-2 border-dashed border-blue-600' : 'border-2 border-solid border-blue-700' : ''}`}
                style={{
                  left: `${(bounds.x / MASTER.width) * 100}%`,
                  top: `${(bounds.y / MASTER.height) * 100}%`,
                  width: `${(bounds.width / MASTER.width) * 100}%`,
                  height: `${(bounds.height / MASTER.height) * 100}%`,
                  zIndex: object.zIndex,
                  backgroundColor: object.backgroundColor,
                  borderColor: textEditorOutline || !selected ? object.borderColor ?? 'transparent' : undefined,
                  borderWidth: textEditorOutline || !selected ? Math.max(0, object.borderWidth ?? 1) : 2,
                  ...objectAnimationStyles[object.id],
                  rotate: `${rotationFor(object)}deg`,
                }}
              >
                {overlay}
              </div>
            );
          })}
          <svg
            viewBox={`0 0 ${MASTER.width} ${MASTER.height}`}
            className={`absolute inset-0 z-10 h-full w-full touch-none ${drawingEnabled ? 'cursor-crosshair' : interactionOverlayEnabled ? 'cursor-none' : 'pointer-events-none'}`}
            onPointerDown={beginDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={finishDrawing}
            onPointerCancel={finishDrawing}
            aria-label="Authored drawing layer"
          >
            {fixedDrawingStrokes.map((stroke) => <DrawingStrokeMark key={`fixed-${stroke.id}`} keyPrefix="fixed-" stroke={stroke} />)}
            {[...drawingStrokes, ...(currentStroke ? [currentStroke] : [])].map((stroke) => <DrawingStrokeMark key={stroke.id} stroke={stroke} />)}
            {laserPoint ? <g pointerEvents="none"><circle cx={laserPoint.x} cy={laserPoint.y} r={Math.max(18, drawingWidth * 2.5)} fill={drawingColor} opacity={0.2} /><circle cx={laserPoint.x} cy={laserPoint.y} r={Math.max(6, drawingWidth)} fill={drawingColor} opacity={0.95} /></g> : null}
          </svg>
          {!drawingEnabled &&
            onChangeObjectBounds &&
            (layout?.slots ?? []).map((slot) => {
              const object = slide.objects.find((item) => item.slotId === slot.id);
              if (!object || object.id !== selectedObjectId) return null;
              if (object.id === geometryControlsHiddenForObjectId) return null;
              if (object.locked) return null;
              const bounds = boundsFor(object, slot);
              return (
                <div
                  key={`controls-${object.id}`}
                  data-element-id={object.id}
                  className="pointer-events-none absolute z-20"
                  style={{
                    left: `${(bounds.x / MASTER.width) * 100}%`,
                    top: `${(bounds.y / MASTER.height) * 100}%`,
                    width: `${(bounds.width / MASTER.width) * 100}%`,
                    height: `${(bounds.height / MASTER.height) * 100}%`,
                    rotate: `${rotationFor(object)}deg`,
                  }}
                >
                  <button
                    type="button"
                    onPointerDown={(event) => beginInteraction(event, object.id, 'move', bounds, object.locked)}
                        className="pointer-events-auto absolute -top-11 left-1/2 flex h-11 w-11 touch-none min-h-11 min-w-11 -translate-x-1/2 select-none items-center justify-center bg-transparent p-0 text-blue-700"
                    title="Drag to move element"
                    aria-label="Drag to move element"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-blue-700 bg-white shadow-sm">
                      <MoveIcon size={12} aria-hidden="true" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onPointerDown={(event) => beginRotation(event, object.id, bounds, rotationFor(object), object.locked)}
                    className="pointer-events-auto absolute -right-11 -top-11 flex h-11 w-11 touch-none select-none items-center justify-center bg-transparent p-0 text-blue-700"
                    title="Rotate element"
                    aria-label="Rotate element"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-blue-700 bg-white shadow-sm"><RotateCw size={13} /></span>
                  </button>
                  {([
                    ['resize-nw', 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize'],
                    ['resize-n', 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize'],
                    ['resize-ne', 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize'],
                    ['resize-e', 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize'],
                    ['resize-se', 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize'],
                    ['resize-s', 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize'],
                    ['resize-sw', 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize'],
                    ['resize-w', 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize'],
                  ] as const).map(([mode, position]) => (
                    <button
                      key={mode}
                      type="button"
                      onPointerDown={(event) => beginInteraction(event, object.id, mode, bounds, object.locked)}
                          className={`pointer-events-auto absolute min-h-11 min-w-11 touch-none h-11 w-11 select-none bg-transparent p-0 ${position} after:absolute after:left-1/2 after:top-1/2 after:h-3 after:w-3 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-sm after:border-2 after:border-blue-700 after:bg-white after:shadow-sm after:content-['']`}
                      title={`Resize element ${mode.replace('resize-', '')}`}
                      aria-label={`Resize element ${mode.replace('resize-', '')}`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
