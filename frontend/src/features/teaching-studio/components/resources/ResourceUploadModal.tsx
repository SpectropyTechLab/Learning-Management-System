import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Link2, UploadCloud, X } from 'lucide-react';
import {
  STUDIO_RESOURCE_TYPES,
  studioResourceTypeLabel,
  type StudioResourceSummary,
  type StudioResourceType,
  type StudioResourceUploadInput,
} from '../../api/studioResourcesApi';

const MAX_FILE_SIZE = 250 * 1024 * 1024;
const FILE_ONLY_TYPES = new Set<StudioResourceType>(['html', 'zip', 'scorm', 'presentation']);
const RESOURCE_FORMATS: Record<StudioResourceType, { short: string; help: string }> = {
  image: {
    short: 'PNG, JPG, JPEG, GIF, WebP, SVG',
    help: 'Upload a PNG, JPG/JPEG, GIF, WebP or SVG image, or provide a direct image URL.',
  },
  video: {
    short: 'MP4, WebM',
    help: 'For reliable browser playback, upload an MP4 (H.264/AAC) or WebM video.',
  },
  animation: {
    short: 'GIF, MP4, WebM, JSON',
    help: 'Upload an animated GIF, MP4, WebM or JSON animation file. JSON animation preview support may depend on its format.',
  },
  simulation: {
    short: 'HTML, HTM, ZIP',
    help: 'Upload a standalone HTML/HTM file or a ZIP browser package containing an HTML entry point.',
  },
  external_link: {
    short: 'HTTP or HTTPS URL',
    help: 'Enter a public HTTP or HTTPS address. Embedded display depends on the destination website allowing iframes.',
  },
  html: {
    short: 'HTML, HTM',
    help: 'Upload a standalone .html or .htm file.',
  },
  zip: {
    short: 'ZIP with index.html',
    help: 'Upload a browser package ZIP containing index.html, or specify its HTML entry point below.',
  },
  scorm: {
    short: 'SCORM 1.2 or 2004 ZIP',
    help: 'Upload a valid SCORM 1.2 or SCORM 2004 package as a .zip file.',
  },
  presentation: {
    short: 'PPSX',
    help: 'Upload a Microsoft PowerPoint Show in .ppsx format.',
  },
};

interface ResourceUploadModalProps {
  open: boolean;
  mode: 'create' | 'version';
  resource?: StudioResourceSummary | null;
  submitting: boolean;
  serverError?: string;
  onClose: () => void;
  onSubmit: (input: StudioResourceUploadInput) => Promise<void>;
}

export default function ResourceUploadModal({
  open,
  mode,
  resource,
  submitting,
  serverError,
  onClose,
  onSubmit,
}: ResourceUploadModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<StudioResourceType>('image');
  const [sourceMode, setSourceMode] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [duration, setDuration] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!open) return;
    const nextType = resource?.resource_type || 'image';
    setName('');
    setDescription('');
    setResourceType(nextType);
    setSourceMode(nextType === 'external_link' ? 'url' : 'file');
    setFile(null);
    setExternalUrl('');
    setWidth('');
    setHeight('');
    setDuration('');
    setEntryPoint('');
    setAdvancedOpen(false);
    setValidationError('');
  }, [open, resource]);

  const effectiveType = mode === 'version' && resource ? resource.resource_type : resourceType;
  const fileOnly = FILE_ONLY_TYPES.has(effectiveType);
  const urlOnly = effectiveType === 'external_link';
  const effectiveSourceMode = fileOnly ? 'file' : urlOnly ? 'url' : sourceMode;
  const title = mode === 'create' ? 'Add Resource' : `Upload new version`;
  const subtitle = mode === 'create'
    ? 'Create a reusable Studio Resource and its first immutable version.'
    : `Add a new immutable version of ${resource?.name || 'this Resource'}.`;

  const accept = useMemo(() => ({
    image: '.png,.jpg,.jpeg,.gif,.webp,.svg,image/png,image/jpeg,image/gif,image/webp,image/svg+xml',
    video: '.mp4,.webm,video/mp4,video/webm',
    animation: '.gif,.mp4,.webm,.json,image/gif,video/mp4,video/webm,application/json',
    simulation: '.zip,.html,.htm,application/zip,text/html',
    external_link: '',
    html: '.html,.htm,text/html',
    zip: '.zip,application/zip',
    scorm: '.zip,application/zip',
    presentation: '.ppsx,application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    model_3d: '.glb,model/gltf-binary,application/octet-stream',
  }[effectiveType]), [effectiveType]);

  if (!open) return null;

  const numberValue = (value: string) => value ? Number(value) : null;

  const validate = () => {
    if (mode === 'create' && !name.trim()) return 'Resource name is required.';
    if (effectiveSourceMode === 'file' && !file) return 'Choose a Resource file.';
    if (file && file.size > MAX_FILE_SIZE) return 'The file must be 250 MB or smaller.';
    if (effectiveType === 'presentation' && file && !file.name.toLowerCase().endsWith('.ppsx')) {
      return 'PowerPoint Show Resources require a .ppsx file.';
    }
    if (effectiveType === 'model_3d') {
      const sourceName = file?.name || externalUrl;
      if (!sourceName.toLowerCase().split('?')[0].endsWith('.glb')) {
        return '3D Model Resources require a self-contained .glb file or direct .glb URL.';
      }
    }
    if (effectiveSourceMode === 'url') {
      if (!externalUrl.trim()) return 'External URL is required.';
      try {
        const parsed = new URL(externalUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) return 'Use an HTTP or HTTPS URL.';
      } catch {
        return 'Enter a valid HTTP or HTTPS URL.';
      }
    }
    for (const [label, value] of [['Width', width], ['Height', height], ['Duration', duration]]) {
      if (value && (!Number.isFinite(Number(value)) || Number(value) <= 0)) {
        return `${label} must be greater than zero.`;
      }
    }
    return '';
  };

  const submit = async () => {
    const message = validate();
    setValidationError(message);
    if (message) return;
    await onSubmit({
      name,
      description,
      resourceType: effectiveType,
      file: effectiveSourceMode === 'file' ? file : null,
      externalUrl: effectiveSourceMode === 'url' ? externalUrl : '',
      width: numberValue(width),
      height: numberValue(height),
      durationSeconds: numberValue(duration),
      entryPoint,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="resource-upload-title">
      <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="resource-upload-title" className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Close Resource form"><X size={20} /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {mode === 'create' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Resource name
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={250} placeholder="e.g. Motion Simulation" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-semibold text-slate-700">Resource type
                <select value={resourceType} onChange={(event) => { const value = event.target.value as StudioResourceType; setResourceType(value); setSourceMode(value === 'external_link' ? 'url' : 'file'); setFile(null); setExternalUrl(''); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100">
                  {STUDIO_RESOURCE_TYPES.filter((type) => type !== 'html').map((type) => <option key={type} value={type}>{studioResourceTypeLabel(type)} — {RESOURCE_FORMATS[type].short}</option>)}
                </select>
                <span className="mt-1.5 block text-xs font-normal leading-5 text-slate-500">{RESOURCE_FORMATS[resourceType].help}</span>
              </label>
              <div className="text-sm font-semibold text-slate-700">Status
                <div className="mt-1.5 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5 font-normal text-slate-600">Active on creation</div>
              </div>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description <span className="font-normal text-slate-400">(optional)</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Explain how this Resource supports teaching content." className="mt-1.5 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="font-semibold text-blue-950">{resource?.name}</p>
              <p className="mt-1 text-sm text-blue-800">{resource ? studioResourceTypeLabel(resource.resource_type) : ''} · Current version {resource?.latest_version?.version_number ?? '—'}</p>
            </div>
          )}

          {!fileOnly && !urlOnly ? (
            <div>
              <p className="text-sm font-semibold text-slate-700">Source</p>
              <div className="mt-2 inline-flex rounded-lg border border-gray-200 bg-slate-50 p-1">
                <button type="button" onClick={() => setSourceMode('file')} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${effectiveSourceMode === 'file' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600'}`}><UploadCloud size={16} />Upload file</button>
                <button type="button" onClick={() => setSourceMode('url')} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${effectiveSourceMode === 'url' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600'}`}><Link2 size={16} />External URL</button>
              </div>
            </div>
          ) : <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{studioResourceTypeLabel(effectiveType)} Resources require {urlOnly ? 'an external URL' : 'a file upload'}.</p>}

          {effectiveSourceMode === 'file' ? (
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
              <UploadCloud className="mx-auto text-blue-800" size={34} />
              <span className="mt-3 block font-semibold text-slate-800">{file ? file.name : 'Choose a Resource file'}</span>
              <span className="mt-1 block text-sm text-slate-600">Supported: {RESOURCE_FORMATS[effectiveType].short}</span>
              <span className="mt-0.5 block text-xs text-slate-500">Maximum file size: 250 MB</span>
              <input type="file" accept={accept} onChange={(event) => setFile(event.target.files?.[0] || null)} className="sr-only" />
            </label>
          ) : (
            <label className="block text-sm font-semibold text-slate-700">External URL
              <div className="relative mt-1.5"><Link2 className="absolute left-3 top-3 text-slate-400" size={18} /><input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://example.com/resource" className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 font-normal text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></div>
              {effectiveType === 'image' ? <span className="mt-1.5 block text-xs font-normal text-slate-500">Use the direct image file URL, not a Google/Bing image-search or result-page URL.</span> : null}
            </label>
          )}

          <div className="rounded-xl border border-gray-200">
            <button type="button" onClick={() => setAdvancedOpen((value) => !value)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-700"><span>Advanced details <span className="font-normal text-slate-400">(optional)</span></span><ChevronDown size={18} className={`transition ${advancedOpen ? 'rotate-180' : ''}`} /></button>
            {advancedOpen ? <div className="grid gap-4 border-t border-gray-200 p-4 sm:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">Width<input type="number" min="1" value={width} onChange={(event) => setWidth(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium text-slate-700">Height<input type="number" min="1" value={height} onChange={(event) => setHeight(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium text-slate-700">Duration (seconds)<input type="number" min="1" value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-3">Entry point<input value={entryPoint} onChange={(event) => setEntryPoint(event.target.value)} placeholder="index.html" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
            </div> : null}
          </div>

          {(validationError || serverError) ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{validationError || serverError}</div> : null}
        </div>

        <footer className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-gray-50 disabled:opacity-40">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={submitting} className="rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? (mode === 'create' ? 'Adding Resource…' : 'Uploading Version…') : (mode === 'create' ? 'Add Resource' : 'Upload Version')}</button>
        </footer>
      </div>
    </div>
  );
}
