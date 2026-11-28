import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Crosshair, Download, Eraser, FileText, GitBranch, Grid3X3, Highlighter, Image as ImageIcon, Loader2, Maximize2, Minimize2, MousePointer2, Music, Palette, PenLine, Presentation, RotateCcw, SlidersHorizontal, Trash2, Video, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getApiErrorDetails } from '@/lib/api';
import type { Layout, ObjectType, Rect, Slide } from './layouts';
import { targetLayouts } from './targetLayouts';
import { studioElementSlotId } from './importing/elementSlot';
import SlideCanvas from './SlideCanvas';
import StudioShell from './components/StudioShell';
import { downloadPublishedSessionPlan, getPublishedPresenterData, getPublishedTeachingMaterials, getPublishedRelease, getSessionPlayerPreview, launchPublishedResource, previewPublishedObject, previewPublishedResource } from './api/studioPublishedApi';
import { commitStudioScormAttempt, getStudioObjectPreview, getStudioResourcePreview, launchStudioResourceVersion, startStudioScormAttempt, type StudioObjectPreviewDescriptor } from './api/studioResourcesApi';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import type { CurriculumDocumentPreview } from './api/studioDocumentsApi';
import CurriculumDocumentViewer from './components/CurriculumDocumentViewer';
import Model3DViewer from './components/resources/Model3DViewer';
import { model3DSettingsFrom } from './components/resources/model3DSettings';
import { ExecutableResourceFrame, ExternalLinkFrame } from './components/resources/StudioResourceFrames';
import { resolveAssetUrl } from '@/lib/apiBaseUrl';
import { studioAnimationStyle, studioContainerAnimationEffects, studioShapePaintAnimationEffects } from './components/studioAnimationRuntime';
import EmbeddedObjectViewer from './components/resources/EmbeddedObjectViewer';
import {
  buildPresenterAnimationTimeline,
  CLICKER_SHORTCUT_GROUPS,
  clickerNavigationAction,
  presenterDiagramVisibleNodes,
  presenterComponentBuildState,
  presenterElementPlaybackState,
  presenterMediaBookmarkCueIds,
  presenterTriggerCueIds,
  type PresenterAnimationNavigation,
  type PresenterAnimationTimeline,
} from './components/studioClickerRuntime';
import StudioCanvasTextElement from './components/StudioCanvasTextElement';
import StudioMathElement from './components/StudioMathElement';
import StudioShapeElement from './components/StudioShapeElement';
import { useStudioBackgroundImageUrl } from './components/StudioBackgroundImageMenu';
import StudioSmartDiagram from './components/StudioSmartDiagram';
import StudioTableElement from './components/StudioTableElement';
import StudioChartElement from './components/StudioChartElement';
import ScreenSimulationPlayer from './components/ScreenSimulationPlayer';
import StudioLocalPhysicsLabFrame from './components/StudioLocalPhysicsLabFrame';
import StudioLocalChemistryLabFrame from './components/StudioLocalChemistryLabFrame';
import StudioLocalMathematicsLabFrame from './components/StudioLocalMathematicsLabFrame';
import StudioLocalBiologyLabFrame from './components/StudioLocalBiologyLabFrame';
import StudioHyperlinkOverlay from './components/studioHyperlink';
import { isSmartDiagramContent } from './components/smartDiagramModel';
import StudioBranchDiscoveryPanel from './components/StudioBranchDiscoveryPanel';
import type { PublishedPresenterData, PublishedRelease, PublishedResourceMapping, PublishedScreen, PublishedTeachingMaterials } from './api/studioPublishedApi';
import type { StudioDiscoveryItem } from './api/studioDiscoveryApi';
import type { AuthorDrawingStroke, StudioBackgroundImageFill } from './types';
import FloatingWhiteboards from './components/FloatingWhiteboards';
import { playStudioTransitionSound, startStudioSlideTransition, stopStudioTransitionSound, studioTransitionHandledByPlayer, unlockStudioTransitionAudio } from './components/studioTransition';
import { normalizeStudioTransition, studioScreenIsHidden } from './components/studioTransitionModel';
import { playStudioAnimationSound } from './components/studioAnimationAudio';
import type { StudioAnimationEffectDefinition } from './components/studioAnimationModel';
import type { SimulationDocument } from './components/simulationStudioModel';
import { clearCachedSessionPreview, getCachedResourcePreviewUrl, getCachedSessionPreview, getPendingSessionPreview, getPreferredSessionPreviewScreen, prepareSessionPreviewCriticalScreen, prepareSessionPreviewResources } from './studioSessionPreviewCache';

const textFrom = (content: Record<string, unknown>) => {
  const preferred = content.text ?? content.value ?? content.title ?? content.caption;
  if (typeof preferred === 'string') return preferred;
  const value = Object.values(content).find((item) => typeof item === 'string');
  return typeof value === 'string' ? value : '';
};

type PresenterAnnotationTool = 'pointer' | 'laser' | 'pen' | 'highlighter' | 'eraser';

type PresenterSyncState = {
  screenId: number | null;
  animationStep: number;
  playbackCycle: number;
  annotations: AuthorDrawingStroke[];
  blankMode: 'black' | 'white' | null;
  presentationZoom: number;
  triggeredCueIds: string[];
};

const presenterText = (value: unknown) => {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  return String(record.word_for_word ?? record.text ?? record.value ?? '').trim();
};

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
};

const materialRows = (content: Record<string, unknown> | null | undefined) => {
  const rows = content?.rows;
  return Array.isArray(rows) ? rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row)) : content ? [content] : [];
};

const layoutFor = (screen: PublishedScreen): Layout | null => {
  if (!screen.layout) return null;
  const known = targetLayouts.find((layout) => layout.id === screen.layout?.layout_key);
  if (known) return known;
  const slots = screen.layout.layout_data_json?.slots;
  if (!Array.isArray(slots)) return null;
  return {
    id: screen.layout.layout_key,
    name: screen.layout.name,
    purpose: screen.layout.description || '',
    catalog: 'target',
    slots: slots as Layout['slots'],
  };
};

const elementBounds = (position: Record<string, unknown>): Rect | undefined => {
  const x = Number(position.x);
  const y = Number(position.y);
  const width = Number(position.width);
  const height = Number(position.height);
  return [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0 ? { x, y, width, height } : undefined;
};

const publishedElementSlotId = (element: PublishedScreen['elements'][number]) =>
  studioElementSlotId(element.element_key, element.slot_id, element.content_json);

const freeformLayoutFor = (screen: PublishedScreen): Layout => ({
  id: 'FREEFORM',
  name: 'Freeform screen',
  purpose: 'Published author-positioned screen',
  catalog: 'pilot',
  slots: screen.elements.filter((element) => element.position_json?.hidden !== true).map((element, index) => {
    const region = element.element_type === 'title' ? 'header' : element.element_type === 'footer' ? 'footer' : 'content';
    const fallback = region === 'header' ? { x: 90, y: 60, width: 1740, height: 150 } : region === 'footer' ? { x: 90, y: 950, width: 1740, height: 90 } : { x: 180 + (index % 2) * 800, y: 260, width: 760, height: 420 };
    return {
      id: publishedElementSlotId(element),
      label: element.element_type,
      region,
      allowed: [element.element_type as ObjectType],
      bounds: elementBounds(element.position_json) ?? fallback,
    };
  }),
});

const afterVisiblePaint = (callback?: () => void) => {
  if (!callback) return;
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
};

function PublishedImage({ source, alt, content, children, onReady }: { source: string; alt: string; content?: Record<string, unknown>; children?: ReactNode; onReady?: () => void }) {
  const [painted, setPainted] = useState(false);
  useEffect(() => setPainted(false), [source]);
  const markImageReady = (image: HTMLImageElement) => {
    const markPainted = () => {
      if (image.complete && image.naturalWidth > 0) {
        setPainted(true);
        afterVisiblePaint(onReady);
      }
    };
    void image.decode().catch(() => undefined).finally(markPainted);
  };
  const mediaTransform = content?.mediaTransform && typeof content.mediaTransform === 'object' && !Array.isArray(content.mediaTransform)
    ? content.mediaTransform as Record<string, unknown>
    : null;
  const cropped = mediaTransform?.cropped === true || mediaTransform?.edgeCrop === true || mediaTransform?.cropGeometry === true;
  const imageFilter = typeof mediaTransform?.filter === 'string' ? mediaTransform.filter : undefined;
  const imageOpacity = Number.isFinite(Number(mediaTransform?.opacity)) ? Math.max(0, Math.min(1, Number(mediaTransform?.opacity))) : undefined;
  if (!cropped) return <div className="relative h-full w-full overflow-hidden"><div data-resource-placeholder aria-hidden="true" className={`absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 transition-opacity duration-150 ${painted ? 'opacity-0' : 'opacity-100'}`} /><img src={source} alt={alt} onLoad={(event) => markImageReady(event.currentTarget)} className="h-full w-full object-fill" style={{ filter: imageFilter, opacity: painted ? imageOpacity ?? 1 : 0, transition: 'opacity 150ms ease-out' }} />{children}</div>;
  const hasEdgeCrop = mediaTransform?.edgeCrop === true;
  const hasCropGeometry = mediaTransform?.cropGeometry === true;
  const cropScaleX = hasCropGeometry ? Math.max(1, Number(mediaTransform?.cropScaleX) || 1) : 1;
  const cropScaleY = hasCropGeometry ? Math.max(1, Number(mediaTransform?.cropScaleY) || 1) : 1;
  return <div
    className={`relative h-full w-full ${hasEdgeCrop ? 'overflow-visible' : 'overflow-hidden'}`}
    style={hasEdgeCrop ? { clipPath: `inset(${Number(mediaTransform?.cropTop) || 0}% ${Number(mediaTransform?.cropRight) || 0}% ${Number(mediaTransform?.cropBottom) || 0}% ${Number(mediaTransform?.cropLeft) || 0}%)` } : undefined}
  >
    <img
      src={source}
      alt={alt}
      onLoad={(event) => markImageReady(event.currentTarget)}
      className="absolute max-h-none max-w-none"
      style={{
        width: `${cropScaleX * 100}%`,
        height: `${cropScaleY * 100}%`,
        objectFit: 'fill',
        left: `${(hasCropGeometry ? Number(mediaTransform?.cropOffsetX) || 0 : 0) * 100}%`,
        top: `${(hasCropGeometry ? Number(mediaTransform?.cropOffsetY) || 0 : 0) * 100}%`,
        transform: hasEdgeCrop || hasCropGeometry
          ? `translate(${Number(mediaTransform?.x) || 0}%, ${Number(mediaTransform?.y) || 0}%) scale(${Math.max(1, Number(mediaTransform?.scale) || 1)})`
          : 'none',
        transformOrigin: 'center',
        filter: imageFilter,
        opacity: painted ? imageOpacity ?? 1 : 0,
        transition: 'opacity 150ms ease-out',
      }}
    />
    <div data-resource-placeholder aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 transition-opacity duration-150 ${painted ? 'opacity-0' : 'opacity-100'}`} />
    {children}
  </div>;
}

function PublishedResource({ releaseId, mapping, previewMode = false, elementContent, onMediaTime, onReady }: { releaseId: number; mapping: PublishedResourceMapping; previewMode?: boolean; elementContent?: Record<string, unknown>; onMediaTime?: (previousSeconds: number, currentSeconds: number) => void; onReady?: () => void }) {
  const [source, setSource] = useState(mapping.external_url || (previewMode ? getCachedResourcePreviewUrl(mapping.resource_version_id) : ''));
  const [error, setError] = useState('');
  const [objectPreview, setObjectPreview] = useState<StudioObjectPreviewDescriptor | null>(null);
  const [scormAttemptId, setScormAttemptId] = useState<number | null>(null);
  const readyReportedRef = useRef(false);
  const markReady = useCallback(() => {
    if (readyReportedRef.current) return;
    readyReportedRef.current = true;
    afterVisiblePaint(onReady);
  }, [onReady]);

  useEffect(() => {
    readyReportedRef.current = false;
  }, [mapping.resource_version_id, mapping.external_url]);

  useEffect(() => {
    if (!source || mapping.resource_type !== 'presentation') return;
    const frame = window.requestAnimationFrame(() => afterVisiblePaint(markReady));
    return () => window.cancelAnimationFrame(frame);
  }, [mapping.resource_type, markReady, source]);

  useEffect(() => {
    if (mapping.external_url || source) return;
    let active = true;
    const request = mapping.resource_type === 'document'
      ? (previewMode
          ? getStudioObjectPreview(mapping.resource_version_id)
          : previewPublishedObject(releaseId, mapping.resource_version_id)).then((descriptor) => {
          if (active) setObjectPreview(descriptor);
          return descriptor.url || 'embedded-object-ready';
        })
      : mapping.resource_type === 'scorm'
      ? startStudioScormAttempt(mapping.resource_version_id, previewMode ? undefined : releaseId).then((attempt) => {
          if (active) setScormAttemptId(attempt.id);
          if (!attempt.launch.launchable || !attempt.launch.launch_url) throw new Error(attempt.launch.message || 'SCORM Resource cannot be launched.');
          return resolveAssetUrl(attempt.launch.launch_url) || attempt.launch.launch_url;
        })
      : ['html', 'zip', 'simulation'].includes(mapping.resource_type)
      ? (previewMode
          ? launchStudioResourceVersion(mapping.resource_version_id)
          : launchPublishedResource(releaseId, mapping.resource_version_id)).then((result) => {
          if (!result.launchable || !result.launch_url) throw new Error(result.message || 'Resource cannot be launched.');
          return resolveAssetUrl(result.launch_url) || result.launch_url;
        })
      : (previewMode
          ? getStudioResourcePreview(mapping.resource_version_id)
          : previewPublishedResource(releaseId, mapping.resource_version_id)).then((result) => result.url);
    void request
      .then((url) => {
        if (active) setSource(url);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorDetails(requestError).message);
      });
    return () => {
      active = false;
    };
  }, [mapping.external_url, mapping.resource_type, mapping.resource_version_id, previewMode, releaseId, source]);

  if (error) return <div className="grid h-full place-items-center bg-slate-950 p-3 text-center text-xs text-white">{error}</div>;
  if (!source) return <div data-resource-placeholder aria-busy="true" className="grid h-full place-items-center bg-gradient-to-br from-slate-100 to-slate-200 p-3 text-center text-slate-500"><div><Presentation className="mx-auto text-slate-400" size={30} /><p className="mt-2 max-w-48 truncate text-xs font-medium">{mapping.name}</p></div></div>;
  if (mapping.resource_type === 'document' && objectPreview) return <EmbeddedObjectViewer descriptor={objectPreview} className="h-full w-full" onReady={markReady} />;
  if (mapping.resource_type === 'image' || (mapping.resource_type === 'animation' && mapping.mime_type?.startsWith('image/'))) return <PublishedImage source={source} alt={String(elementContent?.altText || mapping.name)} content={elementContent} onReady={markReady} />;
  if (mapping.resource_type === 'video' || (mapping.resource_type === 'animation' && mapping.mime_type?.startsWith('video/')) || mapping.mime_type?.startsWith('video/')) return <video src={source} controls preload="auto" aria-label={mapping.name} className="h-full w-full" onCanPlayThrough={markReady} onTimeUpdate={(event) => { const previous = Number(event.currentTarget.dataset.animationPreviousTime) || 0; const current = event.currentTarget.currentTime; onMediaTime?.(previous, current); event.currentTarget.dataset.animationPreviousTime = String(current); }} />;
  if (mapping.resource_type === 'audio' || mapping.mime_type?.startsWith('audio/')) return <audio src={source} controls preload="auto" aria-label={mapping.name} className="w-full" onCanPlayThrough={markReady} onTimeUpdate={(event) => { const previous = Number(event.currentTarget.dataset.animationPreviousTime) || 0; const current = event.currentTarget.currentTime; onMediaTime?.(previous, current); event.currentTarget.dataset.animationPreviousTime = String(current); }} />;
  if (mapping.resource_type === 'model_3d') return <Model3DViewer src={source} alt={mapping.name} className="h-full w-full" mode="runtime" settings={model3DSettingsFrom(elementContent)} onReady={markReady} />;
  if (mapping.resource_type === 'presentation')
    return (
      <div className="grid h-full place-items-center bg-gradient-to-br from-orange-50 to-amber-100 p-4 text-center">
        <div>
          <Presentation className="mx-auto text-orange-700" size={42} />
          <p className="mt-2 font-semibold text-slate-900">{mapping.name}</p>
          <p className="mt-1 text-xs text-slate-600">Open this PPSX file in Microsoft PowerPoint or another compatible app.</p>
          <a href={source} download className="mt-3 inline-flex items-center gap-1 rounded-lg bg-orange-700 px-3 py-2 text-xs font-semibold text-white">
            <Download size={14} />
            Download and open
          </a>
        </div>
      </div>
    );
  if (mapping.resource_type === 'external_link') return <ExternalLinkFrame source={source} title={mapping.name} className="h-full w-full" openLinkLabel="Open" width={mapping.width} height={mapping.height} onReady={markReady} />;
  return <ExecutableResourceFrame source={source} title={mapping.name} className="h-full w-full" width={mapping.width} height={mapping.height} onReady={markReady} onRuntimeMessage={mapping.resource_type === 'scorm' && scormAttemptId ? (data) => {
    if (data.source !== 'spectropy-scorm' || data.type !== 'STUDIO_SCORM_COMMIT' || Number(data.attemptId) !== scormAttemptId) return;
    const values = data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data as Record<string, string> : {};
    const event = data.event === 'suspend' || data.event === 'terminate' ? data.event : 'commit';
    void commitStudioScormAttempt(scormAttemptId, String(data.scoIdentifier || ''), values, event).catch(() => undefined);
  } : undefined} />;
}

function PublishedSimulation({ project, passive = false, onReady }: { project: object; passive?: boolean; onReady?: () => void }) {
  const isolatedProject = useMemo(() => {
    if (typeof structuredClone === 'function') return structuredClone(project) as SimulationDocument;
    return JSON.parse(JSON.stringify(project)) as SimulationDocument;
  }, [project]);
  if (passive) return <div className="grid h-full w-full place-items-center bg-[#09111d] text-sm font-semibold text-slate-300">Interactive Simulation</div>;
  return <ScreenSimulationPlayer simulation={isolatedProject} onReady={onReady} />;
}

const publishedTextPadding = (content: Record<string, unknown>) => {
  const margins = content.margins;
  if (!margins || typeof margins !== 'object') return 12;
  const values = margins as Record<string, unknown>;
  const raw = [values.top, values.right, values.bottom, values.left].map((value) => Math.max(0, Number(value) || 0));
  const factor = content.marginsUnit === 'canvas-px' || Math.max(...raw) < 1000 ? 1 : 1 / 6350;
  return raw.map((value) => `${Number((value * factor).toFixed(3))}px`).join(' ');
};

function PublishedTextFrame({ element, shape = false, animationEffects = [], resolveBackgroundPreview }: { element: PublishedScreen['elements'][number]; shape?: boolean; animationEffects?: Array<Record<string, unknown>>; resolveBackgroundPreview?: (versionId: number) => Promise<{ url: string }> }) {
  const content = element.content_json ?? {};
  const backgroundImage = content.backgroundImage && typeof content.backgroundImage === 'object' ? content.backgroundImage as StudioBackgroundImageFill : null;
  const backgroundImageUrl = useStudioBackgroundImageUrl(backgroundImage, undefined, resolveBackgroundPreview);
  const text = shape ? (typeof content.text === 'string' ? content.text : '') : textFrom(content);
  const kind = shape ? String(content.kind || 'rectangle') : typeof content.kind === 'string' ? content.kind : backgroundImage ? 'rectangle' : '';
  const textSequence = String(animationEffects[0]?.textSequence || 'object');
  const animationTextSequence = textSequence === 'paragraph' || textSequence === 'word' || textSequence === 'letter' ? textSequence : undefined;
  const shapePaintEffects = kind ? studioShapePaintAnimationEffects(animationEffects) : [];
  const textElement = <StudioCanvasTextElement
    elementId={element.element_key}
    text={text}
    richTextHtml={typeof content.richTextHtml === 'string' ? content.richTextHtml : undefined}
    color={typeof content.color === 'string' ? content.color : shape ? '#0f2747' : undefined}
    backgroundColor={kind ? 'transparent' : typeof content.backgroundColor === 'string' ? content.backgroundColor : undefined}
    borderColor={kind ? 'transparent' : typeof content.borderColor === 'string' ? content.borderColor : undefined}
    borderWidth={kind ? 0 : Number(content.borderWidth) || undefined}
    fontSize={Number(content.fontSize) || (shape ? 24 : undefined)}
    fontFamily={typeof content.fontFamily === 'string' ? content.fontFamily : undefined}
    bold={content.bold === true}
    italic={content.italic === true}
    underline={content.underline === true}
    contentPadding={publishedTextPadding(content)}
    textStrokeColor={typeof content.textStrokeColor === 'string' ? content.textStrokeColor : undefined}
    textStrokeWidth={Number(content.textStrokeWidth) || undefined}
    alignment={content.alignment === 'left' || content.alignment === 'center' || content.alignment === 'right' || content.alignment === 'justify' ? content.alignment : shape ? 'center' : 'left'}
    verticalAlignment={content.verticalAlignment === 'top' || content.verticalAlignment === 'middle' || content.verticalAlignment === 'bottom' ? content.verticalAlignment : shape ? 'middle' : 'top'}
    list={content.list === true}
    lineHeight={Number(content.lineHeight) || undefined}
    paragraphSpacingBefore={Number(content.paragraphSpacingBefore) || undefined}
    paragraphSpacingAfter={Number(content.paragraphSpacingAfter) || undefined}
    animationTextSequence={animationTextSequence}
    animationTextDelay={Number.isFinite(Number(animationEffects[0]?.textDelay)) ? Number(animationEffects[0]?.textDelay) : undefined}
    animationStyle={animationTextSequence && animationEffects.length ? studioAnimationStyle({ effects: animationEffects }) : undefined}
  />;
  if (!kind) return <div className="relative h-full w-full overflow-visible"><div className="absolute inset-0">{textElement}</div></div>;
  return <div className={`relative h-full w-full ${shape ? 'overflow-hidden' : 'overflow-visible'}`}>
    <div className="pointer-events-none absolute inset-0"><StudioShapeElement
      elementId={element.element_key}
      kind={kind}
      fill={typeof content.fill === 'string' ? content.fill : shape ? undefined : 'transparent'}
      stroke={typeof content.stroke === 'string' ? content.stroke : shape ? undefined : 'transparent'}
      strokeWidth={Number(content.strokeWidth) || undefined}
      opacity={Number(content.opacity) || undefined}
      strokeDash={typeof content.strokeDash === 'string' ? content.strokeDash : undefined}
      customPath={typeof content.customPath === 'string' ? content.customPath : undefined}
      arrowStart={content.arrowStart === true}
      arrowEnd={content.arrowEnd === true}
      effect={typeof content.shapeEffect === 'string' ? content.shapeEffect : undefined}
      effectColor={typeof content.shapeEffectColor === 'string' ? content.shapeEffectColor : undefined}
      gradient={content.gradient && typeof content.gradient === 'object' ? content.gradient as { angle?: number; stops: Array<{ position: number; color: string }> } : undefined}
      backgroundImageUrl={backgroundImageUrl}
      backgroundImageFit={backgroundImage?.fit}
      backgroundImageOpacity={backgroundImage?.opacity}
      backgroundImageScale={backgroundImage?.scale}
      backgroundImageX={backgroundImage?.x}
      backgroundImageY={backgroundImage?.y}
      animationStyle={shapePaintEffects.length ? studioAnimationStyle({ effects: shapePaintEffects }) : undefined}
    /></div>
    <div className={shape ? 'absolute inset-0 overflow-hidden' : 'absolute inset-0'}>{textElement}</div>
  </div>;
}

const publishedLocalProjectReadinessIds = new WeakMap<object, number>();
let nextPublishedLocalProjectReadinessId = 1;

const publishedElementReadinessKey = (screenId: number, element: PublishedScreen['elements'][number]) => {
  const url = typeof element.content_json?.url === 'string' ? element.content_json.url : '';
  const mime = typeof element.content_json?.mimeType === 'string' ? element.content_json.mimeType : '';
  const localProject = element.content_json?.labProject && typeof element.content_json.labProject === 'object'
      ? element.content_json.labProject
      : element.content_json?.simulationProject && typeof element.content_json.simulationProject === 'object'
        ? element.content_json.simulationProject
      : null;
  if (element.element_type === 'simulation' && localProject) {
    let projectId = publishedLocalProjectReadinessIds.get(localProject);
    if (!projectId) {
      projectId = nextPublishedLocalProjectReadinessId++;
      publishedLocalProjectReadinessIds.set(localProject, projectId);
    }
    return `${screenId}:${element.element_key}:local-simulation:${projectId}`;
  }
  if (element.resource_mapping) return `${screenId}:${element.element_key}:resource:${element.resource_mapping.resource_type}:${element.resource_mapping.resource_version_id}:${element.resource_mapping.external_url || ''}`;
  if (url && (element.element_type === 'visual' || mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') || mime === 'application/pdf'))
    return `${screenId}:${element.element_key}:inline:${url}`;
  return null;
};

function PublishedCanvas({ releaseId, screen, previewMode = false, passivePreview = false, immersiveViewport = false, teacherAnnotations, annotationTool, annotationColor, annotationWidth, onAnnotationsChange, onLiveAnnotationChange, onZoom, animationTimeline, animationStep, playbackCycle, animationNavigation, triggeredCueIds = new Set(), onTriggerElement, onMediaTime }: { releaseId: number; screen: PublishedScreen; previewMode?: boolean; passivePreview?: boolean; immersiveViewport?: boolean; teacherAnnotations: AuthorDrawingStroke[]; annotationTool: PresenterAnnotationTool; annotationColor: string; annotationWidth: number; onAnnotationsChange: (strokes: AuthorDrawingStroke[]) => void; onLiveAnnotationChange?: (stroke: AuthorDrawingStroke | null) => void; onZoom?: (element: PublishedScreen['elements'][number]) => void; animationTimeline?: PresenterAnimationTimeline; animationStep?: number; playbackCycle?: number; animationNavigation?: PresenterAnimationNavigation | null; triggeredCueIds?: ReadonlySet<string>; onTriggerElement?: (elementKey: string) => void; onMediaTime?: (elementKey: string, previousSeconds: number, currentSeconds: number) => void }) {
  const [readyResourceKeys, setReadyResourceKeys] = useState<Set<string>>(() => new Set());
  const resolveBackgroundPreview = useCallback((versionId: number) => previewMode ? getStudioResourcePreview(versionId) : previewPublishedResource(releaseId, versionId), [previewMode, releaseId]);
  const screenBackgroundImage = screen.screen_settings_json?.backgroundImage && typeof screen.screen_settings_json.backgroundImage === 'object' ? screen.screen_settings_json.backgroundImage as StudioBackgroundImageFill : null;
  const screenBackgroundImageUrl = useStudioBackgroundImageUrl(screenBackgroundImage, undefined, resolveBackgroundPreview);
  useEffect(() => {
    setReadyResourceKeys(new Set());
  }, [passivePreview, previewMode, releaseId, screen.screen_id]);
  const markResourceReady = useCallback((elementKey: string) => {
    setReadyResourceKeys((current) => {
      const element = screen.elements.find((candidate) => candidate.element_key === elementKey);
      const key = element && publishedElementReadinessKey(screen.screen_id, element);
      if (!key || current.has(key)) return current;
      return new Set(current).add(key);
    });
  }, [screen.elements, screen.screen_id]);
  const layout = layoutFor(screen) ?? freeformLayoutFor(screen);
  const slide: Slide = {
    title: screen.title,
    creationMode: layout ? 'layout' : 'blank',
    objects: screen.elements.filter((element) => element.position_json?.hidden !== true).map((element) => ({
      id: element.element_key,
      slotId: publishedElementSlotId(element),
      type: element.element_type as ObjectType,
      text: textFrom(element.content_json || {}),
      position: elementBounds(element.position_json),
      url: typeof element.content_json?.url === 'string' ? element.content_json.url : undefined,
      altText: typeof element.content_json?.altText === 'string' ? element.content_json.altText : undefined,
      caption: typeof element.content_json?.caption === 'string' ? element.content_json.caption : undefined,
      color: typeof element.content_json?.color === 'string' ? element.content_json.color : undefined,
      // Shape fills belong to StudioShapeElement. Copying them onto the generic
      // SlideCanvas wrapper exposes the element's rectangular bounds during
      // fill/colour animations and makes arrows, lines and custom geometry look
      // like boxes in Slide Show. Keep the wrapper styling aligned with the
      // editor and let the actual visual renderer own the shape surface.
      backgroundColor: element.resource_mapping?.resource_type === 'model_3d'
        ? 'transparent'
        : element.element_type !== 'shape' && typeof element.content_json?.backgroundColor === 'string'
          ? element.content_json.backgroundColor
          : undefined,
      borderColor: element.element_type !== 'shape' && typeof element.content_json?.borderColor === 'string'
        ? element.content_json.borderColor
        : undefined,
      borderWidth: element.resource_mapping?.resource_type === 'model_3d'
        ? 0
        : element.element_type !== 'shape' && Number.isFinite(Number(element.content_json?.borderWidth))
          ? Number(element.content_json?.borderWidth)
          : undefined,
      rotation: Number(element.position_json?.rotation) || 0,
      zIndex: typeof element.position_json?.zIndex === 'number' ? element.position_json.zIndex : undefined,
    })),
  };
  const overlays: Record<string, ReactNode> = Object.fromEntries(screen.elements.filter((element) => element.position_json?.hidden !== true).flatMap((element) => {
    const textPlaybackEffects = animationTimeline && animationStep !== undefined
      ? presenterElementPlaybackState(animationTimeline, element.element_key, animationStep, playbackCycle ?? 0, animationNavigation, triggeredCueIds).activeEffects
      : [];
    if (isSmartDiagramContent(element.content_json)) {
      const visibleNodeIds = animationTimeline && animationStep !== undefined
        ? presenterDiagramVisibleNodes(animationTimeline, element.element_key, animationStep, element.content_json.nodes.map((node) => node.id))
        : undefined;
      return [[element.element_key, <StudioSmartDiagram key={element.element_key} content={element.content_json} visibleNodeIds={visibleNodeIds} />]];
    }
    if (element.element_type === 'math') return [[element.element_key, <StudioMathElement key={element.element_key} latex={String(element.content_json?.latex ?? element.content_json?.text ?? '')} color={typeof element.content_json?.color === 'string' ? element.content_json.color : undefined} backgroundColor={typeof element.content_json?.backgroundColor === 'string' ? element.content_json.backgroundColor : undefined} fontSize={Number(element.content_json?.fontSize) || undefined} alignment={element.content_json?.alignment === 'left' || element.content_json?.alignment === 'right' ? element.content_json.alignment : 'center'} />]];
    if (element.content_json?.visualType === 'chart') return [[element.element_key, <StudioChartElement key={element.element_key} content={element.content_json || {}} animationBuildState={animationTimeline && animationStep !== undefined ? presenterComponentBuildState(animationTimeline, element.element_key, animationStep, triggeredCueIds) : null}/>]];
    if (element.element_type === 'table' || element.content_json?.visualType === 'table') return [[element.element_key, <StudioTableElement key={element.element_key} elementId={element.element_key} content={element.content_json || {}} editable={false} animationBuildState={animationTimeline && animationStep !== undefined ? presenterComponentBuildState(animationTimeline, element.element_key, animationStep, triggeredCueIds) : null} />]];
    if (element.element_type === 'shape') return [[element.element_key, <PublishedTextFrame key={element.element_key} element={element} shape animationEffects={textPlaybackEffects} resolveBackgroundPreview={resolveBackgroundPreview} />]];
    if (element.element_type === 'zoom' && element.zoom) return [[element.element_key, <button key={element.element_key} type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onZoom?.(element); }} className="group grid h-full w-full touch-manipulation place-items-center overflow-hidden rounded-xl border-2 border-white/70 bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 p-5 text-center text-white shadow-xl transition hover:scale-[1.02] hover:shadow-2xl"><span><span className="block text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">{element.content_json?.zoom_summary_group ? 'Summary Zoom' : element.zoom.zoom_kind === 'section' ? 'Section Zoom' : 'Screen Zoom'}</span><span className="mt-2 block text-xl font-black">{textFrom(element.content_json || {}) || 'Open linked teaching content'}</span><span className="mt-2 block text-xs text-blue-100">Select once to explore · returns here</span></span></button>]];
    const droppedUrl = typeof element.content_json?.url === 'string' ? element.content_json.url : '';
    const droppedMime = typeof element.content_json?.mimeType === 'string' ? element.content_json.mimeType : '';
    if (droppedUrl && element.content_json?.source === 'drag-drop') {
      const name = textFrom(element.content_json || {}) || 'Dropped file';
      if (element.element_type === 'visual' || droppedMime.startsWith('image/')) return [[element.element_key, <PublishedImage key={element.element_key} source={droppedUrl} alt={String(element.content_json?.altText || name)} content={element.content_json} onReady={() => markResourceReady(element.element_key)}><span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-semibold text-white"><ImageIcon size={11}/>{name}</span></PublishedImage>]];
      if (droppedMime.startsWith('video/')) return [[element.element_key, <div key={element.element_key} className="relative h-full w-full bg-black"><video src={droppedUrl} controls preload="auto" className="h-full w-full object-contain" onCanPlayThrough={() => afterVisiblePaint(() => markResourceReady(element.element_key))} onTimeUpdate={(event) => { const previous = Number(event.currentTarget.dataset.animationPreviousTime) || 0; const current = event.currentTarget.currentTime; onMediaTime?.(element.element_key, previous, current); event.currentTarget.dataset.animationPreviousTime = String(current); }}/><span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white"><Video size={11}/>{name}</span></div>]];
      if (droppedMime.startsWith('audio/')) return [[element.element_key, <div key={element.element_key} className="grid h-full w-full place-items-center bg-gradient-to-br from-purple-950 to-blue-900 p-5 text-white"><div className="w-full text-center"><Music size={42} className="mx-auto text-purple-200"/><p className="mt-3 truncate text-sm font-bold">{name}</p><audio src={droppedUrl} controls preload="auto" className="mt-4 w-full" onCanPlayThrough={() => afterVisiblePaint(() => markResourceReady(element.element_key))} onTimeUpdate={(event) => { const previous = Number(event.currentTarget.dataset.animationPreviousTime) || 0; const current = event.currentTarget.currentTime; onMediaTime?.(element.element_key, previous, current); event.currentTarget.dataset.animationPreviousTime = String(current); }}/></div></div>]];
      if (droppedMime === 'application/pdf') return [[element.element_key, <div key={element.element_key} className="relative h-full w-full bg-slate-200"><iframe src={droppedUrl} title={name} onLoad={() => afterVisiblePaint(() => markResourceReady(element.element_key))} className="h-full w-full border-0"/><span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-700 px-2 py-1 text-[10px] font-semibold text-white"><FileText size={11}/>PDF · {name}</span></div>]];
      return [[element.element_key, <div key={element.element_key} className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-50 to-blue-50 p-6 text-center"><div><FileText size={48} className="mx-auto text-blue-800"/><p className="mt-3 break-all text-sm font-bold text-slate-900">{name}</p><p className="mt-1 text-xs text-slate-500">{droppedMime || 'Document'}</p><a href={droppedUrl} download={name} className="mt-4 inline-flex rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white">Download and open</a></div></div>]];
    }
    if (['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(element.element_type)) return [[element.element_key, <PublishedTextFrame key={element.element_key} element={element} animationEffects={textPlaybackEffects} resolveBackgroundPreview={resolveBackgroundPreview} />]];
    if (element.element_type === 'simulation' && element.content_json?.labProject && typeof element.content_json.labProject === 'object') {
      const subject = (element.content_json.labProject as { subject?: unknown }).subject;
      const Frame = subject === 'chemistry' ? StudioLocalChemistryLabFrame : subject === 'mathematics' ? StudioLocalMathematicsLabFrame : subject === 'biology' ? StudioLocalBiologyLabFrame : StudioLocalPhysicsLabFrame;
      return [[element.element_key, <Frame
        key={element.element_key}
        project={element.content_json.labProject}
        title={String(element.content_json.labTitle || element.content_json.text || `Interactive ${subject === 'chemistry' ? 'Chemistry' : subject === 'mathematics' ? 'Mathematics' : subject === 'biology' ? 'Biology' : 'Physics'} Lab`)}
        interactive={!passivePreview}
        onReady={() => afterVisiblePaint(() => markResourceReady(element.element_key))}
        className="h-full w-full"
      />]];
    }
    if (element.element_type === 'simulation' && element.content_json?.simulationProject && typeof element.content_json.simulationProject === 'object') {
      return [[element.element_key, <PublishedSimulation
        key={element.element_key}
        project={element.content_json.simulationProject}
        passive={passivePreview}
        onReady={() => markResourceReady(element.element_key)}
      />]];
    }
    if (!element.resource_mapping) return [];
    const executablePreview = passivePreview && ['scorm', 'html', 'zip', 'simulation'].includes(element.resource_mapping.resource_type);
    return [[element.element_key, executablePreview
      ? <div key={element.element_key} className="grid h-full w-full place-items-center bg-slate-900 p-4 text-center text-white"><div><Presentation className="mx-auto text-cyan-300" size={34} /><p className="mt-2 font-semibold">{element.resource_mapping.name}</p><p className="mt-1 text-xs uppercase text-slate-400">{element.resource_mapping.resource_type} activity</p></div></div>
      : <PublishedResource key={`${element.element_key}:${element.resource_mapping.resource_version_id}:${element.resource_mapping.external_url || ''}`} releaseId={releaseId} mapping={element.resource_mapping} previewMode={previewMode} elementContent={element.content_json} onReady={() => markResourceReady(element.element_key)} onMediaTime={(previous, current) => onMediaTime?.(element.element_key, previous, current)} />]];
  }));
  for (const element of screen.elements) {
    const overlay = overlays[element.element_key];
    if (!overlay) continue;
    const flipX = element.position_json?.flipX === true;
    const flipY = element.position_json?.flipY === true;
    if (!flipX && !flipY) continue;
    overlays[element.element_key] = <div
      className="h-full w-full"
      style={{ transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`, transformOrigin: 'center' }}
    >{overlay}</div>;
  }
  for (const element of screen.elements) {
    const overlay = overlays[element.element_key];
    if (!overlay || !element.content_json?.hyperlink) continue;
    overlays[element.element_key] = <StudioHyperlinkOverlay hyperlink={element.content_json.hyperlink} active>{overlay}</StudioHyperlinkOverlay>;
  }
  for (const element of screen.elements) {
    const overlay = overlays[element.element_key];
    if (!overlay) continue;
    const isTrigger = Boolean(animationTimeline && presenterTriggerCueIds(animationTimeline, element.element_key).length);
    overlays[element.element_key] = <div
      data-element-id={element.element_key}
      data-animation-trigger={isTrigger ? 'true' : undefined}
      className={`h-full w-full ${isTrigger ? 'cursor-pointer' : ''}`}
      onClickCapture={isTrigger ? (event) => { event.preventDefault(); event.stopPropagation(); onTriggerElement?.(element.element_key); } : undefined}
    >{overlay}</div>;
  }
  const objectAnimationStyles: Record<string, React.CSSProperties> = {};
  const objectAnimationKeys: Record<string, string | number> = {};
  for (const element of screen.elements) {
    const overlay = overlays[element.element_key];
    if (!overlay || !animationTimeline || animationStep === undefined) continue;
    const readinessKey = publishedElementReadinessKey(screen.screen_id, element);
    const hasAnimationCue = animationTimeline.cues.some((cue) => cue.elementKey === element.element_key);
    if (readinessKey && hasAnimationCue && !readyResourceKeys.has(readinessKey)) {
      // Keep loading UI and partially rendered media out of the animation
      // target. Once the resource reports a painted, usable frame, the changed
      // key replays the current cue against the real resource surface.
      objectAnimationStyles[element.element_key] = { opacity: 0, animation: 'none' };
      objectAnimationKeys[element.element_key] = `${screen.screen_id}-${element.element_key}-waiting-for-resource`;
      continue;
    }
    const playbackState = presenterElementPlaybackState(
      animationTimeline,
      element.element_key,
      animationStep,
      playbackCycle ?? 0,
      animationNavigation,
      triggeredCueIds,
    );
    const containerEffects = studioContainerAnimationEffects(
      playbackState.activeEffects,
      element.element_type === 'shape' || typeof element.content_json?.kind === 'string',
    );
    const activeStyle = containerEffects.length
      ? studioAnimationStyle({ effects: containerEffects })
      : null;
    const sequenceRunsInsideText = playbackState.activeEffects.some((effect) => ['paragraph', 'word', 'letter'].includes(String(effect.textSequence || 'object')))
      && (element.element_type === 'shape' || ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(element.element_type));
    const sequenceRunsInsideComponent = playbackState.activeEffects.some((effect) => !['as-one-object', 'all-at-once', ''].includes(String(effect.buildSequence || '')));
    objectAnimationStyles[element.element_key] = sequenceRunsInsideComponent ? {} : activeStyle && !sequenceRunsInsideText
      ? {
          ...activeStyle,
          ...(playbackState.reverse
            ? {
                animationDirection: playbackState.activeEffects
                  .map(() => 'reverse')
                  .join(', '),
              }
            : {}),
        }
      : playbackState.visible
        ? playbackState.afterStyle
        : { opacity: 0 };
    objectAnimationKeys[element.element_key] = `${screen.screen_id}-${playbackState.identity}`;
  }

  const drawingEnabled = annotationTool === 'pen' || annotationTool === 'highlighter' || annotationTool === 'eraser';
  const drawingTool = annotationTool === 'eraser' ? 'eraser' : annotationTool === 'highlighter' ? 'highlighter' : 'pen';
  const slideTransition = screen.screen_settings_json?.transition;
  const transitionHandledByPlayer = studioTransitionHandledByPlayer(slideTransition);
  return <SlideCanvas layout={layout} slide={slide} compactViewport immersiveViewport={immersiveViewport} backgroundColor={typeof screen.screen_settings_json?.backgroundColor === 'string' ? screen.screen_settings_json.backgroundColor : '#f9fcff'} backgroundImage={screenBackgroundImageUrl && screenBackgroundImage ? { ...screenBackgroundImage, url: screenBackgroundImageUrl } : null} objectOverlays={overlays} objectAnimationStyles={objectAnimationStyles} objectAnimationKeys={objectAnimationKeys} transition={transitionHandledByPlayer ? undefined : slideTransition} fixedDrawingStrokes={screen.screen_settings_json?.author_drawings?.strokes ?? []} drawingStrokes={teacherAnnotations} drawingEnabled={drawingEnabled} drawingTool={drawingTool} drawingColor={annotationColor} drawingWidth={annotationWidth} onDrawingChange={onAnnotationsChange} onDrawingPreviewChange={onLiveAnnotationChange} />;
}

export default function StudioSessionPlayerPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sessionId = Number(params.sessionId);
  const releaseNumber = Number(params.releaseNumber);
  const previewMode = params.releaseNumber === undefined;
  const initialPreviewRef = useRef(previewMode ? getCachedSessionPreview(sessionId) : null);
  const playerRef = useRef<HTMLDivElement>(null);
  const enterScreenAtEndRef = useRef(false);
  const suppressAutoRuntimeRef = useRef(false);
  const previousFullScreenRef = useRef(false);
  const advancePresenterRef = useRef<() => void>(() => undefined);
  const retreatPresenterRef = useRef<() => void>(() => undefined);
  const toggleFullScreenRef = useRef<() => void>(() => undefined);
  const screenIdRef = useRef<number | null>(null);
  const presenterChannelRef = useRef<BroadcastChannel | null>(null);
  const presenterWindowRef = useRef<Window | null>(null);
  const presenterWindowWatchRef = useRef<number | null>(null);
  const presenterStateRef = useRef<PresenterSyncState | null>(null);
  const remotePresenterStateRef = useRef<PresenterSyncState | null>(null);
  const presenterPointerDotRef = useRef<HTMLSpanElement | null>(null);
  const presenterSlideRef = useRef<HTMLDivElement | null>(null);
  const audienceSlideHostRef = useRef<HTMLElement | null>(null);
  const audiencePointerDotRef = useRef<HTMLSpanElement | null>(null);
  const audienceLiveSvgRef = useRef<SVGSVGElement | null>(null);
  const audienceLiveInkRef = useRef<SVGPolylineElement | null>(null);
  const liveAnnotationFrameRef = useRef<number | null>(null);
  const latestLiveAnnotationRef = useRef<AuthorDrawingStroke | null>(null);
  const [release, setRelease] = useState<PublishedRelease | null>(() => initialPreviewRef.current?.release ?? null);
  const [screenId, setScreenId] = useState<number | null>(() => {
    const cached = initialPreviewRef.current;
    if (!cached) return previewMode ? getPreferredSessionPreviewScreen(sessionId) : null;
    if (cached.preferredScreenId && cached.release.manifest.screens.some((screen) => screen.screen_id === cached.preferredScreenId)) return cached.preferredScreenId;
    return [...cached.release.manifest.screens].sort((a, b) => a.display_order - b.display_order)[0]?.screen_id ?? null;
  });
  const [loading, setLoading] = useState(!initialPreviewRef.current);
  const [error, setError] = useState('');
  const [annotationTool, setAnnotationTool] = useState<PresenterAnnotationTool>('pointer');
  const [annotationColor, setAnnotationColor] = useState('#ef4444');
  const [annotationWidth, setAnnotationWidth] = useState(6);
  const [fullscreenDrawOpen, setFullscreenDrawOpen] = useState(false);
  const [fullscreenSlidesOpen, setFullscreenSlidesOpen] = useState(false);
  const [laserPoint, setLaserPoint] = useState<{ x: number; y: number } | null>(null);
  const [annotationsByScreen, setAnnotationsByScreen] = useState<Record<number, AuthorDrawingStroke[]>>({});
  const [annotationHistoryByScreen, setAnnotationHistoryByScreen] = useState<Record<number, AuthorDrawingStroke[][]>>({});
  const [materials, setMaterials] = useState<PublishedTeachingMaterials | null>(null);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [materialsBusy, setMaterialsBusy] = useState(false);
  const [curriculumPreview, setCurriculumPreview] = useState<CurriculumDocumentPreview | null>(null);
  const [discoveryPanelOpen, setDiscoveryPanelOpen] = useState(false);
  const [discoveryItem, setDiscoveryItem] = useState<StudioDiscoveryItem | null>(null);
  const [discoveryRelease, setDiscoveryRelease] = useState<PublishedRelease | null>(null);
  const [discoveryScreenId, setDiscoveryScreenId] = useState<number | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
  const [fullScreen, setFullScreen] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [playbackCycle, setPlaybackCycle] = useState(0);
  const [animationNavigation, setAnimationNavigation] = useState<PresenterAnimationNavigation | null>(null);
  const [triggeredAnimationCueIds, setTriggeredAnimationCueIds] = useState<Set<string>>(() => new Set());
  const [blankMode, setBlankMode] = useState<'black' | 'white' | null>(null);
  const [presentationZoom, setPresentationZoom] = useState(1);
  const [zoomRun, setZoomRun] = useState<null | { originScreenId: number; targetIds: number[]; index: number; returnToZoom: boolean }>(null);
  const [zoomHubRun, setZoomHubRun] = useState<null | { originScreenId: number; elementKeys: string[]; index: number }>(null);
  const [activeRuntimeElement, setActiveRuntimeElement] = useState<PublishedScreen['elements'][number] | null>(null);
  const [shortcutGuideOpen, setShortcutGuideOpen] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);
  const [presenterData, setPresenterData] = useState<PublishedPresenterData | null>(null);
  const [presenterDataBusy, setPresenterDataBusy] = useState(false);

  const presentationChannel = new URLSearchParams(window.location.search).get('channel');
  const audienceMode = new URLSearchParams(window.location.search).get('mode') === 'audience';

  useEffect(() => {
    if (!Number.isInteger(sessionId) || (!previewMode && !Number.isInteger(releaseNumber))) {
      setError('Invalid Session player route.');
      setLoading(false);
      return;
    }
    if (!initialPreviewRef.current) setLoading(true);
    setError('');
    const request = previewMode
      ? getPendingSessionPreview(sessionId) ?? getSessionPlayerPreview(sessionId)
      : getPublishedRelease(sessionId, releaseNumber);
    void request
      .then(async (data) => {
        const orderedScreens = [...data.manifest.screens].sort((a, b) => a.display_order - b.display_order);
        const first = orderedScreens.find((screen) => !studioScreenIsHidden(screen.screen_settings_json)) ?? orderedScreens[0];
        const targetScreenId = audienceMode && remotePresenterStateRef.current?.screenId
          ? remotePresenterStateRef.current.screenId
          : screenIdRef.current && data.manifest.screens.some((screen) => screen.screen_id === screenIdRef.current)
            ? screenIdRef.current
            : first?.screen_id ?? null;
        if (previewMode) {
          let timeoutId = 0;
          await Promise.race([
            prepareSessionPreviewCriticalScreen(data, targetScreenId, getStudioResourcePreview).catch(() => undefined),
            new Promise<void>((resolve) => { timeoutId = window.setTimeout(resolve, 1_500); }),
          ]);
          if (timeoutId) window.clearTimeout(timeoutId);
        }
        setRelease(data);
        setScreenId(targetScreenId);
        if (previewMode) clearCachedSessionPreview(sessionId);
        if (previewMode) void prepareSessionPreviewResources(data, async (mapping) => {
          if (['html', 'zip', 'simulation'].includes(mapping.resource_type)) {
            const launch = await launchStudioResourceVersion(mapping.resource_version_id);
            if (!launch.launchable || !launch.launch_url) throw new Error(launch.message || 'Resource cannot be prepared.');
            return { url: resolveAssetUrl(launch.launch_url) || launch.launch_url };
          }
          return getStudioResourcePreview(mapping.resource_version_id);
        }, targetScreenId);
      })
      .catch((requestError) => {
        if (!initialPreviewRef.current) setError(getApiErrorDetails(requestError).message);
      })
      .finally(() => setLoading(false));
  }, [audienceMode, previewMode, releaseNumber, sessionId]);

  const screens = useMemo(() => [...(release?.manifest.screens || [])].sort((a, b) => a.display_order - b.display_order), [release]);
  const visibleScreens = useMemo(() => screens.filter((item) => !studioScreenIsHidden(item.screen_settings_json)), [screens]);
  const currentIndex = screens.findIndex((screen) => screen.screen_id === screenId);
  const screen = currentIndex >= 0 ? screens[currentIndex] : null;
  const visibleIndex = visibleScreens.findIndex((item) => item.screen_id === screenId);
  const previousVisibleScreen = currentIndex > 0
    ? [...screens.slice(0, currentIndex)].reverse().find((item) => !studioScreenIsHidden(item.screen_settings_json)) ?? null
    : null;
  const nextVisibleScreen = currentIndex >= 0
    ? screens.slice(currentIndex + 1).find((item) => !studioScreenIsHidden(item.screen_settings_json)) ?? null
    : null;
  const preparedPreviewScreens = previewMode && currentIndex >= 0
    ? screens.filter((_, index) => Math.abs(index - currentIndex) <= 1)
    : [];
  const navigateToScreen = useCallback((nextScreenId: number | null) => {
    if (!Number.isInteger(nextScreenId) || nextScreenId === screenIdRef.current) return;
    const destination = screens.find((item) => item.screen_id === nextScreenId);
    const transition = destination?.screen_settings_json?.transition;
    const transitionSettings = transition && typeof transition === 'object'
      ? transition as Record<string, unknown>
      : undefined;
    const updateScreen = () => setScreenId(nextScreenId);
    if (!startStudioSlideTransition(
      updateScreen,
      transitionSettings,
      null,
      playerRef.current,
      presenterSlideRef.current || audienceSlideHostRef.current,
    )) updateScreen();
  }, [screens]);
  const animationTimeline = useMemo(() => buildPresenterAnimationTimeline(screen?.elements ?? []), [screen]);
  const zoomElements = useMemo(() => [...(screen?.elements ?? [])]
    .filter((element) => element.element_type === 'zoom' && element.zoom)
    .sort((left, right) => {
      const leftOrder = Number(left.content_json?.zoom_summary_order);
      const rightOrder = Number(right.content_json?.zoom_summary_order);
      if (Number.isFinite(leftOrder) && Number.isFinite(rightOrder)) return leftOrder - rightOrder;
      return left.display_order - right.display_order;
    }), [screen]);
  const discoveryScreens = useMemo(() => [...(discoveryRelease?.manifest.screens || [])].sort((a, b) => a.display_order - b.display_order), [discoveryRelease]);
  const discoveryIndex = discoveryScreens.findIndex((candidate) => candidate.screen_id === discoveryScreenId);
  const discoveryScreen = discoveryIndex >= 0 ? discoveryScreens[discoveryIndex] : null;
  const isTrackedBranchUser = user?.role === 'teacher';
  const teacherAnnotations = screenId ? (annotationsByScreen[screenId] ?? []) : [];
  screenIdRef.current = screenId;
  const nextScreen = nextVisibleScreen;
  const currentPresenterScript = presenterData?.screen_scripts.find((item) => item.screen_id === screenId);
  const teacherNarration = presenterText(currentPresenterScript?.content.teacher_narration);
  const presenterNotes = presenterText(currentPresenterScript?.content.teacher_presenter_notes_production_checks);
  presenterStateRef.current = {
    screenId,
    animationStep,
    playbackCycle,
    annotations: teacherAnnotations,
    blankMode,
    presentationZoom,
    triggeredCueIds: [...triggeredAnimationCueIds],
  };

  const audienceSlideBounds = () => {
    const host = audienceSlideHostRef.current;
    const surface = host?.querySelector<HTMLElement>('[data-testid="slide-surface"]');
    if (!host || !surface) return null;
    const hostBounds = host.getBoundingClientRect();
    const surfaceBounds = surface.getBoundingClientRect();
    const bounds = {
      left: surfaceBounds.left - hostBounds.left,
      top: surfaceBounds.top - hostBounds.top,
      width: surfaceBounds.width,
      height: surfaceBounds.height,
    };
    const liveSvg = audienceLiveSvgRef.current;
    if (liveSvg) {
      liveSvg.style.left = `${bounds.left}px`;
      liveSvg.style.top = `${bounds.top}px`;
      liveSvg.style.width = `${bounds.width}px`;
      liveSvg.style.height = `${bounds.height}px`;
    }
    return bounds;
  };

  useEffect(() => {
    const unlock = () => void unlockStudioTransitionAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!screen) return;
    const transition = normalizeStudioTransition(screen.screen_settings_json?.transition);
    let cancelled = false;
    const play = async () => {
      let customUrl: string | null = null;
      if (transition.sound === 'custom' && transition.customSound?.resourceVersionId) {
        const preview = previewMode
          ? await getStudioResourcePreview(transition.customSound.resourceVersionId)
          : await previewPublishedResource(releaseId, transition.customSound.resourceVersionId);
        customUrl = preview.url;
      }
      if (!cancelled) await playStudioTransitionSound(transition.sound, {
        loop: transition.loopSound === true,
        customUrl,
      });
    };
    void play().catch(() => undefined);
    return () => {
      cancelled = true;
      stopStudioTransitionSound();
    };
  }, [previewMode, releaseId, screen]);

  useEffect(() => () => stopStudioTransitionSound(), []);

  useEffect(() => {
    const remoteState = audienceMode ? remotePresenterStateRef.current : null;
    if (audienceLiveInkRef.current) audienceLiveInkRef.current.style.display = 'none';
    if (audiencePointerDotRef.current) audiencePointerDotRef.current.style.display = 'none';
    setAnimationStep(remoteState?.screenId === screenId
      ? remoteState.animationStep
      : enterScreenAtEndRef.current ? animationTimeline.maxStep : 0);
    enterScreenAtEndRef.current = false;
    setAnimationNavigation(null);
    setTriggeredAnimationCueIds(remoteState?.screenId === screenId ? new Set(remoteState.triggeredCueIds || []) : new Set());
    setPlaybackCycle(remoteState?.screenId === screenId
      ? remoteState.playbackCycle
      : (value) => value + 1);
    setBlankMode(remoteState?.screenId === screenId ? remoteState.blankMode : null);
    setPresentationZoom(remoteState?.screenId === screenId ? remoteState.presentationZoom : 1);
    if (remoteState?.screenId === screenId && screenId)
      setAnnotationsByScreen((current) => ({ ...current, [screenId]: remoteState.annotations }));
  }, [animationTimeline.maxStep, audienceMode, screenId]);

  const triggerAnimationForElement = (elementKey: string) => {
    const cueIds = presenterTriggerCueIds(animationTimeline, elementKey);
    if (!cueIds.length) return;
    setTriggeredAnimationCueIds((current) => new Set([...current, ...cueIds]));
    setPlaybackCycle((current) => current + 1);
    const cue = animationTimeline.cues.find((candidate) => cueIds.includes(candidate.cueId));
    if (cue) void playStudioAnimationSound(cue.effect as StudioAnimationEffectDefinition).catch(() => undefined);
  };

  const triggerAnimationAtMediaBookmark = (elementKey: string, previousSeconds: number, currentSeconds: number) => {
    const cueIds = presenterMediaBookmarkCueIds(animationTimeline, elementKey, previousSeconds, currentSeconds);
    if (!cueIds.length) return;
    setTriggeredAnimationCueIds((current) => new Set([...current, ...cueIds]));
    setPlaybackCycle((current) => current + 1);
    const cue = animationTimeline.cues.find((candidate) => cueIds.includes(candidate.cueId));
    if (cue) void playStudioAnimationSound(cue.effect as StudioAnimationEffectDefinition).catch(() => undefined);
  };

  useEffect(() => {
    animationTimeline.cues.filter((candidate) => candidate.step === animationStep && candidate.step >= 0)
      .forEach((cue) => void playStudioAnimationSound(cue.effect as StudioAnimationEffectDefinition).catch(() => undefined));
  }, [animationStep, animationTimeline, playbackCycle]);

  useEffect(() => {
    if (!screen) return;
    if (suppressAutoRuntimeRef.current) {
      suppressAutoRuntimeRef.current = false;
      setActiveRuntimeElement(null);
      return;
    }
    const first = [...screen.elements].sort((left, right) => left.display_order - right.display_order)[0];
    const autoFullScreen = first?.resource_mapping && ['simulation', 'html', 'zip', 'scorm'].includes(first.resource_mapping.resource_type)
      && (first.resource_mapping.usage_details_json?.auto_fullscreen === true || first.content_json?.auto_fullscreen === true);
    setActiveRuntimeElement(autoFullScreen ? first : null);
  }, [screenId]);

  const selectTeacherScreen = (nextScreenId: number) => {
    if (!Number.isInteger(nextScreenId) || nextScreenId === screenId) return;
    suppressAutoRuntimeRef.current = true;
    setActiveRuntimeElement(null);
    navigateToScreen(nextScreenId);
  };

  useEffect(() => {
    const syncFullScreen = () => setFullScreen(document.fullscreenElement === playerRef.current);
    document.addEventListener('fullscreenchange', syncFullScreen);
    return () => document.removeEventListener('fullscreenchange', syncFullScreen);
  }, []);

  useEffect(() => {
    const wasFullScreen = previousFullScreenRef.current;
    previousFullScreenRef.current = fullScreen;
    if (fullScreen === wasFullScreen) return;
    setFullscreenDrawOpen(false);
    setFullscreenSlidesOpen(false);
    setLaserPoint(null);
    setAnnotationTool('pointer');
  }, [fullScreen]);

  useEffect(() => {
    if (annotationTool === 'laser') return;
    setLaserPoint(null);
    if (presenterPointerDotRef.current) presenterPointerDotRef.current.style.display = 'none';
    if (presenterMode) presenterChannelRef.current?.postMessage({ type: 'pointer', screenId, point: null });
  }, [annotationTool, presenterMode, screenId]);

  const toggleFullScreen = async () => {
    if (document.fullscreenElement === playerRef.current) await document.exitFullscreen();
    else await playerRef.current?.requestFullscreen();
  };
  toggleFullScreenRef.current = () => { void toggleFullScreen(); };

  const setTeacherAnnotations = (strokes: AuthorDrawingStroke[]) => {
    if (!screenId) return;
    const previous = annotationsByScreen[screenId] ?? [];
    setAnnotationHistoryByScreen((current) => ({
      ...current,
      [screenId]: [...(current[screenId] ?? []), previous],
    }));
    setAnnotationsByScreen((current) => ({ ...current, [screenId]: strokes }));
  };

  const undoTeacherAnnotation = () => {
    if (!screenId) return;
    const history = annotationHistoryByScreen[screenId] ?? [];
    const previous = history.at(-1);
    if (!previous) return;
    setAnnotationsByScreen((current) => ({ ...current, [screenId]: previous }));
    setAnnotationHistoryByScreen((current) => ({ ...current, [screenId]: history.slice(0, -1) }));
  };

  const openTeachingMaterials = async () => {
    if (materialsOpen || curriculumPreview) {
      setMaterialsOpen(false);
      setCurriculumPreview(null);
      return;
    }
    if (!release || materialsBusy) return;
    setDiscoveryPanelOpen(false);
    setCurriculumPreview(null);
    setMaterialsOpen(true);
    if (materials) return;
    setMaterialsBusy(true);
    try {
      setMaterials(await getPublishedTeachingMaterials(release.id));
    } catch (requestError) {
      setError(getApiErrorDetails(requestError).message);
    } finally {
      setMaterialsBusy(false);
    }
  };

  const exitPlayer = () => navigate(-1);

  const openDiscoveredContent = async (item: StudioDiscoveryItem) => {
    setDiscoveryPanelOpen(false);
    setDiscoveryItem(item);
    setDiscoveryRelease(null);
    setDiscoveryScreenId(null);
    setDiscoveryError('');
    if (item.type === 'resource') return;
    setDiscoveryLoading(true);
    try {
      const selectedRelease = await getPublishedRelease(item.session_id, item.release_number);
      const selectedScreens = [...selectedRelease.manifest.screens].sort((left, right) => left.display_order - right.display_order);
      const selectedScreenId = item.type === 'screen' ? item.screen_id : selectedScreens[0]?.screen_id;
      if (!selectedScreenId || !selectedScreens.some((candidate) => candidate.screen_id === selectedScreenId)) {
        throw new Error('The selected published content has no available Screen.');
      }
      setDiscoveryRelease(selectedRelease);
      setDiscoveryScreenId(selectedScreenId);
    } catch (requestError) {
      setDiscoveryError(getApiErrorDetails(requestError, requestError instanceof Error ? requestError.message : 'Unable to open related content.').message);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const closeDiscoveredContent = () => {
    setDiscoveryItem(null);
    setDiscoveryRelease(null);
    setDiscoveryScreenId(null);
    setDiscoveryError('');
    setDiscoveryLoading(false);
  };

  const advancePresenter = () => {
    setBlankMode(null);
    if (activeRuntimeElement) {
      const frame = playerRef.current?.querySelector<HTMLIFrameElement>('[data-active-runtime] iframe');
      frame?.contentWindow?.postMessage({ source: 'spectropy-player', type: 'STUDIO_RUNTIME_COMMAND', direction: 'next' }, '*');
      return;
    }
    if (document.fullscreenElement && document.fullscreenElement !== playerRef.current) {
      void document.exitFullscreen();
      return;
    }
    if (animationStep < animationTimeline.maxStep) {
      const nextStep = animationStep + 1;
      setAnimationNavigation({
        direction: 'forward',
        fromStep: animationStep,
        toStep: nextStep,
      });
      setAnimationStep(nextStep);
      const cueKeys = new Set(animationTimeline.cues.filter((cue) => cue.step === nextStep).map((cue) => cue.elementKey));
      const runtime = screen?.elements.find((element) => cueKeys.has(element.element_key) && element.resource_mapping && ['simulation', 'html', 'zip', 'scorm'].includes(element.resource_mapping.resource_type));
      if (runtime) setActiveRuntimeElement(runtime);
      return;
    }
    if (zoomRun) {
      if (zoomRun.index < zoomRun.targetIds.length - 1) {
        const nextIndex = zoomRun.index + 1;
        setZoomRun({ ...zoomRun, index: nextIndex });
        navigateToScreen(zoomRun.targetIds[nextIndex]);
      } else if (zoomRun.returnToZoom) {
        enterScreenAtEndRef.current = true;
        navigateToScreen(zoomRun.originScreenId);
        setZoomRun(null);
      } else setZoomRun(null);
      return;
    }
    if (screen && zoomElements.length > 0) {
      const orderedKeys = zoomElements.map((element) => element.element_key);
      const nextIndex = zoomHubRun?.originScreenId === screen.screen_id
        ? zoomHubRun.index + 1
        : 0;
      const nextZoom = zoomElements[nextIndex];
      if (nextZoom) {
        setZoomHubRun({ originScreenId: screen.screen_id, elementKeys: orderedKeys, index: nextIndex });
        openZoom(nextZoom, nextIndex, orderedKeys);
        return;
      }
      const zoomTargetIds = new Set<number>();
      for (const zoomElement of zoomElements) {
        if (zoomElement.zoom?.zoom_kind === 'screen' && zoomElement.zoom.target_screen_id)
          zoomTargetIds.add(zoomElement.zoom.target_screen_id);
        if (zoomElement.zoom?.zoom_kind === 'section') {
          const section = release?.manifest.sections?.find((candidate) => candidate.section_id === zoomElement.zoom?.target_section_id);
          section?.screens.forEach((item) => zoomTargetIds.add(item.screen_id));
        }
      }
      const followingScreen = screens.slice(currentIndex + 1).find((candidate) => !studioScreenIsHidden(candidate.screen_settings_json) && !zoomTargetIds.has(candidate.screen_id));
      if (followingScreen) {
        setZoomHubRun(null);
        navigateToScreen(followingScreen.screen_id);
      }
      return;
    }
    const followingScreen = screens.slice(currentIndex + 1).find((candidate) => !studioScreenIsHidden(candidate.screen_settings_json));
    if (followingScreen) navigateToScreen(followingScreen.screen_id);
  };
  advancePresenterRef.current = advancePresenter;

  useEffect(() => {
    const transition = screen?.screen_settings_json?.transition;
    if (!transition || typeof transition !== 'object' || transition.advanceAfterEnabled !== true) return;
    if (animationStep < animationTimeline.maxStep || activeRuntimeElement || discoveryItem || materialsOpen || blankMode) return;
    const seconds = Math.max(0.1, Number(transition.advanceAfterSeconds) || 0);
    const timer = window.setTimeout(() => advancePresenterRef.current(), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [activeRuntimeElement, animationStep, animationTimeline.maxStep, blankMode, discoveryItem, materialsOpen, screen]);

  const retreatPresenter = () => {
    setBlankMode(null);
    if (activeRuntimeElement) {
      const frame = playerRef.current?.querySelector<HTMLIFrameElement>('[data-active-runtime] iframe');
      frame?.contentWindow?.postMessage({ source: 'spectropy-player', type: 'STUDIO_RUNTIME_COMMAND', direction: 'previous' }, '*');
      return;
    }
    if (document.fullscreenElement && document.fullscreenElement !== playerRef.current) {
      void document.exitFullscreen();
      return;
    }
    if (animationStep > 0) {
      const previousStep = Math.max(0, animationStep - 1);
      setAnimationNavigation({
        direction: 'backward',
        fromStep: animationStep,
        toStep: previousStep,
      });
      setAnimationStep(previousStep);
      return;
    }
    if (zoomRun) {
      if (zoomRun.index > 0) {
        const previousIndex = zoomRun.index - 1;
        setZoomRun({ ...zoomRun, index: previousIndex });
        enterScreenAtEndRef.current = true;
        navigateToScreen(zoomRun.targetIds[previousIndex]);
      } else {
        navigateToScreen(zoomRun.originScreenId);
        setZoomRun(null);
      }
      return;
    }
    const previousScreen = currentIndex > 0
      ? [...screens.slice(0, currentIndex)].reverse().find((candidate) => !studioScreenIsHidden(candidate.screen_settings_json))
      : null;
    if (previousScreen) {
      enterScreenAtEndRef.current = true;
      navigateToScreen(previousScreen.screen_id);
    }
  };
  retreatPresenterRef.current = retreatPresenter;

  useEffect(() => {
    if (!presentationChannel || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(presentationChannel);
    channel.onmessage = (event: MessageEvent<{ command?: string; type?: string; state?: PresenterSyncState; screenId?: number | null; stroke?: AuthorDrawingStroke | null; point?: { x: number; y: number } | null }>) => {
      if (event.data?.type === 'live-annotation') {
        const line = audienceLiveInkRef.current;
        if (!line) return;
        audienceSlideBounds();
        const stroke = event.data.screenId === screenIdRef.current ? event.data.stroke : null;
        line.style.display = stroke?.points.length ? 'block' : 'none';
        if (stroke?.points.length) {
          line.setAttribute('points', stroke.points.map((point) => `${point.x},${point.y}`).join(' '));
          line.setAttribute('stroke', stroke.color);
          line.setAttribute('stroke-width', String(stroke.width));
          line.setAttribute('stroke-opacity', String(stroke.opacity ?? 1));
          line.style.mixBlendMode = stroke.tool === 'highlighter' ? 'multiply' : 'normal';
        }
        return;
      }
      if (event.data?.type === 'pointer') {
        const dot = audiencePointerDotRef.current;
        if (!dot) return;
        const point = event.data.screenId === screenIdRef.current ? event.data.point : null;
        const bounds = point ? audienceSlideBounds() : null;
        dot.style.display = point ? 'block' : 'none';
        if (point && bounds) {
          dot.style.left = `${bounds.left + point.x * bounds.width}px`;
          dot.style.top = `${bounds.top + point.y * bounds.height}px`;
        }
        return;
      }
      if (event.data?.type === 'state' && event.data.state) {
        const state = event.data.state;
        remotePresenterStateRef.current = state;
        if (state.screenId !== screenIdRef.current) {
          if (audienceLiveInkRef.current) audienceLiveInkRef.current.style.display = 'none';
          navigateToScreen(state.screenId);
        }
        else {
          setAnimationStep(state.animationStep);
          setPlaybackCycle(state.playbackCycle);
          setBlankMode(state.blankMode);
          setPresentationZoom(state.presentationZoom);
          setTriggeredAnimationCueIds(new Set(state.triggeredCueIds || []));
          if (state.screenId)
            setAnnotationsByScreen((current) => ({ ...current, [state.screenId as number]: state.annotations }));
          window.requestAnimationFrame(() => {
            if (audienceLiveInkRef.current) audienceLiveInkRef.current.style.display = 'none';
          });
        }
        return;
      }
      if (event.data?.command === 'next') advancePresenterRef.current();
      if (event.data?.command === 'previous') retreatPresenterRef.current();
      if (event.data?.command === 'fullscreen') toggleFullScreenRef.current();
      if (event.data?.command === 'close') window.close();
    };
    channel.postMessage({ type: 'ready' });
    return () => channel.close();
  }, [navigateToScreen, presentationChannel]);

  useEffect(() => {
    if (!presenterMode || !presenterChannelRef.current || !presenterStateRef.current) return;
    presenterChannelRef.current.postMessage({ type: 'state', state: presenterStateRef.current });
  }, [animationStep, blankMode, playbackCycle, presentationZoom, presenterMode, screenId, teacherAnnotations, triggeredAnimationCueIds]);

  useEffect(() => () => {
    if (presenterWindowWatchRef.current !== null) window.clearInterval(presenterWindowWatchRef.current);
    presenterChannelRef.current?.postMessage({ command: 'close' });
    presenterChannelRef.current?.close();
    if (presenterWindowRef.current && !presenterWindowRef.current.closed) presenterWindowRef.current.close();
  }, []);

  const openZoom = (element: PublishedScreen['elements'][number], queueIndex?: number, queueKeys?: string[]) => {
    if (!screen || !element.zoom) return;
    const targetIds = element.zoom.zoom_kind === 'screen'
      ? [element.zoom.target_screen_id].filter((value): value is number => Number.isInteger(value))
      : (release?.manifest.sections?.find((section) => section.section_id === element.zoom?.target_section_id)?.screens || [])
          .sort((left, right) => left.display_order - right.display_order)
          .map((item) => item.screen_id);
    if (targetIds.length === 0 || !screens.some((item) => item.screen_id === targetIds[0])) return;
    const hubElements = zoomElements;
    const resolvedIndex = queueIndex ?? hubElements.findIndex((candidate) => candidate.element_key === element.element_key);
    if (resolvedIndex >= 0) setZoomHubRun({
      originScreenId: screen.screen_id,
      elementKeys: queueKeys ?? hubElements.map((candidate) => candidate.element_key),
      index: resolvedIndex,
    });
    setZoomRun({ originScreenId: screen.screen_id, targetIds, index: 0, returnToZoom: element.zoom.return_to_zoom });
    navigateToScreen(targetIds[0]);
  };

  useEffect(() => {
    const receiveRuntimeClicker = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string; key?: string; point?: { x: number; y: number } | null } | null;
      if (data?.source !== 'spectropy-runtime') return;
      if (data.type === 'STUDIO_RUNTIME_POINTER') {
        if (!presenterMode || annotationTool !== 'pointer') return;
        if (!data.point) {
          publishPointerPoint(null);
          return;
        }
        const host = presenterSlideRef.current;
        const frame = Array.from(playerRef.current?.querySelectorAll('iframe') ?? [])
          .find((candidate) => candidate.contentWindow === event.source);
        if (!host || !frame) return;
        const surface = host.querySelector<HTMLElement>('[data-testid="slide-surface"]');
        if (!surface) return;
        const surfaceBounds = surface.getBoundingClientRect();
        const frameBounds = frame.getBoundingClientRect();
        const x = (frameBounds.left + data.point.x * frameBounds.width - surfaceBounds.left) / Math.max(1, surfaceBounds.width);
        const y = (frameBounds.top + data.point.y * frameBounds.height - surfaceBounds.top) / Math.max(1, surfaceBounds.height);
        publishPointerPoint(x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null);
        return;
      }
      if (data.type === 'STUDIO_RUNTIME_COMPLETE') {
        if (document.fullscreenElement) void document.exitFullscreen();
        setActiveRuntimeElement(null);
        return;
      }
      if (data.type !== 'STUDIO_CLICKER_INPUT') return;
      if (['ArrowLeft', 'PageUp', 'Backspace'].includes(String(data.key))) retreatPresenter();
      else if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(String(data.key))) advancePresenter();
    };
    window.addEventListener('message', receiveRuntimeClicker);
    return () => window.removeEventListener('message', receiveRuntimeClicker);
  });

  const replayScreen = () => {
    setAnimationStep(0);
    setAnimationNavigation(null);
    setPlaybackCycle((value) => value + 1);
    setBlankMode(null);
  };

  const toggleMediaPlayback = () => {
    const media = playerRef.current?.querySelector<HTMLMediaElement>('video, audio');
    if (!media) return;
    if (media.paused) void media.play();
    else media.pause();
  };

  useEffect(() => {
    if (audienceMode) return;
    const handleClicker = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape' && discoveryPanelOpen) {
        event.preventDefault();
        setDiscoveryPanelOpen(false);
        return;
      }
      if (event.key === 'Escape' && discoveryItem) {
        event.preventDefault();
        closeDiscoveredContent();
        return;
      }
      if (event.key === 'Escape' && materialsOpen) {
        event.preventDefault();
        setMaterialsOpen(false);
        return;
      }
      if (event.key === 'Escape' && blankMode) {
        event.preventDefault();
        setBlankMode(null);
        return;
      }
      if (event.key === 'Escape' && shortcutGuideOpen) {
        event.preventDefault();
        setShortcutGuideOpen(false);
        return;
      }
      if (materialsOpen) return;
      const navigationAction = clickerNavigationAction(event);
      if (discoveryItem?.type === 'session') {
        if (navigationAction === 'previous' && discoveryIndex > 0) {
          event.preventDefault();
          setDiscoveryScreenId(discoveryScreens[discoveryIndex - 1]?.screen_id ?? null);
        } else if (navigationAction === 'next' && discoveryIndex >= 0 && discoveryIndex < discoveryScreens.length - 1) {
          event.preventDefault();
          setDiscoveryScreenId(discoveryScreens[discoveryIndex + 1]?.screen_id ?? null);
        }
        return;
      }
      if (discoveryItem) return;
      if (navigationAction === 'previous') {
        event.preventDefault();
        retreatPresenter();
      } else if (navigationAction === 'next') {
        event.preventDefault();
        advancePresenter();
      } else if (event.key === 'Home' && visibleScreens.length > 0) {
        event.preventDefault();
        enterScreenAtEndRef.current = false;
        navigateToScreen(visibleScreens[0].screen_id);
      } else if (event.key === 'End' && visibleScreens.length > 0) {
        event.preventDefault();
        enterScreenAtEndRef.current = false;
        navigateToScreen(visibleScreens.at(-1)?.screen_id ?? null);
      } else if (event.key.toLowerCase() === 'f' || event.key === 'F5') {
        event.preventDefault();
        void toggleFullScreen();
      } else if (event.key.toLowerCase() === 'b' || event.key === '.') {
        event.preventDefault();
        setBlankMode((mode) => mode === 'black' ? null : 'black');
      } else if (event.key.toLowerCase() === 'w' || event.key === ',') {
        event.preventDefault();
        setBlankMode((mode) => mode === 'white' ? null : 'white');
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        replayScreen();
      } else if (event.key.toLowerCase() === 'k' || event.key === 'MediaPlayPause') {
        event.preventDefault();
        toggleMediaPlayback();
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setPresentationZoom((zoom) => Math.min(2, Number((zoom + 0.1).toFixed(1))));
      } else if (event.key === '-') {
        event.preventDefault();
        setPresentationZoom((zoom) => Math.max(0.5, Number((zoom - 0.1).toFixed(1))));
      } else if (event.key === '0') {
        event.preventDefault();
        setPresentationZoom(1);
      } else if (event.key.toLowerCase() === 'm' && !previewMode) {
        event.preventDefault();
        void openTeachingMaterials();
      } else if (/^[1-9]$/.test(event.key) && zoomElements[Number(event.key) - 1]) {
        event.preventDefault();
        openZoom(zoomElements[Number(event.key) - 1], Number(event.key) - 1);
      } else if (event.key.toLowerCase() === 'v' && isTrackedBranchUser) {
        event.preventDefault();
        setAnnotationTool('pointer');
      } else if (event.key.toLowerCase() === 'l' && isTrackedBranchUser && !presenterMode) {
        event.preventDefault();
        setAnnotationTool('laser');
      } else if (event.key.toLowerCase() === 'p' && isTrackedBranchUser) {
        event.preventDefault();
        setAnnotationTool('pen');
      } else if (event.key.toLowerCase() === 'e' && isTrackedBranchUser) {
        event.preventDefault();
        setAnnotationTool('eraser');
      } else if (event.key.toLowerCase() === 'z' && isTrackedBranchUser) {
        event.preventDefault();
        undoTeacherAnnotation();
      } else if (event.key.toLowerCase() === 'c' && isTrackedBranchUser) {
        event.preventDefault();
        if (teacherAnnotations.length) setTeacherAnnotations([]);
      } else if (event.key.toLowerCase() === 'h' || event.key === '?') {
        event.preventDefault();
        setShortcutGuideOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleClicker);
    return () => window.removeEventListener('keydown', handleClicker);
  }, [animationStep, animationTimeline.maxStep, audienceMode, blankMode, currentIndex, discoveryIndex, discoveryItem, discoveryPanelOpen, discoveryScreens, materialsOpen, navigateToScreen, previewMode, screens, shortcutGuideOpen, teacherAnnotations.length, visibleScreens, zoomElements]);

  const downloadPlan = async () => {
    if (!release) return;
    try {
      await downloadPublishedSessionPlan(release.id);
    } catch (requestError) {
      setError(getApiErrorDetails(requestError).message);
    }
  };

  const downloadCurriculum = async () => {
    const chapterId = materials?.curriculum?.chapter_id;
    if (!chapterId) return;
    try {
      await studioDocumentsApi.downloadCurriculumDocument(chapterId);
    } catch (requestError) {
      setError(getApiErrorDetails(requestError).message);
    }
  };

  const viewCurriculum = async () => {
    const chapterId = materials?.curriculum?.chapter_id;
    if (!chapterId) return;
    try {
      setCurriculumPreview(await studioDocumentsApi.previewCurriculumDocument(chapterId));
    } catch (requestError) {
      setError(getApiErrorDetails(requestError).message);
    }
  };

  const broadcastLiveAnnotation = (stroke: AuthorDrawingStroke | null) => {
    latestLiveAnnotationRef.current = stroke;
    if (!stroke) {
      if (liveAnnotationFrameRef.current !== null) window.cancelAnimationFrame(liveAnnotationFrameRef.current);
      liveAnnotationFrameRef.current = null;
      return;
    }
    if (liveAnnotationFrameRef.current !== null) return;
    liveAnnotationFrameRef.current = window.requestAnimationFrame(() => {
      liveAnnotationFrameRef.current = null;
      presenterChannelRef.current?.postMessage({
        type: 'live-annotation',
        screenId,
        stroke: latestLiveAnnotationRef.current,
      });
    });
  };

  const publishPointerPoint = (point: { x: number; y: number } | null) => {
    const dot = presenterPointerDotRef.current;
    if (dot) {
      const host = presenterSlideRef.current;
      const surface = host?.querySelector<HTMLElement>('[data-testid="slide-surface"]');
      const hostBounds = host?.getBoundingClientRect();
      const surfaceBounds = surface?.getBoundingClientRect();
      dot.style.display = point && hostBounds && surfaceBounds ? 'block' : 'none';
      if (point && hostBounds && surfaceBounds) {
        dot.style.left = `${surfaceBounds.left - hostBounds.left + point.x * surfaceBounds.width}px`;
        dot.style.top = `${surfaceBounds.top - hostBounds.top + point.y * surfaceBounds.height}px`;
      }
    }
    presenterChannelRef.current?.postMessage({ type: 'pointer', screenId, point });
  };

  const broadcastPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const surface = event.currentTarget.querySelector<HTMLElement>('[data-testid="slide-surface"]');
    if (!surface) return publishPointerPoint(null);
    const bounds = surface.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / Math.max(1, bounds.width);
    const y = (event.clientY - bounds.top) / Math.max(1, bounds.height);
    publishPointerPoint(x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null);
  };

  const clearBroadcastPointer = () => publishPointerPoint(null);

  const closePresenterMode = () => {
    if (liveAnnotationFrameRef.current !== null) window.cancelAnimationFrame(liveAnnotationFrameRef.current);
    liveAnnotationFrameRef.current = null;
    if (presenterWindowWatchRef.current !== null) {
      window.clearInterval(presenterWindowWatchRef.current);
      presenterWindowWatchRef.current = null;
    }
    presenterChannelRef.current?.postMessage({ command: 'close' });
    presenterChannelRef.current?.close();
    presenterChannelRef.current = null;
    if (presenterWindowRef.current && !presenterWindowRef.current.closed) presenterWindowRef.current.close();
    presenterWindowRef.current = null;
    setPresenterMode(false);
    setAnnotationTool('pointer');
  };

  const openPresenterMode = () => {
    if (!release || !isTrackedBranchUser || previewMode || audienceMode) return;
    if (presenterMode) {
      presenterWindowRef.current?.focus();
      return;
    }
    const channelName = `spectropy-player-presenter-${sessionId}-${Date.now()}`;
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : null;
    if (!channel) {
      setError('Presenter Mode requires BroadcastChannel support in this browser.');
      return;
    }
    const audienceUrl = new URL(window.location.href);
    audienceUrl.searchParams.set('mode', 'audience');
    audienceUrl.searchParams.set('channel', channelName);
    const audience = window.open(
      audienceUrl.toString(),
      `spectropy-player-audience-${sessionId}`,
      'popup=yes,width=1440,height=900,left=40,top=40,resizable=yes,scrollbars=no',
    );
    if (!audience) {
      channel.close();
      setError('Allow pop-ups for this site, then open Presenter Mode again.');
      return;
    }
    presenterChannelRef.current = channel;
    presenterWindowRef.current = audience;
    channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'ready' && presenterStateRef.current)
        channel.postMessage({ type: 'state', state: presenterStateRef.current });
    };
    setAnnotationTool('pointer');
    setPresenterMode(true);
    audience.focus();
    presenterWindowWatchRef.current = window.setInterval(() => {
      if (!presenterWindowRef.current?.closed) return;
      if (presenterWindowWatchRef.current !== null) window.clearInterval(presenterWindowWatchRef.current);
      presenterWindowWatchRef.current = null;
      presenterWindowRef.current = null;
      presenterChannelRef.current?.close();
      presenterChannelRef.current = null;
      setPresenterMode(false);
      setAnnotationTool('pointer');
    }, 750);
    setPresenterDataBusy(true);
    void getPublishedPresenterData(release.id)
      .then(setPresenterData)
      .catch((requestError) => setError(getApiErrorDetails(requestError).message))
      .finally(() => setPresenterDataBusy(false));
  };

  if (presenterMode && release && screen && !audienceMode) {
    return (
      <StudioShell title="Presenter View" subtitle={release.manifest.session?.title || `Release ${release.release_number}`} hideHeader scrollContent={false} wrapContent={false}>
        <div ref={playerRef} className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-950 text-white">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/15 px-4 py-2">
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold">Presenter View</h1>
              <p className="truncate text-xs text-slate-300">Screen {screen.screen_number}: {screen.title} · Audience window connected</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => presenterWindowRef.current?.focus()} className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold hover:bg-white/10">Show audience</button>
              <button type="button" onClick={closePresenterMode} className="inline-flex items-center gap-1 rounded-lg border border-red-400/50 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/15"><X size={15} />End Presenter View</button>
            </div>
          </header>
          <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.85fr)] gap-3 p-3">
            <section className="flex min-h-0 flex-col gap-2">
              <div className="flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Current slide</h2><span className="text-xs text-slate-400">{visibleIndex >= 0 ? visibleIndex + 1 : 'Hidden'} / {visibleScreens.length} · Build {animationStep}/{animationTimeline.maxStep}</span></div>
              <div ref={presenterSlideRef} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/20 bg-slate-900" style={{ viewTransitionName: 'studio-slide' }} onPointerMove={(event) => { if (annotationTool === 'pointer') broadcastPointer(event); }} onPointerLeave={() => { if (annotationTool === 'pointer') clearBroadcastPointer(); }}>
                <PublishedCanvas releaseId={release.id} screen={screen} teacherAnnotations={teacherAnnotations} annotationTool={annotationTool} annotationColor={annotationColor} annotationWidth={annotationWidth} onAnnotationsChange={setTeacherAnnotations} onLiveAnnotationChange={broadcastLiveAnnotation} onZoom={openZoom} animationTimeline={animationTimeline} animationStep={animationStep} playbackCycle={playbackCycle} animationNavigation={animationNavigation} triggeredCueIds={triggeredAnimationCueIds} onTriggerElement={triggerAnimationForElement} onMediaTime={triggerAnimationAtMediaBookmark} />
                {annotationTool === 'pointer' ? <span ref={presenterPointerDotRef} className="pointer-events-none absolute z-[65] hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow-md" /> : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 bg-slate-900 p-2">
                <div className="flex items-center gap-1" role="toolbar" aria-label="Presenter drawing tools">
                  <button type="button" onClick={() => { clearBroadcastPointer(); setAnnotationTool('pointer'); }} className={`rounded-lg p-2 ${annotationTool === 'pointer' ? 'bg-blue-600' : 'hover:bg-white/10'}`} title="Pointer"><MousePointer2 size={18} /></button>
                  <button type="button" onClick={() => setAnnotationTool('pen')} className={`rounded-lg p-2 ${annotationTool === 'pen' ? 'bg-blue-600' : 'hover:bg-white/10'}`} title="Pen"><PenLine size={18} /></button>
                  <button type="button" onClick={() => setAnnotationTool('highlighter')} className={`rounded-lg p-2 ${annotationTool === 'highlighter' ? 'bg-amber-500 text-slate-950' : 'hover:bg-white/10'}`} title="Highlighter"><Highlighter size={18} /></button>
                  <button type="button" onClick={() => setAnnotationTool('eraser')} className={`rounded-lg p-2 ${annotationTool === 'eraser' ? 'bg-blue-600' : 'hover:bg-white/10'}`} title="Eraser"><Eraser size={18} /></button>
                  <label className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-lg hover:bg-white/10" title="Ink colour"><Palette size={18} /><span className="absolute bottom-1 h-1 w-5 rounded-full" style={{ backgroundColor: annotationColor }} /><input type="color" value={annotationColor} onChange={(event) => setAnnotationColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
                  <button type="button" disabled={teacherAnnotations.length === 0} onClick={() => setTeacherAnnotations([])} className="rounded-lg p-2 text-red-300 hover:bg-red-500/15 disabled:opacity-30" title="Clear ink"><Trash2 size={18} /></button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={animationStep <= 0 && !previousVisibleScreen} onClick={retreatPresenter} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-white/25 px-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={18} />Previous</button>
                  <button type="button" disabled={animationStep >= animationTimeline.maxStep && !nextVisibleScreen} onClick={advancePresenter} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-blue-600 px-4 text-sm font-bold hover:bg-blue-500 disabled:opacity-30">Next<ChevronRight size={18} /></button>
                </div>
              </div>
            </section>
            <aside className="grid min-h-0 grid-rows-[minmax(11rem,0.8fr)_minmax(0,1.2fr)] gap-3">
              <section className="flex min-h-0 flex-col"><h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-300">Next slide</h2><div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/20 bg-slate-900">{nextScreen ? <PublishedCanvas releaseId={release.id} screen={nextScreen} passivePreview teacherAnnotations={[]} annotationTool="pointer" annotationColor={annotationColor} annotationWidth={annotationWidth} onAnnotationsChange={() => undefined} /> : <div className="grid h-full place-items-center text-sm text-slate-400">End of presentation</div>}</div></section>
              <section className="min-h-0 overflow-y-auto rounded-xl border border-white/15 bg-slate-900 p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-300">Teacher narration</h2>
                {presenterDataBusy ? <p className="mt-3 text-sm text-slate-400">Loading narration…</p> : <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-100">{teacherNarration || 'No teacher narration is available for this screen.'}</p>}
                {presenterNotes ? <><h3 className="mt-5 border-t border-white/10 pt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Presenter notes</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{presenterNotes}</p></> : null}
              </section>
            </aside>
          </main>
        </div>
      </StudioShell>
    );
  }
  return (
    <StudioShell title="Session Player" subtitle={previewMode ? 'Live authoring preview' : release ? `Published Release ${release.release_number}` : undefined} hideHeader scrollContent={false} wrapContent={false} presentationMode={audienceMode}>
      <div ref={playerRef} className={`relative flex h-full min-h-0 flex-col overflow-hidden text-slate-900 ${fullScreen || audienceMode ? 'bg-blue-50' : isTrackedBranchUser ? 'bg-slate-100' : 'bg-white'}`}>
        {!fullScreen && !audienceMode ? <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-0.5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={exitPlayer} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Exit player">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="font-semibold">{discoveryItem ? `Branching · ${discoveryItem.title}` : release?.manifest.session?.title || (previewMode ? 'Session Preview' : 'Published Session')}</h2>
              <p className="text-xs text-slate-600">{discoveryItem ? `Related ${discoveryItem.type} from ${discoveryItem.curriculum.topic_name}` : screen ? `Screen ${screen.screen_number}: ${screen.title}` : 'Loading presentation'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {discoveryItem && <button type="button" onClick={closeDiscoveredContent} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"><X size={16} />Close Branching</button>}
            {isTrackedBranchUser && !previewMode && !discoveryItem ? <button type="button" onClick={openPresenterMode} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"><Presentation size={16} />Presenter View</button> : null}
            {previewMode && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">Unpublished preview</span>}
          </div>
        </header> : null}
        {!previewMode && release && screen && <StudioBranchDiscoveryPanel open={discoveryPanelOpen} fullScreen={fullScreen} releaseId={release.id} screenId={screen.screen_id} onClose={() => setDiscoveryPanelOpen(false)} onSelect={(item) => void openDiscoveredContent(item)} />}
        {blankMode && (
          <button type="button" onClick={() => setBlankMode(null)} className={`absolute inset-0 z-[70] ${blankMode === 'black' ? 'bg-black' : 'bg-white'}`} aria-label={`Restore presentation from ${blankMode} Screen`} />
        )}
        {shortcutGuideOpen ? (
          <div className="absolute inset-0 z-[110] grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Clicker shortcut guide">
            <section className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Clicker shortcuts</h2><p className="text-sm text-slate-500">These keys work in Preview and Presentation mode.</p></div><button type="button" onClick={() => setShortcutGuideOpen(false)} className="rounded-lg border p-2 hover:bg-slate-50" aria-label="Close shortcut guide"><X size={19}/></button></div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">{CLICKER_SHORTCUT_GROUPS.map((group) => <article key={group.title} className="rounded-xl border border-slate-200 p-3"><h3 className="font-bold text-blue-950">{group.title}</h3><dl className="mt-2 space-y-2">{group.shortcuts.map(([label, keys]) => <div key={label} className="rounded-lg bg-slate-50 p-2"><dt className="text-xs font-semibold text-slate-800">{label}</dt><dd className="mt-1 font-mono text-[11px] text-blue-800">{keys}</dd></div>)}</dl></article>)}</div>
            </section>
          </div>
        ) : null}
        {materialsOpen && (
          <aside className={`absolute z-40 flex w-[calc(100%-3rem)] max-w-[20.25rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl ${fullScreen ? 'bottom-14 left-0 top-0' : 'bottom-11 left-12 top-12'}`} role="dialog" aria-label="Published teaching materials">
              <header className="flex items-center justify-between gap-1.5 border-b border-slate-200 px-2 py-1">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold">Teaching materials</h2>
                  <p className="truncate text-[9px] text-slate-600">Curriculum and Session Plan for Release {release?.release_number}.</p>
                </div>
                <button type="button" onClick={() => setMaterialsOpen(false)} className="rounded-md border border-slate-300 p-0.5 hover:bg-slate-100" aria-label="Close teaching materials">
                  <X size={14} />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
                {materialsBusy && <p className="rounded-lg bg-slate-100 p-2 text-sm">Loading published materials…</p>}
                {!materialsBusy && materials && (
                  <div className="space-y-2">
                    <section className="rounded-xl border border-slate-200 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-blue-800" />
                            <h3 className="text-sm font-bold">Chapter Curriculum</h3>
                          </div>
                          <p className="mt-1 break-all text-xs text-slate-600">{materials.curriculum?.original_file_name || 'No Curriculum document is available for this Chapter.'}</p>
                          {materials.curriculum?.revision_no && <p className="text-xs text-slate-500">Revision {materials.curriculum.revision_no}</p>}
                        </div>
                        {materials.curriculum?.document_id && (
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => void viewCurriculum()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50">
                              <FileText size={15} />
                              View Curriculum
                            </button>
                            <button type="button" onClick={() => void downloadCurriculum()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50">
                              <Download size={15} />
                              Download Curriculum
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                    <section>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-blue-800" />
                            <h3 className="text-sm font-bold">Session Plan</h3>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">Revision {materials.session_plan?.revision_no ?? '—'}</p>
                        </div>
                        {materials.session_plan?.original_file_name && (
                          <button type="button" onClick={() => void downloadPlan()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                            <Download size={16} />
                            Download Session Plan
                          </button>
                        )}
                      </div>
                      <div className="mt-2 space-y-2">
                        {materialRows(materials.session_plan?.content).map((row, index) => (
                          <article key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                            <p className="mb-2 text-[11px] font-bold uppercase text-blue-900">Plan row {index + 1}</p>
                            <dl className="grid gap-2">
                              {Object.entries(row).map(([key, value]) => (
                                <div key={key}>
                                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{key.replaceAll('_', ' ')}</dt>
                                  <dd className="mt-1 whitespace-pre-wrap text-sm">{displayValue(value)}</dd>
                                </div>
                              ))}
                            </dl>
                          </article>
                        ))}
                        {!materials.session_plan && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No Session Plan is present in this release.</p>}
                      </div>
                    </section>
                  </div>
                )}
              </div>
          </aside>
        )}
        {curriculumPreview && (
          <aside className={`absolute z-50 flex w-[calc(100%-3rem)] max-w-[20.25rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl ${fullScreen ? 'bottom-14 left-0 top-0' : 'bottom-11 left-12 top-12'}`} role="dialog" aria-label="Curriculum preview">
              <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold">Chapter Curriculum</h2>
                  <p className="truncate text-[11px] text-slate-600" title={curriculumPreview.file_name}>
                    {curriculumPreview.file_name} · Revision {curriculumPreview.revision_no}
                  </p>
                </div>
                <button type="button" onClick={() => setCurriculumPreview(null)} className="rounded-lg border border-slate-300 p-1.5" aria-label="Close Curriculum preview">
                  <X size={16} />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                <CurriculumDocumentViewer preview={curriculumPreview} />
              </div>
          </aside>
        )}
        <main className={`relative grid min-h-0 flex-1 ${audienceMode ? 'grid-cols-1 gap-0 p-0' : fullScreen ? 'grid-cols-1 gap-0 px-0 pb-14 pt-0' : `gap-1 py-1 pl-0 pr-1 ${isTrackedBranchUser && !discoveryItem ? 'grid-cols-[3rem_minmax(0,1fr)]' : 'grid-cols-1 pl-1'}`}`}>
          {!fullScreen && !audienceMode && isTrackedBranchUser && !discoveryItem ? (
            <aside className="studio-player-controls flex min-h-0 min-w-0 flex-col items-center gap-2 overflow-x-hidden overflow-y-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Teacher drawing controls">
              <div className="flex w-full flex-col items-center gap-2">
                <div className="flex w-full flex-col items-center gap-2">
                <label className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" title={`Select screen${screen ? `: ${screen.title}` : ''}`} aria-label="Select screen">
                  <Presentation size={17} aria-hidden="true" />
                  <select value={screenId ?? ''} onChange={(event) => selectTeacherScreen(Number(event.target.value))} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Select screen">
                    {screens.map((item) => <option key={item.screen_id} value={item.screen_id}>Screen {item.screen_number}: {item.title}</option>)}
                  </select>
                </label>
                </div>
                <div className="flex w-full flex-col items-center gap-2" aria-label="Drawing tools">
                <button type="button" onClick={() => setAnnotationTool((tool) => tool === 'laser' ? 'pointer' : 'laser')} className={`grid h-10 w-10 place-items-center rounded-lg ${annotationTool === 'laser' ? 'bg-blue-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} title={annotationTool === 'laser' ? 'Turn off laser pointer' : 'Laser pointer'} aria-label={annotationTool === 'laser' ? 'Turn off laser pointer' : 'Laser pointer'} aria-pressed={annotationTool === 'laser'}><Crosshair size={17} /></button>
                <button type="button" onClick={() => setAnnotationTool('pen')} className={`grid h-10 w-10 place-items-center rounded-lg ${annotationTool === 'pen' ? 'bg-blue-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} title="Pen" aria-label="Pen"><PenLine size={17} /></button>
                <button type="button" onClick={() => setAnnotationTool('eraser')} className={`grid h-10 w-10 place-items-center rounded-lg ${annotationTool === 'eraser' ? 'bg-blue-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} title="Eraser" aria-label="Eraser"><Eraser size={17} /></button>
                <label className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" title="Ink colour" aria-label="Ink colour"><Palette size={17} /><span className="absolute bottom-1 h-1 w-5 rounded-full" style={{ backgroundColor: annotationColor }} /><input type="color" value={annotationColor} onChange={(event) => setAnnotationColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
                <button type="button" disabled={(annotationHistoryByScreen[screenId || 0] ?? []).length === 0} onClick={undoTeacherAnnotation} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30" title="Undo ink" aria-label="Undo ink"><RotateCcw size={17} /></button>
                <button type="button" disabled={teacherAnnotations.length === 0} onClick={() => setTeacherAnnotations([])} className="grid h-10 w-10 place-items-center rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-30" title="Clear ink" aria-label="Clear ink"><Trash2 size={17} /></button>
                {!previewMode && <button type="button" disabled={!release || !screen} onClick={() => { const open = !discoveryPanelOpen; setMaterialsOpen(false); setCurriculumPreview(null); setDiscoveryPanelOpen(open); }} className={`grid h-10 w-10 place-items-center rounded-lg ${discoveryPanelOpen ? 'bg-blue-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'} disabled:opacity-40`} title={discoveryPanelOpen ? 'Close Branching' : 'Branching'} aria-label={discoveryPanelOpen ? 'Close Branching' : 'Branching'} aria-pressed={discoveryPanelOpen}><GitBranch size={17} /></button>}
                {!previewMode && <button type="button" onClick={() => void openTeachingMaterials()} className={`grid h-10 w-10 place-items-center rounded-lg ${materialsOpen || curriculumPreview ? 'bg-blue-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} title={materialsOpen || curriculumPreview ? 'Close teaching materials' : 'View teaching materials'} aria-label={materialsOpen || curriculumPreview ? 'Close teaching materials' : 'View teaching materials'} aria-pressed={materialsOpen || Boolean(curriculumPreview)}><FileText size={17} /></button>}
                </div>
                <label className="relative grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700" title="Ink width"><SlidersHorizontal size={15} className="pointer-events-none absolute left-1 top-1" aria-hidden="true" /><input type="number" min="2" max="24" value={annotationWidth} onChange={(event) => setAnnotationWidth(Math.min(24, Math.max(2, Number(event.target.value) || 2)))} className="h-full w-full rounded-lg bg-transparent pt-2 text-center text-xs font-bold outline-none" aria-label="Ink width" /></label>
              </div>
            </aside>
          ) : null}
          <section
            ref={audienceSlideHostRef}
            className="relative min-h-0 min-w-0 transition-[margin] duration-300"
            style={isTrackedBranchUser && !discoveryItem && (discoveryPanelOpen || materialsOpen || curriculumPreview) ? { marginLeft: 'min(20.25rem, calc(100vw - 7rem))' } : undefined}
            onClick={(event) => {
              if (audienceMode || discoveryItem || annotationTool !== 'pointer') return;
              const target = event.target as HTMLElement;
              if (target.closest('button, a, input, select, textarea, video, audio, iframe')) return;
              const transition = screen?.screen_settings_json?.transition;
              if (!transition || typeof transition !== 'object' || transition.advanceOnClick !== false)
                advancePresenter();
            }}
          >
          {discoveryLoading && <div className="grid h-full place-items-center text-slate-600"><span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={20} />Opening related content…</span></div>}
          {!discoveryLoading && discoveryItem?.type === 'resource' && discoveryItem.resource_mapping && <div className="h-full overflow-hidden rounded-xl bg-black"><PublishedResource releaseId={discoveryItem.release_id} mapping={discoveryItem.resource_mapping} /></div>}
          {!discoveryLoading && discoveryItem && discoveryItem.type !== 'resource' && discoveryRelease && discoveryScreen && <PublishedCanvas releaseId={discoveryRelease.id} screen={discoveryScreen} teacherAnnotations={[]} annotationTool="pointer" annotationColor={annotationColor} annotationWidth={annotationWidth} onAnnotationsChange={() => undefined} />}
          {!discoveryLoading && discoveryItem && discoveryError && <div className="grid h-full place-items-center"><div className="rounded-xl border border-red-400/30 bg-red-950/40 p-6 text-red-100">{discoveryError}</div></div>}
          {loading && <div className="grid h-full place-items-center text-slate-600"><span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={20} />Preparing presentation…</span></div>}
          {!discoveryItem && !loading && error && !release && (
            <div className="grid h-full place-items-center">
              <div className="rounded-xl border border-red-400/30 bg-red-950/40 p-6 text-red-100">{error}</div>
            </div>
          )}
          {!discoveryItem && !loading && release && screen && (
            <div className="h-full w-full transition-transform duration-200" style={{ transform: `scale(${presentationZoom})`, viewTransitionName: presenterMode ? 'none' : 'studio-slide' }}>
              {previewMode ? preparedPreviewScreens.map((preparedScreen) => {
                const active = preparedScreen.screen_id === screen.screen_id;
                return <div key={`${release.id}:${preparedScreen.screen_id}:prepared`} className={`absolute inset-0 ${active ? 'visible' : 'invisible pointer-events-none'}`} aria-hidden={!active}>
                  <PublishedCanvas releaseId={release.id} screen={preparedScreen} previewMode passivePreview={!active} immersiveViewport={active && (fullScreen || audienceMode)} teacherAnnotations={active ? teacherAnnotations : []} annotationTool={active ? audienceMode ? 'pointer' : isTrackedBranchUser ? annotationTool : 'pointer' : 'pointer'} annotationColor={annotationColor} annotationWidth={annotationWidth} onAnnotationsChange={active ? setTeacherAnnotations : () => undefined} onZoom={active ? openZoom : undefined} animationTimeline={active ? animationTimeline : undefined} animationStep={active ? animationStep : undefined} playbackCycle={active ? playbackCycle : undefined} animationNavigation={active ? animationNavigation : null} triggeredCueIds={active ? triggeredAnimationCueIds : new Set()} onTriggerElement={active ? triggerAnimationForElement : undefined} onMediaTime={active ? triggerAnimationAtMediaBookmark : undefined} />
                </div>;
              }) : <PublishedCanvas key={`${release.id}:${screen.screen_id}:published:active`} releaseId={release.id} screen={screen} immersiveViewport={fullScreen || audienceMode} teacherAnnotations={teacherAnnotations} annotationTool={audienceMode ? 'pointer' : isTrackedBranchUser ? annotationTool : 'pointer'} annotationColor={annotationColor} annotationWidth={annotationWidth} onAnnotationsChange={setTeacherAnnotations} onZoom={openZoom} animationTimeline={animationTimeline} animationStep={animationStep} playbackCycle={playbackCycle} animationNavigation={animationNavigation} triggeredCueIds={triggeredAnimationCueIds} onTriggerElement={triggerAnimationForElement} onMediaTime={triggerAnimationAtMediaBookmark} />}
            </div>
          )}
          {!discoveryItem && !loading && release && !screen && <div className="grid h-full place-items-center text-slate-600">This release contains no Screens.</div>}
          {annotationTool === 'laser' ? <div className="absolute inset-0 z-[60] cursor-crosshair" onPointerMove={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); setLaserPoint({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }); }} onPointerLeave={() => setLaserPoint(null)} aria-label="Laser pointer surface">{laserPoint ? <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow-[0_0_18px_6px_rgba(239,68,68,0.75)]" style={{ left: laserPoint.x, top: laserPoint.y }} aria-hidden="true" /> : null}</div> : null}
          {audienceMode ? <><svg ref={audienceLiveSvgRef} viewBox="0 0 1920 1080" preserveAspectRatio="none" className="pointer-events-none absolute z-[64]" aria-hidden="true"><polyline ref={audienceLiveInkRef} className="hidden" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg><span ref={audiencePointerDotRef} className="pointer-events-none absolute z-[65] hidden h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow-[0_0_18px_6px_rgba(239,68,68,0.75)]" aria-label="Presenter pointer" /></> : null}
          </section>
        </main>
        {error && release && <p className="mx-4 mb-2 rounded-lg bg-red-950/70 px-3 py-2 text-sm text-red-100">{error}</p>}
        {activeRuntimeElement?.resource_mapping ? (
          <div data-active-runtime className="absolute inset-0 z-[90] flex flex-col bg-slate-950">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 py-2 text-white"><div><p className="font-bold">{activeRuntimeElement.resource_mapping.name}</p><p className="text-xs text-slate-300">Clicker commands are forwarded into this activity. When it reports completion, the outer presentation continues.</p></div><button type="button" onClick={() => setActiveRuntimeElement(null)} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold">Finish activity and continue</button></div>
            <div className="min-h-0 flex-1"><PublishedResource releaseId={release?.id || 0} mapping={activeRuntimeElement.resource_mapping} previewMode={previewMode} /></div>
          </div>
        ) : null}
        {!fullScreen && !audienceMode ? <footer className={`flex items-center justify-between gap-3 border-t px-3 py-0.5 ${isTrackedBranchUser ? 'border-slate-200 bg-white' : 'border-white/10'}`}>
          <div className="flex items-center gap-2">
            {discoveryItem ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeDiscoveredContent} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950"><X size={18} />Close Branching</button>
                <button type="button" disabled={discoveryItem.type !== 'session' || discoveryIndex <= 0} onClick={() => setDiscoveryScreenId(discoveryScreens[discoveryIndex - 1]?.screen_id ?? null)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-30"><ChevronLeft size={18} />Previous</button>
              </div>
            ) : (
                <button type="button" disabled={animationStep <= 0 && !previousVisibleScreen} onClick={retreatPresenter} className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-30">
                <ChevronLeft size={16} />
                Previous
              </button>
            )}
            <button type="button" onClick={() => void toggleFullScreen()} className="inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-100" title={fullScreen ? 'Exit full screen' : 'Full screen'} aria-label={fullScreen ? 'Exit full screen' : 'Full screen'}>
              {fullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
          <span className="text-center text-xs text-slate-700">
            <span className="block">
              {discoveryItem ? discoveryItem.type === 'session' ? `${discoveryIndex + 1} / ${discoveryScreens.length}` : discoveryItem.type : `${visibleIndex >= 0 ? visibleIndex + 1 : 'Hidden'} / ${visibleScreens.length}`}
            </span>
            <span className="hidden text-[10px] text-slate-500 sm:block">{discoveryItem ? 'Esc closes Branching' : `Animation build ${animationStep}/${animationTimeline.maxStep} · Clicker: ← previous · → next`}</span>
          </span>
          <div className="flex items-center gap-2">
            {isTrackedBranchUser ? <FloatingWhiteboards sessionId={sessionId} inlineLauncher /> : null}
              <button type="button" disabled={discoveryItem ? discoveryItem.type !== 'session' || discoveryIndex < 0 || discoveryIndex >= discoveryScreens.length - 1 : animationStep >= animationTimeline.maxStep && !nextVisibleScreen} onClick={() => discoveryItem ? setDiscoveryScreenId(discoveryScreens[discoveryIndex + 1]?.screen_id ?? null) : advancePresenter()} className="inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-30 sm:gap-1.5">
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </footer> : null}
        {fullScreen ? (
          <>
            {fullscreenDrawOpen ? (
              <div className="absolute bottom-16 left-3 z-[100] flex items-center gap-1 rounded-xl border border-white/25 bg-slate-950/90 p-2 text-white shadow-2xl backdrop-blur" role="toolbar" aria-label="Fullscreen drawing tools">
                <button type="button" onClick={() => { setAnnotationTool('laser'); setFullscreenDrawOpen(false); }} className={`grid h-10 w-10 place-items-center rounded-lg ${annotationTool === 'laser' ? 'bg-red-600' : 'hover:bg-white/15'}`} title="Laser pointer" aria-label="Laser pointer" aria-pressed={annotationTool === 'laser'}><Crosshair size={18} /></button>
                <button type="button" onClick={() => { setAnnotationTool('pen'); setFullscreenDrawOpen(false); }} className={`grid h-10 w-10 place-items-center rounded-lg ${annotationTool === 'pen' ? 'bg-blue-600' : 'hover:bg-white/15'}`} title="Pen" aria-label="Pen" aria-pressed={annotationTool === 'pen'}><PenLine size={18} /></button>
                <button type="button" onClick={() => { setAnnotationTool('highlighter'); setFullscreenDrawOpen(false); }} className={`grid h-10 w-10 place-items-center rounded-lg ${annotationTool === 'highlighter' ? 'bg-amber-500 text-slate-950' : 'hover:bg-white/15'}`} title="Highlighter" aria-label="Highlighter" aria-pressed={annotationTool === 'highlighter'}><Highlighter size={18} /></button>
                <button type="button" onClick={() => { setAnnotationTool('eraser'); setFullscreenDrawOpen(false); }} className={`grid h-10 w-10 place-items-center rounded-lg ${annotationTool === 'eraser' ? 'bg-blue-600' : 'hover:bg-white/15'}`} title="Eraser" aria-label="Eraser" aria-pressed={annotationTool === 'eraser'}><Eraser size={18} /></button>
                <button type="button" disabled={teacherAnnotations.length === 0} onClick={() => { setTeacherAnnotations([]); setFullscreenDrawOpen(false); }} className="grid h-10 w-10 place-items-center rounded-lg text-red-300 hover:bg-red-500/20 disabled:opacity-30" title="Erase all ink on slide" aria-label="Erase all ink on slide"><Trash2 size={18} /></button>
              </div>
            ) : null}
            {fullscreenSlidesOpen ? (
              <div className="absolute bottom-16 left-3 z-[100] max-h-64 w-56 overflow-y-auto rounded-xl border border-white/25 bg-slate-950/90 p-2 text-white shadow-2xl backdrop-blur" role="dialog" aria-label="All slides">
                <div className="grid grid-cols-4 gap-2">
                  {screens.map((item) => <button key={item.screen_id} type="button" onClick={() => { selectTeacherScreen(item.screen_id); setFullscreenSlidesOpen(false); }} className={`relative grid h-11 place-items-center rounded-lg border ${item.screen_id === screenId ? 'border-blue-400 bg-blue-600' : 'border-white/20 hover:bg-white/15'}`} title={`Screen ${item.screen_number}: ${item.title}`} aria-label={`Open Screen ${item.screen_number}: ${item.title}`}><Presentation size={17} /><span className="absolute bottom-0.5 right-1 text-[9px] font-bold">{item.screen_number}</span></button>)}
                </div>
              </div>
            ) : null}
            <div className="absolute bottom-2 left-3 z-[100] flex items-center gap-2">
              <div className="flex items-center gap-1.5" role="toolbar" aria-label="Fullscreen presentation controls">
                <button type="button" disabled={discoveryItem ? discoveryItem.type !== 'session' || discoveryIndex <= 0 : animationStep <= 0 && !previousVisibleScreen} onClick={() => discoveryItem ? setDiscoveryScreenId(discoveryScreens[discoveryIndex - 1]?.screen_id ?? null) : retreatPresenter()} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-black shadow-sm hover:bg-slate-100 disabled:opacity-30" title="Previous" aria-label="Previous"><ChevronLeft size={20} /></button>
                <button type="button" onClick={() => { setFullscreenSlidesOpen(false); if (fullscreenDrawOpen || annotationTool !== 'pointer') { setFullscreenDrawOpen(false); setAnnotationTool('pointer'); } else setFullscreenDrawOpen(true); }} className={`grid h-10 w-10 place-items-center rounded-lg border text-black shadow-sm ${fullscreenDrawOpen || annotationTool !== 'pointer' ? 'border-slate-400 bg-slate-200' : 'border-slate-300 bg-white hover:bg-slate-100'}`} title={annotationTool !== 'pointer' ? 'Turn off drawing tools' : 'Drawing tools'} aria-label={annotationTool !== 'pointer' ? 'Turn off drawing tools' : 'Drawing tools'} aria-expanded={fullscreenDrawOpen} aria-pressed={annotationTool !== 'pointer'}><PenLine size={19} /></button>
                <button type="button" onClick={() => { setFullscreenSlidesOpen((open) => !open); setFullscreenDrawOpen(false); }} className={`grid h-10 w-10 place-items-center rounded-lg border text-black shadow-sm ${fullscreenSlidesOpen ? 'border-slate-400 bg-slate-200' : 'border-slate-300 bg-white hover:bg-slate-100'}`} title="All slides" aria-label="All slides" aria-expanded={fullscreenSlidesOpen}><Grid3X3 size={19} /></button>
                {!previewMode ? <button type="button" disabled={!release || !screen} onClick={() => { if (discoveryItem) closeDiscoveredContent(); else { const open = !discoveryPanelOpen; setMaterialsOpen(false); setCurriculumPreview(null); setDiscoveryPanelOpen(open); } setFullscreenDrawOpen(false); setFullscreenSlidesOpen(false); setAnnotationTool('pointer'); }} className={`grid h-10 w-10 place-items-center rounded-lg border text-black shadow-sm ${discoveryPanelOpen || discoveryItem ? 'border-slate-400 bg-slate-200' : 'border-slate-300 bg-white hover:bg-slate-100'} disabled:opacity-30`} title={discoveryPanelOpen || discoveryItem ? 'Close Branching' : 'Branching'} aria-label={discoveryPanelOpen || discoveryItem ? 'Close Branching' : 'Branching'} aria-pressed={discoveryPanelOpen || Boolean(discoveryItem)}>{discoveryPanelOpen || discoveryItem ? <X size={18} /> : <GitBranch size={18} />}</button> : null}
                {!previewMode ? <button type="button" onClick={() => { setFullscreenDrawOpen(false); setFullscreenSlidesOpen(false); setAnnotationTool('pointer'); void openTeachingMaterials(); }} className={`grid h-10 w-10 place-items-center rounded-lg border text-black shadow-sm ${materialsOpen || curriculumPreview ? 'border-slate-400 bg-slate-200' : 'border-slate-300 bg-white hover:bg-slate-100'}`} title={materialsOpen || curriculumPreview ? 'Close teaching materials' : 'Teaching materials'} aria-label={materialsOpen || curriculumPreview ? 'Close teaching materials' : 'Teaching materials'} aria-pressed={materialsOpen || Boolean(curriculumPreview)}><FileText size={18} /></button> : null}
                <button type="button" disabled={discoveryItem ? discoveryItem.type !== 'session' || discoveryIndex < 0 || discoveryIndex >= discoveryScreens.length - 1 : animationStep >= animationTimeline.maxStep && !nextVisibleScreen} onClick={() => discoveryItem ? setDiscoveryScreenId(discoveryScreens[discoveryIndex + 1]?.screen_id ?? null) : advancePresenter()} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-black shadow-sm hover:bg-slate-100 disabled:opacity-30" title="Next" aria-label="Next"><ChevronRight size={20} /></button>
                <button type="button" onClick={() => void toggleFullScreen()} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-black shadow-sm hover:bg-slate-100" title="Exit full screen" aria-label="Exit full screen"><Minimize2 size={19} /></button>
              </div>
            </div>
          </>
        ) : null}
        {isTrackedBranchUser && fullScreen ? <FloatingWhiteboards sessionId={sessionId} iconOnly /> : null}
      </div>
    </StudioShell>
  );
}
