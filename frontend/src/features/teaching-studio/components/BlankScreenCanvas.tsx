import type { StudioScreen } from '../types';

interface BlankScreenCanvasProps {
  screen: StudioScreen | null;
  loading: boolean;
}

export default function BlankScreenCanvas({ screen, loading }: BlankScreenCanvasProps) {
  return (
    <section aria-label="Studio canvas" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {screen?.title || (loading ? 'Loading Screen...' : 'Blank canvas')}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {screen
              ? `Screen ${screen.screen_number} · Revision ${screen.revision_no}`
              : 'Select or create a Screen to begin.'}
          </p>
        </div>
        {screen ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {screen.creation_mode === 'blank' ? 'Blank Screen' : 'Layout Screen'}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-[260px] items-center justify-center rounded-xl bg-slate-200 p-3 sm:min-h-[420px]">
        <div
          className="flex aspect-video w-full max-w-5xl items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl"
          data-testid="studio-canvas"
        >
          {loading ? (
            <p className="text-sm font-medium text-slate-500" role="status">Loading Screen...</p>
          ) : !screen ? (
            <p className="px-6 text-center text-sm text-slate-500">No Screen is selected.</p>
          ) : screen.elements.length === 0 ? (
            <div className="px-6 text-center">
              <p className="text-base font-semibold text-slate-700">Empty canvas</p>
              <p className="mt-1 text-sm text-slate-500">This Screen has no preset elements.</p>
            </div>
          ) : (
            <div className="px-6 text-center">
              <p className="text-base font-semibold text-slate-700">
                {screen.elements.length} saved {screen.elements.length === 1 ? 'element' : 'elements'}
              </p>
              <p className="mt-1 text-sm text-slate-500">Element editing is added in the later editor milestone.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

