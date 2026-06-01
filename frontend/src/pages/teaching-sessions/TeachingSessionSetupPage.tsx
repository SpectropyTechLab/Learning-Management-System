import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type {
  BatchOption,
  GradeOption,
  ProgramOption,
  ProgramSessionTemplate,
  SchoolMembership,
  SubjectOption,
  TeachingSession,
} from '@/features/teaching-sessions/types';

type DraftSessionItem = {
  template_id: number;
  grade_label: string;
  subject_label: string;
  session_no: number;
  session_label: string;
  part_type: ProgramSessionTemplate['part_type'];
  planned_date: string;
  period_slot: string;
  batch_id: string;
  teacher_user_id: string;
  duration_minutes: string;
  remarks: string;
};

type ClientOption = {
  id: number;
  name: string;
  slug?: string;
};

type SchoolOption = {
  id: number;
  name: string;
  school_code?: string | null;
  client_id?: number | null;
};

export default function TeachingSessionSetupPage() {
  const { user } = useAuth();
  const [programId, setProgramId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [templateVersionNo, setTemplateVersionNo] = useState('1');
  const [schoolId, setSchoolId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [schoolMemberships, setSchoolMemberships] = useState<SchoolMembership[]>([]);
  const [templates, setTemplates] = useState<ProgramSessionTemplate[]>([]);
  const [draftItems, setDraftItems] = useState<Record<number, DraftSessionItem>>({});
  const [createdSessions, setCreatedSessions] = useState<TeachingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);

  const selectedGrade = useMemo(
    () => grades.find((item) => Number(item.id) === Number(gradeId)) ?? null,
    [grades, gradeId]
  );
  const selectedSubject = useMemo(
    () => subjects.find((item) => Number(item.id) === Number(subjectId)) ?? null,
    [subjects, subjectId]
  );

  const normalizeLabel = (value: string | null | undefined) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const matchesSelectedScope = (template: ProgramSessionTemplate) => {
    if (!selectedGrade || !selectedSubject) return true;

    const templateGradeNumber = String(template.grade_label || '').match(/\d+/)?.[0] ?? '';
    const selectedGradeNumber = String(selectedGrade.grade_number);
    const gradeMatches = templateGradeNumber === selectedGradeNumber;

    const templateSubject = normalizeLabel(template.subject_label);
    const subjectMatches =
      templateSubject === normalizeLabel(selectedSubject.name) ||
      (selectedSubject.code ? templateSubject === normalizeLabel(selectedSubject.code) : false);

    return gradeMatches && subjectMatches;
  };

  const visibleSchools = useMemo(() => {
    if (!clientId) return schools;
    return schools.filter((school) => !school.client_id || Number(school.client_id) === Number(clientId));
  }, [schools, clientId]);

  const teacherOptions = useMemo(
    () =>
      schoolMemberships.filter(
        (membership) =>
          membership.status === 'active' &&
          (membership.role_scope === 'teacher' || membership.role === 'teacher')
      ),
    [schoolMemberships]
  );

  const activeBatches = useMemo(
    () => batches.filter((batch) => batch.is_active !== false),
    [batches]
  );

  const buildDraftItems = (
    nextTemplates: ProgramSessionTemplate[],
    existingDrafts: Record<number, DraftSessionItem> = {}
  ) => {
    const nextItems: Record<number, DraftSessionItem> = {};
    nextTemplates.forEach((template) => {
      const existing = existingDrafts[template.id];
      nextItems[template.id] = {
        template_id: template.id,
        grade_label: template.grade_label,
        subject_label: template.subject_label,
        session_no: template.session_no,
        session_label: template.session_label,
        part_type: template.part_type,
        planned_date: existing?.planned_date || '',
        period_slot: existing?.period_slot || '',
        batch_id: existing?.batch_id || '',
        teacher_user_id: existing?.teacher_user_id || '',
        duration_minutes:
          existing?.duration_minutes ||
          (template.duration_minutes ? String(template.duration_minutes) : ''),
        remarks: existing?.remarks || '',
      };
    });
    return nextItems;
  };

  const loadClients = async () => {
    if (user?.role !== 'super_admin') {
      if (user?.client_id) {
        setClientId(String(user.client_id));
      }
      setClients([]);
      return;
    }

    try {
      setClientsLoading(true);
      const res = await api.get<ClientOption[]>('/platform/clients');
      setClients(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load clients');
    } finally {
      setClientsLoading(false);
    }
  };

  const loadSchools = async () => {
    try {
      setSchoolsLoading(true);
      const res = await api.get<SchoolOption[]>('/org/schools');
      setSchools(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load schools');
    } finally {
      setSchoolsLoading(false);
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

  const loadTeacherOptions = async (nextSchoolId: string) => {
    if (!nextSchoolId) {
      setSchoolMemberships([]);
      setTeachersLoading(false);
      return;
    }

    try {
      setTeachersLoading(true);
      setSchoolMemberships(await teachingSessionsApi.listSchoolMemberships(nextSchoolId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load teacher options');
    } finally {
      setTeachersLoading(false);
    }
  };

  const loadPrograms = async () => {
    const scopedClientId = user?.role === 'super_admin' ? clientId || undefined : user?.client_id;
    try {
      setProgramsLoading(true);
      setPrograms(await teachingSessionsApi.listPrograms(scopedClientId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load programs');
    } finally {
      setProgramsLoading(false);
    }
  };

  const loadGrades = async (nextProgramId: string) => {
    if (!nextProgramId) {
      setGrades([]);
      return;
    }

    const scopedClientId = user?.role === 'super_admin' ? clientId || undefined : user?.client_id;
    try {
      setGradesLoading(true);
      setGrades(await teachingSessionsApi.listGrades(nextProgramId, scopedClientId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load grades');
    } finally {
      setGradesLoading(false);
    }
  };

  const loadSubjects = async (nextProgramId: string, nextGradeId: string) => {
    if (!nextProgramId || !nextGradeId) {
      setSubjects([]);
      return;
    }

    const scopedClientId = user?.role === 'super_admin' ? clientId || undefined : user?.client_id;
    try {
      setSubjectsLoading(true);
      setSubjects(await teachingSessionsApi.listSubjects(nextProgramId, nextGradeId, scopedClientId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load subjects');
    } finally {
      setSubjectsLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!programId || !gradeId || !subjectId) {
      toast.error('Program, grade, and subject are required');
      return;
    }

    try {
      setLoading(true);
      const data = await teachingSessionsApi.listProgramTemplates(programId, {
        template_version_no: Number(templateVersionNo || '1'),
      });
      const matched = data.filter(
        (entry) => entry.mapping_status === 'matched' && entry.is_published && matchesSelectedScope(entry)
      );
      setTemplates(matched);
      setDraftItems(buildDraftItems(matched));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load published templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadSchools();
  }, [user?.role, user?.client_id]);

  useEffect(() => {
    setProgramId('');
    setGradeId('');
    setSubjectId('');
    setPrograms([]);
    setGrades([]);
    setSubjects([]);
    setTemplates([]);
    setDraftItems({});

    if (user?.role === 'super_admin' && !clientId) {
      return;
    }

    loadPrograms();
  }, [clientId, user?.role, user?.client_id]);

  useEffect(() => {
    setGradeId('');
    setSubjectId('');
    setSubjects([]);
    setTemplates([]);
    setDraftItems({});
    loadGrades(programId);
  }, [programId]);

  useEffect(() => {
    setSubjectId('');
    setTemplates([]);
    setDraftItems({});
    loadSubjects(programId, gradeId);
  }, [programId, gradeId]);

  useEffect(() => {
    setTemplates([]);
    setDraftItems({});
  }, [subjectId, templateVersionNo]);

  useEffect(() => {
    setSchoolId('');
    setBatches([]);
    setSchoolMemberships([]);
  }, [clientId]);

  useEffect(() => {
    setDraftItems((current) =>
      Object.fromEntries(
        Object.entries(current).map(([templateId, item]) => [
          Number(templateId),
          {
            ...item,
            batch_id: '',
            teacher_user_id: '',
          },
        ])
      )
    );
    loadBatchOptions(schoolId);
    loadTeacherOptions(schoolId);
  }, [schoolId]);

  useEffect(() => {
    setDraftItems((current) =>
      Object.fromEntries(
        Object.entries(current).map(([templateId, item]) => [
          Number(templateId),
          {
            ...item,
            batch_id:
              item.batch_id && activeBatches.some((batch) => Number(batch.id) === Number(item.batch_id))
                ? item.batch_id
                : '',
            teacher_user_id:
              item.teacher_user_id &&
              teacherOptions.some((teacher) => Number(teacher.user_id) === Number(item.teacher_user_id))
                ? item.teacher_user_id
                : '',
          },
        ])
      )
    );
  }, [activeBatches, teacherOptions]);

  const handleGenerate = async () => {
    if (!programId || !gradeId || !subjectId || !schoolId) {
      toast.error('Program, grade, subject, and school id are required');
      return;
    }

    const sessionItems = Object.values(draftItems)
      .filter((item) => item.planned_date)
      .map((item) => ({
        template_id: item.template_id,
        grade_label: item.grade_label,
        subject_label: item.subject_label,
        session_no: item.session_no,
        session_label: item.session_label,
        part_type: item.part_type,
        planned_date: item.planned_date,
        period_slot: item.period_slot || undefined,
        batch_id: item.batch_id ? Number(item.batch_id) : undefined,
        teacher_user_id: item.teacher_user_id ? Number(item.teacher_user_id) : undefined,
        duration_minutes: item.duration_minutes ? Number(item.duration_minutes) : undefined,
        remarks: item.remarks || undefined,
      }));

    if (sessionItems.length === 0) {
      toast.error('Add at least one planned date before generating');
      return;
    }

    try {
      setLoading(true);
      const latestTemplates = await teachingSessionsApi.listProgramTemplates(programId, {
        template_version_no: Number(templateVersionNo || '1'),
      });
      const latestMatchedTemplates = latestTemplates.filter(
        (entry) => entry.mapping_status === 'matched' && entry.is_published && matchesSelectedScope(entry)
      );
      const latestTemplateIds = new Set(latestMatchedTemplates.map((template) => Number(template.id)));
      const invalidTemplateIds = sessionItems
        .map((item) => Number(item.template_id))
        .filter((templateId) => !latestTemplateIds.has(templateId));

      if (invalidTemplateIds.length > 0) {
        setTemplates(latestMatchedTemplates);
        setDraftItems((current) => buildDraftItems(latestMatchedTemplates, current));
        toast.error(
          `Some templates are no longer available (${invalidTemplateIds.join(', ')}). Templates were refreshed.`
        );
        return;
      }

      const result = await teachingSessionsApi.generateTeachingSessions({
        client_id: clientId ? Number(clientId) : undefined,
        program_id: Number(programId),
        template_version_no: Number(templateVersionNo || '1'),
        school_id: Number(schoolId),
        session_items: sessionItems,
      });
      setCreatedSessions(result.sessions ?? []);
      toast.success('Teaching sessions generated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate teaching sessions');
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (templateId: number, key: keyof DraftSessionItem, value: string) => {
    setDraftItems((current) => ({
      ...current,
      [templateId]: {
        ...current[templateId],
        [key]: value,
      },
    }));
  };

  return (
    <TeachingSessionsShell
      title="Teaching Session Setup"
      subtitle="Generate live sessions from published program templates."
      actions={
        <button
          type="button"
          onClick={loadTemplates}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
        >
          Load Templates
        </button>
      }
    >
      <div className="space-y-6">
        <SectionCard title="Generation Context">
          <div className="grid gap-4 md:grid-cols-5">
            <label className="text-sm text-slate-600">
              Client
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={user?.role !== 'super_admin' || clientsLoading}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">
                  {user?.role !== 'super_admin'
                    ? user?.client_id
                      ? `Client ${user.client_id}`
                      : 'Client unavailable'
                    : clientsLoading
                      ? 'Loading clients...'
                      : 'Select a client'}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Program
              <select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                disabled={programsLoading}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">{programsLoading ? 'Loading programs...' : 'Select a program'}</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.code ? `${program.name} (${program.code})` : program.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Grade
              <select
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                disabled={!programId || gradesLoading}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">{!programId ? 'Select a program first' : gradesLoading ? 'Loading grades...' : 'Select a grade'}</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {`Grade ${grade.grade_number}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Subject
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!gradeId || subjectsLoading}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">{!gradeId ? 'Select a grade first' : subjectsLoading ? 'Loading subjects...' : 'Select a subject'}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code ? `${subject.name} (${subject.code})` : subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Template Version
              <input
                value={templateVersionNo}
                onChange={(e) => setTemplateVersionNo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              School
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                disabled={schoolsLoading || (user?.role === 'super_admin' && !clientId)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">
                  {schoolsLoading
                    ? 'Loading schools...'
                    : user?.role === 'super_admin' && !clientId
                      ? 'Select a client first'
                      : 'Select a school'}
                </option>
                {visibleSchools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.school_code ? `${school.name} (${school.school_code})` : school.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Template-to-Session Generation" subtitle="Fill planned dates and assignment details for selected templates.">
          <div className="space-y-4">
            {loading && templates.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-500">
                Loading templates...
              </div>
            )}
            {!loading && templates.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-500">
                Load a published program template for the selected program, grade, and subject to begin.
              </div>
            )}
            {templates.map((template) => {
              const draft = draftItems[template.id];
              return (
                <div key={template.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">
                    {template.session_label} • {template.planner_title || template.topic_label || template.chapter_label}
                  </div>
                  <div className="grid gap-3 md:grid-cols-5">
                    <input
                      type="date"
                      value={draft?.planned_date || ''}
                      onChange={(e) => updateDraft(template.id, 'planned_date', e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Period / Slot"
                      value={draft?.period_slot || ''}
                      onChange={(e) => updateDraft(template.id, 'period_slot', e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <select
                      value={draft?.batch_id || ''}
                      onChange={(e) => updateDraft(template.id, 'batch_id', e.target.value)}
                      disabled={!schoolId || batchesLoading}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">
                        {!schoolId
                          ? 'Select a school first'
                          : batchesLoading
                            ? 'Loading batches...'
                            : activeBatches.length === 0
                              ? 'No batches found'
                              : 'Select a batch'}
                      </option>
                      {activeBatches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.code ? `${batch.name} (${batch.code})` : batch.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draft?.teacher_user_id || ''}
                      onChange={(e) => updateDraft(template.id, 'teacher_user_id', e.target.value)}
                      disabled={!schoolId || teachersLoading}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">
                        {!schoolId
                          ? 'Select a school first'
                          : teachersLoading
                            ? 'Loading teachers...'
                            : teacherOptions.length === 0
                              ? 'No teachers found'
                              : 'Select a teacher'}
                      </option>
                      {teacherOptions.map((teacher) => (
                        <option key={teacher.id} value={teacher.user_id}>
                          {teacher.full_name || teacher.email || `Teacher ${teacher.user_id}`}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Duration"
                      value={draft?.duration_minutes || ''}
                      onChange={(e) => updateDraft(template.id, 'duration_minutes', e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <textarea
                    placeholder="Remarks"
                    value={draft?.remarks || ''}
                    onChange={(e) => updateDraft(template.id, 'remarks', e.target.value)}
                    rows={2}
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              );
            })}
            {templates.length > 0 && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Generating...' : 'Generate Teaching Sessions'}
              </button>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Recently Created Sessions">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Session</th>
                    <th className="px-3 py-2 text-left">Planned Date</th>
                    <th className="px-3 py-2 text-left">Teacher ID</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {createdSessions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-500">
                        No sessions generated yet in this page session.
                      </td>
                    </tr>
                  )}
                  {createdSessions.map((session) => (
                    <tr key={session.id}>
                      <td className="px-3 py-2">{session.session_label}</td>
                      <td className="px-3 py-2">{session.planned_date}</td>
                      <td className="px-3 py-2">{session.teacher_user_id || '-'}</td>
                      <td className="px-3 py-2">{session.status}</td>
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
