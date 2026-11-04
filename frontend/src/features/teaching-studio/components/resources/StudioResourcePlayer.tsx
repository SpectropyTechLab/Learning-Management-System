import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, PackageOpen, RefreshCw } from 'lucide-react';
import { getApiErrorDetails } from '@/lib/api';
import { getStudioResourcePreview, launchStudioResourceVersion, type StudioResourceType, type StudioResourceVersion } from '../../api/studioResourcesApi';

interface StudioResourcePlayerProps {
  resourceType: StudioResourceType;
  version: StudioResourceVersion;
  mode?: 'preview' | 'canvas' | 'runtime';
  className?: string;
}

export default function StudioResourcePlayer({ resourceType, version, mode = 'preview', className = '' }: StudioResourcePlayerProps) {
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setSource('');
    const resolveSource = async () => {
      if (version.external_url) return version.external_url;
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
  if (resourceType === 'image') return <div className={`grid place-items-center overflow-hidden bg-slate-950 ${className}`}><img src={source} alt={commonTitle} onError={mediaPreviewFailed} className="max-h-full max-w-full object-contain" /></div>;
  if (resourceType === 'video' || (resourceType === 'animation' && version.mime_type?.startsWith('video/'))) return <div className={`grid place-items-center overflow-hidden bg-black ${className}`}><video src={source} controls playsInline onError={mediaPreviewFailed} className="max-h-full max-w-full" /></div>;
  if (resourceType === 'animation' && version.mime_type?.startsWith('image/')) return <div className={`grid place-items-center overflow-hidden bg-slate-950 ${className}`}><img src={source} alt={commonTitle} onError={mediaPreviewFailed} className="max-h-full max-w-full object-contain" /></div>;
  if (resourceType === 'external_link') return <div className={`relative overflow-hidden bg-white ${className}`}><iframe key={source} src={source} title={commonTitle} className="h-full w-full border-0" sandbox="allow-scripts allow-forms allow-popups allow-same-origin" /><a href={source} target="_blank" rel="noreferrer" className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-900 shadow"><ExternalLink size={14} />Open in new tab</a></div>;
  return <iframe key={`${source}-${mode}`} src={source} title={commonTitle} className={`border-0 bg-white ${className}`} sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation allow-pointer-lock" allow="fullscreen" allowFullScreen />;
}
