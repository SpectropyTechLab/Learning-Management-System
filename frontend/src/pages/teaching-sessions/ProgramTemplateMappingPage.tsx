import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import StatusBadge from '@/features/teaching-sessions/components/StatusBadge';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type {
  GradeOption,
  ProgramOption,
  ProgramSessionTemplate,
  ProgramUpload,
  SubjectOption,
} from '@/features/teaching-sessions/types';

const uploadLabel = (upload: ProgramUpload) => {
  const gradeLabel = upload.grade_number ? `Grade ${upload.grade_number}` : `Grade ${upload.grade_id}`;
  const subjectLabel = upload.subject_name
    ? upload.subject_code
      ? `${upload.subject_name} (${upload.subject_code})`
      : upload.subject_name
    : `Subject ${upload.subject_id}`;

  return `${upload.file_name} • ${gradeLabel} • ${subjectLabel} • v${upload.version_no}`;
};

export default function ProgramTemplateMappingPage() {
  const [programId, setProgramId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [microUploadId, setMicroUploadId] = useState('');
  const [plannerUploadId, setPlannerUploadId] = useState('');
  const [templateVersionNo, setTemplateVersionNo] = useState('1');
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [microUploads, setMicroUploads] = useState<ProgramUpload[]>([]);
  const [plannerUploads, setPlannerUploads] = useState<ProgramUpload[]>([]);
  const [mappingSummary, setMappingSummary] = useState<Record<string, unknown> | null>(null);
  const [templates, setTemplates] = useState<ProgramSessionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [uploadsLoading, setUploadsLoading] = useState(false);

  const selectedProgram = useMemo(
    () => programs.find((item) => Number(item.id) === Number(programId)),
    [programs, programId]
  );

  const loadPrograms = async () => {
    try {
      setProgramsLoading(true);
      setPrograms(await teachingSessionsApi.listPrograms());
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

    try {
      setGradesLoading(true);
      setGrades(await teachingSessionsApi.listGrades(nextProgramId));
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

    try {
      setSubjectsLoading(true);
      setSubjects(await teachingSessionsApi.listSubjects(nextProgramId, nextGradeId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load subjects');
    } finally {
      setSubjectsLoading(false);
    }
  };

  const loadScopedUploads = async () => {
    if (!programId || !gradeId || !subjectId) {
      setMicroUploads([]);
      setPlannerUploads([]);
      return;
    }

    try {
      setUploadsLoading(true);
      const params = { programId, gradeId, subjectId };
      const [micro, planner] = await Promise.all([
        teachingSessionsApi.listMicroScheduleUploads(params),
        teachingSessionsApi.listLessonPlannerUploads(params),
      ]);
      setMicroUploads(micro);
      setPlannerUploads(planner);
      setMicroUploadId((current) => (current && micro.some((item) => Number(item.id) === Number(current)) ? current : ''));
      setPlannerUploadId((current) => (current && planner.some((item) => Number(item.id) === Number(current)) ? current : ''));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load scoped uploads');
    } finally {
      setUploadsLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!programId) return;
    try {
      const data = await teachingSessionsApi.listProgramTemplates(programId, {
        template_version_no: templateVersionNo || undefined,
        include_unpublished: true,
      });
      setTemplates(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load template records');
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    setGradeId('');
    setSubjectId('');
    setMicroUploadId('');
    setPlannerUploadId('');
    setSubjects([]);
    loadGrades(programId);
  }, [programId]);

  useEffect(() => {
    setSubjectId('');
    setMicroUploadId('');
    setPlannerUploadId('');
    loadSubjects(programId, gradeId);
  }, [programId, gradeId]);

  useEffect(() => {
    setMicroUploadId('');
    setPlannerUploadId('');
    loadScopedUploads();
  }, [programId, gradeId, subjectId]);

  const handleMap = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!programId || !gradeId || !subjectId || !microUploadId || !plannerUploadId) {
      toast.error('Program, grade, subject, micro upload, and planner upload are required');
      return;
    }

    try {
      setLoading(true);
      const result = await teachingSessionsApi.mapProgramTemplates(programId, {
        micro_schedule_upload_id: Number(microUploadId),
        lesson_planner_upload_id: Number(plannerUploadId),
        template_version_no: Number(templateVersionNo || '1'),
      });
      setMappingSummary(result);
      await loadTemplates();
      toast.success('Template mapping completed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to map templates');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!programId) return;
    try {
      setLoading(true);
      await teachingSessionsApi.publishProgramTemplates(programId, {
        template_version_no: Number(templateVersionNo || '1'),
      });
      await loadTemplates();
      toast.success('Templates published');
    } catch (error) {
      console.error(error);
      toast.error('Failed to publish templates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeachingSessionsShell
      title="Program Template Mapping"
      subtitle="Map micro schedules with lesson planners and publish reusable templates."
      actions={
        <button
          type="button"
          onClick={loadTemplates}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
        >
          Refresh Templates
        </button>
      }
    >
      <div className="space-y-6">
        <SectionCard title="Run Mapping" subtitle="Choose one academic scope and map the uploaded files within it.">
          <form onSubmit={handleMap} className="grid gap-4 md:grid-cols-3">
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
              Micro Schedule Upload
              <select
                value={microUploadId}
                onChange={(e) => setMicroUploadId(e.target.value)}
                disabled={!subjectId || uploadsLoading}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">{!subjectId ? 'Select a subject first' : uploadsLoading ? 'Loading uploads...' : 'Select a micro upload'}</option>
                {microUploads.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    {uploadLabel(upload)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Lesson Planner Upload
              <select
                value={plannerUploadId}
                onChange={(e) => setPlannerUploadId(e.target.value)}
                disabled={!subjectId || uploadsLoading}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">{!subjectId ? 'Select a subject first' : uploadsLoading ? 'Loading uploads...' : 'Select a planner upload'}</option>
                {plannerUploads.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    {uploadLabel(upload)}
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
            <button
              disabled={loading}
              className="rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white md:col-span-3"
            >
              {loading ? 'Processing...' : 'Run Mapping'}
            </button>
          </form>
        </SectionCard>

        {mappingSummary ? (
          <SectionCard title="Mapping Summary">
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(mappingSummary).map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">{String(value)}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          title="Template Records"
          subtitle={
            selectedProgram
              ? `Showing template records for ${selectedProgram.code ? `${selectedProgram.name} (${selectedProgram.code})` : selectedProgram.name}.`
              : 'Matched rows are publishable; unmatched and conflict rows remain visible for cleanup.'
          }
          actions={
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading || !programId}
              className="rounded-full bg-[#073b8a] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Publish Matched Rows
            </button>
          }
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Session</th>
                    <th className="px-3 py-2 text-left">Chapter</th>
                    <th className="px-3 py-2 text-left">Planner Title</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {templates.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-slate-500">
                        Run mapping or refresh templates to see results.
                      </td>
                    </tr>
                  )}
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-3 py-2">{template.session_label}</td>
                      <td className="px-3 py-2">{template.chapter_label || '-'}</td>
                      <td className="px-3 py-2">{template.planner_title || '-'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={template.mapping_status} />
                      </td>
                      <td className="px-3 py-2">{template.is_published ? 'Yes' : 'No'}</td>
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
