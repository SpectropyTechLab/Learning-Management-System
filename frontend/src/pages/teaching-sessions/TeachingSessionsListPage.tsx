import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import StatusBadge from '@/features/teaching-sessions/components/StatusBadge';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type { BatchOption, ProgramOption, SchoolMembership, TeachingSession } from '@/features/teaching-sessions/types';

type SchoolOption = {
  id: number;
  name: string;
  school_code?: string | null;
};

export default function TeachingSessionsListPage() {
  const { user } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(true);
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
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [filterTeachers, setFilterTeachers] = useState<SchoolMembership[]>([]);
  const [assignmentTeachers, setAssignmentTeachers] = useState<SchoolMembership[]>([]);
  const [assignmentBatches, setAssignmentBatches] = useState<BatchOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [filterTeachersLoading, setFilterTeachersLoading] = useState(false);
  const [assignmentTeachersLoading, setAssignmentTeachersLoading] = useState(false);
  const [assignmentBatchesLoading, setAssignmentBatchesLoading] = useState(false);

  const teacherOptions = filterTeachers.filter(
    (membership) =>
      membership.status === 'active' &&
      (membership.role_scope === 'teacher' || membership.role === 'teacher')
  );

  const assignmentTeacherOptions = assignmentTeachers.filter(
    (membership) =>
      membership.status === 'active' &&
      (membership.role_scope === 'teacher' || membership.role === 'teacher')
  );

  const activeAssignmentBatches = assignmentBatches.filter((batch) => batch.is_active !== false);

  const loadFilterOptions = async () => {
    try {
      setSchoolsLoading(true);
      setProgramsLoading(true);
      const [schoolsResponse, programsResponse] = await Promise.all([
        api.get<SchoolOption[]>('/org/schools'),
        teachingSessionsApi.listPrograms(user?.client_id),
      ]);
      setSchools(schoolsResponse.data);
      setPrograms(programsResponse);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load filter options');
    } finally {
      setSchoolsLoading(false);
      setProgramsLoading(false);
    }
  };

  const loadTeacherOptions = async (schoolId: string, setter: (value: SchoolMembership[]) => void, loadingSetter: (value: boolean) => void) => {
    if (!schoolId) {
      setter([]);
      loadingSetter(false);
      return;
    }

    try {
      loadingSetter(true);
      setter(await teachingSessionsApi.listSchoolMemberships(schoolId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load teacher options');
    } finally {
      loadingSetter(false);
    }
  };

  const loadAssignmentBatchOptions = async (schoolId: string) => {
    if (!schoolId) {
      setAssignmentBatches([]);
      setAssignmentBatchesLoading(false);
      return;
    }

    try {
      setAssignmentBatchesLoading(true);
      setAssignmentBatches(await teachingSessionsApi.listBatchOptions(schoolId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load batch options');
    } finally {
      setAssignmentBatchesLoading(false);
    }
  };

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
    loadFilterOptions();
    loadSessions();
  }, []);

  useEffect(() => {
    setFilters((current) => ({ ...current, teacher_user_id: '' }));
    loadTeacherOptions(filters.school_id, setFilterTeachers, setFilterTeachersLoading);
  }, [filters.school_id]);

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

  useEffect(() => {
    loadTeacherOptions(assignment.school_id, setAssignmentTeachers, setAssignmentTeachersLoading);
    loadAssignmentBatchOptions(assignment.school_id);
  }, [assignment.school_id]);

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
        <SectionCard
          title="Filters"
          actions={
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700"
              aria-expanded={filtersOpen}
              aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
            >
              {filtersOpen ? 'Hide' : 'Show'}
              <span className={`inline-block transition-transform ${filtersOpen ? 'rotate-180' : ''}`}>⌃</span>
            </button>
          }
        >
          {filtersOpen && (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <select value={filters.school_id} onChange={(e) => setFilters((current) => ({ ...current, school_id: e.target.value }))} disabled={schoolsLoading} className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm">
                  <option value="">{schoolsLoading ? 'Loading schools...' : 'All Schools'}</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.school_code ? `${school.name} (${school.school_code})` : school.name}
                    </option>
                  ))}
                </select>
                <select value={filters.program_id} onChange={(e) => setFilters((current) => ({ ...current, program_id: e.target.value }))} disabled={programsLoading} className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm">
                  <option value="">{programsLoading ? 'Loading programs...' : 'All Programs'}</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.code ? `${program.name} (${program.code})` : program.name}
                    </option>
                  ))}
                </select>
                <select value={filters.teacher_user_id} onChange={(e) => setFilters((current) => ({ ...current, teacher_user_id: e.target.value }))} disabled={!filters.school_id || filterTeachersLoading} className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm">
                  <option value="">{!filters.school_id ? 'Select a school first' : filterTeachersLoading ? 'Loading teachers...' : teacherOptions.length === 0 ? 'No teachers found' : 'All Teachers'}</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.user_id}>
                      {teacher.full_name || teacher.email || `Teacher ${teacher.user_id}`}
                    </option>
                  ))}
                </select>
                <select value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))} className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm">
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="partially_completed">Partially Completed</option>
                  <option value="not_completed">Not Completed</option>
                </select>
                <input type="date" value={filters.date_from} onChange={(e) => setFilters((current) => ({ ...current, date_from: e.target.value }))} className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                <input type="date" value={filters.date_to} onChange={(e) => setFilters((current) => ({ ...current, date_to: e.target.value }))} className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm" />
              </div>
              <button type="button" onClick={loadSessions} className="mt-4 w-full rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white md:w-auto">Apply Filters</button>
            </>
          )}
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
                <select value={assignment.school_id} onChange={(e) => setAssignment((current) => ({ ...current, school_id: e.target.value, batch_id: '', teacher_user_id: '' }))} disabled={schoolsLoading} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">{schoolsLoading ? 'Loading schools...' : 'Select a school'}</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.school_code ? `${school.name} (${school.school_code})` : school.name}
                    </option>
                  ))}
                </select>
                <select value={assignment.batch_id} onChange={(e) => setAssignment((current) => ({ ...current, batch_id: e.target.value }))} disabled={!assignment.school_id || assignmentBatchesLoading} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">{!assignment.school_id ? 'Select a school first' : assignmentBatchesLoading ? 'Loading batches...' : activeAssignmentBatches.length === 0 ? 'No batches found' : 'Select a batch'}</option>
                  {activeAssignmentBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.code ? `${batch.name} (${batch.code})` : batch.name}
                    </option>
                  ))}
                </select>
                <select value={assignment.teacher_user_id} onChange={(e) => setAssignment((current) => ({ ...current, teacher_user_id: e.target.value }))} disabled={!assignment.school_id || assignmentTeachersLoading} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">{!assignment.school_id ? 'Select a school first' : assignmentTeachersLoading ? 'Loading teachers...' : assignmentTeacherOptions.length === 0 ? 'No teachers found' : 'Select a teacher'}</option>
                  {assignmentTeacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.user_id}>
                      {teacher.full_name || teacher.email || `Teacher ${teacher.user_id}`}
                    </option>
                  ))}
                </select>
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
