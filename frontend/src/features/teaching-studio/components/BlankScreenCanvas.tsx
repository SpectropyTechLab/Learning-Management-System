import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Crop, FileText, Maximize2, Minimize2, Minus, Music, Plus, Scan, Video } from 'lucide-react';
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
import StudioChartElement from './StudioChartElement';
import StudioLocalSimulationFrame from './StudioLocalSimulationFrame';
import StudioLocalPhysicsLabFrame from './StudioLocalPhysicsLabFrame';
import StudioLocalChemistryLabFrame from './StudioLocalChemistryLabFrame';
import StudioLocalMathematicsLabFrame from './StudioLocalMathematicsLabFrame';
import StudioLocalBiologyLabFrame from './StudioLocalBiologyLabFrame';
import StudioSmartDiagram from './StudioSmartDiagram';
import StudioDiagramTextPane from './StudioDiagramTextPane';
import StudioHyperlinkOverlay from './studioHyperlink';
import { isSmartDiagramContent, type SmartDiagramContent } from './smartDiagramModel';
import { studioAnimationStyle } from './studioAnimationRuntime';
import { playStudioAnimationSound } from './studioAnimationAudio';
import type { StudioAnimationEffectDefinition } from './studioAnimationModel';
import type { InlineShapeData } from './studioInlineShape';
import {
  buildPresenterAnimationTimeline,
  clickerNavigationAction,
  presenterDiagramVisibleNodes,
  presenterComponentBuildState,
  presenterElementPlaybackState,
  presenterTriggerCueIds,
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
  selectedDiagramNodeId?: string | null;
  diagramLivePreview?: Partial<SmartDiagramContent> | null;
  diagramTextPaneOpen?: boolean;
  onCloseDiagramTextPane?: () => void;
  selectedSlotId?: string | null;
  onSelectElement?: (elementId: string, additive?: boolean) => void;
  onSelectElements?: (elementIds: string[], additive?: boolean) => void;
  onSelectDiagramNode?: (elementId: string, nodeId: string) => void;
  onSelectSlot?: (slotId: string) => void;
  onClearElementSelection?: () => void;
  onChangeElement?: (element: StudioElement) => void;
  onCommitElementChange?: (element: StudioElement) => void;
  onChangeElementBounds?: (elementId: string, bounds: Rect) => void;
  onChangeElementRotation?: (elementId: string, rotation: number) => void;
  onChangeElementContent?: (elementId: string, changes: Record<string, unknown>) => void;
  onTextCaretChange?: (elementId: string, offset: number) => void;
  onEditInlineShape?: (elementId: string, shape: InlineShapeData, start: number, end: number) => void;
  onEditInlineEquation?: (elementId: string, latex: string, start: number, end: number) => void;
  onRemoveElement?: (elementId: string) => void;
  showGuides?: boolean;
  previewMode?: boolean;
  animationPreview?: { elementId?: string; token: number; mode?: 'element' | 'sequence'; fromEffectId?: string } | null;
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

const emptySlide: Slide = {
  title: '',
  creationMode: 'layout',
  objects: [],
};

const elementText = (content: Record<string, unknown>) => {
  const preferred = content.text ?? content.value ?? content.title;
  if (typeof preferred === 'string') return preferred;
  const firstText = Object.values(content).find((value) => typeof value === 'string');
  return typeof firstText === 'string' ? firstText : '';
};

type MediaTransform = { fit: 'contain' | 'cover'; scale: number; x: number; y: number; cropped: boolean; edgeCrop: boolean; cropGeometry: boolean; cropLeft: number; cropRight: number; cropTop: number; cropBottom: number; cropScaleX: number; cropScaleY: number; cropOffsetX: number; cropOffsetY: number };

function BoundResource({ element, bounds, selected = false, cropRequestToken, model3DModeRequestToken, onSelect, onCroppingChange, onCommitCrop, onModel3DSettingsChange, onMediaTransformChange, onReady }: { element: StudioElement; bounds?: Rect; selected?: boolean; cropRequestToken?: number; model3DModeRequestToken?: number; onSelect?: (additive?: boolean) => void; onCroppingChange?: (cropping: boolean) => void; onCommitCrop?: (bounds: Rect, transform: MediaTransform) => void; onModel3DSettingsChange?: (settings: Model3DSettings) => void; onMediaTransformChange?: (transform: MediaTransform) => void; onReady?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resource, setResource] = useState<StudioResourceDetails | null>(null);
  const [version, setVersion] = useState<StudioResourceVersion | null>(null);
  const [error, setError] = useState('');
  const [fullScreen, setFullScreen] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [cropDraft, setCropDraft] = useState<MediaTransform | null>(null);
  const handledCropRequestRef = useRef<number | undefined>(undefined);
  const cropPointerRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const cropEdgeRef = useRef<{ pointerId: number; edge: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; x: number; y: number; left: number; right: number; top: number; bottom: number } | null>(null);
  const resourceId = element.resource?.resource_id;
  const versionId = element.resource?.resource_version_id;
  const storedMediaTransform = element.content.mediaTransform && typeof element.content.mediaTransform === 'object'
    ? element.content.mediaTransform as Partial<MediaTransform>
    : {};
  const mediaTransform = {
    fit: storedMediaTransform.fit === 'cover' ? 'cover' as const : 'contain' as const,
    scale: Math.max(1, Number(storedMediaTransform.scale) || 1),
    x: Number(storedMediaTransform.x) || 0,
    y: Number(storedMediaTransform.y) || 0,
    cropped: storedMediaTransform.cropped === true,
    edgeCrop: storedMediaTransform.edgeCrop === true,
    cropGeometry: storedMediaTransform.cropGeometry === true,
    cropLeft: Math.max(0, Number(storedMediaTransform.cropLeft) || 0),
    cropRight: Math.max(0, Number(storedMediaTransform.cropRight) || 0),
    cropTop: Math.max(0, Number(storedMediaTransform.cropTop) || 0),
    cropBottom: Math.max(0, Number(storedMediaTransform.cropBottom) || 0),
    cropScaleX: Math.max(1, Number(storedMediaTransform.cropScaleX) || 1),
    cropScaleY: Math.max(1, Number(storedMediaTransform.cropScaleY) || 1),
    cropOffsetX: Number(storedMediaTransform.cropOffsetX) || 0,
    cropOffsetY: Number(storedMediaTransform.cropOffsetY) || 0,
  };
  const effectiveMediaTransform = cropping && cropDraft ? cropDraft : mediaTransform;

  useEffect(() => {
    if (!cropRequestToken || handledCropRequestRef.current === cropRequestToken || !selected || !onMediaTransformChange) return;
    handledCropRequestRef.current = cropRequestToken;
    const continuingEdgeCrop = storedMediaTransform.edgeCrop === true;
    const continuingCropGeometry = continuingEdgeCrop || storedMediaTransform.cropGeometry === true;
    setCropDraft({
      fit: 'contain',
      scale: continuingCropGeometry ? Math.max(0.25, Number(storedMediaTransform.scale) || 1) : 1,
      x: continuingCropGeometry ? Number(storedMediaTransform.x) || 0 : 0,
      y: continuingCropGeometry ? Number(storedMediaTransform.y) || 0 : 0,
      cropped: true,
      edgeCrop: true,
      cropGeometry: storedMediaTransform.cropGeometry === true,
      cropLeft: continuingEdgeCrop ? Math.max(0, Number(storedMediaTransform.cropLeft) || 0) : 0,
      cropRight: continuingEdgeCrop ? Math.max(0, Number(storedMediaTransform.cropRight) || 0) : 0,
      cropTop: continuingEdgeCrop ? Math.max(0, Number(storedMediaTransform.cropTop) || 0) : 0,
      cropBottom: continuingEdgeCrop ? Math.max(0, Number(storedMediaTransform.cropBottom) || 0) : 0,
      cropScaleX: Math.max(1, Number(storedMediaTransform.cropScaleX) || 1),
      cropScaleY: Math.max(1, Number(storedMediaTransform.cropScaleY) || 1),
      cropOffsetX: Number(storedMediaTransform.cropOffsetX) || 0,
      cropOffsetY: Number(storedMediaTransform.cropOffsetY) || 0,
    });
    setCropping(true);
    onCroppingChange?.(true);
  }, [cropRequestToken, onCroppingChange, onMediaTransformChange, selected, storedMediaTransform.scale, storedMediaTransform.x, storedMediaTransform.y]);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !cropping) return;
    const handleCropWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();
      setCropDraft((current) => current ? {
        ...current,
        scale: Math.max(0.25, Math.min(4, current.scale + (event.deltaY < 0 ? 0.1 : -0.1))),
      } : current);
    };
    container.addEventListener('wheel', handleCropWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleCropWheel);
  }, [cropping]);

  const isExecutableResource = resource
    ? ['html', 'zip', 'scorm', 'simulation'].includes(resource.resource_type)
    : false;

  useEffect(() => {
    if (!selected || !isExecutableResource || fullScreen) return;
    containerRef.current?.focus({ preventScroll: true });
  }, [fullScreen, isExecutableResource, selected]);

  const toggleFullScreen = async () => {
    const container = containerRef.current;
    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
      return;
    }
    if (container?.requestFullscreen) await container.requestFullscreen();
  };

  const beginCropEdge = (event: ReactPointerEvent<HTMLButtonElement>, edge: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropEdgeRef.current = {
      pointerId: event.pointerId,
      edge,
      x: event.clientX,
      y: event.clientY,
      left: effectiveMediaTransform.cropLeft,
      right: effectiveMediaTransform.cropRight,
      top: effectiveMediaTransform.cropTop,
      bottom: effectiveMediaTransform.cropBottom,
    };
  };

  const moveCropEdge = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = cropEdgeRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !rect) return;
    const deltaX = ((event.clientX - drag.x) / Math.max(1, rect.width)) * 100;
    const deltaY = ((event.clientY - drag.y) / Math.max(1, rect.height)) * 100;
    const next = { ...effectiveMediaTransform, fit: 'contain' as const, cropped: true, edgeCrop: true };
    const minimumWidthPercent = bounds ? Math.min(100, (80 / bounds.width) * 100) : 5;
    const minimumHeightPercent = bounds ? Math.min(100, (60 / bounds.height) * 100) : 5;
    const movesLeft = drag.edge === 'left' || drag.edge.endsWith('-left');
    const movesRight = drag.edge === 'right' || drag.edge.endsWith('-right');
    const movesTop = drag.edge === 'top' || drag.edge.startsWith('top-');
    const movesBottom = drag.edge === 'bottom' || drag.edge.startsWith('bottom-');
    const minimumLeft = effectiveMediaTransform.cropGeometry ? effectiveMediaTransform.cropOffsetX * 100 : 0;
    const minimumRight = effectiveMediaTransform.cropGeometry ? (1 - effectiveMediaTransform.cropOffsetX - effectiveMediaTransform.cropScaleX) * 100 : 0;
    const minimumTop = effectiveMediaTransform.cropGeometry ? effectiveMediaTransform.cropOffsetY * 100 : 0;
    const minimumBottom = effectiveMediaTransform.cropGeometry ? (1 - effectiveMediaTransform.cropOffsetY - effectiveMediaTransform.cropScaleY) * 100 : 0;
    if (movesLeft) next.cropLeft = Math.max(minimumLeft, Math.min(100 - minimumWidthPercent - drag.right, drag.left + deltaX));
    if (movesRight) next.cropRight = Math.max(minimumRight, Math.min(100 - minimumWidthPercent - drag.left, drag.right - deltaX));
    if (movesTop) next.cropTop = Math.max(minimumTop, Math.min(100 - minimumHeightPercent - drag.bottom, drag.top + deltaY));
    if (movesBottom) next.cropBottom = Math.max(minimumBottom, Math.min(100 - minimumHeightPercent - drag.top, drag.bottom - deltaY));
    if (event.shiftKey) {
      const startWidth = 100 - drag.left - drag.right;
      const startHeight = 100 - drag.top - drag.bottom;
      const width = 100 - next.cropLeft - next.cropRight;
      const height = 100 - next.cropTop - next.cropBottom;
      const scale = Math.abs(width / startWidth - 1) >= Math.abs(height / startHeight - 1)
        ? width / startWidth
        : height / startHeight;
      const targetWidth = Math.max(minimumWidthPercent, startWidth * scale);
      const targetHeight = Math.max(minimumHeightPercent, startHeight * scale);
      if (movesLeft) next.cropLeft = Math.max(minimumLeft, 100 - drag.right - targetWidth);
      else if (movesRight) next.cropRight = Math.max(minimumRight, 100 - drag.left - targetWidth);
      else {
        const horizontalChange = (startWidth - targetWidth) / 2;
        next.cropLeft = Math.max(minimumLeft, drag.left + horizontalChange);
        next.cropRight = Math.max(minimumRight, drag.right + horizontalChange);
      }
      if (movesTop) next.cropTop = Math.max(minimumTop, 100 - drag.bottom - targetHeight);
      else if (movesBottom) next.cropBottom = Math.max(minimumBottom, 100 - drag.top - targetHeight);
      else {
        const verticalChange = (startHeight - targetHeight) / 2;
        next.cropTop = Math.max(minimumTop, drag.top + verticalChange);
        next.cropBottom = Math.max(minimumBottom, drag.bottom + verticalChange);
      }
    }
    setCropDraft(next);
  };

  const finishCrop = () => {
    if (!cropDraft) return;
    const left = cropDraft.cropLeft / 100;
    const right = cropDraft.cropRight / 100;
    const top = cropDraft.cropTop / 100;
    const bottom = cropDraft.cropBottom / 100;
    const remainingX = Math.max(0.01, 1 - left - right);
    const remainingY = Math.max(0.01, 1 - top - bottom);
    const nextBounds = bounds ? {
        x: Math.round(bounds.x + bounds.width * left),
        y: Math.round(bounds.y + bounds.height * top),
        width: Math.round(bounds.width * remainingX),
        height: Math.round(bounds.height * remainingY),
      } : null;
    const nextTransform: MediaTransform = {
      ...cropDraft,
      edgeCrop: false,
      cropGeometry: true,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
      cropScaleX: cropDraft.cropScaleX / remainingX,
      cropScaleY: cropDraft.cropScaleY / remainingY,
      cropOffsetX: (cropDraft.cropOffsetX - left) / remainingX,
      cropOffsetY: (cropDraft.cropOffsetY - top) / remainingY,
    };
    if (nextBounds && onCommitCrop) onCommitCrop(nextBounds, nextTransform);
    else onMediaTransformChange?.(nextTransform);
  };

  useEffect(() => {
    if (selected || !cropping) return;
    finishCrop();
    setCropping(false);
    setCropDraft(null);
    onCroppingChange?.(false);
  }, [cropping, selected]);

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

  return (
    <div ref={containerRef} tabIndex={-1} className={`group relative h-full w-full ${resource.resource_type === 'image' || resource.resource_type === 'model_3d' ? 'bg-transparent' : 'bg-black'}`} onClick={(event) => { event.stopPropagation(); onSelect?.(event.ctrlKey || event.metaKey || event.shiftKey); if (isExecutableResource && !fullScreen) containerRef.current?.focus({ preventScroll: true }); }}>
      {element.type === 'simulation' && element.content.labProject && typeof element.content.labProject === 'object' ? (
        (element.content.labProject as { subject?: unknown }).subject === 'chemistry' ? <StudioLocalChemistryLabFrame
          project={element.content.labProject}
          title={String(element.content.labTitle || element.content.text || resource.name)}
          className={`h-full w-full ${!fullScreen ? 'pointer-events-none' : ''}`}
        /> : (element.content.labProject as { subject?: unknown }).subject === 'mathematics' ? <StudioLocalMathematicsLabFrame
          project={element.content.labProject}
          title={String(element.content.labTitle || element.content.text || resource.name)}
          className={`h-full w-full ${!fullScreen ? 'pointer-events-none' : ''}`}
        /> : (element.content.labProject as { subject?: unknown }).subject === 'biology' ? <StudioLocalBiologyLabFrame
          project={element.content.labProject}
          title={String(element.content.labTitle || element.content.text || resource.name)}
          className={`h-full w-full ${!fullScreen ? 'pointer-events-none' : ''}`}
        /> : <StudioLocalPhysicsLabFrame
          project={element.content.labProject}
          title={String(element.content.labTitle || element.content.text || resource.name)}
          className={`h-full w-full ${!fullScreen ? 'pointer-events-none' : ''}`}
        />
      ) : element.type === 'simulation' && element.content.simulationProject && typeof element.content.simulationProject === 'object' ? (
        <StudioLocalSimulationFrame
          project={element.content.simulationProject}
          title={String(element.content.simulationTitle || element.content.text || resource.name)}
          onReady={onReady}
          className={`h-full w-full ${!fullScreen ? 'pointer-events-none' : ''}`}
        />
      ) : (
        <StudioResourcePlayer
          resourceType={resource.resource_type}
          version={version}
          mode="canvas"
          selected={selected}
          mediaTransform={effectiveMediaTransform}
          model3DSettings={resource.resource_type === 'model_3d' ? model3DSettingsFrom(element.content) : undefined}
          model3DModeRequestToken={resource.resource_type === 'model_3d' ? model3DModeRequestToken : undefined}
          onModel3DSettingsChange={resource.resource_type === 'model_3d' ? onModel3DSettingsChange : undefined}
          onReady={onReady}
          className={`h-full w-full ${isExecutableResource && !fullScreen ? 'pointer-events-none' : ''}`}
        />
      )}
      {selected && onMediaTransformChange && ['image', 'animation', 'video'].includes(resource.resource_type) ? (
        <>
          <button
            type="button"
            data-canvas-interactive="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (cropping) {
                finishCrop();
                setCropping(false);
                setCropDraft(null);
                onCroppingChange?.(false);
              } else {
                setCropDraft(mediaTransform.edgeCrop || mediaTransform.cropGeometry
                  ? { ...mediaTransform, fit: 'contain', cropped: true, edgeCrop: true }
                  : { fit: 'contain', scale: 1, x: 0, y: 0, cropped: true, edgeCrop: true, cropGeometry: false, cropLeft: 0, cropRight: 0, cropTop: 0, cropBottom: 0, cropScaleX: 1, cropScaleY: 1, cropOffsetX: 0, cropOffsetY: 0 });
                setCropping(true);
                onCroppingChange?.(true);
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
              data-image-crop-active="true"
              className="absolute z-10 cursor-grab touch-none border-2 border-blue-500 bg-blue-500/5 active:cursor-grabbing"
              style={{ left: `${effectiveMediaTransform.cropLeft}%`, right: `${effectiveMediaTransform.cropRight}%`, top: `${effectiveMediaTransform.cropTop}%`, bottom: `${effectiveMediaTransform.cropBottom}%` }}
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
                setCropDraft({ ...effectiveMediaTransform, fit: 'contain', cropped: true, edgeCrop: true, x: Math.max(-100, Math.min(100, drag.originX + ((event.clientX - drag.x) / Math.max(1, rect.width)) * 200)), y: Math.max(-100, Math.min(100, drag.originY + ((event.clientY - drag.y) / Math.max(1, rect.height)) * 200)) });
              }}
              onPointerUp={() => { cropPointerRef.current = null; }}
              onPointerCancel={() => { cropPointerRef.current = null; }}
            >
              {([
                ['left', 'left-0 top-1/2 h-8 w-8 -translate-y-1/2 cursor-ew-resize after:left-0 after:top-1/2 after:-translate-y-1/2'],
                ['right', 'right-0 top-1/2 h-8 w-8 -translate-y-1/2 cursor-ew-resize after:right-0 after:top-1/2 after:-translate-y-1/2'],
                ['top', 'left-1/2 top-0 h-8 w-8 -translate-x-1/2 cursor-ns-resize after:left-1/2 after:top-0 after:-translate-x-1/2'],
                ['bottom', 'bottom-0 left-1/2 h-8 w-8 -translate-x-1/2 cursor-ns-resize after:bottom-0 after:left-1/2 after:-translate-x-1/2'],
                ['top-left', 'left-0 top-0 h-8 w-8 cursor-nwse-resize after:left-0 after:top-0'],
                ['top-right', 'right-0 top-0 h-8 w-8 cursor-nesw-resize after:right-0 after:top-0'],
                ['bottom-left', 'bottom-0 left-0 h-8 w-8 cursor-nesw-resize after:bottom-0 after:left-0'],
                ['bottom-right', 'bottom-0 right-0 h-8 w-8 cursor-nwse-resize after:bottom-0 after:right-0'],
              ] as const).map(([edge, position]) => (
                <button
                  key={edge}
                  type="button"
                  aria-label={`Crop ${edge} edge`}
                  title={`Crop ${edge} edge`}
                  onPointerDown={(event) => beginCropEdge(event, edge)}
                  onPointerMove={moveCropEdge}
                  onPointerUp={() => { cropEdgeRef.current = null; }}
                  onPointerCancel={() => { cropEdgeRef.current = null; }}
                  className={`absolute z-20 touch-none bg-transparent after:absolute after:h-3 after:w-3 after:rounded-sm after:bg-blue-700 after:ring-2 after:ring-white ${position}`}
                />
              ))}
              <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1 rounded-md bg-white/95 p-1 text-blue-900 shadow">
                <button type="button" aria-label="Zoom image out" title="Zoom image out" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setCropDraft({ ...effectiveMediaTransform, scale: Math.max(0.25, effectiveMediaTransform.scale - 0.1) }); }} className="grid h-7 w-7 place-items-center rounded hover:bg-blue-50"><Minus size={14}/></button>
                <span className="min-w-10 text-center text-[10px] font-bold">{Math.round(effectiveMediaTransform.scale * 100)}%</span>
                <button type="button" aria-label="Zoom image in" title="Zoom image in" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setCropDraft({ ...effectiveMediaTransform, scale: Math.min(4, effectiveMediaTransform.scale + 0.1) }); }} className="grid h-7 w-7 place-items-center rounded hover:bg-blue-50"><Plus size={14}/></button>
              </div>
            </div>
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
  selectedDiagramNodeId = null,
  diagramLivePreview = null,
  diagramTextPaneOpen = false,
  onCloseDiagramTextPane,
  selectedSlotId,
  onSelectElement,
  onSelectElements,
  onSelectDiagramNode,
  onSelectSlot,
  onClearElementSelection,
  onChangeElement,
  onCommitElementChange,
  onChangeElementBounds,
  onChangeElementRotation,
  onChangeElementContent,
  onTextCaretChange,
  onEditInlineShape,
  onEditInlineEquation,
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
  const [editorPreviewStep, setEditorPreviewStep] = useState<number | null>(null);
  const [editorPreviewCycle, setEditorPreviewCycle] = useState(0);
  const editorPreviewStoppedRef = useRef(false);
  const [previewNavigation, setPreviewNavigation] =
    useState<PresenterAnimationNavigation | null>(null);
  const [triggeredAnimationCueIds, setTriggeredAnimationCueIds] = useState<Set<string>>(() => new Set());
  const [lastClickerAction, setLastClickerAction] = useState<'next' | 'previous' | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null);
  const [croppingElementId, setCroppingElementId] = useState<string | null>(null);
  const [readyMediaKeys, setReadyMediaKeys] = useState<Set<string>>(() => new Set());
  const slideFrameRef = useRef<HTMLDivElement>(null);
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
  const mediaKeyFor = (element: StudioElement) => {
    if (element.resource) return `${element.id}:resource:${element.resource.resource_version_id}`;
    const url = typeof element.content.url === 'string' ? element.content.url : '';
    const mimeType = typeof element.content.mimeType === 'string' ? element.content.mimeType : '';
    return url && (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/') || mimeType === 'application/pdf')
      ? `${element.id}:inline:${url}`
      : null;
  };
  const elementMediaReady = (element: StudioElement) => {
    const key = mediaKeyFor(element);
    return !key || readyMediaKeys.has(key);
  };
  const markElementMediaReadyAfterPaint = (element: StudioElement) => {
    const key = mediaKeyFor(element);
    if (!key) return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      setReadyMediaKeys((current) => current.has(key) ? current : new Set(current).add(key));
    }));
  };
  const previewMediaReady = (screen?.elements ?? [])
    .filter((element) => {
      if (animationPreview?.mode === 'sequence') {
        const animation = element.content.animation;
        return Boolean(animation && typeof animation === 'object');
      }
      return element.id === animationPreview?.elementId;
    })
    .every(elementMediaReady);
  useEffect(() => {
    if (previewMode || animationPreview?.mode !== 'sequence' || animationTimeline.maxStep < 1 || !previewMediaReady) {
      setEditorPreviewStep(null);
      return;
    }
    let cancelled = false;
    editorPreviewStoppedRef.current = false;
    let timer = 0;
    const requestedCue = animationPreview.fromEffectId
      ? animationTimeline.cues.find((cue) => cue.cueId === animationPreview.fromEffectId && cue.step >= 0)
      : undefined;
    const firstStep = Math.max(1, requestedCue?.step ?? 1);
    setEditorPreviewStep(Math.max(0, firstStep - 1));
    setEditorPreviewCycle((value) => value + 1);
    const playStep = (step: number) => {
      if (cancelled || editorPreviewStoppedRef.current || step > animationTimeline.maxStep) {
        setEditorPreviewStep(null);
        return;
      }
      setEditorPreviewStep(step);
      setEditorPreviewCycle((value) => value + 1);
      const cues = animationTimeline.cues.filter((cue) => cue.step === step);
      cues.forEach((cue) => void playStudioAnimationSound(cue.effect as StudioAnimationEffectDefinition).catch(() => undefined));
      const durationMs = Math.max(250, ...cues.map((cue) => {
        const repeat = Number(cue.effect.repeat);
        const repeats = Number.isFinite(repeat) && repeat > 0 ? Math.min(10, repeat) : 1;
        const autoReverseMultiplier = cue.effect.autoReverse === true ? 2 : 1;
        return ((Number(cue.effect.runtimeDelay) || 0) + (Number(cue.effect.duration) || 0.8) * repeats * autoReverseMultiplier) * 1000;
      }));
      timer = window.setTimeout(() => playStep(step + 1), Math.min(15000, durationMs + 180));
    };
    timer = window.setTimeout(() => playStep(firstStep), 120);
    return () => {
      cancelled = true;
      editorPreviewStoppedRef.current = true;
      window.clearTimeout(timer);
    };
  }, [animationPreview, animationTimeline, previewMediaReady, previewMode]);
  useEffect(() => {
    setEditingElementId(null);
    setCroppingElementId(null);
    setTextSelectionFontSize(null);
    setTextSelectionSpacing(null);
  }, [screen?.id]);
  useEffect(() => {
    setPreviewStep(previewStartAtEnd ? animationTimeline.maxStep : 0);
    setPreviewCycle((current) => current + 1);
    setPreviewNavigation(null);
    setTriggeredAnimationCueIds(new Set());
    setLastClickerAction(null);
  }, [animationTimeline.maxStep, previewMode, previewStartAtEnd, screen?.id]);
  useEffect(() => {
    if (!previewMode) return;
    const active = animationTimeline.cues.filter((cue) => cue.step === previewStep && cue.step >= 0);
    active.forEach((cue) => void playStudioAnimationSound(cue.effect as StudioAnimationEffectDefinition).catch(() => undefined));
  }, [animationTimeline, previewCycle, previewMode, previewStep]);
  useEffect(() => {
    if (previewMode || !animationPreview) return;
    const element = screen?.elements.find((candidate) => candidate.id === animationPreview.elementId);
    const animation = element?.content.animation;
    if (!animation || typeof animation !== 'object' || Array.isArray(animation)) return;
    const saved = animation as Record<string, unknown>;
    const effect = Array.isArray(saved.effects) ? saved.effects[0] : saved;
    if (effect && typeof effect === 'object') void playStudioAnimationSound(effect as StudioAnimationEffectDefinition).catch(() => undefined);
  }, [animationPreview, previewMode, screen?.elements]);
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
    if (previewMode) return;
    const startTextEditing = (event: Event) => {
      const elementId = String((event as CustomEvent<{ elementId?: string }>).detail?.elementId || '');
      const element = screen?.elements.find((candidate) => candidate.id === elementId);
      if (!element || !['shape', 'text', 'title', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(element.type)) return;
      onSelectElement?.(elementId);
      setEditingElementId(elementId);
    };
    window.addEventListener('studio-edit-element-text', startTextEditing);
    return () => window.removeEventListener('studio-edit-element-text', startTextEditing);
  }, [onSelectElement, previewMode, screen?.elements]);
  useEffect(() => {
    const syncToolbarHost = () => {
      const nextHost = document.getElementById('studio-contextual-toolbar-host');
      setToolbarHost((current) => current === nextHost ? current : nextHost);
    };
    syncToolbarHost();
    const observer = new MutationObserver(syncToolbarHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const frame = slideFrameRef.current;
    if (!frame || previewMode) return;
    const handleWheel = (event: WheelEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || (event.target as Element | null)?.closest('[data-image-crop-active="true"]')) return;
      event.preventDefault();
      const viewport = frame.querySelector<HTMLElement>('[data-testid="slide-viewport"]');
      const surface = frame.querySelector<HTMLElement>('[data-testid="slide-surface"]');
      if (!viewport || !surface) return;
      const surfaceRect = surface.getBoundingClientRect();
      const anchorX = (event.clientX - surfaceRect.left) / Math.max(1, surfaceRect.width);
      const anchorY = (event.clientY - surfaceRect.top) / Math.max(1, surfaceRect.height);
      setCanvasZoom((current) => {
        const next = Math.min(2.5, Math.max(0.4, current + (event.deltaY < 0 ? 0.1 : -0.1)));
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const nextRect = surface.getBoundingClientRect();
          viewport.scrollLeft += nextRect.left + anchorX * nextRect.width - event.clientX;
          viewport.scrollTop += nextRect.top + anchorY * nextRect.height - event.clientY;
        }));
        return next;
      });
    };
    frame.addEventListener('wheel', handleWheel, { passive: false });
    return () => frame.removeEventListener('wheel', handleWheel);
  }, [loading, previewMode, screen?.id]);
  const authoredStrokes =
    drawingStrokes ?? screen?.screen_settings_json?.author_drawings?.strokes ?? [];
  const freeformLayout: Layout | null =
    !layout && screen
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
            backgroundColor: element.resource?.usage?.resource_type === 'model_3d'
              ? 'transparent'
              : element.type !== 'shape' && typeof element.content.backgroundColor === 'string'
              ? element.content.backgroundColor
              : undefined,
            borderColor: element.resource?.usage?.resource_type === 'model_3d'
              ? 'transparent'
              : element.type !== 'shape' && typeof element.content.borderColor === 'string'
              ? element.content.borderColor
              : undefined,
            borderWidth: element.resource?.usage?.resource_type === 'model_3d'
              ? 0
              : element.type !== 'shape' && Number.isFinite(Number(element.content.borderWidth))
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
    const savedAnimation = element.content.animation && typeof element.content.animation === 'object'
      ? element.content.animation as Record<string, unknown>
      : undefined;
    const savedEffects = Array.isArray(savedAnimation?.effects)
      ? savedAnimation.effects as Array<Record<string, unknown>>
      : savedAnimation && String(savedAnimation.effect || 'none') !== 'none' ? [savedAnimation] : [];
    const mediaReady = elementMediaReady(element);
    const editorSequencePreviewing = !previewMode && animationPreview?.mode === 'sequence' && editorPreviewStep !== null && mediaReady;
    const editorPlaybackState = editorSequencePreviewing
      ? presenterElementPlaybackState(animationTimeline, element.id, editorPreviewStep, editorPreviewCycle)
      : null;
    const textPlaybackEffects = previewMode
      ? presenterElementPlaybackState(animationTimeline, element.id, previewStep, previewCycle, previewNavigation, triggeredAnimationCueIds).activeEffects
      : editorPlaybackState?.activeEffects ?? (animationPreview?.elementId === element.id && mediaReady ? savedEffects : []);
    const textSequenceValue = String(textPlaybackEffects[0]?.textSequence || 'object');
    const animationTextSequence = textSequenceValue === 'paragraph' || textSequenceValue === 'word' || textSequenceValue === 'letter'
      ? textSequenceValue
      : undefined;
    const animationTextDelay = Number.isFinite(Number(textPlaybackEffects[0]?.textDelay))
      ? Math.max(0, Number(textPlaybackEffects[0]?.textDelay))
      : undefined;
    const textAnimationStyle = animationTextSequence && textPlaybackEffects.length
      ? studioAnimationStyle({ effects: textPlaybackEffects })
      : undefined;
    if (isSmartDiagramContent(element.content)) {
      const diagramContent = element.content;
      const visibleNodeIds = previewMode || editorSequencePreviewing
        ? presenterDiagramVisibleNodes(
            animationTimeline,
            element.id,
            previewMode ? previewStep : editorPreviewStep ?? 0,
            diagramContent.nodes.map((node) => node.id),
          )
        : undefined;
      objectOverlays[element.id] = (
        <StudioSmartDiagram
          content={selectedElementId === element.id && diagramLivePreview ? { ...diagramContent, ...diagramLivePreview } : diagramContent}
          editable={!previewMode && Boolean(onChangeElementContent)}
          selectedNodeId={selectedElementId === element.id ? selectedDiagramNodeId : null}
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
          onSelectNode={(nodeId) => { onSelectElement?.(element.id); onSelectDiagramNode?.(element.id, nodeId); }}
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
        <div className="relative h-full w-full overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <StudioShapeElement
              elementId={element.id}
              kind={String(element.content.kind || 'rectangle')}
              fill={typeof element.content.fill === 'string' ? element.content.fill : undefined}
              stroke={typeof element.content.stroke === 'string' ? element.content.stroke : undefined}
              strokeWidth={Number(element.content.strokeWidth) || undefined}
              opacity={Number(element.content.opacity) || undefined}
              strokeDash={typeof element.content.strokeDash === 'string' ? element.content.strokeDash : undefined}
              customPath={typeof element.content.customPath === 'string' ? element.content.customPath : undefined}
              effect={typeof element.content.shapeEffect === 'string' ? element.content.shapeEffect : undefined}
            />
          </div>
          <div className="absolute inset-[8%] overflow-hidden">
            <StudioCanvasTextElement
              elementId={element.id}
              text={typeof element.content.text === 'string' ? element.content.text : ''}
              richTextHtml={typeof element.content.richTextHtml === 'string' ? element.content.richTextHtml : undefined}
              color={typeof element.content.color === 'string' ? element.content.color : '#0f2747'}
              fontSize={Number(element.content.fontSize) || 24}
              fontFamily={typeof element.content.fontFamily === 'string' ? element.content.fontFamily : undefined}
              bold={element.content.bold === true}
              italic={element.content.italic === true}
              underline={element.content.underline === true}
              alignment={element.content.alignment === 'left' || element.content.alignment === 'right' || element.content.alignment === 'justify' ? element.content.alignment : 'center'}
              verticalAlignment={element.content.verticalAlignment === 'top' || element.content.verticalAlignment === 'bottom' ? element.content.verticalAlignment : 'middle'}
              list={element.content.list === true}
              lineHeight={Number(element.content.lineHeight) || undefined}
              paragraphSpacingBefore={Number(element.content.paragraphSpacingBefore) || undefined}
              paragraphSpacingAfter={Number(element.content.paragraphSpacingAfter) || undefined}
              animationTextSequence={animationTextSequence}
              animationTextDelay={animationTextDelay}
              animationStyle={textAnimationStyle}
              editable={!previewMode && Boolean(onChangeElementContent)}
              selected={selectedElementId === element.id}
              startEditing={editingElementId === element.id}
              onSelect={onSelectElement ? (additive) => onSelectElement(element.id, additive) : undefined}
              onCommit={onChangeElementContent ? ({ text, richTextHtml, formatting }) => onChangeElementContent(element.id, { text, ...(richTextHtml !== undefined ? { richTextHtml } : {}), ...formatting }) : undefined}
              onCaretChange={(offset) => onTextCaretChange?.(element.id, offset)}
              onSelectionFontSizeChange={(value) => setTextSelectionFontSize({ elementId: element.id, value })}
              onSelectionSpacingChange={(value) => setTextSelectionSpacing({ elementId: element.id, value })}
              onInlineShapeEdit={(shape, start, end) => onEditInlineShape?.(element.id, shape, start, end)}
              onInlineEquationEdit={(latex, start, end) => onEditInlineEquation?.(element.id, latex, start, end)}
              onEditingChange={(editing) => {
                setEditingElementId(editing ? element.id : (current) => current === element.id ? null : current);
                if (!editing) setTextSelectionFontSize((current) => current?.elementId === element.id ? null : current);
                if (!editing) setTextSelectionSpacing((current) => current?.elementId === element.id ? null : current);
              }}
            />
          </div>
        </div>
      );
      continue;
    }
    if (element.content.visualType === 'chart') {
      objectOverlays[element.id] = <StudioChartElement content={element.content} animationBuildState={previewMode ? presenterComponentBuildState(animationTimeline, element.id, previewStep, triggeredAnimationCueIds) : editorSequencePreviewing ? presenterComponentBuildState(animationTimeline, element.id, editorPreviewStep ?? 0) : null}/>;
      continue;
    }
    if (element.type === 'table' || element.content.visualType === 'table') {
      objectOverlays[element.id] = (
        <StudioTableElement
          elementId={element.id}
          content={element.content}
          editable={!previewMode && Boolean(onChangeElementContent)}
          onChange={(changes) => onChangeElementContent?.(element.id, changes)}
          animationBuildState={previewMode ? presenterComponentBuildState(animationTimeline, element.id, previewStep, triggeredAnimationCueIds) : editorSequencePreviewing ? presenterComponentBuildState(animationTimeline, element.id, editorPreviewStep ?? 0) : null}
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
      const textFrameKind = typeof element.content.kind === 'string' ? element.content.kind : '';
      objectOverlays[element.id] = (
        <div className="relative h-full w-full overflow-visible">
        {textFrameKind ? <div className="pointer-events-none absolute inset-0"><StudioShapeElement
          elementId={element.id}
          kind={textFrameKind}
          fill={typeof element.content.fill === 'string' ? element.content.fill : 'transparent'}
          stroke={typeof element.content.stroke === 'string' ? element.content.stroke : 'transparent'}
          strokeWidth={Number(element.content.strokeWidth) || undefined}
          opacity={Number(element.content.opacity) || undefined}
          strokeDash={typeof element.content.strokeDash === 'string' ? element.content.strokeDash : undefined}
          effect={typeof element.content.shapeEffect === 'string' ? element.content.shapeEffect : undefined}
        /></div> : null}
        <div className={textFrameKind ? 'absolute inset-[3%]' : 'h-full w-full'}><StudioCanvasTextElement
          key={element.id}
          elementId={element.id}
          text={text}
          richTextHtml={typeof element.content.richTextHtml === 'string' ? element.content.richTextHtml : undefined}
          color={typeof element.content.color === 'string' ? element.content.color : undefined}
          backgroundColor={textFrameKind ? 'transparent' : typeof element.content.backgroundColor === 'string' ? element.content.backgroundColor : undefined}
          borderColor={textFrameKind ? 'transparent' : typeof element.content.borderColor === 'string' ? element.content.borderColor : undefined}
          borderWidth={textFrameKind ? 0 : Number(element.content.borderWidth) || undefined}
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
          verticalAlignment={element.content.verticalAlignment === 'middle' || element.content.verticalAlignment === 'bottom' ? element.content.verticalAlignment : 'top'}
          list={element.content.list === true}
          lineHeight={Number(element.content.lineHeight) || undefined}
          paragraphSpacingBefore={Number(element.content.paragraphSpacingBefore) || undefined}
          paragraphSpacingAfter={Number(element.content.paragraphSpacingAfter) || undefined}
          animationTextSequence={animationTextSequence}
          animationTextDelay={animationTextDelay}
          animationStyle={textAnimationStyle}
          editable={!previewMode && Boolean(onChangeElementContent)}
          selected={selectedElementId === element.id}
          startEditing={editingElementId === element.id}
          onSelect={onSelectElement ? (additive) => onSelectElement(element.id, additive) : undefined}
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
        /></div></div>
      );
      continue;
    }
    const droppedUrl = typeof element.content.url === 'string' ? element.content.url : '';
    const mimeType = typeof element.content.mimeType === 'string' ? element.content.mimeType : '';
    if (droppedUrl && (element.content.source === 'drag-drop' || element.content.source === 'clipboard')) {
      const name = String(element.content.text || 'Dropped file');
      if (element.type === 'visual' || mimeType.startsWith('image/')) {
        objectOverlays[element.id] = (
          <div className="group relative h-full w-full bg-slate-100" onClick={(event) => { event.stopPropagation(); onSelectElement?.(element.id, event.ctrlKey || event.metaKey || event.shiftKey); }}>
            <img src={droppedUrl} alt={String(element.content.altText || name)} onLoad={(event) => { void event.currentTarget.decode().catch(() => undefined).finally(() => markElementMediaReadyAfterPaint(element)); }} className="h-full w-full object-fill" />
          </div>
        );
      } else if (mimeType.startsWith('video/')) {
        objectOverlays[element.id] = <div className="relative h-full w-full bg-black" onClick={(event) => { event.stopPropagation(); onSelectElement?.(element.id, event.ctrlKey || event.metaKey || event.shiftKey); }}><video src={droppedUrl} controls onLoadedData={() => markElementMediaReadyAfterPaint(element)} onCanPlay={() => markElementMediaReadyAfterPaint(element)} className="h-full w-full object-contain"/><span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white"><Video size={11}/>{name}</span></div>;
      } else if (mimeType.startsWith('audio/')) {
        objectOverlays[element.id] = <div className="grid h-full w-full place-items-center bg-gradient-to-br from-purple-950 to-blue-900 p-5 text-white" onClick={(event) => { event.stopPropagation(); onSelectElement?.(element.id, event.ctrlKey || event.metaKey || event.shiftKey); }}><div className="w-full text-center"><Music size={42} className="mx-auto text-purple-200"/><p className="mt-3 truncate text-sm font-bold">{name}</p><audio src={droppedUrl} controls onCanPlay={() => markElementMediaReadyAfterPaint(element)} className="mt-4 w-full"/></div></div>;
      } else if (mimeType === 'application/pdf') {
        objectOverlays[element.id] = <div className="relative h-full w-full bg-slate-200" onClick={(event) => { event.stopPropagation(); onSelectElement?.(element.id, event.ctrlKey || event.metaKey || event.shiftKey); }}><iframe src={droppedUrl} title={name} onLoad={() => markElementMediaReadyAfterPaint(element)} className="h-full w-full border-0"/><span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-700 px-2 py-1 text-[10px] font-semibold text-white"><FileText size={11}/>PDF · {name}</span></div>;
      } else {
        objectOverlays[element.id] = <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-50 to-blue-50 p-6 text-center" onClick={(event) => { event.stopPropagation(); onSelectElement?.(element.id, event.ctrlKey || event.metaKey || event.shiftKey); }}><div><FileText size={48} className="mx-auto text-blue-800"/><p className="mt-3 break-all text-sm font-bold text-slate-900">{name}</p><p className="mt-1 text-xs text-slate-500">{mimeType || 'Document'}</p><a href={droppedUrl} download={name} onClick={(event) => event.stopPropagation()} className="mt-4 inline-flex rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white">Download and open</a></div></div>;
      }
      continue;
    }
    if (!element.resource) continue;
    objectOverlays[element.id] = (
      <BoundResource
        key={`${element.resource.resource_id}-${element.resource.resource_version_id}`}
        element={element}
        bounds={elementBounds(element.position) ?? renderLayout?.slots.find((slot) => slot.id === (element.slotId || `free-${element.id}`))?.bounds}
        selected={!previewMode && selectedElementId === element.id}
        cropRequestToken={cropRequest?.elementId === element.id ? cropRequest.token : undefined}
        model3DModeRequestToken={model3DModeRequest?.elementId === element.id ? model3DModeRequest.token : undefined}
        onSelect={onSelectElement ? (additive) => onSelectElement(element.id, additive) : undefined}
        onCroppingChange={(cropping) => setCroppingElementId((current) => cropping ? element.id : current === element.id ? null : current)}
        onCommitCrop={onCommitElementChange || onChangeElement ? (bounds, mediaTransform) => (onCommitElementChange || onChangeElement)?.({ ...element, position: { ...element.position, ...bounds }, content: { ...element.content, mediaTransform } }) : undefined}
        onModel3DSettingsChange={onChangeElementContent ? (settings) => onChangeElementContent(element.id, { model3d: settings }) : undefined}
        onMediaTransformChange={onChangeElementContent ? (mediaTransform) => onChangeElementContent(element.id, { mediaTransform }) : undefined}
        onReady={() => markElementMediaReadyAfterPaint(element)}
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
    if (!overlay) continue;
    objectOverlays[element.id] = <div
      data-element-id={element.id}
      className="h-full w-full"
      onClickCapture={previewMode ? (event) => {
        const cueIds = presenterTriggerCueIds(animationTimeline, element.id);
        if (!cueIds.length) return;
        event.preventDefault();
        event.stopPropagation();
        setTriggeredAnimationCueIds((current) => new Set([...current, ...cueIds]));
        setPreviewCycle((current) => current + 1);
        const cue = animationTimeline.cues.find((candidate) => cueIds.includes(candidate.cueId));
        if (cue) void playStudioAnimationSound(cue.effect as StudioAnimationEffectDefinition).catch(() => undefined);
      } : undefined}
    >{overlay}</div>;
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
    if (!elementMediaReady(element)) {
      const previewPending = previewMode || animationPreview?.mode === 'sequence' || animationPreview?.elementId === element.id;
      objectAnimationStyles[element.id] = previewPending ? { opacity: 0 } : {};
      continue;
    }
    if (previewMode) {
      const playbackState = presenterElementPlaybackState(
        animationTimeline,
        element.id,
        previewStep,
        previewCycle,
        previewNavigation,
        triggeredAnimationCueIds,
      );
      const activeStyle = playbackState.activeEffects.length
        ? studioAnimationStyle({ effects: playbackState.activeEffects })
        : null;
      const sequenceRunsInsideText = playbackState.activeEffects.some((effect) => ['paragraph', 'word', 'letter'].includes(String(effect.textSequence || 'object')))
        && (element.type === 'shape' || ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(element.type));
      const sequenceRunsInsideComponent = playbackState.activeEffects.some((effect) => !['as-one-object', 'all-at-once', ''].includes(String(effect.buildSequence || '')));
      objectAnimationStyles[element.id] = sequenceRunsInsideComponent ? {} : activeStyle && !sequenceRunsInsideText
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
      objectAnimationKeys[element.id] = `${screen?.id ?? 'screen'}-${playbackState.identity}`;
    } else if (animationPreview?.mode === 'sequence' && editorPreviewStep !== null) {
      const playbackState = presenterElementPlaybackState(
        animationTimeline,
        element.id,
        editorPreviewStep,
        editorPreviewCycle,
      );
      const sequenceRunsInsideText = playbackState.activeEffects.some((effect) => ['paragraph', 'word', 'letter'].includes(String(effect.textSequence || 'object')))
        && (element.type === 'shape' || ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(element.type));
      const sequenceRunsInsideComponent = playbackState.activeEffects.some((effect) => !['as-one-object', 'all-at-once', ''].includes(String(effect.buildSequence || '')));
      objectAnimationStyles[element.id] = sequenceRunsInsideComponent || sequenceRunsInsideText
        ? {}
        : playbackState.activeEffects.length
          ? studioAnimationStyle({ effects: playbackState.activeEffects })
          : playbackState.visible
            ? playbackState.afterStyle
            : { opacity: 0 };
      objectAnimationKeys[element.id] = `editor-${screen?.id ?? 'screen'}-${editorPreviewCycle}-${element.id}-${editorPreviewStep}`;
    } else if (animationPreview?.elementId === element.id) {
      const sequenceRunsInsideText = effects.some((effect) => effect && typeof effect === 'object' && ['paragraph', 'word', 'letter'].includes(String((effect as Record<string, unknown>).textSequence || 'object')))
        && (element.type === 'shape' || ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(element.type));
      objectAnimationStyles[element.id] = sequenceRunsInsideText ? {} : studioAnimationStyle(animation);
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
        {!previewMode && toolbarHost && screen && onChangeElementContent
          ? createPortal(
              <StudioElementToolbar
                element={selectedElement}
                selectionFontSize={selectedElement && textSelectionFontSize?.elementId === selectedElement.id ? textSelectionFontSize.value : null}
                selectionSpacing={selectedElement && textSelectionSpacing?.elementId === selectedElement.id ? textSelectionSpacing.value : null}
                onChange={(changes) => { if (selectedElement) onChangeElementContent(selectedElement.id, changes); }}
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
        {!previewMode && animationPreview && !previewMediaReady ? <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white shadow-lg">Preparing media before preview…</div> : null}
        {!previewMode && editorPreviewStep !== null ? <div className="absolute right-3 top-3 z-30 flex items-center gap-2 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white shadow-lg"><span>Animation preview · Step {editorPreviewStep}/{animationTimeline.maxStep}</span><button type="button" onClick={() => { editorPreviewStoppedRef.current = true; setEditorPreviewStep(null); }} className="rounded-full bg-white/15 px-2 py-0.5 hover:bg-white/25">Stop</button></div> : null}
        {screen && slide && renderLayout && !loading ? (
          <div
            ref={slideFrameRef}
            className={previewMode ? 'h-full' : 'studio-editor-slide-frame absolute inset-3'}
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
            geometryControlsHiddenForObjectId={croppingElementId}
            overflowVisibleForObjectId={croppingElementId}
            selectedSlotId={selectedSlotId}
            onSelectObject={onSelectElement}
            onSelectObjects={onSelectElements}
            onSelectSlot={onSelectSlot}
            onClearSelection={onClearElementSelection}
            onChangeObjectBounds={onChangeElementBounds}
            onChangeObjectRotation={onChangeElementRotation}
            objectOverlays={objectOverlays}
            objectAnimationStyles={objectAnimationStyles}
            objectAnimationKeys={objectAnimationKeys}
            selectionChromeHidden={previewMode}
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
              {!previewMode && diagramTextPaneOpen && selectedElement && isSmartDiagramContent(selectedElement.content) ? <StudioDiagramTextPane content={selectedElement.content} onChange={(content) => onChangeElement?.({ ...selectedElement, content })} onClose={() => onCloseDiagramTextPane?.()} /> : null}
          </div>
        ) : (
          <div className={previewMode ? 'relative h-full' : 'studio-editor-slide-frame absolute inset-3'}>
            <SlideCanvas
              layout={null}
              slide={emptySlide}
              allowCanvasOverflow={!previewMode}
              backgroundColor={typeof screen?.screen_settings_json?.backgroundColor === 'string' ? screen.screen_settings_json.backgroundColor : '#f9fcff'}
            />
            <p
                className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-slate-500"
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
