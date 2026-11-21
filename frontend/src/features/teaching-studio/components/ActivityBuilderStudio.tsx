import { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { ArrowLeft, FileSpreadsheet, Images, Link2, LoaderCircle, Maximize2, RotateCcw, Upload, WandSparkles, X } from 'lucide-react';
import { ACTIVITY_SCENES, ACTIVITY_SIMULATIONS, ACTIVITY_TEMPLATES, activityTemplate, createActivityDocument, validateActivityDocument, type ActivityDocument, type ActivityType, type SimulationId } from './activityBuilderModel';
import { buildStandaloneActivityHtml } from './activityExport';
import ActivityScenePreview from './ActivityScenePreview';
import ActivityLivePreview from './ActivityLivePreview';
import ResourceLibrary from './resources/ResourceLibrary';
import { getStudioResourcePreview, type StudioResourceSummary, type StudioResourceVersion } from '../api/studioResourcesApi';

export type ActivityBuilderInsert = { project: ActivityDocument; title: string; html: string };
type Props = {
  initialProject?: ActivityDocument | null;
  initialType?: ActivityType;
  onBack: () => void;
  onInsert: (activity: ActivityBuilderInsert) => void;
};

const inputClass = 'mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
const textareaClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
const labelClass = 'block text-[11px] font-bold uppercase tracking-wide text-slate-600';
const sectionClass = 'border-b border-slate-200 bg-white';

const rowsToContent = (rows: unknown[][]) => rows
  .map((row) => row.map((cell) => String(cell ?? '').replace(/[\r\n|]+/g, ' ').trim()))
  .filter((row) => row.some(Boolean))
  .filter((row, index) => index > 0 || !/question|statement|term|word|prompt|left|group/i.test(row[0] || ''))
  .map((row) => row.join(' | '))
  .join('\n');

const contentToTableRows = (content: string) => content
  .split(/\r?\n/)
  .filter((line) => line.trim())
  .map((line) => line.split('|').map((cell) => cell.trim()));

const blobAsDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Unable to read the selected Resource.'));
  reader.readAsDataURL(blob);
});

function ActivityTablePopup({ headers, rows, format, activityLabel, onChangeCell, onSaveRows, onClose }: {
  headers: string[];
  rows: string[][];
  format: string;
  activityLabel: string;
  onChangeCell: (rowIndex: number, columnIndex: number, value: string) => void;
  onSaveRows: (rows: string[][]) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/65 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="activity-table-title" className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3">
          <div><h2 id="activity-table-title" className="font-bold text-slate-950">Activity content table</h2><p className="text-xs text-slate-500">{activityLabel} · {format}</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close table popup"><X size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-5">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100"><tr><th className="w-12 border border-slate-300 p-2 text-slate-500">#</th>{headers.map((header) => <th key={header} className="min-w-48 border border-slate-300 p-2 text-left font-bold text-slate-700">{header}</th>)}<th className="w-12 border border-slate-300" /></tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}><td className="border border-slate-200 p-2 text-center text-slate-400">{rowIndex + 1}</td>{headers.map((_, columnIndex) => <td key={columnIndex} className="border border-slate-200 p-1"><input aria-label={`Popup row ${rowIndex + 1}, column ${columnIndex + 1}`} className="h-10 min-w-48 w-full bg-transparent px-3 outline-none focus:bg-blue-50" value={row[columnIndex] || ''} onChange={(event) => onChangeCell(rowIndex, columnIndex, event.target.value)} /></td>)}<td className="border border-slate-200 text-center"><button type="button" onClick={() => onSaveRows(rows.filter((_, index) => index !== rowIndex))} className="px-3 py-2 text-slate-400 hover:text-red-600" aria-label={`Delete popup row ${rowIndex + 1}`}>×</button></td></tr>)}</tbody>
          </table>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={() => onSaveRows([...rows, Array(headers.length).fill('')])} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800">+ Add row</button>
          <button type="button" onClick={() => void navigator.clipboard.writeText(rows.map((row) => row.join('\t')).join('\n'))} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Copy for Excel</button>
          <button type="button" onClick={() => onSaveRows([])} className="px-3 py-2 text-xs font-bold text-red-600">Clear all</button>
          <button type="button" onClick={onClose} className="ml-auto rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700">Done</button>
        </footer>
      </section>
    </div>
  );
}

export default function ActivityBuilderStudio({ initialProject, initialType = 'mcq', onBack, onInsert }: Props) {
  const initial = initialProject ? validateActivityDocument(initialProject) : createActivityDocument(initialType);
  const [activity, setActivity] = useState(initial);
  const [tableRows, setTableRows] = useState<string[][]>(() => contentToTableRows(initial.content));
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [sceneMessage, setSceneMessage] = useState('');
  const [sceneLoading, setSceneLoading] = useState(false);
  const [dataView, setDataView] = useState<'table' | 'raw' | 'excel'>('table');
  const [tablePopupOpen, setTablePopupOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (activity.sceneSource !== 'resource' || activity.sceneUrl || !activity.sceneResourceVersionId) return;
    let active = true;
    setSceneLoading(true);
    void getStudioResourcePreview(activity.sceneResourceVersionId)
      .then((preview) => fetch(preview.url))
      .then((response) => {
        if (!response.ok) throw new Error('Unable to reload the scene Resource.');
        return response.blob();
      })
      .then(blobAsDataUrl)
      .then((sceneUrl) => { if (active) setActivity((current) => ({ ...current, sceneUrl })); })
      .catch((error) => { if (active) setSceneMessage(error instanceof Error ? error.message : 'Unable to reload the scene Resource.'); })
      .finally(() => { if (active) setSceneLoading(false); });
    return () => { active = false; };
  }, [activity.sceneResourceVersionId, activity.sceneSource, activity.sceneUrl]);
  const template = activityTemplate(activity.activityType);
  const tableHeaders = useMemo(() => {
    const parts = template.format.split('|').map((part) => part.trim()).filter(Boolean);
    return parts.length > 1 ? parts : ['Content'];
  }, [template.format]);
  const update = <K extends keyof ActivityDocument>(key: K, value: ActivityDocument[K]) => {
    if (key === 'content') setTableRows(contentToTableRows(String(value)));
    setActivity((current) => ({ ...current, [key]: value }));
  };
  const saveTableRows = (rows: string[][]) => {
    setTableRows(rows);
    setActivity((current) => ({
      ...current,
      content: rows.map((row) => row.map((cell) => cell.trim()).join(' | ')).join('\n'),
    }));
  };
  const updateTableCell = (rowIndex: number, columnIndex: number, value: string) => {
    const rows = tableRows.map((row) => [...row]);
    while (rows[rowIndex].length < tableHeaders.length) rows[rowIndex].push('');
    rows[rowIndex][columnIndex] = value;
    saveTableRows(rows);
  };
  const changeType = (type: ActivityType) => {
    const next = createActivityDocument(type);
    setTableRows(contentToTableRows(next.content));
    setActivity((current) => ({ ...current, activityType: type, title: next.title, content: next.content, bloom: next.bloom }));
  };
  const importRows = (raw: string, append = false) => {
    const parsed = Papa.parse<string[]>(raw, { skipEmptyLines: true });
    const content = rowsToContent(parsed.data as unknown[][]);
    if (!content) { setImportMessage('No usable rows were found.'); return; }
    update('content', append && activity.content.trim() ? `${activity.content.trim()}\n${content}` : content);
    setImportMessage(`${content.split('\n').length} row(s) loaded into this Activity.`);
  };
  const readFile = (file: File) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const content = rowsToContent(result.data as unknown[][]);
        if (!content) { setImportMessage('No usable rows were found in that file.'); return; }
        update('content', content);
        setImportMessage(`${content.split('\n').length} row(s) imported from ${file.name}.`);
      },
      error: (error) => setImportMessage(error.message),
    });
  };
  const chooseSceneResource = async (resource: StudioResourceSummary, version: StudioResourceVersion) => {
    setSceneLoading(true);
    setSceneMessage('Preparing the selected Resource…');
    try {
      const source = version.external_url || (await getStudioResourcePreview(version.id)).url;
      const response = await fetch(source);
      if (!response.ok) throw new Error('Unable to download the selected Resource.');
      const blob = await response.blob();
      const dataUrl = await blobAsDataUrl(blob);
      setActivity((current) => ({
        ...current,
        sceneSource: 'resource',
        sceneUrl: dataUrl,
        sceneMediaType: (version.mime_type || blob.type).startsWith('video/') ? 'video' : 'image',
        sceneResourceName: resource.name,
        sceneResourceId: resource.id,
        sceneResourceVersionId: version.id,
      }));
      setSceneMessage(`${resource.name} is now the Activity scene.`);
      setResourcePickerOpen(false);
    } catch (error) {
      setSceneMessage(error instanceof Error ? error.message : 'Unable to use that Resource as a scene.');
    } finally {
      setSceneLoading(false);
    }
  };

  return <><main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-100 text-slate-900">
    <header className="flex min-h-[68px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
      <button type="button" onClick={onBack} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-800" aria-label="Back to Screen Editor"><ArrowLeft size={20} /></button>
      <div className="min-w-52"><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-700">SPECTROPY</p><h1 className="text-lg font-bold text-slate-950">Activity Builder</h1></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm text-slate-600">{activity.title}</p></div>
      <button type="button" onClick={() => { const reset = createActivityDocument(activity.activityType); setActivity(reset); setTableRows(contentToTableRows(reset.content)); }} className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-blue-600 hover:bg-blue-50"><RotateCcw size={17} /> Reset</button>
      <button type="button" onClick={() => onInsert({ project: activity, title: activity.title, html: buildStandaloneActivityHtml(activity) })} className="flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-800"><WandSparkles size={18} /> Export &amp; Insert</button>
    </header>

    <section className="grid min-h-0 flex-1 grid-cols-[500px_minmax(0,1fr)] max-[1050px]:grid-cols-1">
      <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-white">
        <div>
          <details className={sectionClass} open>
            <summary className="cursor-pointer px-4 py-3 font-bold">1 · Identity &amp; Curriculum</summary>
            <div className="grid gap-3 border-t border-slate-200 p-4">
              <label className={labelClass}>Activity title<input className={inputClass} value={activity.title} onChange={(event) => update('title', event.target.value)} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>Subject<select className={inputClass} value={activity.subject} onChange={(event) => update('subject', event.target.value)}>{['Physics','Chemistry','Mathematics','Biology','General Science'].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className={labelClass}>Class / Grade<select className={inputClass} value={activity.grade} onChange={(event) => update('grade', event.target.value)}>{[6,7,8,9,10,11,12].map((item) => <option key={item}>Class {item}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-2 gap-3"><label className={labelClass}>Chapter<input className={inputClass} value={activity.chapter} onChange={(event) => update('chapter', event.target.value)} /></label><label className={labelClass}>Concept<input className={inputClass} value={activity.concept} onChange={(event) => update('concept', event.target.value)} /></label></div>
              <div className="grid grid-cols-3 gap-3"><label className={labelClass}>Track<select className={inputClass} value={activity.track} onChange={(event) => update('track', event.target.value)}>{['Foundation','IIT-JEE','NEET','Olympiad','Board'].map((item) => <option key={item}>{item}</option>)}</select></label><label className={labelClass}>Bloom<select className={inputClass} value={activity.bloom} onChange={(event) => update('bloom', event.target.value)}>{['LOT · Remember','LOT · Understand','LOT · Apply','HOT · Analyse','HOT · Evaluate','HOT · Create'].map((item) => <option key={item}>{item}</option>)}</select></label><label className={labelClass}>Difficulty<select className={inputClass} value={activity.difficulty} onChange={(event) => update('difficulty', event.target.value)}>{['Easy','Medium','Hard','Challenge'].map((item) => <option key={item}>{item}</option>)}</select></label></div>
              <label className={labelClass}>Learning objective<input className={inputClass} value={activity.objective} onChange={(event) => update('objective', event.target.value)} /></label>
            </div>
          </details>

          <details className={sectionClass} open>
            <summary className="cursor-pointer px-4 py-3 font-bold">2 · Activity Type, Content &amp; Excel/CSV</summary>
            <div className="grid gap-3 border-t border-slate-200 p-4">
              <label className={labelClass}>Activity type<select className={inputClass} value={activity.activityType} onChange={(event) => changeType(event.target.value as ActivityType)}>{ACTIVITY_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.label}</option>)}</select></label>
              <p className="text-xs text-slate-600"><b className="text-blue-800">Row format:</b> {template.format}</p>
              <nav className="flex border-b border-slate-300" aria-label="Activity content view">
                {([['table', 'Table'], ['raw', 'Raw text'], ['excel', 'Excel / CSV']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setDataView(value)} className={`border-b-2 px-4 py-2 text-xs font-bold ${dataView === value ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
              </nav>
              {dataView === 'table' ? <div className="grid gap-2">
                <div className="max-h-80 overflow-auto border border-slate-300">
                  <table className="w-full border-collapse text-xs"><thead className="sticky top-0 z-10 bg-slate-100"><tr><th className="w-9 border-b border-r border-slate-300 p-2 text-slate-500">#</th>{tableHeaders.map((header) => <th key={header} className="min-w-32 border-b border-r border-slate-300 p-2 text-left font-bold text-slate-600">{header}</th>)}<th className="w-10 border-b border-slate-300" /></tr></thead>
                    <tbody>{tableRows.map((row, rowIndex) => <tr key={rowIndex}><td className="border-r border-t border-slate-200 p-2 text-center text-slate-400">{rowIndex + 1}</td>{tableHeaders.map((_, columnIndex) => <td key={columnIndex} className="border-r border-t border-slate-200 p-1"><input aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`} className="min-w-32 w-full bg-transparent px-2 py-1.5 outline-none focus:bg-blue-50" value={row[columnIndex] || ''} onChange={(event) => updateTableCell(rowIndex, columnIndex, event.target.value)} /></td>)}<td className="border-t border-slate-200 text-center"><button type="button" onClick={() => saveTableRows(tableRows.filter((_, index) => index !== rowIndex))} className="px-2 py-1 text-slate-400 hover:text-red-600" aria-label={`Delete row ${rowIndex + 1}`}>×</button></td></tr>)}</tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setTablePopupOpen(true)} className="flex items-center gap-1 text-xs font-bold text-blue-800"><Maximize2 size={13} /> Open in popup</button><button type="button" onClick={() => saveTableRows([...tableRows, Array(tableHeaders.length).fill('')])} className="text-xs font-bold text-blue-800">+ Add row</button><button type="button" onClick={() => void navigator.clipboard.writeText(tableRows.map((row) => row.join('\t')).join('\n'))} className="text-xs font-bold text-slate-600">Copy for Excel</button><button type="button" onClick={() => update('content', '')} className="text-xs font-bold text-red-600">Clear all</button></div>
              </div> : null}
              {dataView === 'raw' ? <label className={labelClass}>Raw activity content<textarea rows={10} className={`${textareaClass} font-mono text-xs`} value={activity.content} onChange={(event) => update('content', event.target.value)} /></label> : null}
              {dataView === 'excel' ? <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2"><div><p className="flex items-center gap-2 text-sm font-bold"><FileSpreadsheet size={16} className="text-emerald-700" /> Excel / CSV import</p><p className="mt-1 text-xs text-slate-500">Upload CSV/TSV or paste cells copied from Excel or Google Sheets.</p></div><button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:border-emerald-600"><Upload size={14} /> Choose file</button></div>
                <input ref={fileRef} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFile(file); event.currentTarget.value = ''; }} />
                <textarea rows={6} className={`${textareaClass} font-mono text-xs`} value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Copy rows from Excel or Google Sheets and paste here…" />
                <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => importRows(importText, true)} className="bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Add rows</button><button type="button" onClick={() => importRows(importText)} className="border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Replace all rows</button><span className="text-xs text-emerald-700">{importMessage}</span></div>
              </div> : null}
            </div>
          </details>

          <details className={sectionClass}>
            <summary className="cursor-pointer px-4 py-3 font-bold">3 · Scene &amp; Environment</summary>
            <div className="grid gap-3 border-t border-slate-200 p-4">
              <div className="grid grid-cols-3 gap-2" aria-label="Scene source">
                <button type="button" onClick={() => update('sceneSource', 'built-in')} className={`rounded-lg border px-2 py-2 text-xs font-bold ${activity.sceneSource === 'built-in' ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-300 bg-white text-slate-600'}`}>Built-in scene</button>
                <button type="button" onClick={() => setResourcePickerOpen(true)} className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-bold ${activity.sceneSource === 'resource' ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-300 bg-white text-slate-600'}`}><Images size={14} />Resource</button>
                <button type="button" onClick={() => update('sceneSource', 'external')} className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-bold ${activity.sceneSource === 'external' ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-300 bg-white text-slate-600'}`}><Link2 size={14} />External URL</button>
              </div>
              {activity.activityType === 'sim' ? <label className={labelClass}>Simulation model<select className={inputClass} value={activity.simulation} onChange={(event) => update('simulation', event.target.value as SimulationId)}>{Array.from(new Set(ACTIVITY_SIMULATIONS.map((simulation) => simulation.subject))).map((subject) => <optgroup key={subject} label={subject}>{ACTIVITY_SIMULATIONS.filter((simulation) => simulation.subject === subject).map((simulation) => <option key={simulation.id} value={simulation.id}>{simulation.label}</option>)}</optgroup>)}</select></label> : null}
              {activity.sceneSource === 'built-in' ? <label className={labelClass}>Scene<select className={inputClass} value={activity.scene} onChange={(event) => update('scene', event.target.value)}>{Array.from(new Set(ACTIVITY_SCENES.map((scene) => scene.subject))).map((subject) => <optgroup key={subject} label={subject}>{ACTIVITY_SCENES.filter((scene) => scene.subject === subject).map((scene) => <option key={scene.id} value={scene.id}>{scene.label}</option>)}</optgroup>)}</select></label> : null}
              {activity.sceneSource === 'resource' ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><b>{activity.sceneResourceName || 'No Resource selected'}</b><button type="button" onClick={() => setResourcePickerOpen(true)} className="ml-2 font-bold text-blue-800 underline">Choose another</button></div> : null}
              {activity.sceneSource === 'external' ? <><label className={labelClass}>External image, GIF, or video URL<input type="url" className={inputClass} value={activity.sceneUrl} onChange={(event) => update('sceneUrl', event.target.value)} placeholder="https://example.com/scene.jpg" /></label><label className={labelClass}>Media type<select className={inputClass} value={activity.sceneMediaType} onChange={(event) => update('sceneMediaType', event.target.value as ActivityDocument['sceneMediaType'])}><option value="image">Image or animated GIF</option><option value="video">Video</option></select></label></> : null}
              {activity.sceneSource !== 'built-in' ? <div><span className={labelClass}>Media display</span><div className="mt-1.5 grid grid-cols-2 gap-2"><button type="button" onClick={() => update('sceneMediaFit', 'contain')} className={`border px-3 py-2 text-xs font-bold ${activity.sceneMediaFit === 'contain' ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-300 text-slate-600'}`}>Fit · show full media</button><button type="button" onClick={() => update('sceneMediaFit', 'cover')} className={`border px-3 py-2 text-xs font-bold ${activity.sceneMediaFit === 'cover' ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-300 text-slate-600'}`}>Fill · crop edges</button></div></div> : null}
              {sceneMessage ? <p className="text-xs text-blue-800">{sceneMessage}</p> : null}
              <div className="grid grid-cols-2 gap-3"><label className={labelClass}>Layout<select className={inputClass} value={activity.layout} onChange={(event) => update('layout', event.target.value as ActivityDocument['layout'])}><option value="split">Split · scene left, activity right</option><option value="wide">Visual only · full width</option><option value="activity">Activity only · no visual</option></select></label><label className={labelClass}>Accent colour<input type="color" className={`${inputClass} p-1`} value={activity.accent} onChange={(event) => update('accent', event.target.value)} /></label></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={activity.ambientAnimation} onChange={(event) => update('ambientAnimation', event.target.checked)} className="h-5 w-5 accent-blue-700" /> Ambient scene animation</label>
              <ActivityScenePreview {...activity} />
            </div>
          </details>

          <details className={sectionClass}>
            <summary className="cursor-pointer px-4 py-3 font-bold">4 · Rules, Timing &amp; Scoring</summary>
            <div className="grid gap-3 border-t border-slate-200 p-4">
              <div className="grid grid-cols-3 gap-3"><label className={labelClass}>Timer / item<input type="number" min="0" className={inputClass} value={activity.timer} onChange={(event) => update('timer', Number(event.target.value))} /></label><label className={labelClass}>Correct points<input type="number" className={inputClass} value={activity.points} onChange={(event) => update('points', Number(event.target.value))} /></label><label className={labelClass}>Negative marks<input type="number" min="0" className={inputClass} value={activity.negativeMarks} onChange={(event) => update('negativeMarks', Number(event.target.value))} /></label></div>
              <label className={labelClass}>Mode<select className={inputClass} value={activity.mode} onChange={(event) => update('mode', event.target.value)}>{['Whole class (teacher-led)','Team vs Team','Individual practice'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className={labelClass}>Teams<input className={inputClass} value={activity.teams} onChange={(event) => update('teams', event.target.value)} /></label>
              <div className="grid grid-cols-2 gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={activity.shuffle} onChange={(event) => update('shuffle', event.target.checked)} className="h-5 w-5 accent-blue-700" /> Shuffle items</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={activity.instantReveal} onChange={(event) => update('instantReveal', event.target.checked)} className="h-5 w-5 accent-blue-700" /> Instant reveal</label></div>
            </div>
          </details>

          <details className={sectionClass}>
            <summary className="cursor-pointer px-4 py-3 font-bold">5 · Teacher Panel &amp; Misconceptions</summary>
            <div className="grid gap-3 border-t border-slate-200 p-4"><label className={labelClass}>Teacher notes<textarea rows={4} className={textareaClass} value={activity.teacherNotes} onChange={(event) => update('teacherNotes', event.target.value)} /></label><label className={labelClass}>Misconceptions · wrong idea | correction<textarea rows={4} className={textareaClass} value={activity.misconceptions} onChange={(event) => update('misconceptions', event.target.value)} /></label></div>
          </details>
        </div>
      </aside>

      <section className="grid min-h-0 place-items-center overflow-hidden bg-slate-100 p-5">
        <ActivityLivePreview activity={activity} />
        {tablePopupOpen ? <ActivityTablePopup headers={tableHeaders} rows={tableRows} format={template.format} activityLabel={template.label} onChangeCell={updateTableCell} onSaveRows={saveTableRows} onClose={() => setTablePopupOpen(false)} /> : null}
      </section>
    </section>
  </main>{resourcePickerOpen ? <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-5 backdrop-blur-sm"><section className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 px-5 py-3"><div><h2 className="font-bold text-slate-950">Choose a scene Resource</h2><p className="text-xs text-slate-500">Images, GIF animations, and videos can be embedded into the exported Activity.</p></div><button type="button" onClick={() => setResourcePickerOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close Resource picker"><X size={20} /></button></header><div className="min-h-0 flex-1 overflow-auto"><ResourceLibrary mode="picker" allowedTypes={['image', 'animation', 'video']} onPick={(resource, version) => void chooseSceneResource(resource, version)} /></div>{sceneLoading ? <div className="absolute inset-0 grid place-items-center bg-white/80"><span className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white"><LoaderCircle size={18} className="animate-spin" />Preparing scene…</span></div> : null}</section></div> : null}</>;
}
