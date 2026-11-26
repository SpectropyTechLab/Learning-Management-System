import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Loader2, Music, PackageOpen, Presentation, RefreshCw } from 'lucide-react';
import { getApiErrorDetails } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/apiBaseUrl';
import { commitStudioScormAttempt, getStudioObjectPreview, getStudioResourceDownload, getStudioResourcePreview, launchStudioResourceVersion, startStudioScormAttempt, type StudioObjectPreviewDescriptor, type StudioResourcePreview, type StudioResourceType, type StudioResourceVersion } from '../../api/studioResourcesApi';
import Model3DViewer from './Model3DViewer';
import type { Model3DSettings } from './model3DSettings';
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
    cropped?: boolean;
    cropLeft?: number;
    cropRight?: number;
    cropTop?: number;
    cropBottom?: number;
    edgeCrop?: boolean;
    cropGeometry?: boolean;
    cropScaleX?: number;
    cropScaleY?: number;
    cropOffsetX?: number;
    cropOffsetY?: number;
    filter?: string;
    opacity?: number;
  };
  model3DSettings?: Model3DSettings;
  model3DModeRequestToken?: number;
  onModel3DSettingsChange?: (settings: Model3DSettings) => void;
  onReady?: () => void;
  getPreview?: (versionId: number) => Promise<StudioResourcePreview>;
  getObjectPreview?: (versionId: number) => Promise<StudioObjectPreviewDescriptor>;
}

const afterVisiblePaint = (callback?: () => void) => {
  if (!callback) return;
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
};

export default function StudioResourcePlayer({ resourceType, version, mode = 'preview', selected = false, className = '', mediaTransform, model3DSettings, model3DModeRequestToken, onModel3DSettingsChange, onReady, getPreview, getObjectPreview }: StudioResourcePlayerProps) {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const notifyReady = useCallback(() => afterVisiblePaint(onReadyRef.current), []);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [objectPreview, setObjectPreview] = useState<StudioObjectPreviewDescriptor | null>(null);
  const [scormAttemptId, setScormAttemptId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setSource(''); setObjectPreview(null);
    const resolveSource = async () => {
      if (resourceType === 'document') {
        const descriptor = await (getObjectPreview?.(version.id) ?? getStudioObjectPreview(version.id));
        if (active) setObjectPreview(descriptor);
        return descriptor.url || '';
      }
      if (version.external_url) return version.external_url;
      if (resourceType === 'presentation') return (await getStudioResourceDownload(version.id)).url;
      if (resourceType === 'scorm') {
        const attempt = await startStudioScormAttempt(version.id);
        if (active) setScormAttemptId(attempt.id);
        if (!attempt.launch.launchable || !attempt.launch.launch_url) throw new Error(attempt.launch.message || 'This SCORM package cannot be launched.');
        return resolveAssetUrl(attempt.launch.launch_url) || attempt.launch.launch_url;
      }
      if (['html', 'zip', 'simulation'].includes(resourceType)) {
        const launch = await launchStudioResourceVersion(version.id);
        if (!launch.launchable || !launch.launch_url) throw new Error(launch.message || 'This package cannot be previewed.');
        return resolveAssetUrl(launch.launch_url) || launch.launch_url;
      }
      return (await (getPreview?.(version.id) ?? getStudioResourcePreview(version.id))).url;
    };
    void resolveSource().then((value) => { if (active) setSource(value); }).catch((loadError) => { if (active) setError(getApiErrorDetails(loadError, loadError instanceof Error ? loadError.message : 'Unable to open Resource preview.').message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [getObjectPreview, getPreview, reloadKey, resourceType, version.external_url, version.id]);

  useEffect(() => {
    if (loading) return;
    if (error) {
      const frame = window.requestAnimationFrame(notifyReady);
      return () => window.cancelAnimationFrame(frame);
    }
    const embeddedDocument = resourceType === 'document' &&
      (objectPreview?.mode === 'pdf' || objectPreview?.mode === 'interactive');
    if (!['document', 'presentation'].includes(resourceType) || embeddedDocument) return;
    const frame = window.requestAnimationFrame(notifyReady);
    return () => window.cancelAnimationFrame(frame);
  }, [error, loading, notifyReady, objectPreview, resourceType]);

  useEffect(() => {
    if (loading || error || resourceType !== 'document' ||
      (objectPreview?.mode !== 'pdf' && objectPreview?.mode !== 'interactive')) return;
    const timeout = window.setTimeout(notifyReady, 12_000);
    return () => window.clearTimeout(timeout);
  }, [error, loading, notifyReady, objectPreview, resourceType]);

  const mediaPreviewFailed = () => setError(version.external_url
    ? 'This external URL is not an embeddable media file. Use a direct image/video URL or upload the file.'
    : 'The protected preview link expired or could not load. Retry to request a fresh link.');

  if (loading) return <div className={`grid place-items-center bg-slate-950 text-white ${className}`}><span className="inline-flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={18} />Preparing preview…</span></div>;
  if (error) return <div className={`grid place-items-center bg-slate-950 p-6 text-center text-white ${className}`}><div><PackageOpen className="mx-auto text-slate-400" size={42} /><p className="mt-3 font-semibold">Preview unavailable</p><p className="mt-1 max-w-md text-sm text-slate-300">{error}</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900"><RefreshCw size={15} />Retry</button>{version.external_url ? <a href={version.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-3 py-2 text-sm font-semibold text-white"><ExternalLink size={15} />Open source URL</a> : null}</div></div></div>;

  const commonTitle = `${resourceType} Resource version ${version.version_number}`;
  const isImageMedia = resourceType === 'image' || (resourceType === 'animation' && version.mime_type?.startsWith('image/'));
  const hasEdgeCrop = mediaTransform?.edgeCrop === true;
  const hasCropGeometry = mediaTransform?.cropGeometry === true;
  const cropScaleX = hasCropGeometry ? Math.max(1, Number(mediaTransform?.cropScaleX) || 1) : 1;
  const cropScaleY = hasCropGeometry ? Math.max(1, Number(mediaTransform?.cropScaleY) || 1) : 1;
  const transformedMediaStyle = mode === 'canvas' ? {
    width: isImageMedia ? `${cropScaleX * 100}%` : '100%',
    height: isImageMedia ? `${cropScaleY * 100}%` : '100%',
    maxWidth: 'none',
    maxHeight: 'none',
    objectFit: isImageMedia
      ? 'fill' as const
      : mediaTransform?.cropped === true && !hasEdgeCrop
      ? 'cover' as const
      : 'contain' as const,
    position: isImageMedia ? 'absolute' as const : undefined,
    left: isImageMedia ? `${(hasCropGeometry ? Number(mediaTransform?.cropOffsetX) || 0 : 0) * 100}%` : undefined,
    top: isImageMedia ? `${(hasCropGeometry ? Number(mediaTransform?.cropOffsetY) || 0 : 0) * 100}%` : undefined,
    transform: isImageMedia && !hasEdgeCrop && !hasCropGeometry
      ? 'none'
      : `translate(${Number(mediaTransform?.x) || 0}%, ${Number(mediaTransform?.y) || 0}%) scale(${Math.max(1, Number(mediaTransform?.scale) || 1)})`,
    transformOrigin: 'center',
    filter: mediaTransform?.filter || undefined,
    opacity: mediaTransform?.opacity,
  } : undefined;
  const cropMaskStyle = hasEdgeCrop ? {
    clipPath: `inset(${Number(mediaTransform?.cropTop) || 0}% ${Number(mediaTransform?.cropRight) || 0}% ${Number(mediaTransform?.cropBottom) || 0}% ${Number(mediaTransform?.cropLeft) || 0}%)`,
  } : undefined;
  if (resourceType === 'audio' || version.mime_type?.startsWith('audio/')) return <div className={['grid h-full w-full place-items-center overflow-hidden bg-gradient-to-br from-purple-950 to-blue-900 p-5 text-white', className].join(' ')}><div className="w-full text-center"><Music className="mx-auto text-purple-200" size={38}/><p className="mt-2 truncate text-sm font-semibold">{version.original_file_name || 'Audio'}</p><audio src={source} controls preload="auto" onCanPlayThrough={notifyReady} onError={mediaPreviewFailed} className="mt-3 w-full"/></div></div>;
  if (resourceType === 'document' && objectPreview) return <EmbeddedObjectViewer descriptor={objectPreview} onReady={notifyReady} className={className} />;
  const markImageReady = (image: HTMLImageElement) => {
    const markPainted = () => {
      if (image.complete && image.naturalWidth > 0) notifyReady();
    };
    void image.decode().then(markPainted).catch(markPainted);
  };
  if (resourceType === 'image') return <div className={`relative grid place-items-center ${hasEdgeCrop ? 'overflow-visible' : 'overflow-hidden'} ${mode === 'canvas' ? 'bg-transparent' : 'bg-slate-950'} ${className}`} style={cropMaskStyle}><img src={source} alt={commonTitle} onLoad={(event) => markImageReady(event.currentTarget)} onError={mediaPreviewFailed} className={mode === 'canvas' ? '' : 'max-h-full max-w-full object-contain'} style={transformedMediaStyle} /></div>;
  if (resourceType === 'video' || (resourceType === 'animation' && version.mime_type?.startsWith('video/'))) return <div className={`grid place-items-center overflow-hidden bg-black ${className}`}><video src={source} controls playsInline preload="auto" onCanPlayThrough={notifyReady} onError={mediaPreviewFailed} className={mode === 'canvas' ? '' : 'max-h-full max-w-full'} style={transformedMediaStyle} /></div>;
  if (resourceType === 'animation' && version.mime_type?.startsWith('image/')) return <div className={`grid place-items-center overflow-hidden ${mode === 'canvas' ? 'bg-transparent' : 'bg-slate-950'} ${className}`}><img src={source} alt={commonTitle} onLoad={(event) => markImageReady(event.currentTarget)} onError={mediaPreviewFailed} className={mode === 'canvas' ? '' : 'max-h-full max-w-full object-contain'} style={transformedMediaStyle} /></div>;
  if (resourceType === 'model_3d') return <Model3DViewer src={source} alt={commonTitle} className={className} mode={mode} selected={selected} settings={model3DSettings} panZoomRequestToken={model3DModeRequestToken} onSettingsChange={onModel3DSettingsChange} onReady={notifyReady} />;
  if (resourceType === 'presentation') return <div className={`grid place-items-center bg-gradient-to-br from-orange-50 to-amber-100 p-5 text-center ${className}`}><div><Presentation className="mx-auto text-orange-700" size={48} /><p className="mt-3 font-bold text-slate-900">{version.original_file_name || 'PowerPoint Show'}</p><p className="mt-1 max-w-sm text-sm text-slate-600">PPSX playback is handled by Microsoft PowerPoint or another compatible presentation application.</p><a href={source} download={version.original_file_name || undefined} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white"><Download size={16} />Download and open</a></div></div>;
  if (resourceType === 'external_link') return <ExternalLinkFrame source={source} title={commonTitle} className={className} width={version.width} height={version.height} onReady={notifyReady} />;
  return <ExecutableResourceFrame source={source} title={commonTitle} className={className} frameKey={`${source}-${mode}`} width={version.width} height={version.height} onReady={notifyReady} onRuntimeMessage={resourceType === 'scorm' && scormAttemptId ? (data) => {
    if (data.source !== 'spectropy-scorm' || data.type !== 'STUDIO_SCORM_COMMIT' || Number(data.attemptId) !== scormAttemptId) return;
    const values = data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data as Record<string, string> : {};
    const event = data.event === 'suspend' || data.event === 'terminate' ? data.event : 'commit';
    void commitStudioScormAttempt(scormAttemptId, String(data.scoIdentifier || ''), values, event).catch(() => undefined);
  } : undefined} />;
}
