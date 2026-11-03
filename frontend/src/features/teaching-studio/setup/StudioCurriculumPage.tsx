import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeachingStudioShell from '../components/TeachingStudioShell';
import { setupErrorMessage, studioSetupApi } from '../api/studioSetupApi';

interface FormState {
  boardName: string; boardCode: string;
  programName: string; programCode: string;
  gradeNumber: number;
  subjectName: string; subjectCode: string;
  chapterName: string; chapterNumber: number;
  topicName: string; topicNumber: number;
  subtopicName: string;
}

const initialForm: FormState = {
  boardName: '', boardCode: '', programName: '', programCode: '', gradeNumber: 1,
  subjectName: '', subjectCode: '', chapterName: '', chapterNumber: 1,
  topicName: '', topicNumber: 1, subtopicName: '',
};

const textFields: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
  { key: 'boardName', label: 'Board', placeholder: 'Example: CBSE' },
  { key: 'boardCode', label: 'Board code', placeholder: 'Example: CBSE' },
  { key: 'programName', label: 'Program', placeholder: 'Example: Future Foundation' },
  { key: 'programCode', label: 'Program code', placeholder: 'Example: FF-CBSE' },
  { key: 'subjectName', label: 'Subject', placeholder: 'Example: Physics' },
  { key: 'subjectCode', label: 'Subject code', placeholder: 'Example: PHY-CBSE-10' },
  { key: 'chapterName', label: 'Chapter', placeholder: 'Enter chapter name' },
  { key: 'topicName', label: 'Topic', placeholder: 'Enter topic name' },
  { key: 'subtopicName', label: 'Subtopic', placeholder: 'Enter subtopic name' },
];

export default function StudioCurriculumPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (key: keyof FormState, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(''); setSuccess('');
  };

  const valid = textFields.every(({ key }) => String(form[key]).trim())
    && form.gradeNumber > 0 && form.chapterNumber > 0 && form.topicNumber > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await studioSetupApi.createHierarchy({
        ...form,
        boardName: form.boardName.trim(), boardCode: form.boardCode.trim(),
        programName: form.programName.trim(), programCode: form.programCode.trim(),
        subjectName: form.subjectName.trim(), subjectCode: form.subjectCode.trim(),
        chapterName: form.chapterName.trim(), topicName: form.topicName.trim(),
        subtopicName: form.subtopicName.trim(),
      });
      setSuccess('Curriculum hierarchy created successfully. You can now open it in Studio Sessions.');
      setForm(initialForm);
    } catch (requestError) {
      setError(setupErrorMessage(requestError));
    } finally { setSaving(false); }
  };

  return (
    <TeachingStudioShell title="Curriculum" subtitle="Create a complete curriculum path for Teaching Studio.">
      <form onSubmit={submit} className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Curriculum details</h2>
          <p className="mb-5 mt-1 text-sm text-slate-600">All levels are created in order from Board through Subtopic.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {textFields.map(({ key, label, placeholder }) => (
              <label key={key} className="text-sm font-medium text-slate-700">
                {label}
                <input value={String(form[key])} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
              </label>
            ))}
            <label className="text-sm font-medium text-slate-700">Grade<input type="number" min="1" value={form.gradeNumber} onChange={(event) => update('gradeNumber', Number(event.target.value))} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700">Chapter number<input type="number" min="1" value={form.chapterNumber} onChange={(event) => update('chapterNumber', Number(event.target.value))} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700">Topic number<input type="number" min="1" value={form.topicNumber} onChange={(event) => update('topicNumber', Number(event.target.value))} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
          </div>
          {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {success ? <p role="status" className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p> : null}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => navigate('/content-authorizer/studio')} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
            <button type="submit" disabled={!valid || saving} className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Creating hierarchy...' : 'Create curriculum'}</button>
          </div>
        </section>
      </form>
    </TeachingStudioShell>
  );
}
