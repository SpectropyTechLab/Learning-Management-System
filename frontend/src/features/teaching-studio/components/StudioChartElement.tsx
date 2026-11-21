import { studioAnimationStyle } from './studioAnimationRuntime';

type ChartBuildState = {
  sequence: string;
  visibleItems: ReadonlySet<number>;
  activeItem: number | null;
  effect?: Record<string, unknown>;
};

const palette = ['#2563eb', '#f97316', '#16a34a', '#9333ea', '#dc2626', '#0891b2'];

export default function StudioChartElement({ content, animationBuildState }: {
  content: Record<string, unknown>;
  animationBuildState?: ChartBuildState | null;
}) {
  const source = content.data && typeof content.data === 'object' && !Array.isArray(content.data)
    ? content.data as Record<string, unknown>
    : content;
  const labels = Array.isArray(source.labels) ? source.labels.map(String) : [];
  const datasets = Array.isArray(source.datasets) ? source.datasets.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return [];
    const dataset = candidate as Record<string, unknown>;
    return [{ label: String(dataset.label || `Series ${index + 1}`), values: Array.isArray(dataset.data) ? dataset.data.map((value) => Number(value) || 0) : [], color: String(dataset.color || dataset.backgroundColor || palette[index % palette.length]) }];
  }) : [];
  const chartType = String(content.chartType || source.type || 'bar');
  const maximum = Math.max(1, ...datasets.flatMap((dataset) => dataset.values.map(Math.abs)));
  const buildItem = (series: number, category: number) => animationBuildState?.sequence === 'by-series' ? series
    : animationBuildState?.sequence === 'by-category' ? category
      : category * Math.max(1, datasets.length) + series;
  const itemStyle = (series: number, category: number) => {
    const item = buildItem(series, category);
    const visible = !animationBuildState || animationBuildState.visibleItems.has(item);
    const active = animationBuildState?.activeItem === item && animationBuildState.effect
      ? studioAnimationStyle({ effects: [animationBuildState.effect] })
      : {};
    return { opacity: visible ? 1 : 0, ...active };
  };
  if (!datasets.length || !labels.length) return <div className="grid h-full w-full place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">Chart data is empty</div>;
  if (chartType === 'pie' || chartType === 'doughnut') {
    const values = datasets[0].values;
    const total = Math.max(1, values.reduce((sum, value) => sum + Math.max(0, value), 0));
    let angle = -Math.PI / 2;
    return <svg viewBox="0 0 500 320" className="h-full w-full overflow-visible bg-white" role="img" aria-label={String(content.title || 'Chart')}>
      {values.map((value, category) => { const start = angle; const sweep = Math.max(0, value) / total * Math.PI * 2; angle += sweep; const end = angle; const large = sweep > Math.PI ? 1 : 0; const outer = 115; const inner = chartType === 'doughnut' ? 55 : 0; const x1 = 250 + Math.cos(start) * outer; const y1 = 155 + Math.sin(start) * outer; const x2 = 250 + Math.cos(end) * outer; const y2 = 155 + Math.sin(end) * outer; const path = inner ? `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${250 + Math.cos(end) * inner} ${155 + Math.sin(end) * inner} A ${inner} ${inner} 0 ${large} 0 ${250 + Math.cos(start) * inner} ${155 + Math.sin(start) * inner} Z` : `M 250 155 L ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} Z`; return <path key={category} d={path} fill={palette[category % palette.length]} style={itemStyle(0, category)}/>; })}
      <text x="250" y="24" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">{String(content.title || '')}</text>
    </svg>;
  }
  const categoryWidth = 400 / Math.max(1, labels.length);
  return <svg viewBox="0 0 520 330" className="h-full w-full overflow-visible bg-white" role="img" aria-label={String(content.title || 'Chart')}>
    <text x="260" y="24" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">{String(content.title || '')}</text>
    <line x1="58" y1="275" x2="490" y2="275" stroke="#64748b"/><line x1="58" y1="45" x2="58" y2="275" stroke="#64748b"/>
    {chartType === 'line' ? datasets.map((dataset, series) => { const points = dataset.values.map((value, category) => `${75 + category * categoryWidth},${275 - Math.abs(value) / maximum * 210}`).join(' '); return <g key={series} style={itemStyle(series, 0)}><polyline points={points} fill="none" stroke={dataset.color} strokeWidth="4"/>{dataset.values.map((value, category) => <circle key={category} cx={75 + category * categoryWidth} cy={275 - Math.abs(value) / maximum * 210} r="6" fill={dataset.color} style={itemStyle(series, category)}/>)}</g>; }) : labels.flatMap((_, category) => datasets.map((dataset, series) => { const width = Math.max(8, categoryWidth / Math.max(1, datasets.length) - 8); const height = Math.abs(dataset.values[category] || 0) / maximum * 210; return <rect key={`${series}-${category}`} x={65 + category * categoryWidth + series * (width + 4)} y={275 - height} width={width} height={height} rx="3" fill={dataset.color} style={itemStyle(series, category)}/>; }))}
    {labels.map((label, category) => <text key={category} x={75 + category * categoryWidth} y="300" textAnchor="middle" fontSize="12" fill="#334155">{label.slice(0, 12)}</text>)}
  </svg>;
}
