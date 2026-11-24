import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, FileUp, LoaderCircle, Presentation, X } from 'lucide-react';
import { getPptxImportErrorMessage, importPptx, preflightPptx, type PptxImportOptions, type PptxImportResult, type PptxPreflight } from '../../api/studioPptxImportApi';

type Props = {
  sessionId: number;
  sessions: Array<{ id: number; session_number: number; title: string }>;
  currentScreenId: number | null;
  onClose: () => void;
  onImported: (result: PptxImportResult, destinationSessionId: number) => Promise<void> | void;
};

type Stage = 'choose' | 'validating' | 'reading' | 'ready' | 'uploading' | 'creating' | 'complete';

const stageLabel: Record<Stage, string> = {
  choose: 'Choose a PowerPoint file', validating: 'Validating package safety', reading: 'Reading slides, layouts and resources',
  ready: 'Configure import', uploading: 'Uploading extracted resources', creating: 'Creating editable Screens', complete: 'Import complete',
};

export default function PptxImportDialog({ sessionId, sessions, currentScreenId, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preflight, setPreflight] = useState<PptxPreflight | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState<Stage>('choose');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PptxImportResult | null>(null);
  const [destinationSessionId, setDestinationSessionId] = useState(sessionId);
  const [insertionMode, setInsertionMode] = useState<PptxImportOptions['insertion_mode']>(currentScreenId ? 'after' : 'end');
  const [formatting, setFormatting] = useState<PptxImportOptions['formatting']>('source');
  const [fitMode, setFitMode] = useState<PptxImportOptions['fit_mode']>('fit');
  const [fallback, setFallback] = useState<PptxImportOptions['fallback']>('picture');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  const busy = ['validating', 'reading', 'uploading', 'creating'].includes(stage);

  const inspect = async (nextFile: File) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFile(nextFile);
    setPreflight(null);
    setResult(null);
    setError(null);
    setStage('validating');
    try {
      const response = await preflightPptx(sessionId, nextFile, controller.signal, (percent) => {
        setUploadPercent(percent);
        if (percent >= 100) setStage('reading');
      });
      setPreflight(response);
      setSelected(new Set(response.defaults.selected_slide_ids));
      setStage('ready');
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setError(getPptxImportErrorMessage(requestError));
      setStage('choose');
    }
  };

  const commit = async () => {
    if (!file || !preflight || selected.size === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setUploadPercent(0);
    setStage('uploading');
    try {
      const response = await importPptx(destinationSessionId, file, {
        selected_slide_ids: [...selected], insertion_mode: insertionMode,
        after_screen_id: insertionMode === 'after' && destinationSessionId === sessionId ? currentScreenId : null,
        formatting, fit_mode: fitMode, fallback, animations: false,
      }, controller.signal, (percent) => {
        setUploadPercent(percent);
        if (percent >= 100) setStage('creating');
      });
      setResult(response);
      setStage('complete');
      await onImported(response, destinationSessionId);
    } catch (requestError) {
      if (controller.signal.aborted) { setStage('ready'); return; }
      setError(getPptxImportErrorMessage(requestError));
      setStage('ready');
    }
  };

  const closeOrCancel = () => {
    if (busy) abortRef.current?.abort();
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Import PowerPoint">
      <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-700"><Presentation size={21}/></span>
          <div className="min-w-0 flex-1"><h2 className="font-bold text-slate-900">Import PowerPoint as editable Screens</h2><p className="text-xs text-slate-500">{stageLabel[stage]} · .pptx only · original file is not retained</p></div>
          <button type="button" onClick={closeOrCancel} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-100" aria-label={busy ? 'Cancel import' : 'Close'}><X size={17}/></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {busy ? <div className="grid min-h-72 place-items-center text-center"><div><LoaderCircle className="mx-auto animate-spin text-blue-700" size={32}/><p className="mt-3 font-semibold text-slate-800">{stageLabel[stage]}</p>{stage === 'validating' || stage === 'uploading' ? <p className="mt-1 text-sm text-slate-500">Uploading {uploadPercent}%</p> : <p className="mt-1 text-sm text-slate-500">This may take a moment for media-rich presentations.</p>}<button type="button" onClick={closeOrCancel} className="mt-5 rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel safely</button></div></div> : null}
          {!busy && !preflight && !result ? <label className="grid min-h-72 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-8 text-center hover:bg-blue-50"><span><FileUp className="mx-auto text-blue-700" size={34}/><span className="mt-3 block font-bold text-slate-900">Choose a .pptx presentation</span><span className="mt-1 block text-sm text-slate-600">Maximum 100 MB and 100 slides. Password-protected, macro and legacy .ppt files are rejected.</span></span><input type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="sr-only" onChange={(event) => { const next = event.target.files?.[0]; if (next) void inspect(next); }}/></label> : null}
          {error ? <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="shrink-0" size={18}/><span>{error}</span></div> : null}
          {!busy && preflight && !result ? <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
            <section><div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Select slides</h3><p className="text-xs text-slate-500">{selected.size} of {preflight.slides.length} selected · {preflight.resource_count} reusable media resources found</p></div><button type="button" onClick={() => setSelected(selected.size === preflight.slides.length ? new Set() : new Set(preflight.slides.map((slide) => slide.source_id)))} className="text-xs font-semibold text-blue-700 hover:underline">{selected.size === preflight.slides.length ? 'Clear all' : 'Select all'}</button></div>
              <div className="grid max-h-[52dvh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{preflight.slides.map((slide) => <label key={slide.source_id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${selected.has(slide.source_id) ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:bg-slate-50'}`}><input type="checkbox" checked={selected.has(slide.source_id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(slide.source_id)) next.delete(slide.source_id); else next.add(slide.source_id); return next; })}/><span className="min-w-0"><span className="block text-xs font-bold text-slate-500">SLIDE {slide.number}{slide.hidden ? ' · HIDDEN' : ''}</span><span className="block truncate text-sm font-semibold text-slate-900">{slide.title}</span><span className="mt-1 block text-[11px] text-slate-500">{slide.editable_text_count} text · {slide.shape_count} shapes · {slide.image_count} images{slide.warning_count ? ` · ${slide.warning_count} warnings` : ''}</span></span></label>)}</div>
            </section>
            <aside className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-semibold text-slate-900">Import settings</h3>
              <label className="block text-xs font-semibold text-slate-700">Destination Session<select value={destinationSessionId} onChange={(event) => { const next = Number(event.target.value); setDestinationSessionId(next); if (next !== sessionId && insertionMode === 'after') setInsertionMode('end'); }} className="mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm">{(sessions.length ? sessions : [{ id: sessionId, session_number: sessionId, title: 'Current Session' }]).map((session) => <option key={session.id} value={session.id}>Session {session.session_number}: {session.title}</option>)}</select></label>
              <label className="block text-xs font-semibold text-slate-700">Insert Screens<select value={insertionMode} onChange={(event) => setInsertionMode(event.target.value as PptxImportOptions['insertion_mode'])} className="mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm"><option value="after" disabled={!currentScreenId || destinationSessionId !== sessionId}>After current Screen</option><option value="end">At end of Session</option><option value="start">At beginning</option></select></label>
              <label className="block text-xs font-semibold text-slate-700">Formatting<select value={formatting} onChange={(event) => setFormatting(event.target.value as PptxImportOptions['formatting'])} className="mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm"><option value="source">Keep source formatting</option><option value="destination">Use destination defaults</option></select></label>
              <label className="block text-xs font-semibold text-slate-700">Slide sizing<select value={fitMode} onChange={(event) => setFitMode(event.target.value as PptxImportOptions['fit_mode'])} className="mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm"><option value="fit">Fit proportionally</option><option value="preserve">Preserve source dimensions</option></select></label>
              <label className="block text-xs font-semibold text-slate-700">Unsupported objects<select value={fallback} onChange={(event) => setFallback(event.target.value as PptxImportOptions['fallback'])} className="mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm"><option value="picture">Picture when available, otherwise placeholder</option><option value="placeholder">Visible placeholder</option><option value="skip">Skip and report</option></select></label>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">PowerPoint animations, transitions, charts, SmartArt, media and 3D are reported but deferred from this editable MVP.</div>
            </aside>
          </div> : null}
          {!busy && result ? <div className="space-y-5"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 font-bold text-emerald-900"><Check size={19}/>PowerPoint imported successfully</div><p className="mt-1 text-sm text-emerald-800">Created {result.report.counts.screens} Screens with {result.report.counts.elements} editable objects and {result.report.counts.resources} Resources.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Object.entries({ Text: result.report.counts.editable_text, Shapes: result.report.counts.shapes, Images: result.report.counts.images, Resources: result.report.counts.resources, Warnings: result.report.counts.warnings }).map(([label, value]) => <div key={label} className="rounded-xl border p-3 text-center"><div className="text-xl font-black text-slate-900">{value}</div><div className="text-xs text-slate-500">{label}</div></div>)}</div>{result.report.issues.length ? <section><h3 className="font-semibold text-slate-900">Import report</h3><div className="mt-2 max-h-52 overflow-y-auto rounded-xl border divide-y">{result.report.issues.map((issue, index) => <div key={`${issue.code}-${index}`} className="p-3 text-sm"><span className="font-semibold text-slate-800">{issue.code.replaceAll('_', ' ')}</span><span className="ml-2 text-slate-600">{issue.message}</span>{issue.fallback_applied ? <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">{issue.fallback_applied}</span> : null}</div>)}</div></section> : null}</div> : null}
        </div>
        {!busy && preflight && !result ? <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3"><label className="cursor-pointer text-xs font-semibold text-blue-700 hover:underline">Choose another file<input type="file" accept=".pptx" className="sr-only" onChange={(event) => { const next = event.target.files?.[0]; if (next) void inspect(next); }}/></label><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" disabled={!selected.size} onClick={() => void commit()} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Import {selected.size} slide{selected.size === 1 ? '' : 's'}</button></div></footer> : null}
        {!busy && result ? <footer className="flex justify-end border-t border-slate-200 px-5 py-3"><button type="button" onClick={onClose} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white">Done</button></footer> : null}
      </div>
    </div>
  );
}
