import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type { BatchOption, ProgramOption, SchoolMembership, TeacherTrackerPermission } from '@/features/teaching-sessions/types';

type SchoolOption = {
  id: number;
  name: string;
  school_code?: string | null;
};

export default function TeacherTrackerPermissionsPage() {
  const { user } = useAuth();
  const [clientId, setClientId] = useState('');
  const [teacherUserId, setTeacherUserId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [programId, setProgramId] = useState('');
  const [permissions, setPermissions] = useState<TeacherTrackerPermission[]>([]);
  const [canView, setCanView] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [teachers, setTeachers] = useState<SchoolMembership[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [programsLoading, setProgramsLoading] = useState(false);

  const teacherOptions = teachers.filter(
    (membership) =>
      membership.status === 'active' &&
      (membership.role_scope === 'teacher' || membership.role === 'teacher')
  );

  const activeBatches = batches.filter((batch) => batch.is_active !== false);

  const loadPermissions = async () => {
    try {
      const data = await teachingSessionsApi.listTeacherPermissions({
        client_id: clientId || undefined,
        teacher_user_id: teacherUserId || undefined,
      });
      setPermissions(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load tracker permissions');
    }
  };

  useEffect(() => {
    if (user?.client_id) {
      setClientId(String(user.client_id));
    }
    loadPermissions();
  }, [user?.client_id]);

  const loadFilterOptions = async () => {
    try {
      setSchoolsLoading(true);
      setProgramsLoading(true);
      const [schoolsResponse, programsResponse] = await Promise.all([
        api.get<SchoolOption[]>('/org/schools'),
        teachingSessionsApi.listPrograms(user?.client_id ?? undefined),
      ]);
      setSchools(schoolsResponse.data);
      setPrograms(programsResponse);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load grant access options');
    } finally {
      setSchoolsLoading(false);
      setProgramsLoading(false);
    }
  };

  const loadTeacherOptions = async (nextSchoolId: string) => {
    if (!nextSchoolId) {
      setTeachers([]);
      setTeachersLoading(false);
      return;
    }

    try {
      setTeachersLoading(true);
      setTeachers(await teachingSessionsApi.listSchoolMemberships(nextSchoolId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load teacher options');
    } finally {
      setTeachersLoading(false);
    }
  };

  const loadBatchOptions = async (nextSchoolId: string) => {
    if (!nextSchoolId) {
      setBatches([]);
      setBatchesLoading(false);
      return;
    }

    try {
      setBatchesLoading(true);
      setBatches(await teachingSessionsApi.listBatchOptions(nextSchoolId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load batch options');
    } finally {
      setBatchesLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, [user?.client_id]);

  useEffect(() => {
    setTeacherUserId('');
    setBatchId('');
    loadTeacherOptions(schoolId);
    loadBatchOptions(schoolId);
  }, [schoolId]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!teacherUserId) {
      toast.error('Teacher user id is required');
      return;
    }

    try {
      await teachingSessionsApi.createTeacherPermission({
        client_id: clientId ? Number(clientId) : undefined,
        teacher_user_id: Number(teacherUserId),
        school_id: schoolId ? Number(schoolId) : undefined,
        batch_id: batchId ? Number(batchId) : undefined,
        program_id: programId ? Number(programId) : undefined,
        can_view_tracker: canView,
        can_update_tracker: canUpdate,
      });
      toast.success('Tracker permission granted');
      await loadPermissions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to grant tracker permission');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await teachingSessionsApi.deleteTeacherPermission(id);
      toast.success('Tracker permission revoked');
      await loadPermissions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to revoke tracker permission');
    }
  };

  const formatScope = (permission: TeacherTrackerPermission) => {
    const parts = [];
    if (permission.school_name) parts.push(permission.school_name);
    if (permission.batch_name) parts.push(permission.batch_name);
    if (permission.program_name) {
      parts.push(
        permission.program_code
          ? `${permission.program_name} (${permission.program_code})`
          : permission.program_name
      );
    }
    return parts.length > 0 ? parts.join(' • ') : '-';
  };

  return (
    <TeachingSessionsShell
      title="Teacher Tracker Permissions"
      subtitle="Grant or revoke tracker access for teachers without touching other flows."
    >
      <div className="space-y-6">
        <SectionCard title="Grant Access">
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} disabled className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">{user?.client_id ? `Client ${user.client_id}` : 'Client unavailable'}</option>
            </select>
            <select value={programId} onChange={(e) => setProgramId(e.target.value)} disabled={programsLoading} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">{programsLoading ? 'Loading programs...' : 'Select a program'}</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code ? `${program.name} (${program.code})` : program.name}
                </option>
              ))}
            </select>
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} disabled={schoolsLoading} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">{schoolsLoading ? 'Loading schools...' : 'Select a school'}</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.school_code ? `${school.name} (${school.school_code})` : school.name}
                </option>
              ))}
            </select>
            <select value={teacherUserId} onChange={(e) => setTeacherUserId(e.target.value)} disabled={!schoolId || teachersLoading} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">{!schoolId ? 'Select a school first' : teachersLoading ? 'Loading teachers...' : teacherOptions.length === 0 ? 'No teachers found' : 'Select a teacher'}</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.user_id}>
                  {teacher.full_name || teacher.email || `Teacher ${teacher.user_id}`}
                </option>
              ))}
            </select>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={!schoolId || batchesLoading} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">{!schoolId ? 'Select a school first' : batchesLoading ? 'Loading batches...' : activeBatches.length === 0 ? 'No batches found' : 'Select a batch'}</option>
              {activeBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.code ? `${batch.name} (${batch.code})` : batch.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <label className="flex items-center gap-2 whitespace-nowrap"><input type="checkbox" checked={canView} onChange={(e) => setCanView(e.target.checked)} /> View</label>
              <label className="flex items-center gap-2 whitespace-nowrap"><input type="checkbox" checked={canUpdate} onChange={(e) => setCanUpdate(e.target.checked)} /> Update</label>
            </div>
            <button className="rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white md:col-span-2 xl:col-span-3">Grant Tracker Access</button>
          </form>
        </SectionCard>

        <SectionCard title="Existing Permissions" actions={<button type="button" onClick={loadPermissions} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Refresh</button>}>
          <div className="space-y-3 md:hidden">
            {permissions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No tracker permissions found.
              </div>
            )}
            {permissions.map((permission) => (
              <div key={`permission-mobile-${permission.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {permission.teacher_name || permission.teacher_user_id}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {permission.client_name || permission.client_id}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(permission.id)}
                    className="shrink-0 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                  >
                    Revoke
                  </button>
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div>
                    <span className="font-medium text-slate-900">Scope:</span> {formatScope(permission)}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">Flags:</span>{' '}
                    {permission.can_view_tracker ? 'View' : 'No View'} / {permission.can_update_tracker ? 'Update' : 'Read Only'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
            <div className="overflow-x-auto">
              <table className="min-w-160 divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left whitespace-nowrap">Teacher</th>
                    <th className="px-3 py-3 text-left whitespace-nowrap">Client</th>
                    <th className="px-3 py-3 text-left whitespace-nowrap">Scope</th>
                    <th className="px-3 py-3 text-left whitespace-nowrap">Flags</th>
                    <th className="px-3 py-3 text-left whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {permissions.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-4 text-slate-500">No tracker permissions found.</td></tr>
                  )}
                  {permissions.map((permission) => (
                    <tr key={permission.id}>
                      <td className="px-3 py-3 align-top">{permission.teacher_name || permission.teacher_user_id}</td>
                      <td className="px-3 py-3 align-top">{permission.client_name || permission.client_id}</td>
                      <td className="px-3 py-3 align-top wrap-break-word">{formatScope(permission)}</td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {permission.can_view_tracker ? 'View' : 'No View'} / {permission.can_update_tracker ? 'Update' : 'Read Only'}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <button type="button" onClick={() => handleDelete(permission.id)} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
                          Revoke
                        </button>
                      </td>
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
