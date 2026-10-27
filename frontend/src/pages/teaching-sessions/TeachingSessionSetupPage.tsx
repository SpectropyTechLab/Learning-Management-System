import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
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
  ProgramUpload,
  SchoolMembership,
  SubjectOption,
  TeachingSession,
} from '@/features/teaching-sessions/types';

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

type DraftSessionItem = {
  template_id: number;
  grade_label: string;
  subject_label: string;
  session_no: number;
  session_label: string;
  part_type: ProgramSessionTemplate['part_type'];
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
  const [microUploads, setMicroUploads] = useState<ProgramUpload[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [schoolMemberships, setSchoolMemberships] = useState<SchoolMembership[]>([]);
  const [templates, setTemplates] = useState<ProgramSessionTemplate[]>([]);
  const [draftItems, setDraftItems] = useState<Record<number, DraftSessionItem>>({});
  const [sharedBatchId, setSharedBatchId] = useState('');
  const [sharedTeacherUserId, setSharedTeacherUserId] = useState('');
  const [existingSessions, setExistingSessions] = useState<TeachingSession[]>([]);
  const [existingSessionsLoading, setExistingSessionsLoading] = useState(false);
  const [scopeBlockedMessage, setScopeBlockedMessage] = useState('');
  const [createdSessions, setCreatedSessions] = useState<TeachingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [microUploadsLoading, setMicroUploadsLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [microScheduleUploadId, setMicroScheduleUploadId] = useState('');

  const selectedGrade = useMemo(
    () => grades.find((item) => Number(item.id) === Number(gradeId)) ?? null,
    [grades, gradeId]
  );
  const selectedSubject = useMemo(
    () => subjects.find((item) => Number(item.id) === Number(subjectId)) ?? null,
    [subjects, subjectId]
  );
  const hasCompleteExistingSessionSelection = Boolean(
    clientId && programId && gradeId && subjectId && schoolId && sharedBatchId && sharedTeacherUserId
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

  const visibleExistingSessions = useMemo(() => existingSessions, [existingSessions]);

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
    const scopedClientId =
      user?.role === 'super_admin' ? clientId || undefined : user?.client_id ?? undefined;
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

    const scopedClientId =
      user?.role === 'super_admin' ? clientId || undefined : user?.client_id ?? undefined;
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

    const scopedClientId =
      user?.role === 'super_admin' ? clientId || undefined : user?.client_id ?? undefined;
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
    if (!programId || !gradeId || !subjectId || !microScheduleUploadId) {
      toast.error('Program, grade, subject, and micro schedule are required');
      return;
    }

    if (existingSessions.length > 0) {
      setTemplates([]);
      setDraftItems({});
      setScopeBlockedMessage(
        'Teaching sessions are already assigned for this selected program, grade, subject, school, and template version.'
      );
      toast.error('This template scope is already assigned and cannot be loaded again');
      return;
    }

    try {
      setLoading(true);
      setScopeBlockedMessage('');
      const data = await teachingSessionsApi.listProgramTemplates(programId, {
        template_version_no: Number(templateVersionNo || '1'),
        micro_schedule_upload_id: Number(microScheduleUploadId),
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

  const loadMicroUploads = async (nextProgramId: string, nextGradeId: string, nextSubjectId: string) => {
    if (!nextProgramId || !nextGradeId || !nextSubjectId) {
      setMicroUploads([]);
      setMicroScheduleUploadId('');
      return;
    }

    try {
      setMicroUploadsLoading(true);
      const data = await teachingSessionsApi.listMicroScheduleUploads({
        programId: nextProgramId,
        gradeId: nextGradeId,
        subjectId: nextSubjectId,
      });
      setMicroUploads(data);
      setMicroScheduleUploadId((current) =>
        current && data.some((upload) => Number(upload.id) === Number(current))
          ? current
          : String(data[0]?.id ?? '')
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to load micro schedules');
    } finally {
      setMicroUploadsLoading(false);
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
    setMicroUploads([]);
    setMicroScheduleUploadId('');
    setSubjects([]);
    setTemplates([]);
    setDraftItems({});
    loadGrades(programId);
  }, [programId]);

  useEffect(() => {
    setSubjectId('');
    setMicroUploads([]);
    setMicroScheduleUploadId('');
    setTemplates([]);
    setDraftItems({});
    loadSubjects(programId, gradeId);
  }, [programId, gradeId]);

  useEffect(() => {
    setMicroUploads([]);
    setMicroScheduleUploadId('');
    setTemplates([]);
    setDraftItems({});
    loadMicroUploads(programId, gradeId, subjectId);
  }, [subjectId]);

  useEffect(() => {
    setTemplates([]);
    setDraftItems({});
  }, [templateVersionNo]);

  useEffect(() => {
    setTemplates([]);
    setDraftItems({});
  }, [microScheduleUploadId]);

  useEffect(() => {
    const loadExistingSessions = async () => {
      if (!hasCompleteExistingSessionSelection) {
        setExistingSessions([]);
        setScopeBlockedMessage('');
        return;
      }

      const grade = grades.find((item) => Number(item.id) === Number(gradeId));
      const subject = subjects.find((item) => Number(item.id) === Number(subjectId));

      if (!grade || !subject) {
        setExistingSessions([]);
        setScopeBlockedMessage('');
        return;
      }

      try {
        setExistingSessionsLoading(true);
        const data = await teachingSessionsApi.listTeachingSessions({
          client_id: Number(clientId),
          school_id: Number(schoolId),
          program_id: Number(programId),
          batch_id: Number(sharedBatchId),
          teacher_user_id: Number(sharedTeacherUserId),
          template_version_no: Number(templateVersionNo || '1'),
          grade_label: `GRADE-${grade.grade_number}`,
          subject_label: subject.name,
        });
        setExistingSessions(data);

        if (data.length > 0) {
          setTemplates([]);
          setDraftItems({});
          setScopeBlockedMessage(
            'Teaching sessions are already assigned for this selected program, grade, subject, school, and template version.'
          );
        } else {
          setScopeBlockedMessage('');
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load existing assigned sessions');
      } finally {
        setExistingSessionsLoading(false);
      }
    };

    loadExistingSessions();
  }, [
    clientId,
    programId,
    gradeId,
    subjectId,
    schoolId,
    sharedBatchId,
    sharedTeacherUserId,
    templateVersionNo,
    grades,
    subjects,
    hasCompleteExistingSessionSelection,
  ]);

  useEffect(() => {
    setSchoolId('');
    setBatches([]);
    setSchoolMemberships([]);
    setSharedBatchId('');
    setSharedTeacherUserId('');
  }, [clientId]);

  useEffect(() => {
    setSharedBatchId('');
    setSharedTeacherUserId('');
    loadBatchOptions(schoolId);
    loadTeacherOptions(schoolId);
  }, [schoolId]);

  const handleGenerate = async () => {
    if (!programId || !gradeId || !subjectId || !microScheduleUploadId || !schoolId) {
      toast.error('Program, grade, subject, micro schedule, and school are required');
      return;
    }

    if (!sharedBatchId || !sharedTeacherUserId) {
      toast.error('Select one batch and one teacher for all sessions');
      return;
    }

    const sessionItems = Object.values(draftItems).map((item) => ({
      template_id: item.template_id,
      grade_label: item.grade_label,
      subject_label: item.subject_label,
      session_no: item.session_no,
      session_label: item.session_label,
      part_type: item.part_type,
      duration_minutes: item.duration_minutes ? Number(item.duration_minutes) : undefined,
      remarks: item.remarks || undefined,
    }));

    if (sessionItems.length === 0) {
      toast.error('Load at least one template before generating');
      return;
    }

    if (templates.some((template) => !template.planned_date)) {
      toast.error('One or more templates are missing planned dates from the micro schedule');
      return;
    }

    try {
      setLoading(true);
      const latestTemplates = await teachingSessionsApi.listProgramTemplates(programId, {
        template_version_no: Number(templateVersionNo || '1'),
        micro_schedule_upload_id: Number(microScheduleUploadId),
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
        micro_schedule_upload_id: Number(microScheduleUploadId),
        school_id: Number(schoolId),
        batch_id: Number(sharedBatchId),
        teacher_user_id: Number(sharedTeacherUserId),
        session_items: sessionItems,
      });
      setCreatedSessions(result.sessions ?? []);
      toast.success('Teaching sessions generated');
    } catch (error) {
      console.error(error);
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message || 'Failed to generate teaching sessions'
        : 'Failed to generate teaching sessions';
      toast.error(errorMessage);
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
          <div className="grid gap-4 md:grid-cols-6">
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
                <option value="">
                  {!programId ? 'Select a program first' : gradesLoading ? 'Loading grades...' : 'Select a grade'}
                </option>
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
                <option value="">
                  {!gradeId ? 'Select a grade first' : subjectsLoading ? 'Loading subjects...' : 'Select a subject'}
                </option>
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
              Micro Schedule
              <select
                value={microScheduleUploadId}
                onChange={(e) => setMicroScheduleUploadId(e.target.value)}
                disabled={!subjectId || microUploadsLoading}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">
                  {!subjectId
                    ? 'Select a subject first'
                    : microUploadsLoading
                      ? 'Loading micro schedules...'
                      : microUploads.length === 0
                        ? 'No micro schedules found'
                        : 'Select a micro schedule'}
                </option>
                {microUploads.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    {upload.file_name} | v{upload.version_no}
                  </option>
                ))}
              </select>
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

        <SectionCard
          title="Template-to-Session Generation"
          subtitle="Micro schedule dates are fixed here. Select one batch and one teacher for all sessions."
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={sharedBatchId}
                onChange={(e) => setSharedBatchId(e.target.value)}
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
                        : 'Select one batch for all sessions'}
                </option>
                {activeBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.code ? `${batch.name} (${batch.code})` : batch.name}
                  </option>
                ))}
              </select>
              <select
                value={sharedTeacherUserId}
                onChange={(e) => setSharedTeacherUserId(e.target.value)}
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
                        : 'Select one teacher for all sessions'}
                </option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher.id} value={teacher.user_id}>
                    {teacher.full_name || teacher.email || `Teacher ${teacher.user_id}`}
                  </option>
                ))}
              </select>
            </div>
            {loading && templates.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-500">
                Loading templates...
              </div>
            )}
            {!loading && templates.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-500">
                {scopeBlockedMessage ||
                  'Load a published program template for the selected program, grade, and subject to begin.'}
              </div>
            )}
            {templates.map((template) => {
              const draft = draftItems[template.id];
              return (
                <div key={template.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">
                    {template.session_label} • {template.planner_title || template.topic_label || template.chapter_label}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Planned Date</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {template.planned_date ? formatIndianDate(template.planned_date) : 'Date missing in micro schedule'}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Grade / Subject</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {template.grade_label} / {template.subject_label}
                      </div>
                    </div>
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
                disabled={loading || existingSessions.length > 0}
                className="rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Generating...' : 'Generate Teaching Sessions'}
              </button>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Existing Assigned Sessions"
          subtitle="Already assigned sessions for the selected scope are shown here. Batch and teacher selectors filter this list."
        >
          {!hasCompleteExistingSessionSelection && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Select program, grade, subject, school, batch, and teacher to view existing assigned sessions.
            </div>
          )}

          {hasCompleteExistingSessionSelection && <div className="space-y-3 md:hidden">
            {existingSessionsLoading && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Loading existing assigned sessions...
              </div>
            )}
            {!existingSessionsLoading && visibleExistingSessions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No assigned sessions found yet for the selected scope.
              </div>
            )}
            {!existingSessionsLoading &&
              visibleExistingSessions.map((session) => (
                <div key={`existing-mobile-${session.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{session.session_label}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatIndianDate(session.planned_date)}</div>
                    </div>
                    <div className="text-xs font-medium text-slate-500">{session.status}</div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div><span className="font-medium text-slate-900">Batch:</span> {session.batch_name || session.batch_id || '-'}</div>
                    <div><span className="font-medium text-slate-900">Teacher:</span> {session.teacher_name || session.teacher_user_id || '-'}</div>
                  </div>
                </div>
              ))}
          </div>}

          {hasCompleteExistingSessionSelection && <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Session</th>
                    <th className="px-3 py-2 text-left">Planned Date</th>
                    <th className="px-3 py-2 text-left">Batch</th>
                    <th className="px-3 py-2 text-left">Teacher</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {existingSessionsLoading && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-slate-500">
                        Loading existing assigned sessions...
                      </td>
                    </tr>
                  )}
                  {!existingSessionsLoading && visibleExistingSessions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-slate-500">
                        No assigned sessions found yet for the selected scope.
                      </td>
                    </tr>
                  )}
                  {!existingSessionsLoading &&
                    visibleExistingSessions.map((session) => (
                      <tr key={`existing-${session.id}`}>
                        <td className="px-3 py-2">{session.session_label}</td>
                        <td className="px-3 py-2">{formatIndianDate(session.planned_date)}</td>
                        <td className="px-3 py-2">{session.batch_name || session.batch_id || '-'}</td>
                        <td className="px-3 py-2">{session.teacher_name || session.teacher_user_id || '-'}</td>
                        <td className="px-3 py-2">{session.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>}
        </SectionCard>

        <SectionCard title="Recently Created Sessions">
          <div className="space-y-3 md:hidden">
            {createdSessions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No sessions generated yet in this page session.
              </div>
            )}
            {createdSessions.map((session) => (
              <div key={`created-mobile-${session.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{session.session_label}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatIndianDate(session.planned_date)}</div>
                  </div>
                  <div className="text-xs font-medium text-slate-500">{session.status}</div>
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">Teacher:</span> {session.teacher_name || session.teacher_user_id || '-'}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Session</th>
                    <th className="px-3 py-2 text-left">Planned Date</th>
                    <th className="px-3 py-2 text-left">Teacher</th>
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
                      <td className="px-3 py-2">{formatIndianDate(session.planned_date)}</td>
                      <td className="px-3 py-2">{session.teacher_name || session.teacher_user_id || '-'}</td>
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
