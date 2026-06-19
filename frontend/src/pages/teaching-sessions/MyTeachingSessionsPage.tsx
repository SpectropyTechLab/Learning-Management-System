import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import StatusBadge from '@/features/teaching-sessions/components/StatusBadge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type { TeachingSession } from '@/features/teaching-sessions/types';

type UpdateFormState = {
  status_submitted: 'completed' | 'partially_completed' | 'not_completed';
  completion_percentage: string;
  actual_date: string;
  topics_covered: string;
  pending_topics: string;
  reason_code: string;
  remarks: string;
};

const formatIndianDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date).replace(/\//g, '-');
};

const createDefaultForm = (session: TeachingSession): UpdateFormState => ({
  status_submitted: session.status === 'partially_completed' ? 'partially_completed' : session.status === 'not_completed' ? 'not_completed' : 'completed',
  completion_percentage: String(session.completion_percentage ?? 100),
  actual_date: session.actual_date || '',
  topics_covered: session.topics_covered || '',
  pending_topics: session.pending_topics || '',
  reason_code: session.reason_code || '',
  remarks: session.remarks || '',
});

export default function MyTeachingSessionsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
  const [forms, setForms] = useState<Record<number, UpdateFormState>>({});
  const [savingSessionId, setSavingSessionId] = useState<number | null>(null);

  const getDisplayStatus = (session: TeachingSession) => (session.is_expired ? 'expired' : session.status);

  const loadSessions = async () => {
    try {
      const data = await teachingSessionsApi.listMyTeachingSessions(status ? { status } : undefined);
      setSessions(data);
      setForms((current) => {
        const next = { ...current };
        data.forEach((session) => {
          if (!next[session.id]) {
            next[session.id] = createDefaultForm(session);
          }
        });
        return next;
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load assigned teaching sessions');
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const grades = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.grade_label).filter(Boolean))),
    [sessions]
  );
  const subjects = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.subject_label).filter(Boolean))),
    [sessions]
  );

  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) => {
        if (gradeFilter && session.grade_label !== gradeFilter) return false;
        if (subjectFilter && session.subject_label !== subjectFilter) return false;
        return true;
      }),
    [sessions, gradeFilter, subjectFilter]
  );
  const teacherDisplayName = useMemo(
    () => sessions.find((session) => session.teacher_name)?.teacher_name || user?.full_name || user?.email || 'Teacher',
    [sessions, user]
  );

  const updateForm = (sessionId: number, key: keyof UpdateFormState, value: string) => {
    setForms((current) => ({
      ...current,
      [sessionId]: {
        ...current[sessionId],
        [key]: value,
      },
    }));
  };

  const handleSubmitUpdate = async (session: TeachingSession) => {
    const form = forms[session.id];
    if (!form || session.is_expired) return;

    try {
      setSavingSessionId(session.id);
      const result = await teachingSessionsApi.createTeachingSessionUpdate(session.id, {
        ...form,
        completion_percentage: Number(form.completion_percentage),
      });
      setSessions((current) => current.map((entry) => (entry.id === session.id ? result.session : entry)));
      setForms((current) => ({
        ...current,
        [session.id]: createDefaultForm(result.session),
      }));
      toast.success('Daily update submitted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit teaching update');
    } finally {
      setSavingSessionId(null);
    }
  };

  const handleDownloadLessonPlan = async (session: TeachingSession) => {
    try {
      await teachingSessionsApi.downloadMyTeachingSessionLessonPlan(
        session.id,
        session.lesson_plan_file_name || undefined
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to download lesson plan');
    }
  };

  return (
    <TeachingSessionsShell
      title="My Teaching Sessions"
      subtitle={<span className="text-yellow-600">Track your assigned sessions, download the correct lesson plan, and submit daily updates inline.</span>}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Status filter" className="rounded-full border border-slate-200 px-3 py-2 text-xs" />
          <button type="button" onClick={loadSessions} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            Refresh
          </button>
        </div>
      }
    >
      <SectionCard title="Teacher Session Tracker">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Teacher Name</div>
              <div className="mt-2 font-semibold text-slate-900">{teacherDisplayName}</div>
            </div>
            <label className="text-sm text-slate-600">
              Grade
              <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">All grades</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Subject
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredSessions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No sessions assigned right now.
              </div>
            )}
            {filteredSessions.map((session) => {
              const form = forms[session.id] ?? createDefaultForm(session);
              const isExpanded = expandedSessionId === session.id;
              return (
                <div key={session.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{session.session_label}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatIndianDate(session.planned_date)}</div>
                    </div>
                    <StatusBadge status={getDisplayStatus(session)} />
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div><span className="font-medium text-slate-900">Chapter:</span> {session.chapter_label || '-'}</div>
                    <div><span className="font-medium text-slate-900">Topic:</span> {session.topic_label || '-'}</div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {session.lesson_plan_file_storage_path ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadLessonPlan(session)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-[#073b8a]"
                      >
                        {session.lesson_plan_file_name ? 'Download' : 'View'}
                      </button>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-center text-xs text-slate-400">
                        No lesson plan
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                      className="rounded-xl bg-[#073b8a] px-3 py-2 text-xs font-semibold text-white"
                    >
                      {isExpanded ? 'Close' : 'Update'}
                    </button>
                  </div>
                  {isExpanded ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      {session.is_expired ? (
                        <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                          This session is expired and no longer accepts daily updates.
                        </div>
                      ) : null}
                      <div className="mt-3 space-y-3">
                        <select value={form.status_submitted} onChange={(e) => updateForm(session.id, 'status_submitted', e.target.value)} disabled={session.is_expired} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                          <option value="completed">Completed</option>
                          <option value="partially_completed">Partially Completed</option>
                          <option value="not_completed">Not Completed</option>
                        </select>
                        <input value={form.completion_percentage} onChange={(e) => updateForm(session.id, 'completion_percentage', e.target.value)} disabled={session.is_expired} placeholder="Completion %" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <input type="date" value={form.actual_date} onChange={(e) => updateForm(session.id, 'actual_date', e.target.value)} disabled={session.is_expired} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <textarea value={form.topics_covered} onChange={(e) => updateForm(session.id, 'topics_covered', e.target.value)} disabled={session.is_expired} rows={2} placeholder="Topics Covered" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <textarea value={form.pending_topics} onChange={(e) => updateForm(session.id, 'pending_topics', e.target.value)} disabled={session.is_expired} rows={2} placeholder="Pending Topics" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <input value={form.reason_code} onChange={(e) => updateForm(session.id, 'reason_code', e.target.value)} disabled={session.is_expired} placeholder="Reason Code" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <textarea value={form.remarks} onChange={(e) => updateForm(session.id, 'remarks', e.target.value)} disabled={session.is_expired} rows={2} placeholder="Remarks" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <button type="button" onClick={() => handleSubmitUpdate(session)} disabled={session.is_expired || savingSessionId === session.id} className="w-full rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                          {savingSessionId === session.id ? 'Saving...' : 'Submit Daily Update'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Session</th>
                    <th className="px-3 py-2 text-left">Chapter</th>
                    <th className="px-3 py-2 text-left">Topic</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Lesson Plan View</th>
                    <th className="px-3 py-2 text-left">Submit Daily Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredSessions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-slate-500">
                        No sessions assigned right now.
                      </td>
                    </tr>
                  )}
                  {filteredSessions.map((session) => {
                    const form = forms[session.id] ?? createDefaultForm(session);
                    const isExpanded = expandedSessionId === session.id;
                    return (
                      <Fragment key={session.id}>
                        <tr key={session.id}>
                          <td className="px-3 py-2">{formatIndianDate(session.planned_date)}</td>
                          <td className="px-3 py-2 font-medium text-slate-900">{session.session_label}</td>
                          <td className="px-3 py-2">{session.chapter_label || '-'}</td>
                          <td className="px-3 py-2">{session.topic_label || '-'}</td>
                          <td className="px-3 py-2">
                            <StatusBadge status={getDisplayStatus(session)} />
                          </td>
                          <td className="px-3 py-2">
                            {session.lesson_plan_file_storage_path ? (
                              <button type="button" onClick={() => handleDownloadLessonPlan(session)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-[#073b8a]">
                                {session.lesson_plan_file_name ? 'Download' : 'View'}
                              </button>
                            ) : (
                              <span className="text-slate-400">No lesson plan</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => setExpandedSessionId(isExpanded ? null : session.id)} className="rounded-full bg-[#073b8a] px-3 py-1 text-xs font-semibold text-white">
                              {isExpanded ? 'Close' : 'Update'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr>
                            <td colSpan={7} className="bg-slate-50 px-3 py-4">
                              {session.is_expired ? (
                                <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                                  This session is expired and no longer accepts daily updates.
                                </div>
                              ) : null}
                              <div className="grid gap-3 md:grid-cols-3">
                                <select value={form.status_submitted} onChange={(e) => updateForm(session.id, 'status_submitted', e.target.value)} disabled={session.is_expired} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                  <option value="completed">Completed</option>
                                  <option value="partially_completed">Partially Completed</option>
                                  <option value="not_completed">Not Completed</option>
                                </select>
                                <input value={form.completion_percentage} onChange={(e) => updateForm(session.id, 'completion_percentage', e.target.value)} disabled={session.is_expired} placeholder="Completion %" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                                <input type="date" value={form.actual_date} onChange={(e) => updateForm(session.id, 'actual_date', e.target.value)} disabled={session.is_expired} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                                <textarea value={form.topics_covered} onChange={(e) => updateForm(session.id, 'topics_covered', e.target.value)} disabled={session.is_expired} rows={2} placeholder="Topics Covered" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-3" />
                                <textarea value={form.pending_topics} onChange={(e) => updateForm(session.id, 'pending_topics', e.target.value)} disabled={session.is_expired} rows={2} placeholder="Pending Topics" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-3" />
                                <input value={form.reason_code} onChange={(e) => updateForm(session.id, 'reason_code', e.target.value)} disabled={session.is_expired} placeholder="Reason Code" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                                <textarea value={form.remarks} onChange={(e) => updateForm(session.id, 'remarks', e.target.value)} disabled={session.is_expired} rows={2} placeholder="Remarks" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
                              </div>
                              <div className="mt-3 flex justify-end">
                                <button type="button" onClick={() => handleSubmitUpdate(session)} disabled={session.is_expired || savingSessionId === session.id} className="rounded-xl bg-[#073b8a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                                  {savingSessionId === session.id ? 'Saving...' : 'Submit Daily Update'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SectionCard>
    </TeachingSessionsShell>
  );
}
