interface Props {
  kind: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  strokeDash?: string;
}
export default function StudioShapeElement({
  kind,
  fill = '#dbeafe',
  stroke = '#1d4ed8',
  strokeWidth = 4,
  opacity = 1,
  strokeDash = 'solid',
}: Props) {
  const common = {
    fill,
    stroke,
    strokeWidth,
    opacity,
    strokeDasharray: strokeDash === 'dash' ? '12 8' : strokeDash === 'dot' ? '2 7' : undefined,
    vectorEffect: 'non-scaling-stroke' as const,
  };
  const textCommon = { fill: stroke, stroke: 'none', fontSize: 64, fontWeight: 700 };
  return (
    <svg
      viewBox="0 0 200 120"
      className="pointer-events-none h-full w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {kind === 'circle' ? (
        <ellipse cx="100" cy="60" rx="92" ry="52" {...common} />
      ) : kind === 'triangle' ? (
        <polygon points="100,6 194,114 6,114" {...common} />
      ) : kind === 'inverted-triangle' ? (
        <polygon points="6,6 194,6 100,114" {...common} />
      ) : ['diamond', 'flow-decision'].includes(kind) ? (
        <polygon points="100,5 195,60 100,115 5,60" {...common} />
      ) : kind === 'pentagon' ? (
        <polygon points="100,5 195,45 160,115 40,115 5,45" {...common} />
      ) : kind === 'hexagon' ? (
        <polygon points="45,5 155,5 195,60 155,115 45,115 5,60" {...common} />
      ) : kind === 'star' ? (
        <polygon
          points="100,5 122,42 168,28 143,65 184,91 133,88 100,116 67,88 16,91 57,65 32,28 78,42"
          {...common}
        />
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
        <line x1="8" y1="60" x2="192" y2="60" {...common} fill="none" />
      ) : ['arrow', 'curved-arrow'].includes(kind) ? (
        <polygon points="5,45 140,45 140,20 195,60 140,100 140,75 5,75" {...common} />
      ) : kind === 'double-arrow' ? (
        <polygon
          points="5,60 50,20 50,45 150,45 150,20 195,60 150,100 150,75 50,75 50,100"
          {...common}
        />
      ) : kind === 'elbow-arrow' ? (
        <polygon
          points="20,15 65,15 65,75 145,75 145,45 195,85 145,115 145,92 45,92 45,35 20,35"
          {...common}
        />
      ) : kind === 'flow-data' ? (
        <polygon points="28,8 194,8 172,112 6,112" {...common} />
      ) : kind === 'flow-document' ? (
        <path d="M7 8H193V92C160 72 130 116 100 96C70 76 40 116 7 96Z" {...common} />
      ) : kind === 'flow-terminator' ? (
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
        <rect
          x="6"
          y="6"
          width="188"
          height="108"
          rx={kind === 'rounded-rectangle' ? 18 : 0}
          {...common}
        />
      )}
    </svg>
  );
}
