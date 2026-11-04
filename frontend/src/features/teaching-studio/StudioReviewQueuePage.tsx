import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Eye, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorDetails } from '@/lib/api';
import { listStudioLibrarySessions } from './api/studioSessionLibraryApi';
import type { StudioLibrarySession, StudioSessionStatus } from './api/studioSessionLibraryApi';
import StudioShell from './components/StudioShell';

const tabs: Array<{ status: StudioSessionStatus; label: string; icon: typeof Clock3 }> = [
  { status: 'submitted', label: 'Awaiting review', icon: Clock3 },
  { status: 'approved', label: 'Ready to publish', icon: CheckCircle2 },
  { status: 'published', label: 'Published', icon: Radio },
];

export default function StudioReviewQueuePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StudioSessionStatus>('submitted');
  const [sessions, setSessions] = useState<StudioLibrarySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    setLoading(true); setError('');
    listStudioLibrarySessions(status).then(setSessions).catch((requestError) => setError(getApiErrorDetails(requestError).message)).finally(() => setLoading(false));
  }, [status]);
  return <StudioShell title="Session Review & Publishing" subtitle="Review submitted content, approve it, then publish an immutable release.">
    <div className="flex flex-wrap gap-2">{tabs.map(({ status: itemStatus, label, icon: Icon }) => <button key={itemStatus} type="button" onClick={() => setStatus(itemStatus)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${status === itemStatus ? 'bg-blue-900 text-white' : 'border bg-white text-slate-700'}`}><Icon size={16} />{label}</button>)}</div>
    {loading && <div className="mt-5 rounded-xl border bg-white p-10 text-center text-sm text-slate-500">Loading review queue…</div>}
    {!loading && error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!loading && !error && sessions.length === 0 && <div className="mt-5 rounded-xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">No Sessions in this stage.</div>}
    <div className="mt-5 space-y-3">{sessions.map((session) => <article key={session.id} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase text-blue-900">{session.program_name} · Grade {session.grade_number} · {session.subject_name}</p><h2 className="mt-1 font-semibold text-slate-900">Session {session.session_number}: {session.title}</h2><p className="mt-1 text-sm text-slate-600">Chapter {session.chapter_number}: {session.chapter_name} · {session.screen_count} Screens · Revision {session.revision_no}</p></div>
      <button type="button" onClick={() => navigate(`/studio/review/${session.id}`)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"><Eye size={16} />{status === 'submitted' ? 'Review Session' : status === 'approved' ? 'Review & publish' : 'View release status'}</button>
    </article>)}</div>
  </StudioShell>;
}
