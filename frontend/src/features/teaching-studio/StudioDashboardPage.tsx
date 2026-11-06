import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorDetails } from '@/lib/api';
import { listPublishedStudioSessions } from './api/studioDashboardApi';
import type { PublishedStudioSession } from './api/studioDashboardApi';
import StudioShell from './components/StudioShell';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function StudioDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthor = user?.role === 'super_admin' || user?.role === 'content_authorizer';
  const [published, setPublished] = useState<PublishedStudioSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { listPublishedStudioSessions().then(setPublished).catch((requestError) => setError(getApiErrorDetails(requestError).message)).finally(() => setLoading(false)); }, []);
  return <StudioShell title="Digital Studio" subtitle={isAuthor ? 'Plan, script and produce interactive classroom Sessions.' : 'Open published classroom Sessions.'}>
    <section><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Published Chapter content</h2><p className="text-sm text-slate-600">Latest published Sessions available for review.</p></div></div>
      {loading && <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-slate-500">Loading published content…</div>}
      {!loading && error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!loading && !error && published.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center"><BookOpen className="mx-auto text-3xl text-slate-400" /><p className="mt-3 font-medium text-slate-700">No published Chapter content yet</p><p className="mt-1 text-sm text-slate-500">Published Sessions will appear here automatically.</p></div>}
      {!loading && !error && published.length > 0 && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{published.map((item) => <button key={item.release_id} type="button" onClick={() => navigate(isAuthor ? `/studio/editor/${item.session_id}` : `/studio/player/${item.session_id}/releases/${item.release_number}`)} className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/30"><p className="text-xs font-semibold uppercase tracking-wide text-blue-900">{item.program_name} · Grade {item.grade_number}</p><h3 className="mt-2 font-semibold text-slate-900">Chapter {item.chapter_number}: {item.chapter_name}</h3><p className="mt-1 text-sm text-slate-600">{item.subject_name} · {item.session_title}</p><p className="mt-3 text-xs text-slate-500">Release {item.release_number} · {item.screen_count} Screens</p></button>)}</div>}
    </section>
  </StudioShell>;
}
