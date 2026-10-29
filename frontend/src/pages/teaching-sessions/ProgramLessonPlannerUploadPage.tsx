import axios from 'axios';
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
  ProgramUpload,
  SubjectOption,
} from '@/features/teaching-sessions/types';

export default function ProgramLessonPlannerUploadPage() {
  const [programId, setProgramId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [versionNo, setVersionNo] = useState('1');
  const [notes, setNotes] = useState('');
  const [targetSessionNo, setTargetSessionNo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [microUploads, setMicroUploads] = useState<ProgramUpload[]>([]);
  const [selectedMicroUploadId, setSelectedMicroUploadId] = useState('');
  const [checklist, setChecklist] = useState<PlannerChecklist | null>(null);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const getUploadErrorMessage = (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return 'Failed to upload lesson planner';
    }

    return (
      error.response?.data?.error ||
      error.message ||
      'Failed to upload lesson planner'
    );
  };

  const selectedChecklistSession = useMemo(
    () => checklist?.sessions.find((session) => Number(session.session_no) === Number(targetSessionNo)) ?? null,
    [checklist, targetSessionNo]
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

  const loadMicroUploads = async () => {
    if (!programId || !gradeId || !subjectId) {
      setMicroUploads([]);
      setSelectedMicroUploadId('');
      setChecklist(null);
      return;
    }

    try {
      setUploadsLoading(true);
      const data = await teachingSessionsApi.listMicroScheduleUploads({
        programId,
        gradeId,
        subjectId,
      });
      setMicroUploads(data);
      setSelectedMicroUploadId((current) =>
        current && data.some((upload) => Number(upload.id) === Number(current)) ? current : String(data[0]?.id ?? '')
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to load micro schedule uploads');
    } finally {
      setUploadsLoading(false);
    }
  };

  const loadChecklist = async (microUploadId: string) => {
    if (!microUploadId) {
      setChecklist(null);
      return;
    }

    try {
      setChecklistLoading(true);
      const data = await teachingSessionsApi.getPlannerChecklist(microUploadId);
      setChecklist(data);
      setTargetSessionNo((current) => {
        if (current && data.sessions.some((session) => Number(session.session_no) === Number(current))) {
          return current;
        }
        return String(data.sessions.find((session) => session.planner_status !== 'complete')?.session_no ?? data.sessions[0]?.session_no ?? '');
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load planner checklist');
    } finally {
      setChecklistLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    setGradeId('');
    setSubjectId('');
    setMicroUploads([]);
    setSelectedMicroUploadId('');
    setChecklist(null);
    loadGrades(programId);
  }, [programId]);

  useEffect(() => {
    setSubjectId('');
    setMicroUploads([]);
    setSelectedMicroUploadId('');
    setChecklist(null);
    loadSubjects(programId, gradeId);
  }, [programId, gradeId]);

  useEffect(() => {
    setMicroUploads([]);
    setSelectedMicroUploadId('');
    setChecklist(null);
    loadMicroUploads();
  }, [programId, gradeId, subjectId]);

  useEffect(() => {
    loadChecklist(selectedMicroUploadId);
  }, [selectedMicroUploadId]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!programId || !gradeId || !subjectId || !selectedMicroUploadId || !targetSessionNo || !file) {
      toast.error('Program, grade, subject, micro schedule, target session, and planner file are required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('program_id', programId);
      formData.append('grade_id', gradeId);
      formData.append('subject_id', subjectId);
      formData.append('micro_schedule_upload_id', selectedMicroUploadId);
      formData.append('target_session_no', targetSessionNo);
      formData.append('version_no', versionNo || '1');
      formData.append('notes', notes);
      formData.append('file', file);
      await teachingSessionsApi.uploadLessonPlanner(formData);
      toast.success(`Lesson planner uploaded for SESSION-${targetSessionNo}`);
      setFile(null);
      setNotes('');
      await loadChecklist(selectedMicroUploadId);
    } catch (error) {
      console.error(error);
      toast.error(getUploadErrorMessage(error));
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
      title="Lesson Planner Uploads"
      subtitle="Upload exactly one lesson planner per parsed micro-schedule session before publishing templates."
    >
      <div className="space-y-6">
        <SectionCard title="Select Micro Schedule Scope" subtitle="Choose the academic scope and then the exact micro schedule version that defines required planner sessions.">
          <div className="grid gap-4 md:grid-cols-4">
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
              Micro Schedule Version
              <select value={selectedMicroUploadId} onChange={(e) => setSelectedMicroUploadId(e.target.value)} disabled={!subjectId || uploadsLoading} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">{!subjectId ? 'Select a subject first' : uploadsLoading ? 'Loading micro schedules...' : 'Select a micro schedule'}</option>
                {microUploads.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    {upload.file_name} | v{upload.version_no}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Upload Session Planner" subtitle="Each upload must contain exactly one planner for the selected target session.">
          <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-slate-600">
              Target Session
              <select value={targetSessionNo} onChange={(e) => setTargetSessionNo(e.target.value)} disabled={!checklist} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">{checklist ? 'Select a session' : 'Choose a micro schedule first'}</option>
                {checklist?.sessions.map((session) => (
                  <option key={session.micro_schedule_row_id} value={session.session_no}>
                    {session.session_label} - {session.topic_label || session.chapter_label || 'No topic'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Version
              <input value={versionNo} onChange={(e) => setVersionNo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-600">
              Planner File
              <input type="file" accept=".docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              <div className="mt-2 text-xs text-slate-500">
                Use a single-session `.docx` whose content clearly includes the selected session number, for example `SESSION-{targetSessionNo || 'X'}`, plus a title/topic section.
              </div>
            </label>
            <label className="text-sm text-slate-600 md:col-span-3">
              Notes
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {selectedChecklistSession ? (
                <>
                  <div className="font-semibold text-slate-900">{selectedChecklistSession.session_label}</div>
                  <div className="mt-1">
                    {selectedChecklistSession.topic_label || selectedChecklistSession.chapter_label || 'No chapter/topic'} | Current status:{' '}
                    <span className="font-medium">{selectedChecklistSession.planner_status.replace(/_/g, ' ')}</span>
                  </div>
                  {selectedChecklistSession.issue ? <div className="mt-1 text-rose-600">{selectedChecklistSession.issue}</div> : null}
                </>
              ) : (
                'Select a target session to see its current planner status.'
              )}
            </div>
            <button className="rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white md:col-span-3">Upload Session Planner</button>
          </form>
        </SectionCard>

        <SectionCard title="Planner Checklist" subtitle="All required sessions must be complete before template mapping and publish can proceed.">
          {checklistLoading && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Loading planner checklist...</div>
          )}
          {!checklistLoading && !checklist && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Select a micro schedule upload to review required planner sessions.</div>
          )}
          {checklist ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Required Sessions</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{checklist.total_required_sessions}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Completed</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{checklist.completed_sessions}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Publish Ready</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{checklist.is_publish_ready ? 'Yes' : 'No'}</div>
                </div>
              </div>
              <div className="space-y-3 md:hidden">
                {checklist.sessions.map((session) => (
                  <div key={`mobile-${session.micro_schedule_row_id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{session.session_label}</div>
                        <div className="mt-1 text-xs text-slate-500">{session.chapter_label || 'No chapter'}</div>
                      </div>
                      <StatusBadge status={session.planner_status} />
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <div><span className="font-medium text-slate-900">Topic:</span> {session.topic_label || '-'}</div>
                      <div>
                        <span className="font-medium text-slate-900">Planner:</span>{' '}
                        {session.lesson_plan_file_storage_path ? (
                          <button type="button" onClick={() => handleDownloadLessonPlanner(session.lesson_planner_upload_id, session.lesson_plan_file_name)} className="text-[#073b8a] underline underline-offset-2">
                            {session.lesson_plan_file_name || 'Download'}
                          </button>
                        ) : (
                          '-'
                        )}
                      </div>
                      <div><span className="font-medium text-slate-900">Issue:</span> {session.issue || '-'}</div>
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
                        <th className="px-3 py-2 text-left">Topic</th>
                        <th className="px-3 py-2 text-left">Planner</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {checklist.sessions.map((session) => (
                        <tr key={session.micro_schedule_row_id}>
                          <td className="px-3 py-2 font-medium text-slate-900">{session.session_label}</td>
                          <td className="px-3 py-2">{session.chapter_label || '-'}</td>
                          <td className="px-3 py-2">{session.topic_label || '-'}</td>
                          <td className="px-3 py-2">
                            {session.lesson_plan_file_storage_path ? (
                              <button type="button" onClick={() => handleDownloadLessonPlanner(session.lesson_planner_upload_id, session.lesson_plan_file_name)} className="text-[#073b8a] underline underline-offset-2">
                                {session.lesson_plan_file_name || 'Download'}
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={session.planner_status} />
                          </td>
                          <td className="px-3 py-2 text-slate-600">{session.issue || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </SectionCard>
      </div>
    </TeachingSessionsShell>
  );
}
