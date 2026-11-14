import { useEffect, useState } from 'react';
import { Download, ExternalLink, Loader2, PackageOpen, Presentation, RefreshCw } from 'lucide-react';
import { getApiErrorDetails } from '@/lib/api';
import { getStudioObjectPreview, getStudioResourceDownload, getStudioResourcePreview, launchStudioResourceVersion, type StudioObjectPreviewDescriptor, type StudioResourceType, type StudioResourceVersion } from '../../api/studioResourcesApi';
import Model3DViewer from './Model3DViewer';
import EmbeddedObjectViewer from './EmbeddedObjectViewer';
import { ExecutableResourceFrame, ExternalLinkFrame } from './StudioResourceFrames';

interface StudioResourcePlayerProps {
  resourceType: StudioResourceType;
  version: StudioResourceVersion;
  mode?: 'preview' | 'canvas' | 'runtime';
  selected?: boolean;
  className?: string;
  mediaTransform?: {
    fit?: 'contain' | 'cover';
    scale?: number;
    x?: number;
    y?: number;
  };
}

export default function StudioResourcePlayer({ resourceType, version, mode = 'preview', selected = false, className = '', mediaTransform }: StudioResourcePlayerProps) {
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [objectPreview, setObjectPreview] = useState<StudioObjectPreviewDescriptor | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setSource(''); setObjectPreview(null);
    const resolveSource = async () => {
      if (resourceType === 'document') {
        const descriptor = await getStudioObjectPreview(version.id);
        if (active) setObjectPreview(descriptor);
        return descriptor.url || '';
      }
      if (version.external_url) return version.external_url;
      if (resourceType === 'presentation') return (await getStudioResourceDownload(version.id)).url;
      if (['html', 'zip', 'scorm', 'simulation'].includes(resourceType)) {
        const launch = await launchStudioResourceVersion(version.id);
        if (!launch.launchable || !launch.launch_url) throw new Error(launch.message || 'This package cannot be previewed.');
        return launch.launch_url;
      }
      return (await getStudioResourcePreview(version.id)).url;
    };
    void resolveSource().then((value) => { if (active) setSource(value); }).catch((loadError) => { if (active) setError(getApiErrorDetails(loadError, loadError instanceof Error ? loadError.message : 'Unable to open Resource preview.').message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey, resourceType, version.external_url, version.id]);

  const mediaPreviewFailed = () => setError(version.external_url
    ? 'This external URL is not an embeddable media file. Use a direct image/video URL or upload the file.'
    : 'The protected preview link expired or could not load. Retry to request a fresh link.');

  if (loading) return <div className={`grid place-items-center bg-slate-950 text-white ${className}`}><span className="inline-flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={18} />Preparing preview…</span></div>;
  if (error) return <div className={`grid place-items-center bg-slate-950 p-6 text-center text-white ${className}`}><div><PackageOpen className="mx-auto text-slate-400" size={42} /><p className="mt-3 font-semibold">Preview unavailable</p><p className="mt-1 max-w-md text-sm text-slate-300">{error}</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900"><RefreshCw size={15} />Retry</button>{version.external_url ? <a href={version.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-3 py-2 text-sm font-semibold text-white"><ExternalLink size={15} />Open source URL</a> : null}</div></div></div>;

  const commonTitle = `${resourceType} Resource version ${version.version_number}`;
  const transformedMediaStyle = mode === 'canvas' ? {
    width: '100%',
    height: '100%',
    maxWidth: 'none',
    maxHeight: 'none',
    objectFit: mediaTransform?.fit === 'cover' ? 'cover' as const : 'contain' as const,
    transform: `translate(${Number(mediaTransform?.x) || 0}%, ${Number(mediaTransform?.y) || 0}%) scale(${Math.max(1, Number(mediaTransform?.scale) || 1)})`,
    transformOrigin: 'center',
  } : undefined;
  if (resourceType === 'document' && objectPreview) return <EmbeddedObjectViewer descriptor={objectPreview} className={className} />;
  if (resourceType === 'image') return <div className={`grid place-items-center overflow-hidden ${mode === 'canvas' ? 'bg-transparent' : 'bg-slate-950'} ${className}`}><img src={source} alt={commonTitle} onError={mediaPreviewFailed} className={mode === 'canvas' ? '' : 'max-h-full max-w-full object-contain'} style={transformedMediaStyle} /></div>;
  if (resourceType === 'video' || (resourceType === 'animation' && version.mime_type?.startsWith('video/'))) return <div className={`grid place-items-center overflow-hidden bg-black ${className}`}><video src={source} controls playsInline onError={mediaPreviewFailed} className={mode === 'canvas' ? '' : 'max-h-full max-w-full'} style={transformedMediaStyle} /></div>;
  if (resourceType === 'animation' && version.mime_type?.startsWith('image/')) return <div className={`grid place-items-center overflow-hidden ${mode === 'canvas' ? 'bg-transparent' : 'bg-slate-950'} ${className}`}><img src={source} alt={commonTitle} onError={mediaPreviewFailed} className={mode === 'canvas' ? '' : 'max-h-full max-w-full object-contain'} style={transformedMediaStyle} /></div>;
  if (resourceType === 'model_3d') return <Model3DViewer src={source} alt={commonTitle} className={className} mode={mode} selected={selected} />;
  if (resourceType === 'presentation') return <div className={`grid place-items-center bg-gradient-to-br from-orange-50 to-amber-100 p-5 text-center ${className}`}><div><Presentation className="mx-auto text-orange-700" size={48} /><p className="mt-3 font-bold text-slate-900">{version.original_file_name || 'PowerPoint Show'}</p><p className="mt-1 max-w-sm text-sm text-slate-600">PPSX playback is handled by Microsoft PowerPoint or another compatible presentation application.</p><a href={source} download={version.original_file_name || undefined} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white"><Download size={16} />Download and open</a></div></div>;
  if (resourceType === 'external_link') return <ExternalLinkFrame source={source} title={commonTitle} className={className} width={version.width} height={version.height} />;
  return <ExecutableResourceFrame source={source} title={commonTitle} className={className} frameKey={`${source}-${mode}`} width={version.width} height={version.height} />;
}
