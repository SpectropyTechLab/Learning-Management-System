import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Crop, FileText, Image as ImageIcon, Maximize2, Minimize2, Minus, Music, Plus, Scan, Video } from 'lucide-react';
import { getStudioResource } from '../api/studioResourcesApi';
import type { StudioResourceDetails, StudioResourceVersion } from '../api/studioResourcesApi';
import type { Layout, ObjectType, Rect, Slide, Slot } from '../layouts';
import SlideCanvas from '../SlideCanvas';
import type { AuthorDrawingStroke, StudioDrawingTool, StudioElement, StudioScreen } from '../types';
import StudioResourcePlayer from './resources/StudioResourcePlayer';
import { model3DSettingsFrom, type Model3DSettings } from './resources/model3DSettings';
import StudioMathElement from './StudioMathElement';
import MathLiveEquationEditor from './MathLiveEquationEditor';
import StudioCanvasTextElement from './StudioCanvasTextElement';
import StudioElementToolbar from './StudioElementToolbar';
import StudioShapeElement from './StudioShapeElement';
import StudioTableElement from './StudioTableElement';
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
  contextBreadcrumb?: string;
  loading: boolean;
  layout?: Layout | null;
  selectedElementId?: string | null;
  selectedElementIds?: string[];
  selectedSlotId?: string | null;
  onSelectElement?: (elementId: string, additive?: boolean) => void;
  onSelectSlot?: (slotId: string) => void;
  onClearElementSelection?: () => void;
  onChangeElement?: (element: StudioElement) => void;
  onChangeElementBounds?: (elementId: string, bounds: Rect) => void;
  onChangeElementRotation?: (elementId: string, rotation: number) => void;
  onChangeElementContent?: (elementId: string, changes: Record<string, unknown>) => void;
  onTextCaretChange?: (elementId: string, offset: number) => void;
  onEditInlineShape?: (elementId: string, shape: InlineShapeData, start: number, end: number) => void;
  onEditInlineEquation?: (elementId: string, latex: string, start: number, end: number) => void;
  onOpenTool?: (tool: 'math' | 'shapes' | 'animations') => void;
  onDuplicateElement?: (elementId: string) => void;
  onRemoveElement?: (elementId: string) => void;
  showGuides?: boolean;
  previewMode?: boolean;
  animationPreview?: { elementId: string; token: number } | null;
  cropRequest?: { elementId: string; token: number } | null;
  model3DModeRequest?: { elementId: string; token: number } | null;
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
  onCanvasPointChange?: (point: { x: number; y: number }) => void;
}

const elementText = (content: Record<string, unknown>) => {
  const preferred = content.text ?? content.value ?? content.title;
  if (typeof preferred === 'string') return preferred;
  const firstText = Object.values(content).find((value) => typeof value === 'string');
  return typeof firstText === 'string' ? firstText : '';
};

function BoundResource({ element, selected = false, cropRequestToken, model3DModeRequestToken, onSelect, onModel3DSettingsChange, onMediaTransformChange }: { element: StudioElement; selected?: boolean; cropRequestToken?: number; model3DModeRequestToken?: number; onSelect?: () => void; onModel3DSettingsChange?: (settings: Model3DSettings) => void; onMediaTransformChange?: (transform: { fit: 'contain' | 'cover'; scale: number; x: number; y: number }) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resource, setResource] = useState<StudioResourceDetails | null>(null);
  const [version, setVersion] = useState<StudioResourceVersion | null>(null);
  const [error, setError] = useState('');
  const [fullScreen, setFullScreen] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [cropDraft, setCropDraft] = useState<{ fit: 'contain' | 'cover'; scale: number; x: number; y: number } | null>(null);
  const handledCropRequestRef = useRef<number | undefined>(undefined);
  const cropPointerRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const resourceId = element.resource?.resource_id;
  const versionId = element.resource?.resource_version_id;
  const storedMediaTransform = element.content.mediaTransform && typeof element.content.mediaTransform === 'object'
    ? element.content.mediaTransform as { fit?: 'contain' | 'cover'; scale?: number; x?: number; y?: number }
    : {};
  const mediaTransform = {
    fit: storedMediaTransform.fit === 'cover' ? 'cover' as const : 'contain' as const,
    scale: Math.max(1, Number(storedMediaTransform.scale) || 1),
    x: Number(storedMediaTransform.x) || 0,
    y: Number(storedMediaTransform.y) || 0,
  };
  const effectiveMediaTransform = cropping && cropDraft ? cropDraft : mediaTransform;

  useEffect(() => {
    if (!cropRequestToken || handledCropRequestRef.current === cropRequestToken || !selected || !onMediaTransformChange) return;
    handledCropRequestRef.current = cropRequestToken;
    setCropDraft({
      fit: 'cover',
      scale: Math.max(1, Number(storedMediaTransform.scale) || 1),
      x: Number(storedMediaTransform.x) || 0,
      y: Number(storedMediaTransform.y) || 0,
    });
    setCropping(true);
  }, [cropRequestToken, onMediaTransformChange, selected, storedMediaTransform.scale, storedMediaTransform.x, storedMediaTransform.y]);

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
    <div ref={containerRef} className={`group relative h-full w-full ${resource.resource_type === 'image' || resource.resource_type === 'model_3d' ? 'bg-transparent' : 'bg-black'}`} onClick={onSelect}>
      <StudioResourcePlayer
        resourceType={resource.resource_type}
        version={version}
        mode="canvas"
        selected={selected}
        mediaTransform={effectiveMediaTransform}
        model3DSettings={resource.resource_type === 'model_3d' ? model3DSettingsFrom(element.content) : undefined}
        model3DModeRequestToken={resource.resource_type === 'model_3d' ? model3DModeRequestToken : undefined}
        onModel3DSettingsChange={resource.resource_type === 'model_3d' ? onModel3DSettingsChange : undefined}
        className="h-full w-full"
      />
      {selected && onMediaTransformChange && ['image', 'animation', 'video'].includes(resource.resource_type) ? (
        <>
          <button
            type="button"
            data-canvas-interactive="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (cropping) {
                if (cropDraft) onMediaTransformChange(cropDraft);
                setCropping(false);
                setCropDraft(null);
              } else {
                setCropDraft({ ...mediaTransform, fit: 'cover' });
                setCropping(true);
              }
            }}
            className={`absolute left-2 top-2 z-20 inline-flex h-9 items-center gap-1 rounded-lg border px-2 text-xs font-bold shadow ${cropping ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white/95 text-blue-900'}`}
            title={cropping ? 'Finish direct crop' : 'Crop inside this container'}
          >
            {cropping ? <Check size={15} /> : <Crop size={15} />}{cropping ? 'Done' : 'Crop'}
          </button>
          {cropping ? (
            <div
              data-canvas-interactive="true"
              className="absolute inset-0 z-10 cursor-grab touch-none border-2 border-blue-500 bg-blue-500/5 active:cursor-grabbing"
              title="Drag to reposition. Use Ctrl + mouse wheel to zoom the media inside its container."
              onPointerDown={(event) => {
                event.preventDefault(); event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                cropPointerRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: effectiveMediaTransform.x, originY: effectiveMediaTransform.y };
              }}
              onPointerMove={(event) => {
                const drag = cropPointerRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                const rect = event.currentTarget.getBoundingClientRect();
                setCropDraft({ ...effectiveMediaTransform, fit: 'cover', x: Math.max(-100, Math.min(100, drag.originX + ((event.clientX - drag.x) / Math.max(1, rect.width)) * 200)), y: Math.max(-100, Math.min(100, drag.originY + ((event.clientY - drag.y) / Math.max(1, rect.height)) * 200)) });
              }}
              onPointerUp={() => { cropPointerRef.current = null; }}
              onPointerCancel={() => { cropPointerRef.current = null; }}
              onWheel={(event) => {
                if (!event.ctrlKey && !event.metaKey) return;
                event.preventDefault(); event.stopPropagation();
                setCropDraft({ ...effectiveMediaTransform, fit: 'cover', scale: Math.max(1, Math.min(3, effectiveMediaTransform.scale + (event.deltaY < 0 ? 0.1 : -0.1))) });
              }}
            />
          ) : null}
        </>
      ) : null}
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
  contextBreadcrumb,
  loading,
  layout = null,
  selectedElementId,
  selectedElementIds = [],
  selectedSlotId,
  onSelectElement,
  onSelectSlot,
  onClearElementSelection,
  onChangeElement,
  onChangeElementBounds,
  onChangeElementRotation,
  onChangeElementContent,
  onTextCaretChange,
  onEditInlineShape,
  onEditInlineEquation,
  onOpenTool,
  onDuplicateElement,
  onRemoveElement,
  showGuides = false,
  previewMode = false,
  animationPreview = null,
  cropRequest = null,
  model3DModeRequest = null,
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
  onCanvasPointChange,
  onActivateSlotAt,
  onDropFiles,
}: BlankScreenCanvasProps) {
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [textSelectionFontSize, setTextSelectionFontSize] = useState<{
    elementId: string;
    value: number | 'mixed' | null;
  } | null>(null);
  const [textSelectionSpacing, setTextSelectionSpacing] = useState<{
    elementId: string;
    value: {
      lineHeight: number | 'mixed';
      paragraphSpacingBefore: number | 'mixed';
      paragraphSpacingAfter: number | 'mixed';
    };
  } | null>(null);
  const [previewStep, setPreviewStep] = useState(0);
  const [previewCycle, setPreviewCycle] = useState(0);
  const [previewNavigation, setPreviewNavigation] =
    useState<PresenterAnimationNavigation | null>(null);
  const [lastClickerAction, setLastClickerAction] = useState<'next' | 'previous' | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null);
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
    setTextSelectionFontSize(null);
    setTextSelectionSpacing(null);
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
  useEffect(() => {
    setToolbarHost(document.getElementById('studio-contextual-toolbar-host'));
  }, []);
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
          slots: screen.elements.filter((element) => element.position.hidden !== true).map((element, index) => {
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
                  element.position.hidden !== true &&
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
          objects: screen.elements.filter((element) => element.position.hidden !== true).map((element) => ({
            id: element.id,
            slotId: element.slotId || `free-${element.id}`,
            type: element.type as Slide['objects'][number]['type'],
            text: elementText(element.content),
            position: elementBounds(element.position),
            color: typeof element.content.color === 'string' ? element.content.color : undefined,
            backgroundColor: element.type !== 'shape' && typeof element.content.backgroundColor === 'string'
              ? element.content.backgroundColor
              : undefined,
            borderColor: element.type !== 'shape' && typeof element.content.borderColor === 'string'
              ? element.content.borderColor
              : undefined,
            borderWidth: element.type !== 'shape' && Number.isFinite(Number(element.content.borderWidth))
              ? Number(element.content.borderWidth)
              : undefined,
            locked: element.position.locked === true,
            rotation: Number(element.position.rotation) || 0,
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
    if (element.position.hidden === true) continue;
    if (isSmartDiagramContent(element.content)) {
      const diagramContent = element.content;
      const visibleNodeIds = previewMode
        ? presenterDiagramVisibleNodes(
            animationTimeline,
            element.id,
            previewStep,
            diagramContent.nodes.map((node) => node.id),
          )
        : undefined;
      objectOverlays[element.id] = (
        <StudioSmartDiagram
          content={diagramContent}
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
              nodes: diagramContent.nodes.map((node) =>
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
        !previewMode && selectedElementId === element.id && onChangeElementContent ? (
          <div className="flex h-full w-full items-center" style={{ color: typeof element.content.color === 'string' ? element.content.color : '#0f2747', fontSize: Number(element.content.fontSize) || 42 }}>
            <MathLiveEquationEditor
              value={String(element.content.latex ?? element.content.text ?? '')}
              onChange={(latex) => onChangeElementContent(element.id, { latex, text: latex })}
              ariaLabel="Edit equation on canvas"
              elementId={element.id}
              canvas
            />
          </div>
        ) : (
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
        )
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
          effect={typeof element.content.shapeEffect === 'string' ? element.content.shapeEffect : undefined}
        />
      );
      continue;
    }
    if (element.type === 'table' || element.content.visualType === 'table') {
      objectOverlays[element.id] = (
        <StudioTableElement
          elementId={element.id}
          content={element.content}
          editable={!previewMode && Boolean(onChangeElementContent)}
          onChange={(changes) => onChangeElementContent?.(element.id, changes)}
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
          backgroundColor={typeof element.content.backgroundColor === 'string' ? element.content.backgroundColor : undefined}
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
          lineHeight={Number(element.content.lineHeight) || undefined}
          paragraphSpacingBefore={Number(element.content.paragraphSpacingBefore) || undefined}
          paragraphSpacingAfter={Number(element.content.paragraphSpacingAfter) || undefined}
          editable={!previewMode && Boolean(onChangeElementContent)}
          selected={selectedElementId === element.id}
          startEditing={editingElementId === element.id}
          onSelect={onSelectElement ? () => onSelectElement(element.id) : undefined}
          onCommit={onChangeElement ? ({ text: value, richTextHtml: richText, formatting, requiredHeight }) => {
            const currentBounds =
              elementBounds(element.position) ??
              renderLayout?.slots.find(
                (slot) => slot.id === (element.slotId || `free-${element.id}`),
              )?.bounds;
            if (!currentBounds) return;
            const nextContent: Record<string, unknown> = { ...element.content, text: value, ...formatting };
            if (richText !== undefined) nextContent.richTextHtml = richText;
            const nextHeight = Math.max(60, Math.ceil(requiredHeight));
            const contentChanged = Object.entries(nextContent).some(
              ([key, nextValue]) => element.content[key] !== nextValue,
            );
            if (!contentChanged && Math.abs(nextHeight - currentBounds.height) < 2) return;
            onChangeElement({
              ...element,
              content: nextContent,
              position: { ...element.position, ...currentBounds, height: nextHeight },
            });
          } : undefined}
          onCaretChange={(offset) => onTextCaretChange?.(element.id, offset)}
          onSelectionFontSizeChange={(value) => setTextSelectionFontSize((current) =>
            current?.elementId === element.id && current.value === value
              ? current
              : { elementId: element.id, value }
          )}
          onSelectionSpacingChange={(value) => setTextSelectionSpacing((current) =>
            current?.elementId === element.id &&
            current.value.lineHeight === value.lineHeight &&
            current.value.paragraphSpacingBefore === value.paragraphSpacingBefore &&
            current.value.paragraphSpacingAfter === value.paragraphSpacingAfter
              ? current
              : { elementId: element.id, value }
          )}
          onInlineShapeEdit={(shape, start, end) => onEditInlineShape?.(element.id, shape, start, end)}
          onInlineEquationEdit={(latex, start, end) => onEditInlineEquation?.(element.id, latex, start, end)}
          onEditingChange={(editing) => {
            setEditingElementId(
              editing ? element.id : (current) => (current === element.id ? null : current),
            );
            if (!editing) setTextSelectionFontSize((current) => current?.elementId === element.id ? null : current);
            if (!editing) setTextSelectionSpacing((current) => current?.elementId === element.id ? null : current);
          }}
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
        selected={selectedElementId === element.id}
        cropRequestToken={cropRequest?.elementId === element.id ? cropRequest.token : undefined}
        model3DModeRequestToken={model3DModeRequest?.elementId === element.id ? model3DModeRequest.token : undefined}
        onSelect={onSelectElement ? () => onSelectElement(element.id) : undefined}
        onModel3DSettingsChange={onChangeElementContent ? (settings) => onChangeElementContent(element.id, { model3d: settings }) : undefined}
        onMediaTransformChange={onChangeElementContent ? (mediaTransform) => onChangeElementContent(element.id, { mediaTransform }) : undefined}
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

  return (
    <section
      aria-label={previewMode ? 'Flattened screen preview' : 'Studio canvas'}
      className={`relative flex h-full min-h-0 min-w-0 flex-col ${previewMode ? 'bg-white' : 'studio-editor-canvas-stage overflow-hidden rounded-2xl border border-slate-300 bg-slate-200 shadow-sm'}`}
    >
      <div
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
        {!previewMode && toolbarHost && screen && selectedElement && onChangeElementContent && onOpenTool
          ? createPortal(
              <StudioElementToolbar
                  element={selectedElement}
                  selectionFontSize={textSelectionFontSize?.elementId === selectedElement.id ? textSelectionFontSize.value : null}
                  selectionSpacing={textSelectionSpacing?.elementId === selectedElement.id ? textSelectionSpacing.value : null}
                  onChange={(changes) => onChangeElementContent(selectedElement.id, changes)}
                  onOpenMath={() => onOpenTool('math')}
                  onOpenShapes={() => onOpenTool('shapes')}
                  onOpenAnimations={() => onOpenTool('animations')}
                  onDuplicate={onDuplicateElement ? () => onDuplicateElement(selectedElement.id) : undefined}
                  onRemove={onRemoveElement ? () => onRemoveElement(selectedElement.id) : undefined}
                />,
              toolbarHost,
            )
          : null}
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
            selectedObjectIds={selectedElementIds}
            selectedSlotId={selectedSlotId}
            onSelectObject={onSelectElement}
            onSelectSlot={onSelectSlot}
            onClearSelection={onClearElementSelection}
            onChangeObjectBounds={onChangeElementBounds}
            onChangeObjectRotation={onChangeElementRotation}
            objectOverlays={objectOverlays}
            objectAnimationStyles={objectAnimationStyles}
            objectAnimationKeys={objectAnimationKeys}
            allowCanvasOverflow={!previewMode}
            showTextEditorOutlines={!previewMode}
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
            onRemoveObject={onRemoveElement}
            zoom={previewMode ? 1 : canvasZoom}
            backgroundColor={typeof screen.screen_settings_json?.backgroundColor === 'string' ? screen.screen_settings_json.backgroundColor : '#f9fcff'}
            onCanvasDoubleClick={!previewMode && (onActivateSlotAt || onCreateTextAt) ? (point) => {
              const createdId = onActivateSlotAt?.(point) ?? onCreateTextAt?.(point);
              if (createdId) setEditingElementId(createdId);
            } : undefined}
            onCanvasClick={!previewMode ? onCanvasPointChange : undefined}
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
          <span className="min-w-0 truncate px-1" title={contextBreadcrumb || screenTitle || screen?.title}>
            {screen ? contextBreadcrumb || screenTitle || screen.title : 'No Screen selected'}
          </span>
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
