import { RiAddLine, RiFileList3Line } from 'react-icons/ri';
import type { StudioScreen } from '../types';

interface StudioScreenNavigatorProps {
  screens: StudioScreen[];
  selectedScreenId: number | null;
  loading: boolean;
  creating: boolean;
  onSelect: (screenId: number) => void;
  onCreateBlank: () => void;
}

export default function StudioScreenNavigator({
  screens,
  selectedScreenId,
  loading,
  creating,
  onSelect,
  onCreateBlank,
}: StudioScreenNavigatorProps) {
  return (
    <aside aria-label="Session Screens" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Screens</h2>
          <p className="mt-1 text-xs text-slate-500">Persisted Session order</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {screens.length}
        </span>
      </div>

      <button
        type="button"
        onClick={onCreateBlank}
        disabled={creating || loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        <RiAddLine aria-hidden="true" />
        {creating ? 'Creating...' : 'Create blank Screen'}
      </button>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500" role="status">
            Loading Screens...
          </p>
        ) : screens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center">
            <RiFileList3Line className="mx-auto text-2xl text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-slate-700">No Screens yet</p>
            <p className="mt-1 text-xs text-slate-500">Create a genuinely blank Screen to start.</p>
          </div>
        ) : (
          screens.map((screen, index) => {
            const selected = screen.id === selectedScreenId;
            return (
              <button
                key={screen.id}
                type="button"
                onClick={() => onSelect(screen.id)}
                aria-pressed={selected}
                className={`w-full rounded-xl border px-3 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  selected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Screen {index + 1}
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-slate-800">
                  {screen.title || `Untitled Screen ${screen.screen_number}`}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

