import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, MonitorPlay, ScrollText, Send, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import { SCREEN_SCRIPT_FIELDS, SESSION_PLAN_FIELDS, studioDocumentsApi } from './api/studioDocumentsApi';
import type { ScreenScriptRow, StudioDocumentRecord } from './api/studioDocumentsApi';
import { listStudioLibrarySessions } from './api/studioSessionLibraryApi';
import type { StudioLibrarySession } from './api/studioSessionLibraryApi';
import { listStudioScreens } from './api/studioScreensApi';
import { getStudioWorkflowStatus, publishStudioSession, reviewStudioSession, workflowError } from './api/studioWorkflowApi';
import type { StudioWorkflowStatus } from './api/studioWorkflowApi';
import type { StudioScreenList } from './types';
import BlankScreenCanvas from './components/BlankScreenCanvas';
import StudioShell from './components/StudioShell';

type Tab = 'plan' | 'scripts' | 'screens';

export default function StudioSessionReviewPage() {
  const navigate = useNavigate();
  const sessionId = Number(useParams<{ sessionId: string }>().sessionId);
  const [session, setSession] = useState<StudioLibrarySession | null>(null);
  const [workflow, setWorkflow] = useState<StudioWorkflowStatus | null>(null);
  const [plan, setPlan] = useState<StudioDocumentRecord | null>(null);
  const [scripts, setScripts] = useState<ScreenScriptRow[]>([]);
  const [screens, setScreens] = useState<StudioScreenList>({ session_revision_no: 0, screens: [] });
  const [selectedScreenId, setSelectedScreenId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('plan');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'approve' | 'reject' | 'publish' | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!Number.isInteger(sessionId) || sessionId <= 0) { setError('Invalid Session ID.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [allSessions, workflowStatus, planDocument, scriptRows, screenRows] = await Promise.all([
        listStudioLibrarySessions(), getStudioWorkflowStatus(sessionId), studioDocumentsApi.sessionPlan(sessionId),
        studioDocumentsApi.screenScripts(sessionId), listStudioScreens(sessionId),
      ]);
      const current = allSessions.find((item) => item.id === sessionId);
      if (!current) throw new Error('Session was not found in your Studio access.');
      setSession(current); setWorkflow(workflowStatus); setPlan(planDocument); setScripts(scriptRows); setScreens(screenRows);
      setSelectedScreenId((selected) => selected && screenRows.screens.some((screen) => screen.id === selected) ? selected : screenRows.screens[0]?.id ?? null);
      setComment(workflowStatus.approval_comment || '');
    } catch (requestError) { setError(getApiErrorDetails(requestError).message); }
    finally { setLoading(false); }
  }, [sessionId]);
  useEffect(() => { void load(); }, [load]);
  const selectedScreen = useMemo(() => screens.screens.find((screen) => screen.id === selectedScreenId) || null, [screens.screens, selectedScreenId]);

  const review = async (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !comment.trim()) { toast.error('Add a reason before rejecting the Session.'); return; }
    setAction(decision === 'approved' ? 'approve' : 'reject');
    try {
      await reviewStudioSession(sessionId, decision, comment.trim());
      toast.success(decision === 'approved' ? 'Session approved and ready to publish.' : 'Session returned with review feedback.');
      await load();
    } catch (requestError) { const details = workflowError(requestError); toast.error(details.problems[0]?.message || details.message); }
    finally { setAction(null); }
  };
  const publish = async () => {
    setAction('publish');
    try { await publishStudioSession(sessionId); toast.success('Session published successfully.'); await load(); }
    catch (requestError) { const details = workflowError(requestError); toast.error(details.problems[0]?.message || details.message); }
    finally { setAction(null); }
  };

  return <StudioShell title="Review Session" subtitle={session ? `${session.subject_name} · ${session.title}` : 'Read-only content review'} actions={<button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"><ArrowLeft size={16} />Back</button>}>
    {loading && <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">Loading Session review…</div>}
    {!loading && error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!loading && !error && session && workflow && <>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-900">{session.program_name} · Grade {session.grade_number} · {session.subject_name}</p><h2 className="mt-2 text-xl font-bold text-slate-900">Session {session.session_number}: {session.title}</h2><p className="mt-1 text-sm text-slate-600">Chapter {session.chapter_number}: {session.chapter_name} / {session.topic_name} / {session.subtopic_name}</p></div><div className="text-right"><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize text-slate-700">{workflow.status}</span><p className="mt-2 text-xs text-slate-500">Revision {workflow.revision_no} · {workflow.validation.screen_count} Screens</p></div></div>
        {!workflow.validation.valid && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Content needs attention:</strong><ul className="mt-1 list-disc pl-5">{workflow.validation.errors.map((problem) => <li key={`${problem.code}-${problem.screen_id || ''}`}>{problem.message}</li>)}</ul></div>}
      </section>
      <div className="mt-5 flex flex-wrap gap-2">{([
        ['plan', 'Session Plan', FileText], ['scripts', 'Screen Scripts', ScrollText], ['screens', 'Screens', MonitorPlay],
      ] as const).map(([value, label, Icon]) => <button key={value} type="button" onClick={() => setTab(value)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-blue-900 text-white' : 'border bg-white text-slate-700'}`}><Icon size={16} />{label}</button>)}</div>
      {tab === 'plan' && <section className="mt-4 space-y-4">{plan?.structured_content?.rows?.map((row, index) => <article key={index} className="rounded-xl border bg-white p-5 shadow-sm"><h3 className="font-semibold text-blue-900">Plan row {index + 1}</h3><dl className="mt-4 grid gap-4 md:grid-cols-2">{SESSION_PLAN_FIELDS.map(([key, label]) => <div key={key}><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{row[key] || '—'}</dd></div>)}</dl></article>)}{!plan?.structured_content?.rows?.length && <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No Session Plan is saved.</div>}</section>}
      {tab === 'scripts' && <section className="mt-4 space-y-4">{scripts.map((script) => <article key={script.screen_id} className="rounded-xl border bg-white p-5 shadow-sm"><h3 className="font-semibold text-blue-900">Screen {script.screen_number}: {script.title}</h3><dl className="mt-4 grid gap-4 md:grid-cols-2">{SCREEN_SCRIPT_FIELDS.map(([key, label]) => <div key={key}><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{script.content_json?.[key] || '—'}</dd></div>)}</dl></article>)}</section>}
      {tab === 'screens' && <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm"><div className="mb-4 flex flex-wrap gap-2">{screens.screens.map((screen) => <button key={screen.id} type="button" onClick={() => setSelectedScreenId(screen.id)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${selectedScreenId === screen.id ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Screen {screen.screen_number}</button>)}</div><div className="h-[min(65vh,680px)] overflow-hidden rounded-lg bg-slate-100"><BlankScreenCanvas screen={selectedScreen} loading={false} showGuides={false} previewMode /></div></section>}
      {workflow.status === 'submitted' && <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Review decision</h2><label className="mt-3 block text-sm font-semibold text-slate-700">Reviewer comment<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} placeholder="Optional for approval; required for rejection" className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-normal" /></label><div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" disabled={Boolean(action)} onClick={() => void review('rejected')} className="inline-flex items-center gap-2 rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"><XCircle size={16} />{action === 'reject' ? 'Rejecting…' : 'Reject with feedback'}</button><button type="button" disabled={!workflow.can_review || Boolean(action)} onClick={() => void review('approved')} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={16} />{action === 'approve' ? 'Approving…' : 'Approve Session'}</button></div></section>}
      {workflow.status === 'approved' && <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><div><h2 className="font-semibold text-emerald-900">Approved and ready to publish</h2><p className="mt-1 text-sm text-emerald-800">Publishing creates an immutable release for the viewer roles.</p></div><button type="button" disabled={!workflow.can_publish || Boolean(action)} onClick={() => void publish()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send size={16} />{action === 'publish' ? 'Publishing…' : 'Publish Session'}</button></section>}
      {workflow.status === 'published' && <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><h2 className="font-semibold">Session is published</h2><p className="mt-1 text-sm">The published immutable release is available to authorized viewer roles. Unpublish is intentionally not included.</p></section>}
    </>}
  </StudioShell>;
}
