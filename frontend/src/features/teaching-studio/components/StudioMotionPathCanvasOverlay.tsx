import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { MASTER, type Rect } from '../layouts';
import {
  studioMotionPathPoints,
  type StudioAnimationEffectDefinition,
  type StudioMotionPathPoint,
} from './studioAnimationModel';

export default function StudioMotionPathCanvasOverlay({ bounds, effect, onChange }: {
  bounds: Rect;
  effect: StudioAnimationEffectDefinition;
  onChange?: (changes: Partial<StudioAnimationEffectDefinition>) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const points = studioMotionPathPoints(effect);
  if (points.length < 2) return null;

  const origin = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const canvasPoints = points.map((point) => ({ x: origin.x + point.x, y: origin.y + point.y }));
  const updatePoint = (index: number, event: ReactPointerEvent<SVGCircleElement>) => {
    if (!onChange || !svgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = svgRef.current.getBoundingClientRect();
    const next: StudioMotionPathPoint = {
      x: Math.round(((event.clientX - rect.left) / rect.width) * MASTER.width - origin.x),
      y: Math.round(((event.clientY - rect.top) / rect.height) * MASTER.height - origin.y),
    };
    onChange({ effect: 'path-custom', motionPath: points.map((point, pointIndex) => pointIndex === index ? next : point) });
  };

  return <svg
    ref={svgRef}
    viewBox={`0 0 ${MASTER.width} ${MASTER.height}`}
    className="pointer-events-none absolute inset-0 z-[18] h-full w-full overflow-visible"
    aria-label="Editable motion path"
  >
    <polyline
      points={canvasPoints.map((point) => `${point.x},${point.y}`).join(' ')}
      fill="none"
      stroke="#2563eb"
      strokeWidth="5"
      strokeDasharray="14 10"
      vectorEffect="non-scaling-stroke"
    />
    {canvasPoints.map((point, index) => {
      const isStart = index === 0;
      const isEnd = index === canvasPoints.length - 1;
      return <circle
        key={index}
        cx={point.x}
        cy={point.y}
        r={isStart || isEnd ? 13 : 9}
        fill={isStart ? '#22c55e' : isEnd ? '#ef4444' : '#2563eb'}
        stroke="white"
        strokeWidth="5"
        vectorEffect="non-scaling-stroke"
        className={onChange ? 'pointer-events-auto cursor-move touch-none' : ''}
        role="button"
        aria-label={isStart ? 'Motion path start point' : isEnd ? 'Motion path end point' : `Motion path point ${index + 1}`}
        onPointerDown={(event) => updatePoint(index, event)}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updatePoint(index, event); }}
      ><title>{isStart ? 'Start' : isEnd ? 'End' : `Point ${index + 1}`}</title></circle>;
    })}
  </svg>;
}
