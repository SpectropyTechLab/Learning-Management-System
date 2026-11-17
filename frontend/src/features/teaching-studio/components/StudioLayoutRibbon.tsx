import { ChevronDown } from 'lucide-react';
import type { StudioLayoutSummary } from '../api/studioEditorApi';
import type { Layout } from '../layouts';
import { targetLayouts } from '../targetLayouts';

type Props = {
  layouts: StudioLayoutSummary[];
  selectedLayoutId: number | null;
  applying: boolean;
  disabled?: boolean;
  onApply: (row: StudioLayoutSummary, layout: Layout) => void;
  onMore: () => void;
};

const MiniLayout = ({ layout }: { layout: Layout }) => (
  <span className="relative block h-8 w-12 overflow-hidden rounded border border-slate-300 bg-slate-50">
    {layout.slots.map((slot) => (
      <span
        key={slot.id}
        className={`absolute rounded-[1px] border ${slot.region === 'header' ? 'border-blue-300 bg-blue-100' : slot.region === 'footer' ? 'border-slate-300 bg-slate-200' : 'border-teal-300 bg-teal-50'}`}
        style={{ left: `${slot.bounds.x / 19.2}%`, top: `${slot.bounds.y / 10.8}%`, width: `${slot.bounds.width / 19.2}%`, height: `${slot.bounds.height / 10.8}%` }}
      />
    ))}
  </span>
);

export default function StudioLayoutRibbon({ layouts, selectedLayoutId, applying, disabled = false, onApply, onMore }: Props) {
  const rowsByKey = new Map(
    layouts.filter((row) => row.is_default).map((row) => [row.layout_key.toUpperCase(), row]),
  );

  return (
    <div className="flex h-full items-center gap-1 px-1" aria-label="Screen layouts">
      {targetLayouts.slice(0, 5).map((layout) => {
        const row = rowsByKey.get(layout.id.toUpperCase());
        const selected = Boolean(row && row.id === selectedLayoutId);
        return (
          <button
            key={layout.id}
            type="button"
            disabled={disabled || applying || !row || selected}
            onClick={() => row && onApply(row, layout)}
            title={`${layout.id} - ${layout.name}${selected ? ' - Applied' : ''}`}
            aria-label={`Apply ${layout.name} layout`}
            aria-pressed={selected}
            className={`rounded-md p-0.5 transition disabled:cursor-not-allowed ${selected ? 'bg-blue-100 ring-2 ring-blue-600' : 'hover:bg-blue-50 disabled:opacity-45'}`}
          >
            <MiniLayout layout={layout} />
          </button>
        );
      })}
      <button type="button" disabled={disabled} onClick={onMore} title="More layouts and custom layouts" className="flex h-9 items-center gap-0.5 rounded-md border border-slate-300 px-1.5 text-[10px] font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40">
        More <ChevronDown size={12} />
      </button>
    </div>
  );
}
