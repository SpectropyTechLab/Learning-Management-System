import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
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
import StudioAnimatedElement from './StudioAnimatedElement';
import {
  buildPresenterAnimationTimeline,
  clickerNavigationAction,
  presenterElementState,
} from './studioClickerRuntime';

interface BlankScreenCanvasProps {
  screen: StudioScreen | null;
  loading: boolean;
  layout?: Layout | null;
  selectedElementId?: string | null;
  onSelectElement?: (elementId: string) => void;
  onClearElementSelection?: () => void;
  onChangeElementBounds?: (elementId: string, bounds: Rect) => void;
  onChangeElementContent?: (elementId: string, changes: Record<string, unknown>) => void;
  onTextCaretChange?: (elementId: string, offset: number) => void;
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
}

const elementText = (content: Record<string, unknown>) => {
  const preferred = content.text ?? content.value ?? content.title;
  if (typeof preferred === 'string') return preferred;
  const firstText = Object.values(content).find((value) => typeof value === 'string');
  return typeof firstText === 'string' ? firstText : '';
};

function BoundResource({ element, onSelect }: { element: StudioElement; onSelect?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resource, setResource] = useState<StudioResourceDetails | null>(null);
  const [version, setVersion] = useState<StudioResourceVersion | null>(null);
  const [error, setError] = useState('');
  const [fullScreen, setFullScreen] = useState(false);
  const resourceId = element.resource?.resource_id;
  const versionId = element.resource?.resource_version_id;

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
        className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-slate-950/70 text-white opacity-0 backdrop-blur transition-opacity hover:bg-slate-950/90 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
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
  loading,
  layout = null,
  selectedElementId,
  onSelectElement,
  onClearElementSelection,
  onChangeElementBounds,
  onChangeElementContent,
  onTextCaretChange,
  onOpenTool,
  onDuplicateElement,
  onRemoveElement,
  showGuides = true,
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
}: BlankScreenCanvasProps) {
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [previewStep, setPreviewStep] = useState(0);
  const [previewCycle, setPreviewCycle] = useState(0);
  const [lastClickerAction, setLastClickerAction] = useState<'next' | 'previous' | null>(null);
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
    setLastClickerAction(null);
  }, [animationTimeline.maxStep, previewMode, previewStartAtEnd, screen?.id]);
  useEffect(() => {
    if (!previewMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = clickerNavigationAction(event);
      if (action === 'next') {
        event.preventDefault();
        if (previewStep < animationTimeline.maxStep) setPreviewStep((current) => current + 1);
        else onPreviewNext?.();
        setLastClickerAction('next');
      } else if (action === 'previous') {
        event.preventDefault();
        if (previewStep > 0) {
          setPreviewStep((current) => current - 1);
          setPreviewCycle((current) => current + 1);
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
  for (const element of screen?.elements ?? []) {
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
          <span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">{element.zoom?.kind === 'section' ? 'Section Zoom' : 'Screen Zoom'}</span><span className="mt-2 block text-lg font-black">{String(element.content.text || 'Linked teaching content')}</span><span className="mt-2 block text-xs text-blue-100">{destination} · {element.zoom?.return_to_zoom === false ? 'continue' : 'return here'}</span></span>
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
          text={text}
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
          onSelect={onSelectElement ? () => onSelectElement(element.id) : undefined}
          onTextChange={(value) => onChangeElementContent?.(element.id, { text: value })}
          onCaretChange={(offset) => onTextCaretChange?.(element.id, offset)}
          onEditingChange={(editing) =>
            setEditingElementId(
              editing ? element.id : (current) => (current === element.id ? null : current),
            )
          }
        />
      );
      continue;
    }
    if (!element.resource) continue;
    objectOverlays[element.id] = (
      <BoundResource
        key={`${element.resource.resource_id}-${element.resource.resource_version_id}`}
        element={element}
        onSelect={onSelectElement ? () => onSelectElement(element.id) : undefined}
      />
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
      const state = presenterElementState(animationTimeline, element.id, previewStep);
      objectOverlays[element.id] = (
        <StudioAnimatedElement
          presenterEffects={state.activeEffects}
          presenterVisible={state.visible}
          playbackKey={`${screen?.id ?? 'screen'}-${previewCycle}-${previewStep}-${element.id}`}
        >
          {overlay}
        </StudioAnimatedElement>
      );
    } else if (animationPreview?.elementId === element.id) {
      objectOverlays[element.id] = (
        <StudioAnimatedElement animation={animation} playbackKey={animationPreview.token}>
          {overlay}
        </StudioAnimatedElement>
      );
    } else {
      objectOverlays[element.id] = (
        <StudioAnimatedElement presenterEffects={[]} presenterVisible>
          {overlay}
        </StudioAnimatedElement>
      );
    }
  }
  const selectedElement =
    screen?.elements.find((element) => element.id === selectedElementId) ?? null;

  return (
    <section
      aria-label={previewMode ? 'Flattened screen preview' : 'Studio canvas'}
      className={`flex h-full min-h-0 min-w-0 flex-col bg-white ${previewMode ? '' : 'rounded-2xl border border-slate-200 p-2 shadow-sm'}`}
    >
      {!previewMode && (
        <div className="mb-2 flex min-w-0 items-center gap-2">
          <h2 className="min-w-0 truncate text-lg font-semibold text-slate-900">
            {screen
              ? `${screen.title || 'Untitled Screen'} · Screen ${screen.screen_number}`
              : loading
                ? 'Loading Screen...'
                : 'Blank canvas · Select or create a Screen to begin.'}
          </h2>
          {screen && selectedElement && onChangeElementContent && onOpenTool ? (
            <StudioElementToolbar
              element={selectedElement}
              onChange={(changes) => onChangeElementContent(selectedElement.id, changes)}
              onOpenMath={() => onOpenTool('math')}
              onOpenShapes={() => onOpenTool('shapes')}
              onOpenAnimations={() => onOpenTool('animations')}
              onDuplicate={onDuplicateElement ? () => onDuplicateElement(selectedElement.id) : undefined}
              onRemove={onRemoveElement ? () => onRemoveElement(selectedElement.id) : undefined}
            />
          ) : null}
          {screen ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {screen.creation_mode === 'blank' ? 'Blank Screen' : 'Layout Screen'}
            </span>
          ) : null}
        </div>
      )}

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
        {previewMode && animationTimeline.maxStep > 0 ? (
          <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white">
            Clicker ready · Animation {previewStep}/{animationTimeline.maxStep}
            {lastClickerAction
              ? ` · ${lastClickerAction === 'next' ? 'Next' : 'Previous'} received`
              : ''}
          </div>
        ) : null}
        {slide && renderLayout && !loading ? (
          <SlideCanvas
            layout={renderLayout}
            slide={slide}
            showGuides={showGuides}
            selectedObjectId={selectedElementId}
            onSelectObject={onSelectElement}
            onClearSelection={onClearElementSelection}
            onChangeObjectBounds={onChangeElementBounds}
            objectOverlays={objectOverlays}
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
          />
        ) : (
          <div className="flex h-full min-h-0 items-center justify-center rounded-xl bg-slate-200 p-3">
            <div
              className="relative h-full min-h-0 w-full max-w-5xl overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl"
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
    </section>
  );
}
