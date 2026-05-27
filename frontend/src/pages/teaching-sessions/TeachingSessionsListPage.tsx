import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import StatusBadge from '@/features/teaching-sessions/components/StatusBadge';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type { TeachingSession } from '@/features/teaching-sessions/types';

export default function TeachingSessionsListPage() {
  const [filters, setFilters] = useState({
    school_id: '',
    program_id: '',
    teacher_user_id: '',
    status: '',
    date_from: '',
    date_to: '',
  });
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [assignment, setAssignment] = useState({
    school_id: '',
    batch_id: '',
    teacher_user_id: '',
    planned_date: '',
    period_slot: '',
    duration_minutes: '',
    remarks: '',
  });

  const loadSessions = async () => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );
      const data = await teachingSessionsApi.listTeachingSessions(params);
      setSessions(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load teaching sessions');
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const session = sessions.find((entry) => entry.id === selectedId);
    if (!session) return;
    setAssignment({
      school_id: String(session.school_id),
      batch_id: session.batch_id ? String(session.batch_id) : '',
      teacher_user_id: session.teacher_user_id ? String(session.teacher_user_id) : '',
      planned_date: session.planned_date,
      period_slot: session.period_slot || '',
      duration_minutes: session.duration_minutes ? String(session.duration_minutes) : '',
      remarks: session.remarks || '',
    });
  }, [selectedId, sessions]);

  const selectedSession = sessions.find((entry) => entry.id === selectedId) || null;

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSession) return;
    try {
      await teachingSessionsApi.updateTeachingSession(selectedSession.id, {
        school_id: Number(assignment.school_id),
        batch_id: assignment.batch_id ? Number(assignment.batch_id) : undefined,
        teacher_user_id: assignment.teacher_user_id ? Number(assignment.teacher_user_id) : undefined,
        planned_date: assignment.planned_date || undefined,
        period_slot: assignment.period_slot || undefined,
        duration_minutes: assignment.duration_minutes ? Number(assignment.duration_minutes) : undefined,
        remarks: assignment.remarks || undefined,
      });
      toast.success('Teaching session updated');
      await loadSessions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update teaching session');
    }
  };

  return (
    <TeachingSessionsShell
      title="Live Teaching Sessions"
      subtitle="Review generated sessions and adjust assignments without touching existing dashboards."
      actions={<button type="button" onClick={loadSessions} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Refresh</button>}
    >
      <div className="space-y-6">
        <SectionCard title="Filters">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <input placeholder="School ID" value={filters.school_id} onChange={(e) => setFilters((current) => ({ ...current, school_id: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="Program ID" value={filters.program_id} onChange={(e) => setFilters((current) => ({ ...current, program_id: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="Teacher ID" value={filters.teacher_user_id} onChange={(e) => setFilters((current) => ({ ...current, teacher_user_id: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="Status" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input type="date" value={filters.date_from} onChange={(e) => setFilters((current) => ({ ...current, date_from: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input type="date" value={filters.date_to} onChange={(e) => setFilters((current) => ({ ...current, date_to: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button type="button" onClick={loadSessions} className="mt-4 rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white">Apply Filters</button>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Session List">
            <div className="space-y-3">
              {sessions.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-500">No sessions found for the current filters.</div>}
              {sessions.map((session) => (
                <button
                  type="button"
                  key={session.id}
                  onClick={() => setSelectedId(session.id)}
                  className={`w-full rounded-2xl border p-4 text-left ${selectedId === session.id ? 'border-[#073b8a] bg-sky-50' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{session.session_label} • {session.planner_title || session.chapter_label || session.topic_label}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Program {session.program_id} • School {session.school_id} • Teacher {session.teacher_user_id || '-'} • {session.planned_date}
                      </div>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Assignment Editor" subtitle="Update only the selected live session.">
            {!selectedSession && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-500">Select a session from the left to edit assignment details.</div>}
            {selectedSession && (
              <form onSubmit={handleUpdate} className="space-y-3">
                <input placeholder="School ID" value={assignment.school_id} onChange={(e) => setAssignment((current) => ({ ...current, school_id: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input placeholder="Batch ID" value={assignment.batch_id} onChange={(e) => setAssignment((current) => ({ ...current, batch_id: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input placeholder="Teacher User ID" value={assignment.teacher_user_id} onChange={(e) => setAssignment((current) => ({ ...current, teacher_user_id: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input type="date" value={assignment.planned_date} onChange={(e) => setAssignment((current) => ({ ...current, planned_date: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input placeholder="Period / Slot" value={assignment.period_slot} onChange={(e) => setAssignment((current) => ({ ...current, period_slot: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input placeholder="Duration Minutes" value={assignment.duration_minutes} onChange={(e) => setAssignment((current) => ({ ...current, duration_minutes: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <textarea placeholder="Remarks" value={assignment.remarks} onChange={(e) => setAssignment((current) => ({ ...current, remarks: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <button className="w-full rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white">Save Assignment</button>
              </form>
            )}
          </SectionCard>
        </div>
      </div>
    </TeachingSessionsShell>
  );
}
