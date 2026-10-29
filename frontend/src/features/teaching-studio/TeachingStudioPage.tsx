import { useState } from 'react';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import { layouts, pilotLayouts, sampleSlides, validateSlide } from './layouts';
import type { Layout } from './layouts';
import SlideCanvas from './SlideCanvas';

function LayoutThumbnail({ layout }: { layout: Layout }) {
  if (layout.thumbnail) return <img src={`/teaching-studio/layouts/${encodeURIComponent(layout.thumbnail)}`} alt="" className="w-full rounded" />;
  return <svg viewBox="0 0 1920 1080" aria-hidden="true" className="w-full rounded border border-slate-200 bg-white">
    <rect width="1920" height="1080" fill="#f8fbff" />
    {layout.slots.map((field) => <rect key={field.id} {...field.bounds} rx="18" fill={field.region === 'header' ? '#d8e9fb' : field.region === 'footer' ? '#e8eef5' : '#dcf1f5'} stroke="#6798ac" strokeWidth="8" />)}
  </svg>;
}

export default function TeachingStudioPage() {
  const [catalog, setCatalog] = useState<'target' | 'pilot'>('target');
  const [selected, setSelected] = useState(layouts[0].id);
  const [showGuides, setShowGuides] = useState(false);
  const visibleLayouts = catalog === 'target' ? layouts : pilotLayouts;
  const layout = visibleLayouts.find((item) => item.id === selected) ?? visibleLayouts[0];
  const slide = sampleSlides[layout.id];
  const errors = validateSlide(layout, slide);
  return <TeachingSessionsShell title="Teaching Studio" subtitle="Target layout catalog and pilot import previews">
    <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
      <section aria-label="Layout gallery" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Layouts</h2>
        <p className="mt-1 text-xs text-slate-500">Guide v3 target layouts and pilot import arrangements.</p>
        <div className="mt-3 flex gap-2" role="group" aria-label="Layout catalog">
          {(['target', 'pilot'] as const).map((item) => <button key={item} type="button" onClick={() => { setCatalog(item); setSelected(item === 'target' ? layouts[0].id : pilotLayouts[0].id); }} aria-pressed={catalog === item} className={`rounded-lg px-3 py-2 text-xs font-semibold ${catalog === item ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>{item === 'target' ? 'Target (14)' : 'Pilot (8)'}</button>)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-1">
          {visibleLayouts.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item.id)} aria-pressed={selected === item.id} className={`rounded-xl border p-2 text-left transition focus-visible:outline-2 focus-visible:outline-blue-600 ${selected === item.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
            <LayoutThumbnail layout={item} />
            <span className="mt-2 block text-xs font-semibold text-blue-700">{item.id}</span>
            <span className="mt-2 block text-sm font-semibold text-slate-800">{item.name}</span>
          </button>)}
        </div>
      </section>
      <section aria-label="Teaching slide" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-slate-900">{layout.id} · {layout.name}</h2><p className="text-sm text-slate-500">1920 × 1080 master · 16:9 · {layout.slots.length} slots · {layout.catalog === 'target' ? 'target wireframe' : 'pilot import'}</p></div>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} />Show placement guides</label>
        </div>
        <SlideCanvas layout={layout} slide={slide} showGuides={showGuides} />
        <p className={`mt-3 text-sm ${errors.length ? 'text-red-700' : 'text-emerald-700'}`} role="status">{errors.length ? errors.join('; ') : 'All objects fit their assigned slots and regions.'}</p>
        <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2">
          <p><strong>Purpose:</strong> {layout.purpose}</p>
          {layout.compatibility && <p><strong>Compatible use:</strong> {layout.compatibility}</p>}
          {layout.interaction && <p><strong>Reveal / interaction:</strong> {layout.interaction}</p>}
          {layout.evidence && <p><strong>Evidence:</strong> {layout.evidence}</p>}
          {layout.productionChecks && <p className="sm:col-span-2"><strong>Production checks:</strong> {layout.productionChecks}</p>}
        </div>
        <p className="mt-2 text-xs text-slate-500">Guide wireframe preview with sample labels. Authoring, persistence, and interactive behavior are not connected yet.</p>
      </section>
    </div>
  </TeachingSessionsShell>;
}
