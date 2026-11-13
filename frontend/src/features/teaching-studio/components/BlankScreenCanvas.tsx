import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { FileText, Image as ImageIcon, Maximize2, Minimize2, Minus, Music, Plus, Scan, Video } from 'lucide-react';
import { getStudioResource } from '../api/studioResourcesApi';
import type { StudioResourceDetails, StudioResourceVersion } from '../api/studioResourcesApi';
import type { Layout, ObjectType, Rect, Slide, Slot } from '../layouts';
import SlideCanvas from '../SlideCanvas';
import type { AuthorDrawingStroke, StudioDrawingTool, StudioElement, StudioScreen } from '../types';
import StudioResourcePlayer from './resources/StudioResourcePlayer';
import StudioMathElement from './StudioMathElement';
import StudioCanvasTextElement from './StudioCanvasTextElement';
import StudioElementToolbar from './StudioElementToolbar';
import StudioShapeElement from './StudioShapeElement';
import StudioSmartDiagram from './StudioSmartDiagram';
import StudioHyperlinkOverlay from './studioHyperlink';
import { isSmartDiagramContent } from './smartDiagramModel';
import { studioAnimationStyle } from './studioAnimationRuntime';
import type { InlineShapeData } from './studioInlineShape';
import {
  buildPresenterAnimationTimeline,
  clickerNavigationAction,
  presenterDiagramVisibleNodes,
  presenterElementPlaybackState,
  type PresenterAnimationNavigation,
} from './studioClickerRuntime';

interface BlankScreenCanvasProps {
  screen: StudioScreen | null;
  screenTitle?: string;
  loading: boolean;
  layout?: Layout | null;
  selectedElementId?: string | null;
  selectedSlotId?: string | null;
  onSelectElement?: (elementId: string) => void;
  onSelectSlot?: (slotId: string) => void;
  onClearElementSelection?: () => void;
  onChangeElementBounds?: (elementId: string, bounds: Rect) => void;
  onChangeElementContent?: (elementId: string, changes: Record<string, unknown>) => void;
  onTextCaretChange?: (elementId: string, offset: number) => void;
  onEditInlineShape?: (elementId: string, shape: InlineShapeData, start: number, end: number) => void;
  onOpenTool?: (tool: 'math' | 'shapes' | 'animations') => void;
  onDuplicateElement?: (elementId: string) => void;
  onRemoveElement?: (elementId: string) => void;
  showGuides?: boolean;
  previewMode?: boolean;
  animationPreview?: { elementId: string; token: number } | null;
  previewStartAtEnd?: boolean;
  onPreviewNext?: () => void;
  onPreviewPrevious?: () => void;
  drawingStrokes?: AuthorDrawingStroke[];
  drawingEnabled?: boolean;
  drawingTool?: StudioDrawingTool;
  drawingColor?: string;
  drawingWidth?: number;
  drawingOpacity?: number;
  onDrawingChange?: (strokes: AuthorDrawingStroke[]) => void;
  onCreateTextAt?: (point: { x: number; y: number }) => string | void;
  onActivateSlotAt?: (point: { x: number; y: number }) => string | void;
  onDropFiles?: (files: File[], point: { x: number; y: number }) => void;
}

const elementText = (content: Record<string, unknown>) => {
  const preferred = content.text ?? content.value ?? content.title;
  if (typeof preferred === 'string') return preferred;
  const firstText = Object.values(content).find((value) => typeof value === 'string');
  return typeof firstText === 'string' ? firstText : '';
};

function BoundResource({ element, onSelect, onImageAspectRatio }: { element: StudioElement; onSelect?: () => void; onImageAspectRatio?: (aspectRatio: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resource, setResource] = useState<StudioResourceDetails | null>(null);
  const [version, setVersion] = useState<StudioResourceVersion | null>(null);
  const [error, setError] = useState('');
  const [fullScreen, setFullScreen] = useState(false);
  const resourceId = element.resource?.resource_id;
  const versionId = element.resource?.resource_version_id;
  const imageAspectRatioRef = useRef(onImageAspectRatio);
  imageAspectRatioRef.current = onImageAspectRatio;

  useEffect(() => {
    if (!resourceId || !versionId) return;
    let active = true;
    setResource(null);
    setVersion(null);
    setError('');
    void getStudioResource(resourceId)
      .then((details) => {
        if (!active) return;
        const selectedVersion = details.versions.find((candidate) => candidate.id === versionId);
        if (!selectedVersion)
          throw new Error('The linked Resource version is no longer available.');
        setResource(details);
        setVersion(selectedVersion);
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError instanceof Error ? loadError.message : 'Unable to load the linked Resource.',
          );
      });
    return () => {
      active = false;
    };
  }, [resourceId, versionId]);

  useEffect(() => {
    if (resource?.resource_type !== 'image' || !version?.width || !version?.height) return;
    imageAspectRatioRef.current?.(version.width / version.height);
  }, [resource?.resource_type, version?.height, version?.id, version?.width]);

  useEffect(() => {
    const syncFullScreen = () => setFullScreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', syncFullScreen);
    return () => document.removeEventListener('fullscreenchange', syncFullScreen);
  }, []);

  if (error)
    return (
      <div className="grid h-full place-items-center bg-slate-900 p-3 text-center text-xs text-white">
        {error}
      </div>
    );
  if (!resource || !version)
    return (
      <div className="grid h-full place-items-center bg-slate-900 text-xs font-medium text-white">
        Preparing media…
      </div>
    );

  const toggleFullScreen = async () => {
    const container = containerRef.current;
    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
      return;
    }
    if (container?.requestFullscreen) await container.requestFullscreen();
  };

  return (
    <div ref={containerRef} className="group relative h-full w-full bg-black" onClick={onSelect}>
      <StudioResourcePlayer
        resourceType={resource.resource_type}
        version={version}
        mode="canvas"
        className="h-full w-full"
      />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void toggleFullScreen();
        }}
        className="studio-resource-fullscreen absolute right-2 top-2 z-10 inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg border border-white/40 bg-slate-950/70 text-white opacity-0 backdrop-blur transition-opacity hover:bg-slate-950/90 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
        title={
          fullScreen
            ? 'Exit full screen and return to the editor'
            : 'View this resource in full screen'
        }
        aria-label={fullScreen ? 'Exit full screen' : 'View resource in full screen'}
      >
        {fullScreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
      </button>
    </div>
  );
}

const elementBounds = (position: Record<string, unknown>): Rect | undefined => {
  const x = Number(position.x);
  const y = Number(position.y);
  const width = Number(position.width);
  const height = Number(position.height);
  return [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0
    ? { x, y, width, height }
    : undefined;
};

export default function BlankScreenCanvas({
  screen,
  screenTitle,
  loading,
  layout = null,
  selectedElementId,
  selectedSlotId,
  onSelectElement,
  onSelectSlot,
  onClearElementSelection,
  onChangeElementBounds,
  onChangeElementContent,
  onTextCaretChange,
  onEditInlineShape,
  onOpenTool,
  onDuplicateElement,
  onRemoveElement,
  showGuides = false,
  previewMode = false,
  animationPreview = null,
  previewStartAtEnd = false,
  onPreviewNext,
  onPreviewPrevious,
  drawingStrokes,
  drawingEnabled = false,
  drawingTool = 'pen',
  drawingColor = '#ef4444',
  drawingWidth = 6,
  drawingOpacity = 1,
  onDrawingChange,
  onCreateTextAt,
  onActivateSlotAt,
  onDropFiles,
}: BlankScreenCanvasProps) {
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [previewStep, setPreviewStep] = useState(0);
  const [previewCycle, setPreviewCycle] = useState(0);
  const [previewNavigation, setPreviewNavigation] =
    useState<PresenterAnimationNavigation | null>(null);
  const [lastClickerAction, setLastClickerAction] = useState<'next' | 'previous' | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const toolbarBoundsRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const toolbarDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const zoomPointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistanceRef = useRef<number | null>(null);
  const animationTimeline = useMemo(
    () =>
      buildPresenterAnimationTimeline(
        (screen?.elements ?? []).map((element) => ({
          element_key: element.id,
          content_json: element.content,
        })),
      ),
    [screen?.elements],
  );
  useEffect(() => {
    setEditingElementId(null);
  }, [screen?.id]);
  useEffect(() => {
    setPreviewStep(previewStartAtEnd ? animationTimeline.maxStep : 0);
    setPreviewCycle((current) => current + 1);
    setPreviewNavigation(null);
    setLastClickerAction(null);
  }, [animationTimeline.maxStep, previewMode, previewStartAtEnd, screen?.id]);
  useEffect(() => {
    if (!previewMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = clickerNavigationAction(event);
      if (action === 'next') {
        event.preventDefault();
        if (previewStep < animationTimeline.maxStep) {
          const nextStep = previewStep + 1;
          setPreviewNavigation({
            direction: 'forward',
            fromStep: previewStep,
            toStep: nextStep,
          });
          setPreviewStep(nextStep);
        } else onPreviewNext?.();
        setLastClickerAction('next');
      } else if (action === 'previous') {
        event.preventDefault();
        if (previewStep > 0) {
          const previousStep = previewStep - 1;
          setPreviewNavigation({
            direction: 'backward',
            fromStep: previewStep,
            toStep: previousStep,
          });
          setPreviewStep(previousStep);
        } else onPreviewPrevious?.();
        setLastClickerAction('previous');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [animationTimeline.maxStep, onPreviewNext, onPreviewPrevious, previewMode, previewStep]);
  useEffect(() => {
    if (editingElementId && selectedElementId !== editingElementId) setEditingElementId(null);
  }, [editingElementId, selectedElementId]);
  const authoredStrokes =
    drawingStrokes ?? screen?.screen_settings_json?.author_drawings?.strokes ?? [];
  const freeformLayout: Layout | null =
    !layout &&
    screen &&
    (screen.elements.length > 0 || drawingEnabled || authoredStrokes.length > 0)
      ? {
          id: 'FREEFORM',
          name: 'Freeform screen',
          purpose: 'Author-positioned blank screen elements',
          catalog: 'pilot',
          slots: screen.elements.map((element, index) => {
            const region =
              element.type === 'title'
                ? 'header'
                : element.type === 'footer'
                  ? 'footer'
                  : 'content';
            const fallback =
              region === 'header'
                ? { x: 90, y: 60, width: 1740, height: 150 }
                : region === 'footer'
                  ? { x: 90, y: 950, width: 1740, height: 90 }
                  : { x: 180 + (index % 2) * 800, y: 260, width: 760, height: 420 };
            return {
              id: element.slotId || `free-${element.id}`,
              label: element.type,
              region,
              allowed: [element.type as ObjectType],
              bounds: elementBounds(element.position) ?? fallback,
            };
          }),
        }
      : null;
  const baseLayout = layout ?? freeformLayout;
  const displayLayoutGuides = showGuides && Boolean(layout);
  const renderLayout: Layout | null =
    baseLayout && screen
      ? {
          ...baseLayout,
          slots: [
            ...baseLayout.slots,
            ...screen.elements
              .filter(
                (element) =>
                  !baseLayout.slots.some(
                    (slot) => slot.id === (element.slotId || `free-${element.id}`),
                  ),
              )
              .map((element, index) => ({
                id: element.slotId || `free-${element.id}`,
                label: element.type === 'math' ? 'Math equation' : element.type,
                region: (element.type === 'title'
                  ? 'header'
                  : element.type === 'footer'
                    ? 'footer'
                    : 'content') as Slot['region'],
                allowed: [element.type as ObjectType],
                bounds: elementBounds(element.position) ?? {
                  x: 420 + (index % 3) * 40,
                  y: 340 + (index % 3) * 40,
                  width: 1080,
                  height: 260,
                },
              })),
          ],
        }
      : baseLayout;
  const fitElementToRenderedSize = (
    element: StudioElement,
    requiredWidthRatio: number,
    requiredHeightRatio: number,
  ) => {
    if (!onChangeElementBounds || !Number.isFinite(requiredWidthRatio) || !Number.isFinite(requiredHeightRatio)) return;
    const currentBounds =
      elementBounds(element.position) ??
      renderLayout?.slots.find(
        (slot) => slot.id === (element.slotId || `free-${element.id}`),
      )?.bounds;
    if (!currentBounds) return;
    const nextBounds = {
      ...currentBounds,
      width: Math.max(80, Math.min(1920 - currentBounds.x, Math.ceil(currentBounds.width * requiredWidthRatio))),
      height: Math.max(60, Math.min(1080 - currentBounds.y, Math.ceil(currentBounds.height * requiredHeightRatio))),
    };
    if (Math.abs(nextBounds.width - currentBounds.width) < 2 && Math.abs(nextBounds.height - currentBounds.height) < 2) return;
    onChangeElementBounds(element.id, nextBounds);
  };
  const slide: Slide | null =
    screen && renderLayout
      ? {
          title: screen.title,
          creationMode: 'layout',
          objects: screen.elements.map((element) => ({
            id: element.id,
            slotId: element.slotId || `free-${element.id}`,
            type: element.type as Slide['objects'][number]['type'],
            text: elementText(element.content),
            position: elementBounds(element.position),
            color: typeof element.content.color === 'string' ? element.content.color : undefined,
            backgroundColor: typeof element.content.backgroundColor === 'string'
              ? element.content.backgroundColor
              : typeof element.content.fill === 'string' ? element.content.fill : undefined,
            locked: element.position.locked === true,
            zIndex:
              typeof element.position.zIndex === 'number' ? element.position.zIndex : undefined,
            url: typeof element.content.url === 'string' ? element.content.url : undefined,
            altText:
              typeof element.content.altText === 'string' ? element.content.altText : undefined,
            caption:
              typeof element.content.caption === 'string' ? element.content.caption : undefined,
          })),
        }
      : null;

  const objectOverlays: Record<string, ReactNode> = {};
  const objectAnimationStyles: Record<string, CSSProperties> = {};
  const objectAnimationKeys: Record<string, string | number> = {};
  for (const element of screen?.elements ?? []) {
    if (isSmartDiagramContent(element.content)) {
      const visibleNodeIds = previewMode
        ? presenterDiagramVisibleNodes(
            animationTimeline,
            element.id,
            previewStep,
            element.content.nodes.map((node) => node.id),
          )
        : undefined;
      objectOverlays[element.id] = (
        <StudioSmartDiagram
          content={element.content}
          editable={!previewMode && Boolean(onChangeElementContent)}
          visibleNodeIds={visibleNodeIds}
            onAspectRatioChange={!previewMode && onChangeElementBounds ? (aspectRatio) => {
              const currentBounds = elementBounds(element.position) ?? renderLayout?.slots.find((slot) => slot.id === element.slotId)?.bounds;
              if (!currentBounds || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return;
              const maximumWidth = 1920 - currentBounds.x;
              const maximumHeight = 1080 - currentBounds.y;
              let width = Math.min(currentBounds.width, maximumWidth);
              let height = width / aspectRatio;
              if (height > maximumHeight) {
                height = maximumHeight;
                width = height * aspectRatio;
              }
              const nextBounds = { ...currentBounds, width: Math.max(80, Math.round(width)), height: Math.max(60, Math.round(height)) };
              if (Math.abs(nextBounds.width - currentBounds.width) < 2 && Math.abs(nextBounds.height - currentBounds.height) < 2) return;
              onChangeElementBounds(element.id, nextBounds);
            } : undefined}
          onSelectNode={() => onSelectElement?.(element.id)}
          onChangeNodeText={(nodeId, text) =>
            onChangeElementContent?.(element.id, {
              nodes: element.content.nodes.map((node) =>
                node.id === nodeId ? { ...node, text } : node,
              ),
            })
          }
        />
      );
      continue;
    }
    if (element.type === 'math') {
      objectOverlays[element.id] = (
        <StudioMathElement
          key={element.id}
          latex={String(element.content.latex ?? element.content.text ?? '')}
          color={typeof element.content.color === 'string' ? element.content.color : undefined}
          backgroundColor={typeof element.content.backgroundColor === 'string' ? element.content.backgroundColor : undefined}
          fontSize={Number(element.content.fontSize) || undefined}
          alignment={
            element.content.alignment === 'left' || element.content.alignment === 'right'
              ? element.content.alignment
              : 'center'
          }
          onRequestSize={previewMode ? undefined : (widthRatio, heightRatio) => fitElementToRenderedSize(element, widthRatio, heightRatio)}
        />
      );
      continue;
    }
    if (element.type === 'shape') {
      objectOverlays[element.id] = (
        <StudioShapeElement
          kind={String(element.content.kind || 'rectangle')}
          fill={typeof element.content.fill === 'string' ? element.content.fill : undefined}
          stroke={typeof element.content.stroke === 'string' ? element.content.stroke : undefined}
          strokeWidth={Number(element.content.strokeWidth) || undefined}
          opacity={Number(element.content.opacity) || undefined}
          strokeDash={
            typeof element.content.strokeDash === 'string' ? element.content.strokeDash : undefined
          }
          customPath={
            typeof element.content.customPath === 'string' ? element.content.customPath : undefined
          }
        />
      );
      continue;
    }
    if (element.type === 'zoom') {
      const destination = element.zoom?.target_screen_id
        ? `Screen ${element.zoom.target_screen_id}`
        : element.zoom?.target_section_id ? `Section ${element.zoom.target_section_id}` : 'Choose destination';
      objectOverlays[element.id] = (
        <div className="grid h-full w-full place-items-center overflow-hidden rounded-xl border-2 border-white/70 bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 p-4 text-center text-white shadow-xl">
          <span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">{element.content.zoom_summary_group ? 'Summary Zoom' : element.zoom?.kind === 'section' ? 'Section Zoom' : 'Screen Zoom'}</span><span className="mt-2 block text-lg font-black">{String(element.content.text || 'Linked teaching content')}</span><span className="mt-2 block text-xs text-blue-100">{destination} · {element.zoom?.return_to_zoom === false ? 'continue' : 'return here'}</span></span>
        </div>
      );
      continue;
    }
    const text = elementText(element.content);
    if (
      [
        'title',
        'text',
        'question',
        'response',
        'steps',
        'workspace',
        'footer',
        'options',
        'data',
      ].includes(element.type)
    ) {
      objectOverlays[element.id] = (
        <StudioCanvasTextElement
          key={element.id}
          elementId={element.id}
          text={text}
          richTextHtml={typeof element.content.richTextHtml === 'string' ? element.content.richTextHtml : undefined}
          color={typeof element.content.color === 'string' ? element.content.color : undefined}
          fontSize={Number(element.content.fontSize) || undefined}
          fontFamily={
            typeof element.content.fontFamily === 'string' ? element.content.fontFamily : undefined
          }
          bold={element.content.bold === true}
          italic={element.content.italic === true}
          underline={element.content.underline === true}
          alignment={
            element.content.alignment === 'center' ||
            element.content.alignment === 'right' ||
            element.content.alignment === 'justify'
              ? element.content.alignment
              : 'left'
          }
          list={element.content.list === true}
          editable={!previewMode && Boolean(onChangeElementContent)}
          selected={selectedElementId === element.id}
          startEditing={editingElementId === element.id}
          onSelect={onSelectElement ? () => onSelectElement(element.id) : undefined}
          onTextChange={(value, richText) => onChangeElementContent?.(element.id, { text: value, richTextHtml: richText })}
          onCaretChange={(offset) => onTextCaretChange?.(element.id, offset)}
          onInlineShapeEdit={(shape, start, end) => onEditInlineShape?.(element.id, shape, start, end)}
          onRequestHeight={(requiredRatio) => {
            if (!onChangeElementBounds) return;
            const currentBounds =
              elementBounds(element.position) ??
              renderLayout?.slots.find(
                (slot) => slot.id === (element.slotId || `free-${element.id}`),
              )?.bounds;
            if (!currentBounds) return;
            const nextHeight = Math.max(60, Math.min(1080 - currentBounds.y, Math.ceil(currentBounds.height * requiredRatio)));
            if (Math.abs(nextHeight - currentBounds.height) < 2) return;
            onChangeElementBounds(element.id, { ...currentBounds, height: nextHeight });
          }}
          onEditingChange={(editing) =>
            setEditingElementId(
              editing ? element.id : (current) => (current === element.id ? null : current),
            )
          }
        />
      );
      continue;
    }
    const droppedUrl = typeof element.content.url === 'string' ? element.content.url : '';
    const mimeType = typeof element.content.mimeType === 'string' ? element.content.mimeType : '';
    if (droppedUrl && element.content.source === 'drag-drop') {
      const name = String(element.content.text || 'Dropped file');
      if (element.type === 'visual' || mimeType.startsWith('image/')) {
        objectOverlays[element.id] = (
          <div className="group relative h-full w-full bg-slate-100" onClick={() => onSelectElement?.(element.id)}>
            <img src={droppedUrl} alt={String(element.content.altText || name)} className="h-full w-full object-contain" />
            <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-semibold text-white"><ImageIcon size={11}/>{name}</span>
          </div>
        );
      } else if (mimeType.startsWith('video/')) {
        objectOverlays[element.id] = <div className="relative h-full w-full bg-black" onClick={() => onSelectElement?.(element.id)}><video src={droppedUrl} controls className="h-full w-full object-contain"/><span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white"><Video size={11}/>{name}</span></div>;
      } else if (mimeType.startsWith('audio/')) {
        objectOverlays[element.id] = <div className="grid h-full w-full place-items-center bg-gradient-to-br from-purple-950 to-blue-900 p-5 text-white" onClick={() => onSelectElement?.(element.id)}><div className="w-full text-center"><Music size={42} className="mx-auto text-purple-200"/><p className="mt-3 truncate text-sm font-bold">{name}</p><audio src={droppedUrl} controls className="mt-4 w-full"/></div></div>;
      } else if (mimeType === 'application/pdf') {
        objectOverlays[element.id] = <div className="relative h-full w-full bg-slate-200" onClick={() => onSelectElement?.(element.id)}><iframe src={droppedUrl} title={name} className="h-full w-full border-0"/><span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-700 px-2 py-1 text-[10px] font-semibold text-white"><FileText size={11}/>PDF · {name}</span></div>;
      } else {
        objectOverlays[element.id] = <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-50 to-blue-50 p-6 text-center" onClick={() => onSelectElement?.(element.id)}><div><FileText size={48} className="mx-auto text-blue-800"/><p className="mt-3 break-all text-sm font-bold text-slate-900">{name}</p><p className="mt-1 text-xs text-slate-500">{mimeType || 'Document'}</p><a href={droppedUrl} download={name} onClick={(event) => event.stopPropagation()} className="mt-4 inline-flex rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white">Download and open</a></div></div>;
      }
      continue;
    }
    if (!element.resource) continue;
    objectOverlays[element.id] = (
      <BoundResource
        key={`${element.resource.resource_id}-${element.resource.resource_version_id}`}
        element={element}
        onSelect={onSelectElement ? () => onSelectElement(element.id) : undefined}
        onImageAspectRatio={previewMode ? undefined : (aspectRatio) => {
          if (!onChangeElementBounds || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return;
          const currentBounds = elementBounds(element.position);
          if (!currentBounds) return;
          const maximumHeight = 1080 - currentBounds.y;
          let width = currentBounds.width;
          let height = width / aspectRatio;
          if (height > maximumHeight) {
            height = maximumHeight;
            width = height * aspectRatio;
          }
          const nextBounds = { ...currentBounds, width: Math.max(80, Math.round(width)), height: Math.max(60, Math.round(height)) };
          if (Math.abs(nextBounds.width - currentBounds.width) < 2 && Math.abs(nextBounds.height - currentBounds.height) < 2) return;
          onChangeElementBounds(element.id, nextBounds);
        }}
      />
    );
  }
  for (const element of screen?.elements ?? []) {
    const overlay = objectOverlays[element.id];
    if (!overlay || !element.content.hyperlink) continue;
    objectOverlays[element.id] = (
      <StudioHyperlinkOverlay hyperlink={element.content.hyperlink} active={previewMode}>
        {overlay}
      </StudioHyperlinkOverlay>
    );
  }
  for (const element of screen?.elements ?? []) {
    const overlay = objectOverlays[element.id];
    const animation =
      element.content.animation && typeof element.content.animation === 'object'
        ? (element.content.animation as Record<string, unknown>)
        : undefined;
    const effects = Array.isArray(animation?.effects) ? animation.effects : [];
    const hasAnimation =
      Boolean(animation) && (effects.length > 0 || String(animation?.effect || 'none') !== 'none');
    if (!overlay || !hasAnimation) continue;
    if (previewMode) {
      const playbackState = presenterElementPlaybackState(
        animationTimeline,
        element.id,
        previewStep,
        previewCycle,
        previewNavigation,
      );
      const activeStyle = playbackState.activeEffects.length
        ? studioAnimationStyle({ effects: playbackState.activeEffects })
        : null;
      objectAnimationStyles[element.id] = activeStyle
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
      objectAnimationKeys[element.id] = `${screen?.id ?? 'screen'}-${playbackState.identity}`;
    } else if (animationPreview?.elementId === element.id) {
      objectAnimationStyles[element.id] = studioAnimationStyle(animation);
      objectAnimationKeys[element.id] = animationPreview.token;
    } else {
      objectAnimationStyles[element.id] = {};
    }
  }
  const selectedElement =
    screen?.elements.find((element) => element.id === selectedElementId) ?? null;

  const moveToolbar = (clientX: number, clientY: number) => {
    const bounds = toolbarBoundsRef.current?.getBoundingClientRect();
    const toolbar = toolbarRef.current?.getBoundingClientRect();
    const drag = toolbarDragRef.current;
    if (!bounds || !toolbar || !drag) return;
    const maximumX = Math.max(0, bounds.width - toolbar.width);
    const maximumY = Math.max(0, bounds.height - toolbar.height);
    setToolbarPosition({
      x: Math.min(maximumX, Math.max(0, clientX - bounds.left - drag.offsetX)),
      y: Math.min(maximumY, Math.max(0, clientY - bounds.top - drag.offsetY)),
    });
  };

  return (
    <section
      aria-label={previewMode ? 'Flattened screen preview' : 'Studio canvas'}
      className={`relative flex h-full min-h-0 min-w-0 flex-col ${previewMode ? 'bg-white' : 'studio-editor-canvas-stage overflow-hidden rounded-2xl border border-slate-300 bg-slate-200 shadow-sm'}`}
    >
      <div
        ref={toolbarBoundsRef}
        className="relative min-h-0 flex-1"
        onClick={(event) => {
          if (!previewMode) return;
          const target = event.target as HTMLElement;
          if (target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;
          if (previewStep < animationTimeline.maxStep)
            setPreviewStep((current) => current + 1);
          else onPreviewNext?.();
          setLastClickerAction('next');
        }}
      >
        {!previewMode ? (
          <>
            {screen && selectedElement && onChangeElementContent && onOpenTool ? (
              <div
                ref={toolbarRef}
                className={`absolute z-40 max-w-[calc(100%-1rem)] rounded-xl border border-white/70 bg-white/82 shadow-lg backdrop-blur-md ${toolbarPosition ? '' : 'left-1/2 top-16 -translate-x-1/2'}`}
                style={toolbarPosition ? { left: toolbarPosition.x, top: toolbarPosition.y } : undefined}
              >
                <StudioElementToolbar
                  element={selectedElement}
                  onChange={(changes) => onChangeElementContent(selectedElement.id, changes)}
                  onOpenMath={() => onOpenTool('math')}
                  onOpenShapes={() => onOpenTool('shapes')}
                  onOpenAnimations={() => onOpenTool('animations')}
                  onDuplicate={onDuplicateElement ? () => onDuplicateElement(selectedElement.id) : undefined}
                  onRemove={onRemoveElement ? () => onRemoveElement(selectedElement.id) : undefined}
                  onDragPointerDown={(event) => {
                    const bounds = toolbarBoundsRef.current?.getBoundingClientRect();
                    const toolbar = toolbarRef.current?.getBoundingClientRect();
                    if (!bounds || !toolbar) return;
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    toolbarDragRef.current = {
                      pointerId: event.pointerId,
                      offsetX: event.clientX - toolbar.left,
                      offsetY: event.clientY - toolbar.top,
                    };
                    setToolbarPosition({ x: toolbar.left - bounds.left, y: toolbar.top - bounds.top });
                  }}
                  onDragPointerMove={(event) => {
                    if (toolbarDragRef.current?.pointerId === event.pointerId) moveToolbar(event.clientX, event.clientY);
                  }}
                  onDragPointerEnd={(event) => {
                    if (toolbarDragRef.current?.pointerId !== event.pointerId) return;
                    moveToolbar(event.clientX, event.clientY);
                    toolbarDragRef.current = null;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                />
              </div>
            ) : null}
          </>
        ) : null}
        {previewMode && animationTimeline.maxStep > 0 ? (
          <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white">
            Clicker ready · Animation {previewStep}/{animationTimeline.maxStep}
            {lastClickerAction
              ? ` · ${lastClickerAction === 'next' ? 'Next' : 'Previous'} received`
              : ''}
          </div>
        ) : null}
        {screen && slide && renderLayout && !loading ? (
          <div
            className={previewMode ? 'h-full' : 'studio-editor-slide-frame absolute inset-3'}
            onWheel={(event) => {
              if (previewMode || (!event.ctrlKey && !event.metaKey)) return;
              event.preventDefault();
              setCanvasZoom((current) => Math.min(2.5, Math.max(0.4, current + (event.deltaY < 0 ? 0.1 : -0.1))));
            }}
            onPointerDown={(event) => {
              if (previewMode || event.pointerType !== 'touch') return;
              zoomPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              if (zoomPointersRef.current.size === 2) {
                const [first, second] = Array.from(zoomPointersRef.current.values());
                pinchDistanceRef.current = Math.hypot(first.x - second.x, first.y - second.y);
              }
            }}
            onPointerMove={(event) => {
              if (previewMode || event.pointerType !== 'touch' || !zoomPointersRef.current.has(event.pointerId)) return;
              zoomPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              if (zoomPointersRef.current.size !== 2 || !pinchDistanceRef.current) return;
              const [first, second] = Array.from(zoomPointersRef.current.values());
              const distance = Math.hypot(first.x - second.x, first.y - second.y);
              const ratio = distance / pinchDistanceRef.current;
              if (Math.abs(ratio - 1) < 0.03) return;
              event.preventDefault();
              setCanvasZoom((current) => Math.min(2.5, Math.max(0.4, current * ratio)));
              pinchDistanceRef.current = distance;
            }}
            onPointerUp={(event) => {
              zoomPointersRef.current.delete(event.pointerId);
              if (zoomPointersRef.current.size < 2) pinchDistanceRef.current = null;
            }}
            onPointerCancel={(event) => {
              zoomPointersRef.current.delete(event.pointerId);
              if (zoomPointersRef.current.size < 2) pinchDistanceRef.current = null;
            }}
            onDragOver={(event) => {
              if (!previewMode && event.dataTransfer.types.includes('Files')) event.preventDefault();
            }}
            onDrop={(event) => {
              if (previewMode || !onDropFiles) return;
              const files = Array.from(event.dataTransfer.files);
              if (!files.length) return;
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              onDropFiles(files, {
                x: Math.round(((event.clientX - rect.left) / rect.width) * 1920),
                y: Math.round(((event.clientY - rect.top) / rect.height) * 1080),
              });
            }}
          >
          <SlideCanvas
            layout={renderLayout}
            slide={slide}
            showGuides={displayLayoutGuides}
            selectedObjectId={selectedElementId}
            selectedSlotId={selectedSlotId}
            onSelectObject={onSelectElement}
            onSelectSlot={onSelectSlot}
            onClearSelection={onClearElementSelection}
            onChangeObjectBounds={onChangeElementBounds}
            objectOverlays={objectOverlays}
            objectAnimationStyles={objectAnimationStyles}
            objectAnimationKeys={objectAnimationKeys}
            transition={
              screen.screen_settings_json?.transition &&
              typeof screen.screen_settings_json.transition === 'object'
                ? screen.screen_settings_json.transition
                : undefined
            }
            drawingStrokes={authoredStrokes}
            drawingEnabled={drawingEnabled}
            drawingTool={drawingTool}
            drawingColor={drawingColor}
            drawingWidth={drawingWidth}
            drawingOpacity={drawingOpacity}
            onDrawingChange={onDrawingChange}
            zoom={previewMode ? 1 : canvasZoom}
            backgroundColor={typeof screen.screen_settings_json?.backgroundColor === 'string' ? screen.screen_settings_json.backgroundColor : '#f9fcff'}
            onCanvasDoubleClick={!previewMode && (onActivateSlotAt || onCreateTextAt) ? (point) => {
              const createdId = onActivateSlotAt?.(point) ?? onCreateTextAt?.(point);
              if (createdId) setEditingElementId(createdId);
            } : undefined}
          />
          </div>
        ) : (
          <div className="flex h-full min-h-0 items-center justify-center rounded-xl bg-slate-200 p-3">
            <div
              className="relative h-full min-h-0 w-full max-w-5xl overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl"
              style={{ backgroundColor: typeof screen?.screen_settings_json?.backgroundColor === 'string' ? screen.screen_settings_json.backgroundColor : '#f9fcff' }}
              data-testid="studio-canvas"
            >
              <p
                className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-slate-500"
                role={loading ? 'status' : undefined}
              >
                {loading
                  ? 'Loading Screen...'
                  : !screen
                    ? 'No Screen is selected.'
                    : screen.elements.length === 0
                      ? 'Empty canvas'
                      : 'Apply a layout to position this Screen’s content.'}
              </p>
            </div>
          </div>
        )}
      </div>
      {!previewMode ? (
        <footer className="studio-editor-status-bar flex h-8 shrink-0 items-center justify-between border-t border-slate-300 bg-white/95 px-2 text-[11px] text-slate-600" aria-label="Editor status and zoom controls">
          <span className="min-w-0 truncate px-1">{screen ? screenTitle || screen.title : 'No Screen selected'}</span>
          <div className="flex shrink-0 items-center gap-1" aria-label="Canvas zoom">
            <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => setCanvasZoom((value) => Math.max(0.4, Number((value - 0.1).toFixed(1))))} className="grid h-6 w-6 place-items-center rounded hover:bg-blue-50"><Minus size={13} /></button>
            <input type="range" min="40" max="250" step="10" value={Math.round(canvasZoom * 100)} onChange={(event) => setCanvasZoom(Number(event.target.value) / 100)} className="h-1 w-24 accent-blue-900 sm:w-32" aria-label="Canvas zoom percentage" />
            <button type="button" title="Reset canvas zoom" onClick={() => setCanvasZoom(1)} className="min-w-11 rounded px-1 py-1 text-[11px] font-semibold hover:bg-blue-50">{Math.round(canvasZoom * 100)}%</button>
            <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => setCanvasZoom((value) => Math.min(2.5, Number((value + 0.1).toFixed(1))))} className="grid h-6 w-6 place-items-center rounded hover:bg-blue-50"><Plus size={13} /></button>
            <button type="button" title="Fit slide" aria-label="Fit slide" onClick={() => setCanvasZoom(1)} className="grid h-6 w-6 place-items-center rounded hover:bg-blue-50"><Scan size={13} /></button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}
