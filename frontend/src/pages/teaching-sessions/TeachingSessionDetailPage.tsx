import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import StatusBadge from '@/features/teaching-sessions/components/StatusBadge';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type { TeachingSession, TeachingSessionUpdate } from '@/features/teaching-sessions/types';

export default function TeachingSessionDetailPage() {
  const { id } = useParams();
  const [session, setSession] = useState<TeachingSession | null>(null);
  const [updates, setUpdates] = useState<TeachingSessionUpdate[]>([]);
  const [form, setForm] = useState({
    status_submitted: 'completed',
    completion_percentage: '100',
    actual_date: '',
    topics_covered: '',
    pending_topics: '',
    reason_code: '',
    remarks: '',
  });

  const loadSession = async () => {
    if (!id) return;
    try {
      const data = await teachingSessionsApi.getMyTeachingSession(id);
      setSession(data.session);
      setUpdates(data.updates);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load teaching session');
    }
  };

  useEffect(() => {
    loadSession();
  }, [id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    try {
      const result = await teachingSessionsApi.createTeachingSessionUpdate(id, {
        ...form,
        completion_percentage: Number(form.completion_percentage),
      });
      setSession(result.session);
      setUpdates((current) => [result.update, ...current]);
      toast.success('Teaching session updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit teaching update');
    }
  };

  return (
    <TeachingSessionsShell
      title="Teaching Session Detail"
      subtitle="Review the assigned plan and submit daily execution updates."
    >
      <div className="space-y-6">
        <SectionCard title="Session Overview">
          {!session && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-500">Loading session details...</div>}
          {session && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">{session.session_label}</div>
                <div className="mt-1 text-sm text-slate-600">{session.planner_title || session.topic_label || session.chapter_label}</div>
                <div className="mt-2 text-xs text-slate-500">Planned: {session.planned_date} • {session.period_slot || 'Slot TBD'}</div>
              </div>
              <div className="flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Current Completion</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{session.completion_percentage}%</div>
                </div>
                <StatusBadge status={session.status} />
              </div>
            </div>
          )}
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title="Submit Daily Update">
            <form onSubmit={handleSubmit} className="space-y-3">
              <select value={form.status_submitted} onChange={(e) => setForm((current) => ({ ...current, status_submitted: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="completed">Completed</option>
                <option value="partially_completed">Partially Completed</option>
                <option value="not_completed">Not Completed</option>
              </select>
              <input value={form.completion_percentage} onChange={(e) => setForm((current) => ({ ...current, completion_percentage: e.target.value }))} placeholder="Completion Percentage" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input type="date" value={form.actual_date} onChange={(e) => setForm((current) => ({ ...current, actual_date: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={form.topics_covered} onChange={(e) => setForm((current) => ({ ...current, topics_covered: e.target.value }))} rows={3} placeholder="Topics Covered" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={form.pending_topics} onChange={(e) => setForm((current) => ({ ...current, pending_topics: e.target.value }))} rows={3} placeholder="Pending Topics" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.reason_code} onChange={(e) => setForm((current) => ({ ...current, reason_code: e.target.value }))} placeholder="Reason Code" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={form.remarks} onChange={(e) => setForm((current) => ({ ...current, remarks: e.target.value }))} rows={3} placeholder="Remarks" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button className="w-full rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white">Submit Update</button>
            </form>
          </SectionCard>

          <SectionCard title="Update History">
            <div className="space-y-3">
              {updates.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-500">No updates submitted yet.</div>}
              {updates.map((update) => (
                <div key={update.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={update.status_submitted} />
                    <div className="text-xs text-slate-500">{new Date(update.created_at).toLocaleString()}</div>
                  </div>
                  <div className="mt-3 text-sm text-slate-700">Completion: {update.completion_percentage}%</div>
                  {update.topics_covered ? <div className="mt-2 text-sm text-slate-600">Covered: {update.topics_covered}</div> : null}
                  {update.pending_topics ? <div className="mt-1 text-sm text-slate-600">Pending: {update.pending_topics}</div> : null}
                  {update.remarks ? <div className="mt-1 text-sm text-slate-600">Remarks: {update.remarks}</div> : null}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </TeachingSessionsShell>
  );
}
