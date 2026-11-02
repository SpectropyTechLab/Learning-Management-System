import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorDetails } from '@/lib/api';
import { listPublishedStudioSessions } from './api/studioDashboardApi';
import type { PublishedStudioSession } from './api/studioDashboardApi';
import StudioShell from './components/StudioShell';

export default function StudioDashboardPage() {
  const navigate = useNavigate();
  const [published, setPublished] = useState<PublishedStudioSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { listPublishedStudioSessions().then(setPublished).catch((requestError) => setError(getApiErrorDetails(requestError).message)).finally(() => setLoading(false)); }, []);
  return <StudioShell title="Digital Studio" subtitle="Plan, script and produce interactive classroom Sessions.">
    <section className="overflow-hidden rounded-xl bg-gradient-to-br from-[#0b285d] to-[#153d8a] p-8 text-white shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">Authoring workspace</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-bold">Build reusable curriculum into clear Session Plans, Screen Scripts and teaching Screens.</h2>
      <p className="mt-3 max-w-2xl text-blue-100">Published Chapter content appears below. Start a new workflow only when you need to create or revise content.</p>
      <button type="button" onClick={() => navigate('/content-authorizer/studio/curriculum')} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-blue-900 transition hover:bg-blue-50">Create Studio <ArrowRight size={18} /></button>
    </section>
    <section className="mt-6"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Published Chapter content</h2><p className="text-sm text-slate-600">Latest published Sessions available for review.</p></div></div>
      {loading && <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-slate-500">Loading published content…</div>}
      {!loading && error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!loading && !error && published.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center"><BookOpen className="mx-auto text-3xl text-slate-400" /><p className="mt-3 font-medium text-slate-700">No published Chapter content yet</p><p className="mt-1 text-sm text-slate-500">Published Sessions will appear here automatically.</p></div>}
      {!loading && !error && published.length > 0 && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{published.map((item) => <button key={item.release_id} type="button" onClick={() => navigate(`/content-authorizer/studio/editor/${item.session_id}`)} className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/30"><p className="text-xs font-semibold uppercase tracking-wide text-blue-900">{item.program_name} · Grade {item.grade_number}</p><h3 className="mt-2 font-semibold text-slate-900">Chapter {item.chapter_number}: {item.chapter_name}</h3><p className="mt-1 text-sm text-slate-600">{item.subject_name} · {item.session_title}</p><p className="mt-3 text-xs text-slate-500">Release {item.release_number} · {item.screen_count} Screens</p></button>)}</div>}
    </section>
  </StudioShell>;
}
