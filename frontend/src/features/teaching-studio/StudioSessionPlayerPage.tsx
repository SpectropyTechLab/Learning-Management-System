import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Eraser, FileText, GitBranch, Loader2, Maximize2, Minimize2, MousePointer2, PenLine, Presentation, RotateCcw, Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getApiErrorDetails } from '@/lib/api';
import type { Layout, ObjectType, Rect, Slide } from './layouts';
import { targetLayouts } from './targetLayouts';
import SlideCanvas from './SlideCanvas';
import StudioShell from './components/StudioShell';
import { downloadPublishedSessionPlan, getPublishedTeachingMaterials, getPublishedRelease, getSessionPlayerPreview, launchPublishedResource, previewPublishedResource } from './api/studioPublishedApi';
import { getStudioResourcePreview, launchStudioResourceVersion } from './api/studioResourcesApi';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import type { CurriculumDocumentPreview } from './api/studioDocumentsApi';
import Model3DViewer from './components/resources/Model3DViewer';
import { ExecutableResourceFrame, ExternalLinkFrame } from './components/resources/StudioResourceFrames';
import StudioAnimatedElement from './components/StudioAnimatedElement';
import StudioCanvasTextElement from './components/StudioCanvasTextElement';
import StudioMathElement from './components/StudioMathElement';
import StudioShapeElement from './components/StudioShapeElement';
import StudioBranchDiscoveryPanel from './components/StudioBranchDiscoveryPanel';
import type { PublishedRelease, PublishedResourceMapping, PublishedScreen, PublishedTeachingMaterials } from './api/studioPublishedApi';
import type { StudioDiscoveryItem } from './api/studioDiscoveryApi';
import type { AuthorDrawingStroke } from './types';

const textFrom = (content: Record<string, unknown>) => {
  const preferred = content.text ?? content.value ?? content.title ?? content.caption;
  if (typeof preferred === 'string') return preferred;
  const value = Object.values(content).find((item) => typeof item === 'string');
  return typeof value === 'string' ? value : '';
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

  useEffect(() => {
    if (mapping.external_url) return;
    let active = true;
    const request = ['html', 'zip', 'scorm', 'simulation'].includes(mapping.resource_type)
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

function PublishedCanvas({ releaseId, screen, previewMode = false, teacherAnnotations, annotationTool, annotationColor, annotationWidth, onAnnotationsChange }: { releaseId: number; screen: PublishedScreen; previewMode?: boolean; teacherAnnotations: AuthorDrawingStroke[]; annotationTool: 'pointer' | 'pen' | 'eraser'; annotationColor: string; annotationWidth: number; onAnnotationsChange: (strokes: AuthorDrawingStroke[]) => void }) {
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
      animation: element.content_json?.animation && typeof element.content_json.animation === 'object' ? element.content_json.animation as Record<string, unknown> : undefined,
      color: typeof element.content_json?.color === 'string' ? element.content_json.color : undefined,
      zIndex: typeof element.position_json?.zIndex === 'number' ? element.position_json.zIndex : undefined,
    })),
  };
  const overlays: Record<string, ReactNode> = Object.fromEntries(screen.elements.flatMap((element) => {
    if (element.element_type === 'math') return [[element.element_key, <StudioMathElement key={element.element_key} latex={String(element.content_json?.latex ?? element.content_json?.text ?? '')} color={typeof element.content_json?.color === 'string' ? element.content_json.color : undefined} fontSize={Number(element.content_json?.fontSize) || undefined} alignment={element.content_json?.alignment === 'left' || element.content_json?.alignment === 'right' ? element.content_json.alignment : 'center'} />]];
    if (element.element_type === 'shape') return [[element.element_key, <StudioShapeElement key={element.element_key} kind={String(element.content_json?.kind || 'rectangle')} fill={typeof element.content_json?.fill === 'string' ? element.content_json.fill : undefined} stroke={typeof element.content_json?.stroke === 'string' ? element.content_json.stroke : undefined} strokeWidth={Number(element.content_json?.strokeWidth) || undefined} opacity={Number(element.content_json?.opacity) || undefined} />]];
    const text = textFrom(element.content_json || {});
    if (['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(element.element_type)) return [[element.element_key, <StudioCanvasTextElement key={element.element_key} text={text} color={typeof element.content_json?.color === 'string' ? element.content_json.color : undefined} fontSize={Number(element.content_json?.fontSize) || undefined} fontFamily={typeof element.content_json?.fontFamily === 'string' ? element.content_json.fontFamily : undefined} bold={element.content_json?.bold === true} italic={element.content_json?.italic === true} underline={element.content_json?.underline === true} alignment={element.content_json?.alignment === 'center' || element.content_json?.alignment === 'right' || element.content_json?.alignment === 'justify' ? element.content_json.alignment : 'left'} list={element.content_json?.list === true} />]];
    return element.resource_mapping ? [[element.element_key, <PublishedResource key={element.element_key} releaseId={releaseId} mapping={element.resource_mapping} previewMode={previewMode} />]] : [];
  }));
  for (const element of screen.elements) {
    const overlay = overlays[element.element_key];
    const animation = element.content_json?.animation && typeof element.content_json.animation === 'object' ? element.content_json.animation as Record<string, unknown> : undefined;
    if (overlay && animation && animation.effect !== 'none') overlays[element.element_key] = <StudioAnimatedElement animation={animation}>{overlay}</StudioAnimatedElement>;
  }

  return <SlideCanvas layout={layout} slide={slide} objectOverlays={overlays} transition={screen.screen_settings_json?.transition} fixedDrawingStrokes={screen.screen_settings_json?.author_drawings?.strokes ?? []} drawingStrokes={teacherAnnotations} drawingEnabled={annotationTool !== 'pointer'} drawingTool={annotationTool === 'eraser' ? 'eraser' : 'pen'} drawingColor={annotationColor} drawingWidth={annotationWidth} onDrawingChange={onAnnotationsChange} />;
}

export default function StudioSessionPlayerPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerRef = useRef<HTMLDivElement>(null);
  const [release, setRelease] = useState<PublishedRelease | null>(null);
  const [screenId, setScreenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [annotationTool, setAnnotationTool] = useState<'pointer' | 'pen' | 'eraser'>('pointer');
  const [annotationColor, setAnnotationColor] = useState('#ef4444');
  const [annotationWidth, setAnnotationWidth] = useState(6);
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

  const sessionId = Number(params.sessionId);
  const releaseNumber = Number(params.releaseNumber);
  const previewMode = params.releaseNumber === undefined;

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
  const discoveryScreens = useMemo(() => [...(discoveryRelease?.manifest.screens || [])].sort((a, b) => a.display_order - b.display_order), [discoveryRelease]);
  const discoveryIndex = discoveryScreens.findIndex((candidate) => candidate.screen_id === discoveryScreenId);
  const discoveryScreen = discoveryIndex >= 0 ? discoveryScreens[discoveryIndex] : null;
  const isTrackedBranchUser = user?.role === 'teacher';
  const teacherAnnotations = screenId ? (annotationsByScreen[screenId] ?? []) : [];

  useEffect(() => {
    const syncFullScreen = () => setFullScreen(document.fullscreenElement === playerRef.current);
    document.addEventListener('fullscreenchange', syncFullScreen);
    return () => document.removeEventListener('fullscreenchange', syncFullScreen);
  }, []);

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
    if (!release || materialsBusy) return;
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

  useEffect(() => {
    const handleClicker = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) return;
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
      if (materialsOpen || discoveryItem) return;
      const previousKeys = new Set(['ArrowLeft', 'PageUp', 'Backspace']);
      const nextKeys = new Set(['ArrowRight', 'PageDown', ' ', 'Enter']);
      if (previousKeys.has(event.key) && currentIndex > 0) {
        event.preventDefault();
        setScreenId(screens[currentIndex - 1]?.screen_id ?? null);
      } else if (nextKeys.has(event.key) && currentIndex >= 0 && currentIndex < screens.length - 1) {
        event.preventDefault();
        setScreenId(screens[currentIndex + 1]?.screen_id ?? null);
      } else if (event.key === 'Home' && screens.length > 0) {
        event.preventDefault();
        setScreenId(screens[0].screen_id);
      } else if (event.key === 'End' && screens.length > 0) {
        event.preventDefault();
        setScreenId(screens.at(-1)?.screen_id ?? null);
      }
    };
    window.addEventListener('keydown', handleClicker);
    return () => window.removeEventListener('keydown', handleClicker);
  }, [currentIndex, discoveryItem, discoveryPanelOpen, materialsOpen, screens]);

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
    <StudioShell title="Session Player" subtitle={previewMode ? 'Live authoring preview' : release ? `Published Release ${release.release_number}` : undefined} scrollContent={false} wrapContent={false}>
      <div ref={playerRef} className={`relative flex h-full min-h-0 flex-col overflow-hidden ${isTrackedBranchUser ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'}`}>
        <header className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 ${isTrackedBranchUser ? 'border-slate-200 bg-white' : 'border-white/10'}`}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={exitPlayer} className={`rounded-lg p-2 ${isTrackedBranchUser ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`} aria-label="Exit player">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="font-semibold">{discoveryItem ? `Branching · ${discoveryItem.title}` : release?.manifest.session?.title || (previewMode ? 'Session Preview' : 'Published Session')}</h2>
              <p className={`text-xs ${isTrackedBranchUser ? 'text-slate-600' : 'text-slate-300'}`}>{discoveryItem ? `Related ${discoveryItem.type} from ${discoveryItem.curriculum.topic_name}` : screen ? `Screen ${screen.screen_number}: ${screen.title}` : 'Loading presentation'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {discoveryItem && <button type="button" onClick={closeDiscoveredContent} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"><X size={16} />Close Branching</button>}
            {previewMode && <span className="rounded-full bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-200">Unpublished preview</span>}
            <button type="button" onClick={() => void toggleFullScreen()} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${isTrackedBranchUser ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`} title={fullScreen ? 'Exit full screen' : 'Full screen'} aria-label={fullScreen ? 'Exit full screen' : 'Full screen'}>
              {fullScreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          </div>
        </header>
        {!previewMode && release && screen && <StudioBranchDiscoveryPanel open={discoveryPanelOpen} releaseId={release.id} screenId={screen.screen_id} onClose={() => setDiscoveryPanelOpen(false)} onSelect={(item) => void openDiscoveredContent(item)} />}
        {materialsOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label="Published teaching materials">
            <section className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
              <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-xl font-bold">Published teaching materials</h2>
                  <p className="mt-1 text-sm text-slate-600">View the Curriculum and the Session Plan used for Release {release?.release_number}.</p>
                </div>
                <button type="button" onClick={() => setMaterialsOpen(false)} className="rounded-lg border border-slate-300 p-2 hover:bg-slate-100" aria-label="Close teaching materials">
                  <X size={20} />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {materialsBusy && <p className="rounded-lg bg-slate-100 p-4 text-sm">Loading published materials…</p>}
                {!materialsBusy && materials && (
                  <div className="space-y-6">
                    <section className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-blue-800" />
                            <h3 className="font-bold">Chapter Curriculum</h3>
                          </div>
                          <p className="mt-1 break-all text-sm text-slate-600">{materials.curriculum?.original_file_name || 'No Curriculum document is available for this Chapter.'}</p>
                          {materials.curriculum?.revision_no && <p className="text-xs text-slate-500">Revision {materials.curriculum.revision_no}</p>}
                        </div>
                        {materials.curriculum?.document_id && (
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => void viewCurriculum()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                              <FileText size={16} />
                              View Curriculum
                            </button>
                            <button type="button" onClick={() => void downloadCurriculum()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                              <Download size={16} />
                              Download Curriculum
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                    <section>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-blue-800" />
                            <h3 className="font-bold">Session Plan</h3>
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
                      <div className="mt-3 space-y-3">
                        {materialRows(materials.session_plan?.content).map((row, index) => (
                          <article key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="mb-3 text-xs font-bold uppercase text-blue-900">Plan row {index + 1}</p>
                            <dl className="grid gap-3 sm:grid-cols-2">
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
            </section>
          </div>
        )}
        {curriculumPreview && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label="Curriculum preview">
            <section className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
              <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
                <div className="min-w-0">
                  <h2 className="font-bold">Chapter Curriculum</h2>
                  <p className="truncate text-sm text-slate-600" title={curriculumPreview.file_name}>
                    {curriculumPreview.file_name} · Revision {curriculumPreview.revision_no}
                  </p>
                </div>
                <button type="button" onClick={() => setCurriculumPreview(null)} className="rounded-lg border border-slate-300 p-2" aria-label="Close Curriculum preview">
                  <X size={19} />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{curriculumPreview.text || 'The document contains no extractable text.'}</pre>
              </div>
            </section>
          </div>
        )}
        <main className={`grid min-h-0 flex-1 gap-3 p-3 ${isTrackedBranchUser && !discoveryItem ? 'grid-cols-[13rem_minmax(0,1fr)]' : 'grid-cols-1'}`}>
          {isTrackedBranchUser && !discoveryItem && (
            <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Teacher board and drawing controls">
              <label className="text-xs font-semibold text-slate-700">Screens
                <select value={screenId ?? ''} onChange={(event) => setScreenId(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900">
                  {screens.map((item) => <option key={item.screen_id} value={item.screen_id}>Screen {item.screen_number}: {item.title}</option>)}
                </select>
              </label>
              <div className="rounded-lg bg-slate-50 p-3 text-slate-900"><h3 className="text-sm font-bold">Teacher board</h3><p className="mt-1 text-xs text-slate-600">Choose a tool, then draw directly over the teaching screen. Ink remains local to this run.</p></div>
              <button type="button" onClick={() => setAnnotationTool('pointer')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${annotationTool === 'pointer' ? 'bg-blue-900 text-white' : 'border border-slate-300 bg-white'}`}><MousePointer2 size={16} />Pointer</button>
              <button type="button" onClick={() => setAnnotationTool('pen')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${annotationTool === 'pen' ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white'}`}><PenLine size={16} />Pen</button>
              <button type="button" onClick={() => setAnnotationTool('eraser')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${annotationTool === 'eraser' ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white'}`}><Eraser size={16} />Eraser</button>
              <label className="text-xs font-semibold text-slate-700">Colour<input type="color" value={annotationColor} onChange={(event) => setAnnotationColor(event.target.value)} className="mt-1 h-9 w-full cursor-pointer rounded border border-slate-300 bg-white p-0.5" /></label>
              <label className="text-xs font-semibold text-slate-700">Width {annotationWidth}<input type="range" min="2" max="24" value={annotationWidth} onChange={(event) => setAnnotationWidth(Number(event.target.value))} className="mt-1 w-full" /></label>
              <button type="button" disabled={(annotationHistoryByScreen[screenId || 0] ?? []).length === 0} onClick={undoTeacherAnnotation} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-30"><RotateCcw size={15} />Undo ink</button>
              <button type="button" disabled={teacherAnnotations.length === 0} onClick={() => setTeacherAnnotations([])} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-30"><Trash2 size={15} />Clear ink</button>
              {!previewMode && <button type="button" disabled={!release || !screen} onClick={() => setDiscoveryPanelOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"><GitBranch size={16} />Branching</button>}
              {!previewMode && <button type="button" onClick={() => void openTeachingMaterials()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"><FileText size={16} />View teaching materials</button>}
            </aside>
          )}
          <section className="min-h-0 min-w-0">
          {discoveryLoading && <div className="grid h-full place-items-center text-slate-300"><span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={20} />Opening related content…</span></div>}
          {!discoveryLoading && discoveryItem?.type === 'resource' && discoveryItem.resource_mapping && <div className="h-full overflow-hidden rounded-xl bg-black"><PublishedResource releaseId={discoveryItem.release_id} mapping={discoveryItem.resource_mapping} /></div>}
          {!discoveryLoading && discoveryItem && discoveryItem.type !== 'resource' && discoveryRelease && discoveryScreen && <PublishedCanvas releaseId={discoveryRelease.id} screen={discoveryScreen} teacherAnnotations={[]} annotationTool="pointer" annotationColor={annotationColor} annotationWidth={annotationWidth} onAnnotationsChange={() => undefined} />}
          {!discoveryLoading && discoveryItem && discoveryError && <div className="grid h-full place-items-center"><div className="rounded-xl border border-red-400/30 bg-red-950/40 p-6 text-red-100">{discoveryError}</div></div>}
          {loading && <div className="grid h-full place-items-center text-slate-300">Loading published Session…</div>}
          {!discoveryItem && !loading && error && !release && (
            <div className="grid h-full place-items-center">
              <div className="rounded-xl border border-red-400/30 bg-red-950/40 p-6 text-red-100">{error}</div>
            </div>
          )}
          {!discoveryItem && !loading && release && screen && <PublishedCanvas key={screen.screen_id} releaseId={release.id} screen={screen} previewMode={previewMode} teacherAnnotations={teacherAnnotations} annotationTool={isTrackedBranchUser ? annotationTool : 'pointer'} annotationColor={annotationColor} annotationWidth={annotationWidth} onAnnotationsChange={setTeacherAnnotations} />}
          {!discoveryItem && !loading && release && !screen && <div className="grid h-full place-items-center text-slate-300">This release contains no Screens.</div>}
          </section>
        </main>
        {error && release && <p className="mx-4 mb-2 rounded-lg bg-red-950/70 px-3 py-2 text-sm text-red-100">{error}</p>}
        <footer className={`flex items-center justify-between gap-3 border-t px-3 py-1.5 ${isTrackedBranchUser ? 'border-slate-200 bg-white' : 'border-white/10'}`}>
          {discoveryItem ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={closeDiscoveredContent} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950"><X size={18} />Close Branching</button>
              <button type="button" disabled={discoveryItem.type !== 'session' || discoveryIndex <= 0} onClick={() => setDiscoveryScreenId(discoveryScreens[discoveryIndex - 1]?.screen_id ?? null)} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 font-semibold disabled:opacity-30"><ChevronLeft size={18} />Previous</button>
            </div>
          ) : (
            <button type="button" disabled={currentIndex <= 0} onClick={() => setScreenId(screens[currentIndex - 1]?.screen_id)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-30 ${isTrackedBranchUser ? 'border-slate-300 bg-white' : 'border-white/20'}`}>
              <ChevronLeft size={18} />
              Previous
            </button>
          )}
          <span className={`text-center text-sm ${isTrackedBranchUser ? 'text-slate-700' : 'text-slate-300'}`}>
            <span className="block">
              {discoveryItem ? discoveryItem.type === 'session' ? `${discoveryIndex + 1} / ${discoveryScreens.length}` : discoveryItem.type : `${currentIndex + 1} / ${screens.length}`}
            </span>
            <span className="hidden text-[11px] text-slate-500 sm:block">{discoveryItem ? 'Esc closes Branching' : 'Clicker: ←/Page Up · →/Page Down/Space'}</span>
          </span>
          <button type="button" disabled={discoveryItem ? discoveryItem.type !== 'session' || discoveryIndex < 0 || discoveryIndex >= discoveryScreens.length - 1 : currentIndex < 0 || currentIndex >= screens.length - 1} onClick={() => discoveryItem ? setDiscoveryScreenId(discoveryScreens[discoveryIndex + 1]?.screen_id ?? null) : setScreenId(screens[currentIndex + 1]?.screen_id)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-30 ${isTrackedBranchUser ? 'border-slate-300 bg-white' : 'border-white/20'}`}>
            Next
            <ChevronRight size={18} />
          </button>
        </footer>
      </div>
    </StudioShell>
  );
}
