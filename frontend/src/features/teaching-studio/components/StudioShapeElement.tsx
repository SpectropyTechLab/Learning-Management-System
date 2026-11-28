import { useEffect, useId, useState } from 'react';
import type { CSSProperties } from 'react';

interface ShapeGradient {
  angle?: number;
  stops: Array<{ position: number; color: string }>;
}

interface Props {
  elementId?: string;
  moveOutline?: boolean;
  kind: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  strokeDash?: string;
  customPath?: string;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  effect?: string;
  effectColor?: string;
  gradient?: ShapeGradient | null;
  backgroundImageUrl?: string;
  backgroundImageFit?: 'cover' | 'contain';
  backgroundImageOpacity?: number;
  backgroundImageScale?: number;
  backgroundImageX?: number;
  backgroundImageY?: number;
  animationStyle?: CSSProperties;
}
export default function StudioShapeElement({
  elementId,
  moveOutline = false,
  kind,
  fill = '#dbeafe',
  stroke = '#1d4ed8',
  strokeWidth = 4,
  opacity = 1,
  strokeDash = 'solid',
  customPath,
  arrowStart = false,
  arrowEnd = false,
  effect = 'none',
  effectColor = '#2563eb',
  gradient = null,
  backgroundImageUrl,
  backgroundImageFit = 'cover',
  backgroundImageOpacity = 1,
  backgroundImageScale = 1,
  backgroundImageX = 0,
  backgroundImageY = 0,
  animationStyle,
}: Props) {
  const gradientId = `studio-shape-gradient-${useId().replaceAll(':', '')}`;
  const arrowId = `studio-shape-arrow-${useId().replaceAll(':', '')}`;
  const imagePatternId = `studio-shape-image-${useId().replaceAll(':', '')}`;
  const [preview, setPreview] = useState<Partial<Pick<Props, 'fill' | 'stroke' | 'strokeWidth' | 'opacity' | 'strokeDash' | 'effect'>> | null>(null);
  useEffect(() => {
    if (!elementId) return;
    const handlePreview = (event: Event) => {
      const detail = (event as CustomEvent<{ elementId?: string; changes?: Record<string, unknown>; clear?: boolean }>).detail;
      if (detail?.elementId !== elementId) return;
      if (detail.clear) { setPreview(null); return; }
      setPreview((current) => ({ ...(current ?? {}), ...(detail.changes ?? {}) }));
    };
    window.addEventListener('studio-preview-shape-style', handlePreview);
    return () => window.removeEventListener('studio-preview-shape-style', handlePreview);
  }, [elementId]);
  const renderedFill = typeof preview?.fill === 'string' ? preview.fill : fill;
  const renderedStroke = typeof preview?.stroke === 'string' ? preview.stroke : stroke;
  const renderedStrokeWidth = Number.isFinite(Number(preview?.strokeWidth)) ? Number(preview?.strokeWidth) : strokeWidth;
  const renderedOpacity = Number.isFinite(Number(preview?.opacity)) ? Number(preview?.opacity) : opacity;
  const renderedStrokeDash = typeof preview?.strokeDash === 'string' ? preview.strokeDash : strokeDash;
  const renderedEffect = typeof preview?.effect === 'string' ? preview.effect : effect;
  const validGradient = gradient && Array.isArray(gradient.stops) && gradient.stops.length >= 2;
  const common = {
    fill: `var(--studio-shape-fill, ${backgroundImageUrl ? `url(#${imagePatternId})` : validGradient ? `url(#${gradientId})` : renderedFill})`,
    stroke: `var(--studio-shape-stroke, ${renderedStroke})`,
    strokeWidth: renderedStrokeWidth,
    opacity: renderedOpacity,
    strokeDasharray: renderedStrokeDash === 'dash' ? '12 8' : renderedStrokeDash === 'dot' ? '2 7' : undefined,
    vectorEffect: 'non-scaling-stroke' as const,
  };
  const textCommon = { fill: renderedStroke, stroke: 'none', fontSize: 64, fontWeight: 700 };
  const lineCommon = {
    ...common,
    fill: 'none',
    markerStart: arrowStart ? `url(#${arrowId}-start)` : undefined,
    markerEnd: arrowEnd ? `url(#${arrowId}-end)` : undefined,
  };
  return (
    <svg
      viewBox="0 0 200 120"
      data-object-shape-outline={moveOutline ? 'true' : undefined}
      className={`${moveOutline ? 'cursor-move' : 'pointer-events-none'} h-full w-full`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        pointerEvents: moveOutline ? 'stroke' : 'none',
        cursor: moveOutline ? 'move' : undefined,
        filter: renderedEffect === 'shadow' ? `drop-shadow(8px 8px 7px ${effectColor})`
          : renderedEffect === 'glow' ? `drop-shadow(0 0 9px ${effectColor})`
            : renderedEffect === 'soft-edges' ? 'blur(1.5px)'
              : undefined,
        ...animationStyle,
      }}
    >
      <defs>
        {backgroundImageUrl ? <pattern id={imagePatternId} width="1" height="1" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox"><image href={backgroundImageUrl} x={-(Math.max(1, backgroundImageScale) - 1) / 2 + backgroundImageX / 200} y={-(Math.max(1, backgroundImageScale) - 1) / 2 + backgroundImageY / 200} width={Math.max(1, backgroundImageScale)} height={Math.max(1, backgroundImageScale)} preserveAspectRatio={backgroundImageFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'} opacity={Math.max(0, Math.min(1, Number(backgroundImageOpacity) || 0))}/></pattern> : null}
        {validGradient ? <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0" gradientTransform={`rotate(${Number(gradient.angle) || 0} .5 .5)`}>{gradient.stops.map((stop, index) => <stop key={`${stop.position}-${index}`} offset={`${Math.max(0, Math.min(1, Number(stop.position) || 0)) * 100}%`} stopColor={stop.color}/>)}</linearGradient> : null}
        <marker id={`${arrowId}-end`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill={`var(--studio-shape-stroke, ${renderedStroke})`}/></marker>
        <marker id={`${arrowId}-start`} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M10 0L0 5L10 10Z" fill={`var(--studio-shape-stroke, ${renderedStroke})`}/></marker>
      </defs>
      {kind === 'custom-drawing' && customPath ? (
        <path d={customPath} {...common} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : kind === 'custom-geometry' && customPath ? (
        <path d={customPath} {...common} strokeLinecap="round" strokeLinejoin="round" />
      ) : kind === 'diagonal-line' ? (
        <line x1="10" y1="110" x2="190" y2="10" {...common} fill="none" />
      ) : kind === 'vertical-line' ? (
        <line x1="100" y1="6" x2="100" y2="114" {...common} fill="none" />
      ) : ['connector', 'elbow-connector'].includes(kind) ? (
        <path d="M8 25H75V95H192" {...lineCommon} strokeLinecap="round" strokeLinejoin="round" />
      ) : ['curve', 'curved-connector'].includes(kind) ? (
        <path d="M8 98C50 5 145 115 192 22" {...lineCommon} strokeLinecap="round" />
      ) : ['circle', 'ellipse'].includes(kind) ? (
        <ellipse cx="100" cy="60" rx="92" ry="52" {...common} />
      ) : kind === 'triangle' ? (
        <polygon points="100,6 194,114 6,114" {...common} />
      ) : kind === 'inverted-triangle' ? (
        <polygon points="6,6 194,6 100,114" {...common} />
      ) : ['diamond', 'flow-decision', 'flowchart-decision'].includes(kind) ? (
        <polygon points="100,5 195,60 100,115 5,60" {...common} />
      ) : kind === 'pentagon' ? (
        <polygon points="100,5 195,45 160,115 40,115 5,45" {...common} />
      ) : kind === 'hexagon' ? (
        <polygon points="45,5 155,5 195,60 155,115 45,115 5,60" {...common} />
      ) : kind === 'heptagon' ? (
        <polygon points="100,4 169,26 196,80 144,116 56,116 4,80 31,26" {...common} />
      ) : kind === 'octagon' ? (
        <polygon points="55,5 145,5 195,35 195,85 145,115 55,115 5,85 5,35" {...common} />
      ) : kind === 'parallelogram' ? (
        <polygon points="40,6 195,6 160,114 5,114" {...common} />
      ) : kind === 'trapezoid' ? (
        <polygon points="45,6 155,6 195,114 5,114" {...common} />
      ) : kind === 'right-triangle' ? (
        <polygon points="8,8 8,114 194,114" {...common} />
      ) : kind === 'cross' ? (
        <polygon points="72,5 128,5 128,36 194,36 194,84 128,84 128,115 72,115 72,84 6,84 6,36 72,36" {...common} />
      ) : kind === 'plaque' ? (
        <path d="M28 6H172C172 23 183 34 194 38V82C183 86 172 97 172 114H28C28 97 17 86 6 82V38C17 34 28 23 28 6Z" {...common} />
      ) : kind === 'cube' ? (
        <path d="M42 28L100 5L158 28V92L100 115L42 92ZM42 28L100 52L158 28M100 52V115" {...common} fill={renderedFill} />
      ) : kind === 'cylinder' ? (
        <path d="M25 22C25 4 175 4 175 22V98C175 116 25 116 25 98ZM25 22C25 40 175 40 175 22M25 98C25 80 175 80 175 98" {...common} />
      ) : kind === 'pie' ? (
        <path d="M100 60V7A53 53 0 1 1 47 60Z" {...common} />
      ) : kind === 'arc' ? (
        <path d="M15 105A85 85 0 0 1 185 105" {...common} fill="none" />
      ) : kind === 'bracket-pair' ? (
        <path d="M55 7H28V113H55M145 7H172V113H145" {...common} fill="none" />
      ) : kind === 'left-bracket' ? (
        <path d="M145 7H55V113H145" {...common} fill="none" />
      ) : kind === 'right-bracket' ? (
        <path d="M55 7H145V113H55" {...common} fill="none" />
      ) : kind === 'brace-pair' ? (
        <path d="M60 5C35 5 48 48 22 60C48 72 35 115 60 115M140 5C165 5 152 48 178 60C152 72 165 115 140 115" {...common} fill="none" />
      ) : kind === 'left-brace' ? (
        <path d="M145 5C75 5 110 48 55 60C110 72 75 115 145 115" {...common} fill="none" />
      ) : kind === 'right-brace' ? (
        <path d="M55 5C125 5 90 48 145 60C90 72 125 115 55 115" {...common} fill="none" />
      ) : kind === 'star' ? (
        <polygon
          points="100,5 122,42 168,28 143,65 184,91 133,88 100,116 67,88 16,91 57,65 32,28 78,42"
          {...common}
        />
      ) : kind === 'star-4' ? (
        <polygon points="100,4 119,42 194,60 119,78 100,116 81,78 6,60 81,42" {...common} />
      ) : kind === 'star-6' ? (
        <polygon points="100,4 124,40 168,24 155,60 194,88 145,84 124,116 100,82 76,116 55,84 6,88 45,60 32,24 76,40" {...common} />
      ) : kind === 'star-8' ? (
        <polygon points="100,3 116,35 150,15 148,48 190,45 160,67 190,95 146,86 140,117 112,88 80,115 80,84 35,100 55,68 10,52 55,45 52,12 84,36" {...common} />
      ) : ['burst-1', 'burst-2'].includes(kind) ? (
        <polygon points="100,4 119,30 151,13 150,43 189,35 164,61 195,83 157,83 166,113 129,94 111,118 93,94 58,112 66,82 7,84 38,60 12,36 53,43 50,13 82,31" {...common} />
      ) : kind === 'heart' ? (
        <path
          d="M100 110C76 87 22 59 28 29C34 0 78 1 100 29C122 1 166 0 172 29C178 59 124 87 100 110Z"
          {...common}
        />
      ) : kind === 'cloud' ? (
        <path
          d="M48 100C20 100 12 69 34 54C28 28 63 14 82 32C101 3 151 17 151 49C183 47 194 89 163 100Z"
          {...common}
        />
      ) : kind === 'line' ? (
        <line x1="8" y1="60" x2="192" y2="60" {...lineCommon} />
      ) : ['arrow', 'right-arrow'].includes(kind) ? (
        <polygon points="5,45 140,45 140,20 195,60 140,100 140,75 5,75" {...common} />
      ) : ['double-arrow', 'left-right-arrow'].includes(kind) ? (
        <polygon
          points="5,60 50,20 50,45 150,45 150,20 195,60 150,100 150,75 50,75 50,100"
          {...common}
        />
      ) : kind === 'left-arrow' ? (
        <polygon points="195,45 60,45 60,20 5,60 60,100 60,75 195,75" {...common} />
      ) : kind === 'up-arrow' ? (
        <polygon points="85,115 85,48 55,48 100,5 145,48 115,48 115,115" {...common} />
      ) : kind === 'down-arrow' ? (
        <polygon points="85,5 85,72 55,72 100,115 145,72 115,72 115,5" {...common} />
      ) : kind === 'up-down-arrow' ? (
        <polygon points="100,3 145,38 118,38 118,82 145,82 100,117 55,82 82,82 82,38 55,38" {...common} />
      ) : kind === 'quad-arrow' ? (
        <polygon points="100,3 125,27 113,27 113,47 153,47 153,35 195,60 153,85 153,73 113,73 113,93 125,93 100,117 75,93 87,93 87,73 47,73 47,85 5,60 47,35 47,47 87,47 87,27 75,27" {...common} />
      ) : kind === 'bent-arrow' ? (
        <polygon points="15,100 15,25 125,25 125,7 192,42 125,77 125,58 55,58 55,100" {...common} />
      ) : kind === 'u-turn-arrow' ? (
        <path d="M32 112V58C32 5 143 5 143 58V75H170L133 112L96 75H121V58C121 31 55 31 55 58V112Z" {...common} />
      ) : kind === 'circular-arrow' ? (
        <path d="M155 32L190 30L174 65L162 49C143 16 82 12 49 42C8 80 44 116 91 112C123 109 141 88 145 67L166 72C158 111 123 119 89 119C22 119-6 57 35 20C73-14 137-2 169 20Z" {...common} />
      ) : kind === 'curved-arrow' ? (
        <path d="M18 103C44 26 105 14 157 43L176 20L194 82L129 78L151 58C116 39 75 49 50 111Z" {...common} />
      ) : kind === 'notched-arrow' ? (
        <polygon points="8,25 130,25 130,5 195,60 130,115 130,95 8,95 35,60" {...common} />
      ) : kind === 'elbow-arrow' ? (
        <polygon
          points="20,15 65,15 65,75 145,75 145,45 195,85 145,115 145,92 45,92 45,35 20,35"
          {...common}
        />
      ) : kind === 'flow-data' ? (
        <polygon points="28,8 194,8 172,112 6,112" {...common} />
      ) : kind === 'flow-document' ? (
        <path d="M7 8H193V92C160 72 130 116 100 96C70 76 40 116 7 96Z" {...common} />
      ) : ['flow-terminator', 'flowchart-terminator'].includes(kind) ? (
        <rect x="6" y="20" width="188" height="80" rx="40" {...common} />
      ) : kind === 'flow-delay' ? (
        <path d="M7 7H130C210 7 210 113 130 113H7Z" {...common} />
      ) : kind === 'callout' ? (
        <path d="M7 8H193V88H80L52 115L57 88H7Z" {...common} />
      ) : kind === 'speech' ? (
        <path d="M8 8H192V91H73L44 114L52 91H8Z" rx="18" {...common} />
      ) : kind === 'thought' ? (
        <>
          <ellipse cx="105" cy="50" rx="84" ry="43" {...common} />
          <circle cx="45" cy="102" r="12" {...common} />
          <circle cx="22" cy="115" r="6" {...common} />
        </>
      ) : kind === 'banner' ? (
        <polygon points="8,18 192,18 170,60 192,102 8,102 30,60" {...common} />
      ) : kind === 'ribbon' ? (
        <path d="M8 18H192L165 60L192 102H8L35 60Z M35 18V102 M165 18V102" {...common} />
      ) : kind === 'wave-banner' ? (
        <path d="M8 25C48 5 72 42 108 22C142 4 166 27 192 15V92C160 108 137 80 105 99C70 118 42 82 8 103Z" {...common} />
      ) : kind === 'scroll' ? (
        <path d="M35 18C35 2 8 4 8 24C8 39 20 42 35 36V100H165V36C180 42 192 39 192 24C192 4 165 2 165 18Z" {...common} />
      ) : kind.startsWith('action-') ? (
        <>
          <rect x="8" y="8" width="184" height="104" rx="14" {...common} />
          <text x="100" y="78" textAnchor="middle" {...textCommon}>
            {({ 'action-back': '◀', 'action-forward': '▶', 'action-beginning': '|◀', 'action-end': '▶|', 'action-home': '⌂', 'action-info': 'i', 'action-return': '↩', 'action-document': '▤', 'action-sound': '♪', 'action-help': '?' } as Record<string, string>)[kind]}
          </text>
        </>
      ) : ['plus', 'minus', 'multiply', 'divide', 'equal', 'not-equal'].includes(kind) ? (
        <text x="100" y="82" textAnchor="middle" {...textCommon}>
          {
            (
              {
                plus: '+',
                minus: '−',
                multiply: '×',
                divide: '÷',
                equal: '=',
                'not-equal': '≠',
              } as Record<string, string>
            )[kind]
          }
        </text>
      ) : (
        kind === 'frame' ? <path d="M6 6H194V114H6ZM25 25V95H175V25Z" fillRule="evenodd" {...common} />
          : kind === 'snip-one-rectangle' ? <polygon points="30,6 194,6 194,114 6,114 6,30" {...common} />
            : kind === 'snip-two-rectangle' ? <polygon points="30,6 170,6 194,30 194,114 6,114 6,30" {...common} />
              : kind === 'snip-round-rectangle' ? <path d="M30 6H174C185 6 194 15 194 26V114H6V30Z" {...common} />
                : kind === 'round-one-rectangle' ? <path d="M6 6H174C185 6 194 15 194 26V114H6Z" {...common} />
                  : kind === 'round-two-rectangle' ? <rect x="6" y="6" width="188" height="108" rx="28" {...common} />
                    : <rect x="6" y="6" width="188" height="108" rx={kind === 'rounded-rectangle' ? 18 : 0} {...common} />
      )}
    </svg>
  );
}
