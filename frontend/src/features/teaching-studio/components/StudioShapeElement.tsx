interface Props { kind: string; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number; }
export default function StudioShapeElement({ kind, fill = '#dbeafe', stroke = '#1d4ed8', strokeWidth = 4, opacity = 1 }: Props) {
  const common = { fill, stroke, strokeWidth, opacity, vectorEffect: 'non-scaling-stroke' as const };
  return <svg viewBox="0 0 200 120" className="pointer-events-none h-full w-full" preserveAspectRatio="none">
    {kind === 'circle' ? <ellipse cx="100" cy="60" rx="92" ry="52" {...common} />
      : kind === 'triangle' ? <polygon points="100,6 194,114 6,114" {...common} />
      : kind === 'inverted-triangle' ? <polygon points="6,6 194,6 100,114" {...common} />
      : kind === 'diamond' ? <polygon points="100,5 195,60 100,115 5,60" {...common} />
      : kind === 'pentagon' ? <polygon points="100,5 195,45 160,115 40,115 5,45" {...common} />
      : kind === 'hexagon' ? <polygon points="45,5 155,5 195,60 155,115 45,115 5,60" {...common} />
      : kind === 'line' ? <line x1="8" y1="60" x2="192" y2="60" {...common} fill="none" />
      : kind === 'arrow' ? <polygon points="5,45 140,45 140,20 195,60 140,100 140,75 5,75" {...common} />
      : <rect x="6" y="6" width="188" height="108" rx={kind === 'rounded-rectangle' ? 18 : 0} {...common} />}
  </svg>;
}
