import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import StatusBadge from '@/features/teaching-sessions/components/StatusBadge';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type {
  GradeOption,
  PlannerChecklist,
  ProgramOption,
  ProgramSessionTemplate,
  ProgramUpload,
  SubjectOption,
} from '@/features/teaching-sessions/types';

export default function ProgramTemplateMappingPage() {
  const [programId, setProgramId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [microUploadId, setMicroUploadId] = useState('');
  const [templateVersionNo, setTemplateVersionNo] = useState('1');
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [microUploads, setMicroUploads] = useState<ProgramUpload[]>([]);
  const [checklist, setChecklist] = useState<PlannerChecklist | null>(null);
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

  const buildMappingSummary = (data: ProgramSessionTemplate[]) => {
    if (data.length === 0) return null;
    const matched = data.filter((template) => template.mapping_status === 'matched').length;
    return {
      program_id: Number(programId),
      template_version_no: Number(templateVersionNo || '1'),
      total_records: data.length,
      matched_records: matched,
      non_matched_records: data.length - matched,
    };
  };

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

  const loadMicroUploads = async () => {
    if (!programId || !gradeId || !subjectId) {
      setMicroUploads([]);
      setMicroUploadId('');
      setChecklist(null);
      return;
    }
    try {
      setUploadsLoading(true);
      const data = await teachingSessionsApi.listMicroScheduleUploads({ programId, gradeId, subjectId });
      setMicroUploads(data);
      setMicroUploadId((current) =>
        current && data.some((upload) => Number(upload.id) === Number(current)) ? current : String(data[0]?.id ?? '')
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to load micro schedules');
    } finally {
      setUploadsLoading(false);
    }
  };

  const loadChecklist = async (nextMicroUploadId: string) => {
    if (!nextMicroUploadId) {
      setChecklist(null);
      return;
    }
    try {
      setChecklist(await teachingSessionsApi.getPlannerChecklist(nextMicroUploadId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load planner checklist');
    }
  };

  const loadTemplates = async () => {
    if (!programId) {
      setTemplates([]);
      setMappingSummary(null);
      return;
    }
    try {
      const data = await teachingSessionsApi.listProgramTemplates(programId, {
        template_version_no: templateVersionNo || undefined,
        micro_schedule_upload_id: microUploadId || undefined,
        include_unpublished: true,
      });
      setTemplates(data);
      setMappingSummary(buildMappingSummary(data));
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
    setChecklist(null);
    setTemplates([]);
    setMappingSummary(null);
    loadGrades(programId);
  }, [programId]);

  useEffect(() => {
    setSubjectId('');
    setMicroUploadId('');
    setChecklist(null);
    setTemplates([]);
    setMappingSummary(null);
    loadSubjects(programId, gradeId);
  }, [programId, gradeId]);

  useEffect(() => {
    setMicroUploadId('');
    setChecklist(null);
    setTemplates([]);
    setMappingSummary(null);
    loadMicroUploads();
  }, [programId, gradeId, subjectId]);

  useEffect(() => {
    loadChecklist(microUploadId);
  }, [microUploadId]);

  useEffect(() => {
    if (!programId || !gradeId || !subjectId || !microUploadId || !templateVersionNo) {
      return;
    }
    loadTemplates();
  }, [programId, gradeId, subjectId, microUploadId, templateVersionNo]);

  const matchedTemplates = templates.filter((template) => template.mapping_status === 'matched');
  const isTemplateVersionPublished = matchedTemplates.length > 0 && matchedTemplates.every((template) => template.is_published);
  const publishButtonLabel = isTemplateVersionPublished ? 'Already Published' : 'Publish Matched Rows';

  const handleMap = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!programId || !microUploadId) {
      toast.error('Program and micro schedule upload are required');
      return;
    }

    try {
      setLoading(true);
      const result = await teachingSessionsApi.mapProgramTemplates(programId, {
        micro_schedule_upload_id: Number(microUploadId),
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
    if (isTemplateVersionPublished) {
      toast.error('This template version is already published and cannot be published again.');
      return;
    }
    try {
      setLoading(true);
      await teachingSessionsApi.publishProgramTemplates(programId, {
        template_version_no: Number(templateVersionNo || '1'),
        micro_schedule_upload_id: Number(microUploadId),
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

  const handleDownloadLessonPlanner = async (uploadId?: number | null, fileName?: string | null) => {
    if (!uploadId) return;

    try {
      await teachingSessionsApi.downloadLessonPlannerUpload(uploadId, fileName || undefined);
    } catch (error) {
      console.error(error);
      toast.error('Failed to download lesson planner');
    }
  };

  return (
    <TeachingSessionsShell
      title="Program Template Mapping"
      subtitle="Map template records only after every required lesson planner is uploaded session-by-session."
      actions={
        <button type="button" onClick={loadTemplates} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
          Refresh Templates
        </button>
      }
    >
      <div className="space-y-6">
        <SectionCard title="Run Mapping" subtitle="Mapping now works against a selected micro schedule upload plus its completed planner checklist.">
          <form onSubmit={handleMap} className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-slate-600">
              Program
              <select value={programId} onChange={(e) => setProgramId(e.target.value)} disabled={programsLoading} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
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
              <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} disabled={!programId || gradesLoading} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">{!programId ? 'Select a program first' : gradesLoading ? 'Loading grades...' : 'Select a grade'}</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    Grade {grade.grade_number}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Subject
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!gradeId || subjectsLoading} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
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
              <select value={microUploadId} onChange={(e) => setMicroUploadId(e.target.value)} disabled={!subjectId || uploadsLoading} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">{!subjectId ? 'Select a subject first' : uploadsLoading ? 'Loading micro schedules...' : 'Select a micro schedule'}</option>
                {microUploads.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    {upload.file_name} | v{upload.version_no}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Template Version
              <input value={templateVersionNo} onChange={(e) => setTemplateVersionNo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {checklist
                ? `${checklist.completed_sessions}/${checklist.total_required_sessions} session planners complete`
                : 'Select a micro schedule upload to inspect planner readiness.'}
            </div>
            <button disabled={loading || !checklist?.is_publish_ready} className="rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-3">
              {loading ? 'Processing...' : 'Run Mapping'}
            </button>
          </form>
        </SectionCard>

        {checklist || mappingSummary ? (
          <SectionCard title="Template Status" subtitle="Stored template rows are reused for publish and teacher session generation.">
            <div className="grid gap-3 md:grid-cols-6">
              {checklist ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Required</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{checklist.total_required_sessions}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Completed</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{checklist.completed_sessions}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ready</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{checklist.is_publish_ready ? 'Yes' : 'No'}</div>
                  </div>
                </>
              ) : null}
              {mappingSummary ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Records</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{String(mappingSummary.total_records ?? 0)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Matched</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{String(mappingSummary.matched_records ?? 0)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Published</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{isTemplateVersionPublished ? 'Yes' : 'No'}</div>
                  </div>
                </>
              ) : null}
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">Publish Status:</span>{' '}
              {isTemplateVersionPublished
                ? 'Published templates are stored and can be used by the client to generate teacher sessions.'
                : 'Not published yet. Client admins can assign sessions only after these template rows are published.'}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          title="Template Records"
          subtitle={
            selectedProgram
              ? `Showing template records for ${selectedProgram.code ? `${selectedProgram.name} (${selectedProgram.code})` : selectedProgram.name}.`
              : 'Matched rows are publishable only when every required session planner exists.'
          }
          actions={
            <button type="button" onClick={handlePublish} disabled={loading || !checklist?.is_publish_ready || !programId || isTemplateVersionPublished} className="rounded-full bg-[#073b8a] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {publishButtonLabel}
            </button>
          }
        >
          <div className="space-y-3 md:hidden">
            {templates.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No stored template rows were found for this micro schedule and version yet. Run mapping once to create them.
              </div>
            )}
            {templates.map((template) => (
              <div key={`mobile-${template.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{template.session_label}</div>
                    <div className="mt-1 text-xs text-slate-500">{template.chapter_label || 'No chapter'}</div>
                  </div>
                  <StatusBadge status={template.mapping_status} />
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div><span className="font-medium text-slate-900">Planner Title:</span> {template.planner_title || '-'}</div>
                  <div>
                    <span className="font-medium text-slate-900">Lesson Plan:</span>{' '}
                    {template.lesson_plan_file_storage_path ? (
                      <button type="button" onClick={() => handleDownloadLessonPlanner(template.lesson_planner_upload_id, template.lesson_plan_file_name)} className="text-[#073b8a] underline underline-offset-2">
                        {template.lesson_plan_file_name || 'Download'}
                      </button>
                    ) : (
                      '-'
                    )}
                  </div>
                  <div><span className="font-medium text-slate-900">Published:</span> {template.is_published ? 'Yes' : 'No'}</div>
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
                    <th className="px-3 py-2 text-left">Chapter</th>
                    <th className="px-3 py-2 text-left">Planner Title</th>
                    <th className="px-3 py-2 text-left">Lesson Plan</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {templates.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-slate-500">
                        No stored template rows were found for this micro schedule and version yet. Run mapping once to create them.
                      </td>
                    </tr>
                  )}
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-3 py-2">{template.session_label}</td>
                      <td className="px-3 py-2">{template.chapter_label || '-'}</td>
                      <td className="px-3 py-2">{template.planner_title || '-'}</td>
                      <td className="px-3 py-2">
                        {template.lesson_plan_file_storage_path ? (
                          <button type="button" onClick={() => handleDownloadLessonPlanner(template.lesson_planner_upload_id, template.lesson_plan_file_name)} className="text-[#073b8a] underline underline-offset-2">
                            {template.lesson_plan_file_name || 'Download'}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
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
