import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import TeachingSessionsShell from '@/features/teaching-sessions/components/TeachingSessionsShell';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type { GradeOption, MicroScheduleRow, ProgramOption, ProgramUpload, SubjectOption } from '@/features/teaching-sessions/types';

export default function ProgramMicroScheduleUploadPage() {
  const [programId, setProgramId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [versionNo, setVersionNo] = useState('1');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [uploads, setUploads] = useState<ProgramUpload[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<number | null>(null);
  const [rows, setRows] = useState<MicroScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const getProgramLabel = (uploadProgramId: number) => {
    const program = programs.find((item) => Number(item.id) === Number(uploadProgramId));
    if (!program) return `Program ${uploadProgramId}`;
    return program.code ? `${program.name} (${program.code})` : program.name;
  };

  const getGradeLabel = (upload: ProgramUpload) => {
    if (upload.grade_number) return `Grade ${upload.grade_number}`;
    const grade = grades.find((item) => Number(item.id) === Number(upload.grade_id));
    return grade ? `Grade ${grade.grade_number}` : `Grade ${upload.grade_id}`;
  };

  const getSubjectLabel = (upload: ProgramUpload) => {
    if (upload.subject_name) {
      return upload.subject_code ? `${upload.subject_name} (${upload.subject_code})` : upload.subject_name;
    }
    const subject = subjects.find((item) => Number(item.id) === Number(upload.subject_id));
    if (!subject) return `Subject ${upload.subject_id}`;
    return subject.code ? `${subject.name} (${subject.code})` : subject.name;
  };

  const loadPrograms = async () => {
    try {
      setProgramsLoading(true);
      const data = await teachingSessionsApi.listPrograms();
      setPrograms(data);
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
      const data = await teachingSessionsApi.listGrades(nextProgramId);
      setGrades(data);
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
      const data = await teachingSessionsApi.listSubjects(nextProgramId, nextGradeId);
      setSubjects(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load subjects');
    } finally {
      setSubjectsLoading(false);
    }
  };

  const loadUploads = async () => {
    if (!programId || !gradeId || !subjectId) {
      setUploads([]);
      setSelectedUploadId(null);
      return;
    }

    try {
      setLoading(true);
      const data = await teachingSessionsApi.listMicroScheduleUploads({
        programId: programId || undefined,
        gradeId: gradeId || undefined,
        subjectId: subjectId || undefined,
      });
      setUploads(data);
      setSelectedUploadId((current) => {
        if (current && data.some((upload) => upload.id === current)) return current;
        return null;
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load micro schedule uploads');
    } finally {
      setLoading(false);
    }
  };

  const loadRows = async (uploadId: number) => {
    try {
      setRowsLoading(true);
      const data = await teachingSessionsApi.getMicroScheduleRows(uploadId);
      setRows(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load parsed rows');
    } finally {
      setRowsLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    setGradeId('');
    setSubjectId('');
    setSubjects([]);
    loadGrades(programId);
  }, [programId]);

  useEffect(() => {
    setSubjectId('');
    loadSubjects(programId, gradeId);
  }, [programId, gradeId]);

  useEffect(() => {
    loadUploads();
  }, [programId, gradeId, subjectId]);

  useEffect(() => {
    if (selectedUploadId) {
      loadRows(selectedUploadId);
    } else {
      setRows([]);
    }
  }, [selectedUploadId]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!programId || !gradeId || !subjectId || !file) {
      toast.error('Program, grade, subject, and file are required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('program_id', programId);
      formData.append('grade_id', gradeId);
      formData.append('subject_id', subjectId);
      formData.append('version_no', versionNo || '1');
      formData.append('notes', notes);
      formData.append('file', file);
      await teachingSessionsApi.uploadMicroSchedule(formData);
      toast.success('Micro schedule uploaded');
      setFile(null);
      setNotes('');
      await loadUploads();
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload micro schedule');
    }
  };

  return (
    <TeachingSessionsShell
      title="Micro Schedule Uploads"
      subtitle="Upload and review shared program, grade, and subject-level micro schedules."
    >
      <div className="space-y-6">
        <SectionCard title="Upload Micro Schedule" subtitle="Program, grade, and subject-wise Excel uploads for content planning.">
          <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-3">
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
              Version
              <input value={versionNo} onChange={(e) => setVersionNo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              Notes
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              Excel File
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <button className="rounded-xl bg-[#073b8a] px-4 py-3 text-sm font-semibold text-white md:col-span-2">Upload Micro Schedule</button>
          </form>
        </SectionCard>

        <SectionCard title="Upload History" subtitle="Click an existing upload to review the full parsed schedule.">
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="space-y-3">
              {loading && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Loading uploads...</div>}
              {!loading && uploads.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No micro schedule uploads yet.</div>}
              {uploads.map((upload) => (
                <button
                  type="button"
                  key={upload.id}
                  onClick={() =>
                    setSelectedUploadId((current) => (current === upload.id ? null : upload.id))
                  }
                  className={`w-full rounded-2xl border p-4 text-left ${selectedUploadId === upload.id ? 'border-[#073b8a] bg-sky-50' : 'border-slate-200 bg-white'}`}
                >
                  <div className="text-sm font-semibold text-slate-900">{upload.file_name}</div>
                  <div className="mt-1 text-xs text-slate-500">{getProgramLabel(upload.program_id)} | {getGradeLabel(upload)} | {getSubjectLabel(upload)} | v{upload.version_no} | {upload.status}</div>
                </button>
              ))}
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Session</th>
                      <th className="px-3 py-2 text-left">Chapter</th>
                      <th className="px-3 py-2 text-left">Learning Goal</th>
                      <th className="px-3 py-2 text-left">Topic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rowsLoading && (
                      <tr><td colSpan={4} className="px-3 py-4 text-slate-500">Loading parsed rows...</td></tr>
                    )}
                    {!rowsLoading && rows.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-4 text-slate-500">Select an upload to preview rows.</td></tr>
                    )}
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2">{row.session_label}</td>
                        <td className="px-3 py-2">{row.chapter_label}</td>
                        <td className="px-3 py-2">{row.learning_goal || '-'}</td>
                        <td className="px-3 py-2">{row.topic_label || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </TeachingSessionsShell>
  );
}
