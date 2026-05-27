import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type { TeacherTrackerPermission } from '@/features/teaching-sessions/types';

export default function TeacherTrackerPermissionsPage() {
  const [clientId, setClientId] = useState('');
  const [teacherUserId, setTeacherUserId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [programId, setProgramId] = useState('');
  const [permissions, setPermissions] = useState<TeacherTrackerPermission[]>([]);
  const [canView, setCanView] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);

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
    loadPermissions();
  }, []);

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

  return (
    <TeachingSessionsShell
      title="Teacher Tracker Permissions"
      subtitle="Grant or revoke tracker access for teachers without touching other flows."
    >
      <div className="space-y-6">
        <SectionCard title="Grant Access">
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
            <input placeholder="Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="Teacher User ID" value={teacherUserId} onChange={(e) => setTeacherUserId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="School ID" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="Batch ID" value={batchId} onChange={(e) => setBatchId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="Program ID" value={programId} onChange={(e) => setProgramId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={canView} onChange={(e) => setCanView(e.target.checked)} /> View</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={canUpdate} onChange={(e) => setCanUpdate(e.target.checked)} /> Update</label>
            </div>
            <button className="rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white md:col-span-3">Grant Tracker Access</button>
          </form>
        </SectionCard>

        <SectionCard title="Existing Permissions" actions={<button type="button" onClick={loadPermissions} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Refresh</button>}>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Teacher</th>
                    <th className="px-3 py-2 text-left">Client</th>
                    <th className="px-3 py-2 text-left">Scope</th>
                    <th className="px-3 py-2 text-left">Flags</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {permissions.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-4 text-slate-500">No tracker permissions found.</td></tr>
                  )}
                  {permissions.map((permission) => (
                    <tr key={permission.id}>
                      <td className="px-3 py-2">{permission.teacher_user_id}</td>
                      <td className="px-3 py-2">{permission.client_id}</td>
                      <td className="px-3 py-2">
                        S:{permission.school_id || '-'} • B:{permission.batch_id || '-'} • P:{permission.program_id || '-'}
                      </td>
                      <td className="px-3 py-2">
                        {permission.can_view_tracker ? 'View' : 'No View'} / {permission.can_update_tracker ? 'Update' : 'Read Only'}
                      </td>
                      <td className="px-3 py-2">
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
