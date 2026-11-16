import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Link2, LoaderCircle, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import {
  createStudioResource,
  studioResourceTypeLabel,
  type StudioResourceSummary,
} from '../api/studioResourcesApi';
import type { InsertResourceType } from './StudioInsertResourceButtons';

const MAX_FILE_SIZE = 250 * 1024 * 1024;
const ACCEPT_BY_TYPE: Record<InsertResourceType, string> = {
  image: '.png,.jpg,.jpeg,.gif,.webp,.svg,image/png,image/jpeg,image/gif,image/webp,image/svg+xml',
  video: '.mp4,.webm,video/mp4,video/webm',
  simulation: '.zip,.html,.htm,application/zip,text/html',
  external_link: '',
  zip: '.zip,application/zip',
  scorm: '.zip,application/zip',
  model_3d: '.glb,model/gltf-binary,application/octet-stream',
};

const defaultName = (type: InsertResourceType, file: File | null, url: string) => {
  if (file) return file.name.replace(/\.[^.]+$/, '') || file.name;
  if (url.trim()) {
    try {
      return new URL(url.trim()).hostname.replace(/^www\./, '') || studioResourceTypeLabel(type);
    } catch {
      return studioResourceTypeLabel(type);
    }
  }
  return studioResourceTypeLabel(type);
};

type Props = {
  type: InsertResourceType;
  onUploaded: (resource: StudioResourceSummary) => void;
};

export default function StudioResourceInsertUpload({ type, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [duration, setDuration] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const urlOnly = type === 'external_link';
  const accept = useMemo(() => ACCEPT_BY_TYPE[type], [type]);

  useEffect(() => {
    setFile(null);
    setExternalUrl('');
    setName('');
    setDescription('');
    setWidth('');
    setHeight('');
    setDuration('');
    setEntryPoint('');
    setAdvancedOpen(false);
    setError('');
  }, [type]);

  const positiveNumber = (label: string, value: string) => {
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be greater than zero.`);
    return parsed;
  };

  const submit = async () => {
    setError('');
    try {
      if (urlOnly) {
        if (!externalUrl.trim()) throw new Error('External URL is required.');
        const parsed = new URL(externalUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an HTTP or HTTPS URL.');
      } else {
        if (!file) throw new Error('Choose a Resource file.');
        if (file.size > MAX_FILE_SIZE) throw new Error('The file must be 250 MB or smaller.');
      }
      const resolvedWidth = positiveNumber('Width', width);
      const resolvedHeight = positiveNumber('Height', height);
      const resolvedDuration = positiveNumber('Duration', duration);
      setSubmitting(true);
      const resource = await createStudioResource({
        name: name.trim() || defaultName(type, file, externalUrl),
        description: description.trim(),
        resourceType: type,
        file: urlOnly ? null : file,
        externalUrl: urlOnly ? externalUrl.trim() : '',
        width: resolvedWidth,
        height: resolvedHeight,
        durationSeconds: resolvedDuration,
        entryPoint: entryPoint.trim(),
      });
      toast.success(`${resource.name} uploaded to Resources.`);
      onUploaded(resource);
    } catch (uploadError) {
      const message = uploadError instanceof Error && !('response' in uploadError)
        ? uploadError.message
        : getApiErrorDetails(uploadError, 'Unable to upload the Resource.').message;
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-slate-900">Upload {studioResourceTypeLabel(type)}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">The upload is saved in Resources and added directly to the current Screen.</p>
      </div>

      <label className="block text-sm font-semibold text-slate-700">Resource name
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={defaultName(type, file, externalUrl)} maxLength={250} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-700" />
      </label>

      {urlOnly ? (
        <label className="block text-sm font-semibold text-slate-700">
          External URL
          <div className="relative mt-1.5">
            <Link2 className="absolute left-3 top-3 text-slate-400" size={17} />
            <input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://example.com/resource" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 font-normal outline-none focus:border-blue-700" />
          </div>
        </label>
      ) : (
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center hover:border-blue-400 hover:bg-blue-50/40">
          <UploadCloud className="mx-auto text-blue-800" size={32} />
          <span className="mt-2 block break-all text-sm font-semibold text-slate-800">{file ? file.name : `Choose ${studioResourceTypeLabel(type)} file`}</span>
          <span className="mt-1 block text-xs text-slate-500">Maximum file size: 250 MB</span>
          <input type="file" accept={accept} onChange={(event) => setFile(event.target.files?.[0] || null)} className="sr-only" />
        </label>
      )}

      <button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:underline" aria-expanded={advancedOpen}>
        Advanced options
        <ChevronDown size={15} className={`transition ${advancedOpen ? 'rotate-180' : ''}`} />
      </button>

      {advancedOpen ? (
        <div className="space-y-3 border-l-2 border-blue-100 pl-3">
          <label className="block text-xs font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-slate-700">Width<input type="number" min="1" value={width} onChange={(event) => setWidth(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-slate-700">Height<input type="number" min="1" value={height} onChange={(event) => setHeight(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-slate-700">Duration (seconds)<input type="number" min="1" value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-slate-700">Entry point<input value={entryPoint} onChange={(event) => setEntryPoint(event.target.value)} placeholder="index.html" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal" /></label>
          </div>
        </div>
      ) : null}

      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button type="button" onClick={() => void submit()} disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {submitting ? <LoaderCircle size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {submitting ? 'Uploading...' : 'Upload and add to Screen'}
      </button>
    </div>
  );
}
