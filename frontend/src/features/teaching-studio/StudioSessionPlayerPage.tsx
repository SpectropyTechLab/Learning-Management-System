import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Crosshair, Download, Eraser, FileText, GitBranch, Grid3X3, Highlighter, Image as ImageIcon, Loader2, Maximize2, Minimize2, Music, Palette, PenLine, Presentation, RotateCcw, SlidersHorizontal, Trash2, Video, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getApiErrorDetails } from '@/lib/api';
import type { Layout, ObjectType, Rect, Slide } from './layouts';
import { targetLayouts } from './targetLayouts';
import SlideCanvas from './SlideCanvas';
import StudioShell from './components/StudioShell';
import { downloadPublishedSessionPlan, getPublishedTeachingMaterials, getPublishedRelease, getSessionPlayerPreview, launchPublishedResource, previewPublishedObject, previewPublishedResource } from './api/studioPublishedApi';
import { getStudioObjectPreview, getStudioResourcePreview, launchStudioResourceVersion, type StudioObjectPreviewDescriptor } from './api/studioResourcesApi';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import type { CurriculumDocumentPreview } from './api/studioDocumentsApi';
import CurriculumDocumentViewer from './components/CurriculumDocumentViewer';
import Model3DViewer from './components/resources/Model3DViewer';
import { ExecutableResourceFrame, ExternalLinkFrame } from './components/resources/StudioResourceFrames';
import { studioAnimationStyle } from './components/studioAnimationRuntime';
import EmbeddedObjectViewer from './components/resources/EmbeddedObjectViewer';
import {
  buildPresenterAnimationTimeline,
  CLICKER_SHORTCUT_GROUPS,
  clickerNavigationAction,
  presenterDiagramVisibleNodes,
  presenterElementPlaybackState,
  type PresenterAnimationNavigation,
  type PresenterAnimationTimeline,
} from './components/studioClickerRuntime';
import StudioCanvasTextElement from './components/StudioCanvasTextElement';
import StudioMathElement from './components/StudioMathElement';
import StudioShapeElement from './components/StudioShapeElement';
import StudioSmartDiagram from './components/StudioSmartDiagram';
import StudioHyperlinkOverlay from './components/studioHyperlink';
import { isSmartDiagramContent } from './components/smartDiagramModel';
import StudioBranchDiscoveryPanel from './components/StudioBranchDiscoveryPanel';
import type { PublishedRelease, PublishedResourceMapping, PublishedScreen, PublishedTeachingMaterials } from './api/studioPublishedApi';
import type { StudioDiscoveryItem } from './api/studioDiscoveryApi';
import type { AuthorDrawingStroke } from './types';
import FloatingWhiteboards from './components/FloatingWhiteboards';
import { playStudioTransitionSound, stopStudioTransitionSound, unlockStudioTransitionAudio } from './components/studioTransition';

const textFrom = (content: Record<string, unknown>) => {
  const preferred = content.text ?? content.value ?? content.title ?? content.caption;
  if (typeof preferred === 'string') return preferred;
  const value = Object.values(content).find((item) => typeof item === 'string');
  return typeof value === 'string' ? value : '';
};

type PresenterAnnotationTool = 'pointer' | 'laser' | 'pen' | 'highlighter' | 'eraser';

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

const freeformLayoutFor = (screen: PublishedScreen): Layout => ({
  id: 'FREEFORM',
  name: 'Freeform screen',
  purpose: 'Published author-positioned screen',
  catalog: 'pilot',
  slots: screen.elements.map((element, index) => {
    const region = element.element_type === 'title' ? 'header' : element.element_type === 'footer' ? 'footer' : 'content';
    const fallback = region === 'header' ? { x: 90, y: 60, width: 1740, height: 150 } : region === 'footer' ? { x: 90, y: 950, width: 1740, height: 90 } : { x: 180 + (index % 2) * 800, y: 260, width: 760, height: 420 };
    return {
      id: element.slot_id || `free-${element.element_key}`,
      label: element.element_type,
      region,
      allowed: [element.element_type as ObjectType],
      bounds: elementBounds(element.position_json) ?? fallback,
    };
  }),
});

function PublishedResource({ releaseId, mapping, previewMode = false }: { releaseId: number; mapping: PublishedResourceMapping; previewMode?: boolean }) {
  const [source, setSource] = useState(mapping.external_url || '');
  const [error, setError] = useState('');
  const [objectPreview, setObjectPreview] = useState<StudioObjectPreviewDescriptor | null>(null);

  useEffect(() => {
    if (mapping.external_url) return;
    let active = true;
    const request = mapping.resource_type === 'document'
      ? (previewMode
          ? getStudioObjectPreview(mapping.resource_version_id)
          : previewPublishedObject(releaseId, mapping.resource_version_id)).then((descriptor) => {
          if (active) setObjectPreview(descriptor);
          return descriptor.url || 'embedded-object-ready';
        })
      : ['html', 'zip', 'scorm', 'simulation'].includes(mapping.resource_type)
      ? (previewMode
          ? launchStudioResourceVersion(mapping.resource_version_id)
          : launchPublishedResource(releaseId, mapping.resource_version_id)).then((result) => {
          if (!result.launchable || !result.launch_url) throw new Error(result.message || 'Resource cannot be launched.');
          return result.launch_url;
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
  }, [mapping.external_url, mapping.resource_type, mapping.resource_version_id, previewMode, releaseId]);

  if (error) return <div className="grid h-full place-items-center bg-slate-950 p-3 text-center text-xs text-white">{error}</div>;
  if (!source) return <div className="grid h-full place-items-center bg-slate-950 text-xs text-white">Loading resource…</div>;
  if (mapping.resource_type === 'document' && objectPreview) return <EmbeddedObjectViewer descriptor={objectPreview} className="h-full w-full" />;
  if (mapping.resource_type === 'image') return <img src={source} alt={mapping.name} className="h-full w-full object-contain" />;
  if (mapping.resource_type === 'video' || mapping.mime_type?.startsWith('video/')) return <video src={source} controls className="h-full w-full" />;
  if (mapping.resource_type === 'model_3d') return <Model3DViewer src={source} alt={mapping.name} />;
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
  if (mapping.resource_type === 'external_link') return <ExternalLinkFrame source={source} title={mapping.name} className="h-full w-full" openLinkLabel="Open" width={mapping.width} height={mapping.height} />;
  return <ExecutableResourceFrame source={source} title={mapping.name} className="h-full w-full" width={mapping.width} height={mapping.height} />;
}

function PublishedCanvas({ releaseId, screen, previewMode = false, immersiveViewport = false, teacherAnnotations, annotationTool, annotationColor, annotationWidth, onAnnotationsChange, onZoom, animationTimeline, animationStep, playbackCycle, animationNavigation }: { releaseId: number; screen: PublishedScreen; previewMode?: boolean; immersiveViewport?: boolean; teacherAnnotations: AuthorDrawingStroke[]; annotationTool: PresenterAnnotationTool; annotationColor: string; annotationWidth: number; onAnnotationsChange: (strokes: AuthorDrawingStroke[]) => void; onZoom?: (element: PublishedScreen['elements'][number]) => void; animationTimeline?: PresenterAnimationTimeline; animationStep?: number; playbackCycle?: number; animationNavigation?: PresenterAnimationNavigation | null }) {
  const layout = layoutFor(screen) ?? freeformLayoutFor(screen);
  const slide: Slide = {
    title: screen.title,
    creationMode: layout ? 'layout' : 'blank',
    objects: screen.elements.map((element) => ({
      id: element.element_key,
      slotId: element.slot_id || `free-${element.element_key}`,
      type: element.element_type as ObjectType,
      text: textFrom(element.content_json || {}),
      position: elementBounds(element.position_json),
      url: typeof element.content_json?.url === 'string' ? element.content_json.url : undefined,
      altText: typeof element.content_json?.altText === 'string' ? element.content_json.altText : undefined,
      caption: typeof element.content_json?.caption === 'string' ? element.content_json.caption : undefined,
      color: typeof element.content_json?.color === 'string' ? element.content_json.color : undefined,
      backgroundColor: typeof element.content_json?.backgroundColor === 'string'
        ? element.content_json.backgroundColor
        : typeof element.content_json?.fill === 'string' ? element.content_json.fill : undefined,
      borderColor: element.element_type !== 'shape' && typeof element.content_json?.borderColor === 'string'
        ? element.content_json.borderColor
        : undefined,
      borderWidth: element.element_type !== 'shape' && Number.isFinite(Number(element.content_json?.borderWidth))
        ? Number(element.content_json?.borderWidth)
        : undefined,
      zIndex: typeof element.position_json?.zIndex === 'number' ? element.position_json.zIndex : undefined,
    })),
  };
  const overlays: Record<string, ReactNode> = Object.fromEntries(screen.elements.flatMap((element) => {
    if (isSmartDiagramContent(element.content_json)) {
      const visibleNodeIds = animationTimeline && animationStep !== undefined
        ? presenterDiagramVisibleNodes(animationTimeline, element.element_key, animationStep, element.content_json.nodes.map((node) => node.id))
        : undefined;
      return [[element.element_key, <StudioSmartDiagram key={element.element_key} content={element.content_json} visibleNodeIds={visibleNodeIds} />]];
    }
    if (element.element_type === 'math') return [[element.element_key, <StudioMathElement key={element.element_key} latex={String(element.content_json?.latex ?? element.content_json?.text ?? '')} color={typeof element.content_json?.color === 'string' ? element.content_json.color : undefined} backgroundColor={typeof element.content_json?.backgroundColor === 'string' ? element.content_json.backgroundColor : undefined} fontSize={Number(element.content_json?.fontSize) || undefined} alignment={element.content_json?.alignment === 'left' || element.content_json?.alignment === 'right' ? element.content_json.alignment : 'center'} />]];
    if (element.element_type === 'shape') return [[element.element_key, <StudioShapeElement key={element.element_key} kind={String(element.content_json?.kind || 'rectangle')} fill={typeof element.content_json?.fill === 'string' ? element.content_json.fill : undefined} stroke={typeof element.content_json?.stroke === 'string' ? element.content_json.stroke : undefined} strokeWidth={Number(element.content_json?.strokeWidth) || undefined} opacity={Number(element.content_json?.opacity) || undefined} customPath={typeof element.content_json?.customPath === 'string' ? element.content_json.customPath : undefined} />]];
    if (element.element_type === 'zoom' && element.zoom) return [[element.element_key, <button key={element.element_key} type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onZoom?.(element); }} className="group grid h-full w-full touch-manipulation place-items-center overflow-hidden rounded-xl border-2 border-white/70 bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 p-5 text-center text-white shadow-xl transition hover:scale-[1.02] hover:shadow-2xl"><span><span className="block text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">{element.content_json?.zoom_summary_group ? 'Summary Zoom' : element.zoom.zoom_kind === 'section' ? 'Section Zoom' : 'Screen Zoom'}</span><span className="mt-2 block text-xl font-black">{textFrom(element.content_json || {}) || 'Open linked teaching content'}</span><span className="mt-2 block text-xs text-blue-100">Select once to explore · returns here</span></span></button>]];
    const droppedUrl = typeof element.content_json?.url === 'string' ? element.content_json.url : '';
    const droppedMime = typeof element.content_json?.mimeType === 'string' ? element.content_json.mimeType : '';
    if (droppedUrl && element.content_json?.source === 'drag-drop') {
      const name = textFrom(element.content_json || {}) || 'Dropped file';
      if (element.element_type === 'visual' || droppedMime.startsWith('image/')) return [[element.element_key, <div key={element.element_key} className="relative h-full w-full bg-slate-100"><img src={droppedUrl} alt={String(element.content_json?.altText || name)} className="h-full w-full object-contain"/><span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-semibold text-white"><ImageIcon size={11}/>{name}</span></div>]];
      if (droppedMime.startsWith('video/')) return [[element.element_key, <div key={element.element_key} className="relative h-full w-full bg-black"><video src={droppedUrl} controls className="h-full w-full object-contain"/><span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white"><Video size={11}/>{name}</span></div>]];
      if (droppedMime.startsWith('audio/')) return [[element.element_key, <div key={element.element_key} className="grid h-full w-full place-items-center bg-gradient-to-br from-purple-950 to-blue-900 p-5 text-white"><div className="w-full text-center"><Music size={42} className="mx-auto text-purple-200"/><p className="mt-3 truncate text-sm font-bold">{name}</p><audio src={droppedUrl} controls className="mt-4 w-full"/></div></div>]];
      if (droppedMime === 'application/pdf') return [[element.element_key, <div key={element.element_key} className="relative h-full w-full bg-slate-200"><iframe src={droppedUrl} title={name} className="h-full w-full border-0"/><span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-700 px-2 py-1 text-[10px] font-semibold text-white"><FileText size={11}/>PDF · {name}</span></div>]];
      return [[element.element_key, <div key={element.element_key} className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-50 to-blue-50 p-6 text-center"><div><FileText size={48} className="mx-auto text-blue-800"/><p className="mt-3 break-all text-sm font-bold text-slate-900">{name}</p><p className="mt-1 text-xs text-slate-500">{droppedMime || 'Document'}</p><a href={droppedUrl} download={name} className="mt-4 inline-flex rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white">Download and open</a></div></div>]];
    }
    const text = textFrom(element.content_json || {});
    if (['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(element.element_type)) return [[element.element_key, <StudioCanvasTextElement key={element.element_key} elementId={element.element_key} text={text} richTextHtml={typeof element.content_json?.richTextHtml === 'string' ? element.content_json.richTextHtml : undefined} color={typeof element.content_json?.color === 'string' ? element.content_json.color : undefined} backgroundColor={typeof element.content_json?.backgroundColor === 'string' ? element.content_json.backgroundColor : undefined} fontSize={Number(element.content_json?.fontSize) || undefined} fontFamily={typeof element.content_json?.fontFamily === 'string' ? element.content_json.fontFamily : undefined} bold={element.content_json?.bold === true} italic={element.content_json?.italic === true} underline={element.content_json?.underline === true} alignment={element.content_json?.alignment === 'center' || element.content_json?.alignment === 'right' || element.content_json?.alignment === 'justify' ? element.content_json.alignment : 'left'} list={element.content_json?.list === true} />]];
    return element.resource_mapping ? [[element.element_key, <PublishedResource key={element.element_key} releaseId={releaseId} mapping={element.resource_mapping} previewMode={previewMode} />]] : [];
  }));
  for (const element of screen.elements) {
    const overlay = overlays[element.element_key];
    if (!overlay || !element.content_json?.hyperlink) continue;
    overlays[element.element_key] = <StudioHyperlinkOverlay hyperlink={element.content_json.hyperlink} active>{overlay}</StudioHyperlinkOverlay>;
  }
  const objectAnimationStyles: Record<string, React.CSSProperties> = {};
  const objectAnimationKeys: Record<string, string | number> = {};
  for (const element of screen.elements) {
    const overlay = overlays[element.element_key];
    if (!overlay || !animationTimeline || animationStep === undefined) continue;
    const playbackState = presenterElementPlaybackState(
      animationTimeline,
      element.element_key,
      animationStep,
      playbackCycle ?? 0,
      animationNavigation,
    );
    const activeStyle = playbackState.activeEffects.length
      ? studioAnimationStyle({ effects: playbackState.activeEffects })
      : null;
    objectAnimationStyles[element.element_key] = activeStyle
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
        ? {}
        : { opacity: 0 };
    objectAnimationKeys[element.element_key] = `${screen.screen_id}-${playbackState.identity}`;
  }

  const drawingEnabled = annotationTool === 'pen' || annotationTool === 'highlighter' || annotationTool === 'eraser';
  const drawingTool = annotationTool === 'eraser' ? 'eraser' : annotationTool === 'highlighter' ? 'highlighter' : 'pen';
  return <SlideCanvas layout={layout} slide={slide} compactViewport immersiveViewport={immersiveViewport} backgroundColor={typeof screen.screen_settings_json?.backgroundColor === 'string' ? screen.screen_settings_json.backgroundColor : '#f9fcff'} objectOverlays={overlays} objectAnimationStyles={objectAnimationStyles} objectAnimationKeys={objectAnimationKeys} transition={screen.screen_settings_json?.transition} fixedDrawingStrokes={screen.screen_settings_json?.author_drawings?.strokes ?? []} drawingStrokes={teacherAnnotations} drawingEnabled={drawingEnabled} drawingTool={drawingTool} drawingColor={annotationColor} drawingWidth={annotationWidth} onDrawingChange={onAnnotationsChange} />;
}

export default function StudioSessionPlayerPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerRef = useRef<HTMLDivElement>(null);
  const enterScreenAtEndRef = useRef(false);
  const suppressAutoRuntimeRef = useRef(false);
  const previousFullScreenRef = useRef(false);
  const advancePresenterRef = useRef<() => void>(() => undefined);
  const [release, setRelease] = useState<PublishedRelease | null>(null);
  const [screenId, setScreenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [blankMode, setBlankMode] = useState<'black' | 'white' | null>(null);
  const [presentationZoom, setPresentationZoom] = useState(1);
  const [zoomRun, setZoomRun] = useState<null | { originScreenId: number; targetIds: number[]; index: number; returnToZoom: boolean }>(null);
  const [zoomHubRun, setZoomHubRun] = useState<null | { originScreenId: number; elementKeys: string[]; index: number }>(null);
  const [activeRuntimeElement, setActiveRuntimeElement] = useState<PublishedScreen['elements'][number] | null>(null);
  const [shortcutGuideOpen, setShortcutGuideOpen] = useState(false);

  const sessionId = Number(params.sessionId);
  const releaseNumber = Number(params.releaseNumber);
  const previewMode = params.releaseNumber === undefined;
  const presentationChannel = new URLSearchParams(window.location.search).get('channel');
  const audienceMode = new URLSearchParams(window.location.search).get('mode') === 'audience';

  useEffect(() => {
    if (!Number.isInteger(sessionId) || (!previewMode && !Number.isInteger(releaseNumber))) {
      setError('Invalid Session player route.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const request = previewMode
      ? getSessionPlayerPreview(sessionId)
      : getPublishedRelease(sessionId, releaseNumber);
    void request
      .then((data) => {
        setRelease(data);
        const first = [...data.manifest.screens].sort((a, b) => a.display_order - b.display_order)[0];
        setScreenId(first?.screen_id ?? null);
      })
      .catch((requestError) => setError(getApiErrorDetails(requestError).message))
      .finally(() => setLoading(false));
  }, [previewMode, releaseNumber, sessionId]);

  const screens = useMemo(() => [...(release?.manifest.screens || [])].sort((a, b) => a.display_order - b.display_order), [release]);
  const currentIndex = screens.findIndex((screen) => screen.screen_id === screenId);
  const screen = currentIndex >= 0 ? screens[currentIndex] : null;
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
    const transition = screen.screen_settings_json?.transition;
    if (transition && typeof transition === 'object')
      void playStudioTransitionSound(transition.sound, { loop: transition.loopSound === true }).catch(() => undefined);
  }, [screen]);

  useEffect(() => () => stopStudioTransitionSound(), []);

  useEffect(() => {
    setAnimationStep(enterScreenAtEndRef.current ? animationTimeline.maxStep : 0);
    enterScreenAtEndRef.current = false;
    setAnimationNavigation(null);
    setPlaybackCycle((value) => value + 1);
    setBlankMode(null);
    setPresentationZoom(1);
  }, [animationTimeline.maxStep, screenId]);

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
    setScreenId(nextScreenId);
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
    if (annotationTool !== 'laser') setLaserPoint(null);
  }, [annotationTool]);

  const toggleFullScreen = async () => {
    if (document.fullscreenElement === playerRef.current) await document.exitFullscreen();
    else await playerRef.current?.requestFullscreen();
  };

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
        setScreenId(zoomRun.targetIds[nextIndex]);
      } else if (zoomRun.returnToZoom) {
        enterScreenAtEndRef.current = true;
        setScreenId(zoomRun.originScreenId);
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
      const followingScreen = screens.slice(currentIndex + 1).find((candidate) => !zoomTargetIds.has(candidate.screen_id));
      if (followingScreen) {
        setZoomHubRun(null);
        setScreenId(followingScreen.screen_id);
      }
      return;
    }
    if (currentIndex >= 0 && currentIndex < screens.length - 1)
      setScreenId(screens[currentIndex + 1]?.screen_id ?? null);
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
        setScreenId(zoomRun.targetIds[previousIndex]);
      } else {
        setScreenId(zoomRun.originScreenId);
        setZoomRun(null);
      }
      return;
    }
    if (currentIndex > 0) {
      enterScreenAtEndRef.current = true;
      setScreenId(screens[currentIndex - 1]?.screen_id ?? null);
    }
  };

  useEffect(() => {
    if (!presentationChannel || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(presentationChannel);
    channel.onmessage = (event: MessageEvent<{ command?: string }>) => {
      if (event.data?.command === 'next') advancePresenterRef.current();
      if (event.data?.command === 'previous') retreatPresenter();
      if (event.data?.command === 'fullscreen') void toggleFullScreen();
      if (event.data?.command === 'close') window.close();
    };
    return () => channel.close();
  }, [presentationChannel, retreatPresenter]);

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
    setScreenId(targetIds[0]);
  };

  useEffect(() => {
    const receiveRuntimeClicker = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string; key?: string } | null;
      if (data?.source !== 'spectropy-runtime') return;
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
      } else if (event.key === 'Home' && screens.length > 0) {
        event.preventDefault();
        enterScreenAtEndRef.current = false;
        setScreenId(screens[0].screen_id);
      } else if (event.key === 'End' && screens.length > 0) {
        event.preventDefault();
        enterScreenAtEndRef.current = false;
        setScreenId(screens.at(-1)?.screen_id ?? null);
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
      } else if (event.key.toLowerCase() === 'l' && isTrackedBranchUser) {
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
  }, [animationStep, animationTimeline.maxStep, blankMode, currentIndex, discoveryIndex, discoveryItem, discoveryPanelOpen, discoveryScreens, materialsOpen, previewMode, screens, shortcutGuideOpen, teacherAnnotations.length, zoomElements]);

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
            className="relative min-h-0 min-w-0 transition-[margin] duration-300"
            style={isTrackedBranchUser && !discoveryItem && (discoveryPanelOpen || materialsOpen || curriculumPreview) ? { marginLeft: 'min(20.25rem, calc(100vw - 7rem))' } : undefined}
            onClick={(event) => {
              if (discoveryItem || annotationTool !== 'pointer') return;
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
          {loading && <div className="grid h-full place-items-center text-slate-600">Loading published Session…</div>}
          {!discoveryItem && !loading && error && !release && (
            <div className="grid h-full place-items-center">
              <div className="rounded-xl border border-red-400/30 bg-red-950/40 p-6 text-red-100">{error}</div>
            </div>
          )}
          {!discoveryItem && !loading && release && screen && (
            <div className="h-full w-full transition-transform duration-200" style={{ transform: `scale(${presentationZoom})` }}>
              <PublishedCanvas key={screen.screen_id} releaseId={release.id} screen={screen} previewMode={previewMode} immersiveViewport={fullScreen || audienceMode} teacherAnnotations={teacherAnnotations} annotationTool={audienceMode ? 'pointer' : isTrackedBranchUser ? annotationTool : 'pointer'} annotationColor={annotationColor} annotationWidth={annotationWidth} onAnnotationsChange={setTeacherAnnotations} onZoom={openZoom} animationTimeline={animationTimeline} animationStep={animationStep} playbackCycle={playbackCycle} animationNavigation={animationNavigation} />
            </div>
          )}
          {!discoveryItem && !loading && release && !screen && <div className="grid h-full place-items-center text-slate-600">This release contains no Screens.</div>}
          {annotationTool === 'laser' ? <div className="absolute inset-0 z-[60] cursor-crosshair" onPointerMove={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); setLaserPoint({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }); }} onPointerLeave={() => setLaserPoint(null)} aria-label="Laser pointer surface">{laserPoint ? <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow-[0_0_18px_6px_rgba(239,68,68,0.75)]" style={{ left: laserPoint.x, top: laserPoint.y }} aria-hidden="true" /> : null}</div> : null}
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
                <button type="button" disabled={animationStep <= 0 && currentIndex <= 0} onClick={retreatPresenter} className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-30">
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
              {discoveryItem ? discoveryItem.type === 'session' ? `${discoveryIndex + 1} / ${discoveryScreens.length}` : discoveryItem.type : `${currentIndex + 1} / ${screens.length}`}
            </span>
            <span className="hidden text-[10px] text-slate-500 sm:block">{discoveryItem ? 'Esc closes Branching' : `Animation build ${animationStep}/${animationTimeline.maxStep} · Clicker: ← previous · → next`}</span>
          </span>
          <div className="flex items-center gap-2">
            {isTrackedBranchUser ? <FloatingWhiteboards sessionId={sessionId} inlineLauncher /> : null}
              <button type="button" disabled={discoveryItem ? discoveryItem.type !== 'session' || discoveryIndex < 0 || discoveryIndex >= discoveryScreens.length - 1 : animationStep >= animationTimeline.maxStep && (currentIndex < 0 || currentIndex >= screens.length - 1)} onClick={() => discoveryItem ? setDiscoveryScreenId(discoveryScreens[discoveryIndex + 1]?.screen_id ?? null) : advancePresenter()} className="inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-30 sm:gap-1.5">
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
                <button type="button" disabled={discoveryItem ? discoveryItem.type !== 'session' || discoveryIndex <= 0 : animationStep <= 0 && currentIndex <= 0} onClick={() => discoveryItem ? setDiscoveryScreenId(discoveryScreens[discoveryIndex - 1]?.screen_id ?? null) : retreatPresenter()} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-black shadow-sm hover:bg-slate-100 disabled:opacity-30" title="Previous" aria-label="Previous"><ChevronLeft size={20} /></button>
                <button type="button" onClick={() => { setFullscreenSlidesOpen(false); if (fullscreenDrawOpen || annotationTool !== 'pointer') { setFullscreenDrawOpen(false); setAnnotationTool('pointer'); } else setFullscreenDrawOpen(true); }} className={`grid h-10 w-10 place-items-center rounded-lg border text-black shadow-sm ${fullscreenDrawOpen || annotationTool !== 'pointer' ? 'border-slate-400 bg-slate-200' : 'border-slate-300 bg-white hover:bg-slate-100'}`} title={annotationTool !== 'pointer' ? 'Turn off drawing tools' : 'Drawing tools'} aria-label={annotationTool !== 'pointer' ? 'Turn off drawing tools' : 'Drawing tools'} aria-expanded={fullscreenDrawOpen} aria-pressed={annotationTool !== 'pointer'}><PenLine size={19} /></button>
                <button type="button" onClick={() => { setFullscreenSlidesOpen((open) => !open); setFullscreenDrawOpen(false); }} className={`grid h-10 w-10 place-items-center rounded-lg border text-black shadow-sm ${fullscreenSlidesOpen ? 'border-slate-400 bg-slate-200' : 'border-slate-300 bg-white hover:bg-slate-100'}`} title="All slides" aria-label="All slides" aria-expanded={fullscreenSlidesOpen}><Grid3X3 size={19} /></button>
                {!previewMode ? <button type="button" disabled={!release || !screen} onClick={() => { if (discoveryItem) closeDiscoveredContent(); else { const open = !discoveryPanelOpen; setMaterialsOpen(false); setCurriculumPreview(null); setDiscoveryPanelOpen(open); } setFullscreenDrawOpen(false); setFullscreenSlidesOpen(false); setAnnotationTool('pointer'); }} className={`grid h-10 w-10 place-items-center rounded-lg border text-black shadow-sm ${discoveryPanelOpen || discoveryItem ? 'border-slate-400 bg-slate-200' : 'border-slate-300 bg-white hover:bg-slate-100'} disabled:opacity-30`} title={discoveryPanelOpen || discoveryItem ? 'Close Branching' : 'Branching'} aria-label={discoveryPanelOpen || discoveryItem ? 'Close Branching' : 'Branching'} aria-pressed={discoveryPanelOpen || Boolean(discoveryItem)}>{discoveryPanelOpen || discoveryItem ? <X size={18} /> : <GitBranch size={18} />}</button> : null}
                {!previewMode ? <button type="button" onClick={() => { setFullscreenDrawOpen(false); setFullscreenSlidesOpen(false); setAnnotationTool('pointer'); void openTeachingMaterials(); }} className={`grid h-10 w-10 place-items-center rounded-lg border text-black shadow-sm ${materialsOpen || curriculumPreview ? 'border-slate-400 bg-slate-200' : 'border-slate-300 bg-white hover:bg-slate-100'}`} title={materialsOpen || curriculumPreview ? 'Close teaching materials' : 'Teaching materials'} aria-label={materialsOpen || curriculumPreview ? 'Close teaching materials' : 'Teaching materials'} aria-pressed={materialsOpen || Boolean(curriculumPreview)}><FileText size={18} /></button> : null}
                <button type="button" disabled={discoveryItem ? discoveryItem.type !== 'session' || discoveryIndex < 0 || discoveryIndex >= discoveryScreens.length - 1 : animationStep >= animationTimeline.maxStep && (currentIndex < 0 || currentIndex >= screens.length - 1)} onClick={() => discoveryItem ? setDiscoveryScreenId(discoveryScreens[discoveryIndex + 1]?.screen_id ?? null) : advancePresenter()} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-black shadow-sm hover:bg-slate-100 disabled:opacity-30" title="Next" aria-label="Next"><ChevronRight size={20} /></button>
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
