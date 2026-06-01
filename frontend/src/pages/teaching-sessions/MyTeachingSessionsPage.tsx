import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import StatusBadge from '@/features/teaching-sessions/components/StatusBadge';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type { TeachingSession } from '@/features/teaching-sessions/types';

export default function MyTeachingSessionsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [sessions, setSessions] = useState<TeachingSession[]>([]);

  const getDisplayStatus = (session: TeachingSession) =>
    session.is_expired ? 'expired' : session.status;

  const loadSessions = async () => {
    try {
      const data = await teachingSessionsApi.listMyTeachingSessions(status ? { status } : undefined);
      setSessions(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load assigned teaching sessions');
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <TeachingSessionsShell
      title="My Teaching Sessions"
      subtitle={
        <span className="text-yellow-600">
          Track your assigned sessions and complete each daily update within 2 days of the planned date.
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Status filter" className="rounded-full border border-slate-200 px-3 py-2 text-xs" />
          <button type="button" onClick={loadSessions} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Refresh</button>
        </div>
      }
    >
      <SectionCard title="Assigned Sessions">
        <div className="space-y-3">
          {sessions.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-500">No sessions assigned right now.</div>}
          {sessions.map((session) => (
            <button
              type="button"
              key={session.id}
              onClick={() => navigate(`/teacher/teaching-sessions/${session.id}`)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{session.session_label} • {session.planner_title || session.topic_label || session.chapter_label}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {session.planned_date} • {session.period_slot || 'Slot TBD'} • Completion {session.completion_percentage}%
                  </div>
                  {session.is_expired ? (
                    <div className="mt-1 text-xs font-medium text-orange-600">
                      Session expired{session.expiry_date ? ` on ${session.expiry_date}` : ''}.
                    </div>
                  ) : null}
                </div>
                <StatusBadge status={getDisplayStatus(session)} />
              </div>
            </button>
          ))}
        </div>
      </SectionCard>
    </TeachingSessionsShell>
  );
}
