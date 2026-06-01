import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/hooks/useAuth';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import StatsGrid from '@/features/teaching-sessions/components/StatsGrid';
import StatusBadge from '@/features/teaching-sessions/components/StatusBadge';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type { TeachingAnalyticsSummary, TeachingSession } from '@/features/teaching-sessions/types';
import api from '@/lib/api';

type SchoolOption = {
  id: number;
  name: string;
  school_code?: string | null;
};

type ProgramOption = {
  id: number;
  name: string;
  code?: string | null;
};

const emptySummary: TeachingAnalyticsSummary = {
  total_sessions: 0,
  completed_sessions: 0,
  partial_sessions: 0,
  not_completed_sessions: 0,
  update_pending_sessions: 0,
  lagging_sessions: 0,
  average_completion_percentage: 0,
};

const formatIndianDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
};

export default function TeachingSessionAnalyticsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    client_id: '',
    school_id: '',
    program_id: '',
    date_from: '',
    date_to: '',
  });
  const [summary, setSummary] = useState<TeachingAnalyticsSummary>(emptySummary);
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [programsLoading, setProgramsLoading] = useState(false);

  const loadFilterOptions = async () => {
    try {
      const requests = [];

      if (user?.role !== 'teacher') {
        setSchoolsLoading(true);
        requests.push(
          api.get<SchoolOption[]>('/org/schools').then((res) => {
            setSchools(res.data);
          })
        );
      }

      setProgramsLoading(true);
      requests.push(
        teachingSessionsApi.listPrograms().then((data) => {
          setPrograms(data);
        })
      );

      await Promise.all(requests);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load analytics filter options');
    } finally {
      setSchoolsLoading(false);
      setProgramsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );
      const [summaryData, sessionsData] = await Promise.all([
        teachingSessionsApi.getAnalytics(params),
        user?.role === 'teacher'
          ? teachingSessionsApi.listMyTeachingSessions(params)
          : teachingSessionsApi.listTeachingSessions(params),
      ]);
      setSummary(summaryData);
      setSessions(sessionsData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load analytics');
    }
  };

  useEffect(() => {
    loadFilterOptions();
    loadAnalytics();
  }, []);

  const analyticsTitle = user?.role === 'teacher'
    ? 'My Teaching Analytics'
    : user?.role === 'school_owner'
      ? 'School Teaching Analytics'
      : 'Teaching Session Analytics';

  const analyticsSubtitle = user?.role === 'teacher'
    ? 'View your own completion trends and assigned session status.'
    : user?.role === 'school_owner'
      ? 'Monitor school-level execution without disturbing current workflows.'
      : 'Review client-wide tracker performance and live session status.';

  return (
    <TeachingSessionsShell
      title={analyticsTitle}
      subtitle={analyticsSubtitle}
      actions={<button type="button" onClick={loadAnalytics} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Refresh</button>}
    >
      <div className="space-y-6">
        <SectionCard title="Analytics Filters">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {user?.role === 'super_admin' ? (
              <input placeholder="Client ID" value={filters.client_id} onChange={(e) => setFilters((current) => ({ ...current, client_id: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            ) : null}
            {user?.role !== 'teacher' ? (
              <select
                value={filters.school_id}
                onChange={(e) => setFilters((current) => ({ ...current, school_id: e.target.value }))}
                disabled={schoolsLoading}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">{schoolsLoading ? 'Loading schools...' : 'All Schools'}</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.school_code ? `${school.name} (${school.school_code})` : school.name}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={filters.program_id}
              onChange={(e) => setFilters((current) => ({ ...current, program_id: e.target.value }))}
              disabled={programsLoading}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">{programsLoading ? 'Loading programs...' : 'All Programs'}</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code ? `${program.name} (${program.code})` : program.name}
                </option>
              ))}
            </select>
            <label className="text-sm text-slate-600">
              Date From
              <input type="date" value={filters.date_from} onChange={(e) => setFilters((current) => ({ ...current, date_from: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Date To
              <input type="date" value={filters.date_to} onChange={(e) => setFilters((current) => ({ ...current, date_to: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>
          <button type="button" onClick={loadAnalytics} className="mt-4 rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white">Apply Filters</button>
        </SectionCard>

        <StatsGrid summary={summary} />

        <SectionCard title="Session Status Table">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Session</th>
                    <th className="px-3 py-2 text-left">Planned Date</th>
                    <th className="px-3 py-2 text-left">School</th>
                    <th className="px-3 py-2 text-left">Teacher</th>
                    <th className="px-3 py-2 text-left">Completion</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sessions.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-4 text-slate-500">No sessions found for analytics filters.</td></tr>
                  )}
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td className="px-3 py-2">{session.session_label}</td>
                      <td className="px-3 py-2">{formatIndianDate(session.planned_date)}</td>
                      <td className="px-3 py-2">{session.school_name || '-'}</td>
                      <td className="px-3 py-2">{session.teacher_name || '-'}</td>
                      <td className="px-3 py-2">{session.completion_percentage}%</td>
                      <td className="px-3 py-2"><StatusBadge status={session.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      </div>
    </TeachingSessionsShell>
  );
}
