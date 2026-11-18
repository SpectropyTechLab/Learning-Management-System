import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Brush,
  Boxes,
  Check,
  CircleAlert,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cloud,
  CloudOff,
  Download,
  Eye,
  Eraser,
  Focus,
  FileText,
  GalleryHorizontalEnd,
  Grid3X3,
  GripVertical,
  Highlighter,
  LayoutTemplate,
  Link2,
  ListOrdered,
  LoaderCircle,
  Maximize2,
  Minimize2,
  MousePointer2,
  Paintbrush,
  PenLine,
  Pencil as PencilIcon,
  Network,
  Pencil,
  Plus,
  Presentation,
  Redo2,
  RefreshCw,
  Save,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  Unlink,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createBlankStudioScreen,
  deleteStudioScreen,
  getStudioErrorDetails,
  getStudioErrorMessage,
  getStudioScreen,
  listStudioScreens,
  reorderStudioScreens,
  updateStudioScreen,
} from './api/studioScreensApi';
import BlankScreenCanvas from './components/BlankScreenCanvas';
import StudioScreenNavigator from './components/StudioScreenNavigator';
import StudioShell from './components/StudioShell';
import StudioLayoutGallery from './components/StudioLayoutGallery';
import StudioLayoutRibbon from './components/StudioLayoutRibbon';
import StudioWorkflowPanel from './components/StudioWorkflowPanel';
import StudioElementPanel from './components/StudioElementPanel';
import StudioAnimationsPanel from './components/StudioAnimationsPanel';
import StudioAnimationRibbonGallery from './components/StudioAnimationRibbonGallery';
import StudioAnimationMenu from './components/StudioAnimationMenu';
import { STUDIO_EQUATION_GROUPS } from './components/StudioMathPanel';
import StudioEquationRibbon from './components/StudioEquationRibbon';
import { dispatchStudioTextCommand } from './components/studioTextCommands';
import StudioShapesPanel, { STUDIO_SHAPE_GROUPS } from './components/StudioShapesPanel';
import StudioShapeElement from './components/StudioShapeElement';
import StudioColourMenu from './components/StudioColourMenu';
import { inlineShapeToken, type InlineShapeData } from './components/studioInlineShape';
import StudioIconButton from './components/StudioIconButton';
import StudioAdaptiveRibbon, {
  type StudioRibbonGroup,
} from './components/StudioAdaptiveRibbon';
import StudioClipboardGroup from './components/StudioClipboardGroup';
import StudioElementContextMenu from './components/StudioElementContextMenu';
import {
  applyStudioElementFormat,
  collectStudioClipboardElements,
  copyStudioElementFormat,
  pasteStudioClipboardElements,
  studioElementFormatFamily,
  studioPasteModesForElements,
  type StudioCopiedFormat,
  type StudioPasteMode,
} from './components/studioClipboardModel';
import StudioLayersPanel from './components/StudioLayersPanel';
import { moveStudioLayer } from './components/studioLayerModel';
import { buildStudioAnimationSequence } from './components/studioAnimationSequence';
import { model3DSettingsFrom, standardModel3DView, type Model3DSettings } from './components/resources/model3DSettings';
import {
  studioRibbonTabs,
  type StudioRibbonTabId,
} from './components/studioRibbonModel';
import StudioDrawingPanel from './components/StudioDrawingPanel';
import StudioTransitionRibbon from './components/StudioTransitionRibbon';
import StudioRejectionDetailsDialog from './components/StudioRejectionDetailsDialog';
import {
  ShapeAppearanceControls,
  ShapeArrangeControls,
  ShapeGalleryDropdown,
  ShapeSizeControls,
} from './components/StudioShapeFormatRibbon';
import StudioZoomPanel, { type StudioZoomMode, type ZoomInsert } from './components/StudioZoomPanel';
import StudioZoomMenu from './components/StudioZoomMenu';
import StudioSmartDiagramPanel from './components/StudioSmartDiagramPanel';
import StudioDiagramChooser from './components/StudioDiagramChooser';
import StudioDiagramThumbnail from './components/StudioDiagramThumbnail';
import StudioScreenScriptMath from './components/StudioScreenScriptMath';
import StructuredScreenScriptEditor from './components/StructuredScreenScriptEditor';
import { clickerNavigationAction } from './components/studioClickerRuntime';
import {
  SMART_DIAGRAM_THEMES,
  SMART_DIAGRAM_LAYOUTS,
  createSmartDiagramNode,
  createSmartDiagramContent,
  isSmartDiagramContent,
  layoutSmartDiagram,
  rebuildDiagramParents,
  type SmartDiagramNode,
  type SmartDiagramContent,
} from './components/smartDiagramModel';
import ResourceLibrary from './components/resources/ResourceLibrary';
import AssetCatalogPanel from './components/resources/AssetCatalogPanel';
import StudioInsertResourceButtons, {
  type InsertResourceType,
} from './components/StudioInsertResourceButtons';
import StudioResourceInsertUpload from './components/StudioResourceInsertUpload';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import { ensureTargetStudioLayouts } from './api/studioEditorApi';
import type { StudioLayoutSummary } from './api/studioEditorApi';
import { getStudioResourcePreview } from './api/studioResourcesApi';
import type { StudioResourceSummary, StudioResourceVersion } from './api/studioResourcesApi';
import {
  approveStudioSession,
  getStudioWorkflowStatus,
  publishStudioSession,
  startStudioSessionRevision,
  submitStudioSession,
  workflowError,
} from './api/studioWorkflowApi';
import type { StudioValidationProblem, StudioWorkflowStatus } from './api/studioWorkflowApi';
import type { ScreenScriptRow } from './api/studioDocumentsApi';
import type {
  AuthorDrawingStroke,
  StudioDrawingTool,
  StudioElement,
  StudioScreen,
  StudioScreenList,
} from './types';
import type { Layout, ObjectType, Slot } from './layouts';
import { targetLayouts } from './targetLayouts';
import { remapElementsToLayout } from './layoutApplication';
import {
  canPlaceResource,
  resourceTypesForObject,
  supportsResourcePlacement,
} from './resourcePlacement';
import { studioSetupApi } from './api/studioSetupApi';
import type { StudioSession } from './api/studioSetupApi';
import { studioTaxonomyApi } from './api/studioTaxonomyApi';
import type { StudioTaxonomyTerm } from './api/studioTaxonomyApi';

const positiveInteger = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const RIBBON_VISIBLE_SHAPES = ['line', 'rectangle', 'rounded-rectangle', 'circle', 'triangle', 'arrow', 'diamond', 'star', 'heart', 'cloud'];

const screenScriptEntries = (
  content: ScreenScriptRow['content_json'] | undefined,
): Array<[string, string]> =>
  Object.entries(content ?? {}).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );

const authoredDrawingStrokes = (screen: StudioScreen | null): AuthorDrawingStroke[] =>
  screen?.screen_settings_json?.author_drawings?.strokes ?? [];

type ManagedScreen = Screen & {
  availLeft?: number;
  availTop?: number;
  isExtended?: boolean;
  isInternal?: boolean;
  isPrimary?: boolean;
  label?: string;
  left?: number;
  top?: number;
};

type ManagedScreenDetails = {
  currentScreen: ManagedScreen;
  screens: ManagedScreen[];
};

type WindowWithScreenManagement = Window & {
  getScreenDetails?: () => Promise<ManagedScreenDetails>;
};

const sameManagedScreen = (left: ManagedScreen, right: ManagedScreen) =>
  (left.left ?? 0) === (right.left ?? 0) &&
  (left.top ?? 0) === (right.top ?? 0) &&
  left.width === right.width &&
  left.height === right.height;

const presentationWindowFeatures = (target: ManagedScreen) => {
  const left = Math.round(target.availLeft ?? target.left ?? 0);
  const top = Math.round(target.availTop ?? target.top ?? 0);
  const width = Math.max(640, Math.round(target.availWidth || target.width || 1440));
  const height = Math.max(480, Math.round(target.availHeight || target.height || 900));
  return `popup=yes,left=${left},top=${top},width=${width},height=${height}`;
};

export default function TeachingStudioPage() {
  const navigate = useNavigate();
  const { sessionId: rawSessionId } = useParams<{ sessionId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = positiveInteger(rawSessionId);
  const requestedScreenId = positiveInteger(searchParams.get('screen') ?? undefined);
  const [screenList, setScreenList] = useState<StudioScreenList>({
    session_revision_no: 0,
    screens: [],
  });
  const [selectedScreen, setSelectedScreen] = useState<StudioScreen | null>(null);
  const [loadingScreens, setLoadingScreens] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createScreenOpen, setCreateScreenOpen] = useState(false);
  const [screenMetadataOpen, setScreenMetadataOpen] = useState(false);
  const [newScreenTitle, setNewScreenTitle] = useState('Untitled Screen');
  const [newScreenPedagogyId, setNewScreenPedagogyId] = useState('');
  const [newScreenBloomId, setNewScreenBloomId] = useState('');
  const [taxonomyTerms, setTaxonomyTerms] = useState<StudioTaxonomyTerm[]>([]);
  const [screenRequestVersion, setScreenRequestVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<
    | 'script'
    | 'resources'
    | 'insert-resources'
    | 'elements'
    | 'shapes'
    | 'animations'
    | 'transitions'
    | 'diagrams'
    | 'layers'
    | null
  >('elements');
  const [insertResourceType, setInsertResourceType] = useState<InsertResourceType>('image');
  const [insertResourceFilter, setInsertResourceFilter] = useState<InsertResourceType | null>(null);
  const [resourceUploadOpen, setResourceUploadOpen] = useState(false);
  const [assetCatalogOpen, setAssetCatalogOpen] = useState(false);
  const [layoutGalleryOpen, setLayoutGalleryOpen] = useState(false);
  const [zoomDialogMode, setZoomDialogMode] = useState<StudioZoomMode | null>(null);
  const [animationPreview, setAnimationPreview] = useState<{
    elementId: string;
    token: number;
  } | null>(null);
  const [selectedAnimationEffectId, setSelectedAnimationEffectId] = useState<string | null>(null);
  const [cropRequest, setCropRequest] = useState<{ elementId: string; token: number } | null>(null);
  const [model3DModeRequest, setModel3DModeRequest] = useState<{ elementId: string; token: number } | null>(null);
  const [layouts, setLayouts] = useState<StudioLayoutSummary[]>([]);
  const [scripts, setScripts] = useState<ScreenScriptRow[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<StudioWorkflowStatus | null>(null);
  const [workflowProblems, setWorkflowProblems] = useState<StudioValidationProblem[]>([]);
  const [workflowDetailsOpen, setWorkflowDetailsOpen] = useState(false);
  const [rejectionDetailsOpen, setRejectionDetailsOpen] = useState(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<'submit' | 'approve' | 'publish' | null>(
    null,
  );
  const [applyingLayout, setApplyingLayout] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<{
    row: StudioLayoutSummary;
    layout: Layout;
  } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  useEffect(() => {
    setSelectedElementIds((current) => {
      if (!selectedElementId) return current.length ? [] : current;
      return current.includes(selectedElementId) ? current : [selectedElementId];
    });
  }, [selectedElementId]);
  const [activeRibbonTab, setActiveRibbonTab] = useState<StudioRibbonTabId>('home');
  const [ribbonCollapsed, setRibbonCollapsed] = useState(false);
  const [selectedLayoutSlotId, setSelectedLayoutSlotId] = useState<string | null>(null);
  const inlineEquationCaretRef = useRef<{ elementId: string; offset: number } | null>(null);
  const [editorClipboard, setEditorClipboard] = useState<StudioElement[]>([]);
  const [diagramChooserOpen, setDiagramChooserOpen] = useState(false);
  const [diagramLayoutGalleryOpen, setDiagramLayoutGalleryOpen] = useState(false);
  const [diagramTextPaneOpen, setDiagramTextPaneOpen] = useState(false);
  const [selectedDiagramNodeId, setSelectedDiagramNodeId] = useState<string | null>(null);
  const [diagramLivePreview, setDiagramLivePreview] = useState<Partial<SmartDiagramContent> | null>(null);
  const [elementContextMenu, setElementContextMenu] = useState<{ elementId: string; x: number; y: number } | null>(null);
  const [formatPainter, setFormatPainter] = useState<{
    sourceElementId: string;
    format: StudioCopiedFormat;
    persistent: boolean;
    textRangeFormat?: Record<string, string>;
    sourceSelectionText?: string;
  } | null>(null);
  const formatPainterAppliedTargetRef = useRef<string | null>(null);
  const spectropyShortcutHeldRef = useRef(false);
  const equationCanvasPointRef = useRef({ x: 600, y: 410 });
  const presentationChannelRef = useRef<BroadcastChannel | null>(null);
  const presentationWindowRef = useRef<Window | null>(null);
  const presentationWindowWatchRef = useRef<number | null>(null);
  const [presentationActive, setPresentationActive] = useState(false);
  const [presentationDisplayName, setPresentationDisplayName] = useState('current display');
  const [inlineShapeEdit, setInlineShapeEdit] = useState<{
    elementId: string;
    shape: InlineShapeData;
    start: number;
    end: number;
  } | null>(null);
  const [elementPast, setElementPast] = useState<StudioElement[][]>([]);
  const [elementFuture, setElementFuture] = useState<StudioElement[][]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingScreen, setSavingScreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'offline'
  >('idle');
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [sessionContext, setSessionContext] = useState<StudioSession | null>(null);
  const [sessionOptions, setSessionOptions] = useState<StudioSession[]>([]);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [scriptOverlayOpen, setScriptOverlayOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [editorFocusMode, setEditorFocusMode] = useState(false);
  const [showCanvasGuides, setShowCanvasGuides] = useState(false);
  const editorViewportRef = useRef<HTMLDivElement>(null);
  const [revisionPromptOpen, setRevisionPromptOpen] = useState(false);
  const [startingRevision, setStartingRevision] = useState(false);
  const editorReadOnly = !workflowStatus || !['draft', 'rejected'].includes(workflowStatus.status);
  const canStartRevision = Boolean(
    workflowStatus && ['submitted', 'approved', 'published'].includes(workflowStatus.status),
  );
  const toolPanelOpen = rightPanelOpen && !editorReadOnly;
  const showLegacyEditor = false;
  const [screenAction, setScreenAction] = useState<'remove-layout' | 'delete-screen' | null>(null);
  const [screenActionBusy, setScreenActionBusy] = useState(false);
  const [layoutEditRequest, setLayoutEditRequest] = useState<{
    layoutId: number;
    requestId: number;
  } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tablePickerPosition, setTablePickerPosition] = useState({ left: 16, top: 96 });
  const [tablePickerHover, setTablePickerHover] = useState({ rows: 0, columns: 0 });
  const [renameTitle, setRenameTitle] = useState('');
  const [renamingScreen, setRenamingScreen] = useState(false);
  const [reorderIds, setReorderIds] = useState<number[]>([]);
  const [reorderingScreens, setReorderingScreens] = useState(false);
  const [draggingScreenId, setDraggingScreenId] = useState<number | null>(null);
  const reorderIdsRef = useRef<number[]>([]);
  useEffect(() => {
    if (draggingScreenId) return;
    const ids = screenList.screens.map((screen) => screen.id);
    setReorderIds(ids);
    reorderIdsRef.current = ids;
  }, [draggingScreenId, screenList.screens]);
  const [drawingTool, setDrawingTool] = useState<StudioDrawingTool>('pen');
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [drawingWidth, setDrawingWidth] = useState(6);
  const [drawingOpacity, setDrawingOpacity] = useState(1);
  const [drawingPast, setDrawingPast] = useState<AuthorDrawingStroke[][]>([]);
  const [drawingFuture, setDrawingFuture] = useState<AuthorDrawingStroke[][]>([]);
  const [saveConflict, setSaveConflict] = useState<{
    draft: StudioScreen;
    latest: StudioScreen;
  } | null>(null);
  const screenListRef = useRef(screenList);
  const screenRevisionRef = useRef<Map<number, number>>(new Map());
  const selectedScreenRef = useRef<StudioScreen | null>(null);
  const saveInFlightRef = useRef(false);
  const saveDraftRef = useRef<(source?: 'autosave' | 'manual' | 'navigation') => Promise<boolean>>(
    async () => true,
  );

  useEffect(() => {
    screenListRef.current = screenList;
  }, [screenList]);

  useEffect(() => {
    selectedScreenRef.current = selectedScreen;
  }, [selectedScreen]);

  const rememberScreenRevision = useCallback((screen: Pick<StudioScreen, 'id' | 'revision_no'>) => {
    const revision = Number(screen.revision_no);
    if (Number.isInteger(revision) && revision >= 0) {
      screenRevisionRef.current.set(screen.id, revision);
    }
  }, []);

  const latestScreenRevision = useCallback(
    (screen: Pick<StudioScreen, 'id' | 'revision_no'>) =>
      Math.max(Number(screen.revision_no) || 0, screenRevisionRef.current.get(screen.id) || 0),
    [],
  );

  useEffect(() => {
    const syncFullscreenState = () => {
      if (document.fullscreenElement !== editorViewportRef.current) setEditorFocusMode(false);
    };
    const closeFallbackFocusMode = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) setEditorFocusMode(false);
    };
    document.addEventListener('fullscreenchange', syncFullscreenState);
    window.addEventListener('keydown', closeFallbackFocusMode);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      window.removeEventListener('keydown', closeFallbackFocusMode);
    };
  }, []);

  const toggleEditorFocusMode = async () => {
    const viewport = editorViewportRef.current;
    if (!viewport) return;
    if (editorFocusMode) {
      if (document.fullscreenElement === viewport) await document.exitFullscreen();
      setEditorFocusMode(false);
      return;
    }
    setEditorFocusMode(true);
    try {
      await viewport.requestFullscreen();
    } catch {
      toast('Browser fullscreen is unavailable. Editor Focus Mode is still active.');
    }
  };

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const selectedScreenId = useMemo(() => {
    if (requestedScreenId && screenList.screens.some((screen) => screen.id === requestedScreenId)) {
      return requestedScreenId;
    }
    return screenList.screens[0]?.id ?? null;
  }, [requestedScreenId, screenList.screens]);

  const importedTitleByScreenId = useMemo(
    () => new Map(
      scripts
        .map((script) => [script.screen_id, script.content_json?.title?.trim()] as const)
        .filter((entry): entry is readonly [number, string] => Boolean(entry[1])),
    ),
    [scripts],
  );

  const screenDisplayTitle = (screen: Pick<StudioScreen, 'id' | 'screen_number' | 'title'>) => {
    const savedTitle = screen.title?.trim() || '';
    const importedTitle = importedTitleByScreenId.get(screen.id);
    const normalizedSavedTitle = savedTitle.toLowerCase();
    const generatedTitles = new Set([
      `screen ${screen.screen_number}`,
      `untitled screen ${screen.screen_number}`,
      'untitled screen',
    ]);

    return importedTitle && (!savedTitle || generatedTitles.has(normalizedSavedTitle))
      ? importedTitle
      : savedTitle || importedTitle || `Screen ${screen.screen_number}`;
  };

  const loadScreens = useCallback(async () => {
    if (!sessionId) return;
    setLoadingScreens(true);
    setError(null);
    try {
      const result = await listStudioScreens(sessionId);
      screenRevisionRef.current = new Map(
        result.screens.map((screen) => [screen.id, Number(screen.revision_no)]),
      );
      setScreenList(result);
      setScreenRequestVersion((version) => version + 1);
      return true;
    } catch (requestError) {
      setScreenList({ session_revision_no: 0, screens: [] });
      setSelectedScreen(null);
      setError(getStudioErrorMessage(requestError));
      return false;
    } finally {
      setLoadingScreens(false);
    }
  }, [sessionId]);

  const refreshScreens = async () => {
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;
    const refreshed = await loadScreens();
    if (refreshed) toast.success('Studio Screens refreshed successfully.');
    else toast.error('Unable to refresh Studio Screens.');
  };

  useEffect(() => {
    setScreenList({ session_revision_no: 0, screens: [] });
    setSelectedScreen(null);
    if (sessionId) void loadScreens();
  }, [loadScreens, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();
    void studioSetupApi
      .session(sessionId, controller.signal)
      .then(async (session) => {
        setSessionContext(session);
        setSessionOptions(await studioSetupApi.sessions(session.subtopic_id, controller.signal));
      })
      .catch(() => {
        /* The editor remains usable if context labels cannot load. */
      });
    return () => controller.abort();
  }, [sessionId]);

  const loadLayouts = useCallback(async () => {
    setLayouts(await ensureTargetStudioLayouts());
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([ensureTargetStudioLayouts(), studioDocumentsApi.screenScripts(sessionId)])
      .then(([layoutRows, scriptRows]) => {
        setLayouts(layoutRows);
        setScripts(scriptRows);
      })
      .catch(() => {
        /* Individual editor panels show their empty state. */
      });
  }, [sessionId]);

  const loadWorkflow = useCallback(
    async (showSuccess = false) => {
      if (!sessionId) return;
      setLoadingWorkflow(true);
      setWorkflowProblems([]);
      try {
        const status = await getStudioWorkflowStatus(sessionId);
        setWorkflowStatus(status);
        if (showSuccess) toast.success('Publication status checked successfully.');
      } catch (requestError) {
        const response = workflowError(requestError);
        setWorkflowProblems(response.problems);
        toast.error(response.message);
      } finally {
        setLoadingWorkflow(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    setWorkflowStatus(null);
    setWorkflowProblems([]);
    if (sessionId) void loadWorkflow();
  }, [loadWorkflow, sessionId]);

  useEffect(() => {
    if (!selectedScreenId) {
      setSelectedScreen(null);
      return;
    }

    const applySelectedScreen = (screen: StudioScreen) => {
      setSelectedScreen(screen);
      setSelectedElementId(null);
      setElementPast([]);
      setElementFuture([]);
      setDrawingPast([]);
      setDrawingFuture([]);
      setHasUnsavedChanges(false);
      setSaveStatus('idle');
      setSaveConflict(null);
    };

    const selectedScreenFromList = screenListRef.current.screens.find(
      (screen) => screen.id === selectedScreenId,
    );
    if (selectedScreenFromList) {
      applySelectedScreen({
        ...selectedScreenFromList,
        revision_no: latestScreenRevision(selectedScreenFromList),
      });
      setLoadingScreen(false);
      return;
    }

    let active = true;
    setSelectedScreen(null);
    setLoadingScreen(true);
    void getStudioScreen(selectedScreenId)
      .then((screen) => {
        if (active) {
          rememberScreenRevision(screen);
          applySelectedScreen(screen);
        }
      })
      .catch((requestError) => {
        if (active) {
          setSelectedScreen(null);
          setError(getStudioErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) setLoadingScreen(false);
      });
    return () => {
      active = false;
    };
  }, [latestScreenRevision, rememberScreenRevision, screenRequestVersion, selectedScreenId]);

  const selectScreen = async (screenId: number) => {
    if (hasUnsavedChanges) {
      const saved = await saveDraftRef.current('navigation');
      if (!saved) return;
    }
    setError(null);
    setSearchParams({ screen: String(screenId) }, { replace: true });
  };

  const editSelectedScreenScript = async () => {
    if (!sessionId || !selectedScreenId) return;
    if (hasUnsavedChanges) {
      const saved = await saveDraftRef.current('navigation');
      if (!saved) return;
    }
    navigate(`/studio/sessions/${sessionId}/scripts?screen=${selectedScreenId}&returnTo=editor`);
  };

  const createBlankScreen = async () => {
    if (!sessionId || creating || editorReadOnly) return;
    if (hasUnsavedChanges) {
      const saved = await saveDraftRef.current('navigation');
      if (!saved) return;
    }
    setError(null);
    try {
      setTaxonomyTerms(await studioTaxonomyApi.list());
    } catch {
      setTaxonomyTerms([]);
    }
    setCreateScreenOpen(true);
  };

  const confirmCreateBlankScreen = async () => {
    if (!sessionId || creating || !newScreenPedagogyId) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createBlankStudioScreen(
        sessionId,
        newScreenTitle.trim() || 'Untitled Screen',
      );
      const pedagogy = taxonomyTerms.find((term) => term.id === Number(newScreenPedagogyId));
      const bloom = taxonomyTerms.find((term) => term.id === Number(newScreenBloomId));
      await studioTaxonomyApi.saveScreen(created.id, {
        pedagogy: pedagogy ? [pedagogy] : [],
        bloom: bloom ? [bloom] : [],
      });
      await loadScreens();
      setSearchParams({ screen: String(created.id) }, { replace: true });
      setCreateScreenOpen(false);
      setNewScreenTitle('Untitled Screen');
      setNewScreenPedagogyId('');
      setNewScreenBloomId('');
      toast.success('Blank Screen created. Its optional Screen Script is empty.');
    } catch (requestError) {
      const response = getStudioErrorMessage(requestError);
      setError(response);
      toast.error(response);
    } finally {
      setCreating(false);
    }
  };

  const openScreenMetadata = async () => {
    if (!selectedScreenId || editorReadOnly) return;
    setCreating(true);
    try {
      const [terms, assigned] = await Promise.all([
        studioTaxonomyApi.list(),
        studioTaxonomyApi.screen(selectedScreenId),
      ]);
      setTaxonomyTerms(terms);
      setNewScreenPedagogyId(
        String(assigned.explicit.pedagogy[0]?.id || assigned.effective.pedagogy[0]?.id || ''),
      );
      setNewScreenBloomId(String(assigned.explicit.bloom[0]?.id || ''));
      setScreenMetadataOpen(true);
    } catch (requestError) {
      toast.error(getStudioErrorMessage(requestError));
    } finally {
      setCreating(false);
    }
  };

  const saveScreenMetadata = async () => {
    if (!sessionId || !selectedScreenId || creating || !newScreenPedagogyId) return;
    setCreating(true);
    try {
      const pedagogy = taxonomyTerms.find((term) => term.id === Number(newScreenPedagogyId));
      const bloom = taxonomyTerms.find((term) => term.id === Number(newScreenBloomId));
      await studioTaxonomyApi.saveScreen(selectedScreenId, {
        pedagogy: pedagogy ? [pedagogy] : [],
        bloom: bloom ? [bloom] : [],
      });
      setScreenMetadataOpen(false);
      toast.success('Screen metadata saved.');
    } catch (requestError) {
      toast.error(getStudioErrorMessage(requestError));
    } finally {
      setCreating(false);
    }
  };

  const leaveEditor = async () => {
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;
    navigate('/studio/sessions', { replace: true });
  };

  const openPreview = async () => {
    if (!sessionId) return;
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;
    navigate(`/studio/player/${sessionId}/preview`);
  };

  const openPresentation = async () => {
    if (!sessionId) return;
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;

    if (presentationWindowWatchRef.current !== null) {
      window.clearInterval(presentationWindowWatchRef.current);
      presentationWindowWatchRef.current = null;
    }
    if (presentationWindowRef.current && !presentationWindowRef.current.closed) {
      presentationWindowRef.current.close();
    }

    const browserWindow = window as WindowWithScreenManagement;
    const currentBrowserScreen = window.screen as ManagedScreen;
    let targetScreen = currentBrowserScreen;
    let externalDisplay = false;
    let screenPermissionUnavailable = false;

    if (currentBrowserScreen.isExtended && browserWindow.getScreenDetails) {
      try {
        const details = await browserWindow.getScreenDetails();
        const otherScreens = details.screens.filter(
          (candidate) => !sameManagedScreen(candidate, details.currentScreen),
        );
        const preferredExternal =
          otherScreens.find((candidate) => candidate.isInternal === false) ??
          otherScreens.find((candidate) => candidate.isPrimary === false) ??
          otherScreens[0];
        if (preferredExternal) {
          targetScreen = preferredExternal;
          externalDisplay = true;
        }
      } catch {
        screenPermissionUnavailable = true;
      }
    }

    const channelName = `spectropy-present-${sessionId}-${Date.now()}`;
    presentationChannelRef.current?.close();
    presentationChannelRef.current =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : null;
    const audience = window.open(
      `/studio/player/${sessionId}/preview?mode=audience&channel=${encodeURIComponent(channelName)}`,
      `spectropy-presentation-${sessionId}`,
      presentationWindowFeatures(targetScreen),
    );
    if (!audience) {
      presentationChannelRef.current?.close();
      presentationChannelRef.current = null;
      toast.error('Allow pop-ups for this site, then choose Present again.');
      return;
    }

    presentationWindowRef.current = audience;
    try {
      audience.moveTo(
        Math.round(targetScreen.availLeft ?? targetScreen.left ?? 0),
        Math.round(targetScreen.availTop ?? targetScreen.top ?? 0),
      );
      audience.resizeTo(
        Math.round(targetScreen.availWidth || targetScreen.width || 1440),
        Math.round(targetScreen.availHeight || targetScreen.height || 900),
      );
    } catch {
      /* The requested bounds are already supplied to window.open. */
    }
    audience.focus();
    setPresentationActive(true);
    const displayName = externalDisplay
      ? targetScreen.label?.trim() || 'external display'
      : 'current display';
    setPresentationDisplayName(displayName);
    presentationWindowWatchRef.current = window.setInterval(() => {
      if (!presentationWindowRef.current?.closed) return;
      if (presentationWindowWatchRef.current !== null) {
        window.clearInterval(presentationWindowWatchRef.current);
        presentationWindowWatchRef.current = null;
      }
      presentationWindowRef.current = null;
      presentationChannelRef.current?.close();
      presentationChannelRef.current = null;
      setPresentationActive(false);
    }, 750);

    if (externalDisplay) {
      toast.success(`Audience presentation opened on ${displayName}.`);
    } else if (screenPermissionUnavailable) {
      toast.error(
        'Multi-screen permission was not granted. Presentation opened on this display; allow Window management and try again.',
      );
    } else if (currentBrowserScreen.isExtended && !browserWindow.getScreenDetails) {
      toast('This browser cannot automatically place windows on another display.');
    } else {
      toast.success('Audience presentation opened on this display.');
    }
  };

  const sendPresentationCommand = (command: 'previous' | 'next' | 'fullscreen') =>
    presentationChannelRef.current?.postMessage({ command });

  useEffect(() => {
    if (!presentationActive) return;
    const forwardLaptopClicker = (event: KeyboardEvent) => {
      const action = clickerNavigationAction(event);
      if (!action) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      presentationChannelRef.current?.postMessage({ command: action });
    };
    window.addEventListener('keydown', forwardLaptopClicker, true);
    return () => window.removeEventListener('keydown', forwardLaptopClicker, true);
  }, [presentationActive]);

  const closePresentationControls = () => {
    presentationChannelRef.current?.postMessage({ command: 'close' });
    presentationWindowRef.current?.close();
    presentationWindowRef.current = null;
    if (presentationWindowWatchRef.current !== null) {
      window.clearInterval(presentationWindowWatchRef.current);
      presentationWindowWatchRef.current = null;
    }
    presentationChannelRef.current?.close();
    presentationChannelRef.current = null;
    setPresentationActive(false);
  };

  useEffect(
    () => () => {
      if (presentationWindowWatchRef.current !== null) {
        window.clearInterval(presentationWindowWatchRef.current);
      }
      presentationChannelRef.current?.postMessage({ command: 'close' });
      presentationChannelRef.current?.close();
      presentationWindowRef.current?.close();
    },
    [],
  );

  const runWorkflowAction = async (action: 'submit' | 'approve' | 'publish') => {
    if (!sessionId || workflowAction) return;
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;
    setWorkflowAction(action);
    setWorkflowProblems([]);
    try {
      if (action === 'submit') await submitStudioSession(sessionId);
      if (action === 'approve') await approveStudioSession(sessionId);
      if (action === 'publish') await publishStudioSession(sessionId);
      toast.success(
        action === 'submit'
          ? 'Session submitted for review.'
          : action === 'approve'
            ? 'Session approved.'
            : 'Session published successfully.',
      );
      await loadWorkflow();
    } catch (requestError) {
      const response = workflowError(requestError);
      toast.error(response.message);
      await loadWorkflow();
      setWorkflowProblems(
        response.problems.length > 0
          ? response.problems
          : [
              {
                code: 'WORKFLOW_ACTION_FAILED',
                message: response.message,
              },
            ],
      );
    } finally {
      setWorkflowAction(null);
    }
  };

  const openWorkflowDetails = async () => {
    await loadWorkflow();
    setWorkflowDetailsOpen(true);
  };

  const openWorkflowProblemTarget = async (problem: StudioValidationProblem) => {
    if (!sessionId) return;
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;
    setWorkflowDetailsOpen(false);
    if (problem.code === 'SESSION_PLAN_MISSING') {
      navigate(`/studio/sessions/${sessionId}/plan?mode=edit&returnTo=editor`);
      return;
    }
    if (problem.code === 'SCREENS_MISSING') {
      setCreateScreenOpen(true);
      return;
    }
    if (problem.code === 'SCREEN_SCRIPT_MISSING' && problem.screen_id) {
      navigate(`/studio/sessions/${sessionId}/scripts?screen=${problem.screen_id}&returnTo=editor`);
    }
  };

  const handleScreenSaveFailure = async (requestError: unknown, draft: StudioScreen) => {
    const details = getStudioErrorDetails(requestError);
    setError(details.message);
    setSaveStatus(online ? 'error' : 'offline');
    toast.error(details.message);
    if (details.status !== 409) return;
    try {
      const latest = await getStudioScreen(draft.id);
      rememberScreenRevision(latest);
      selectedScreenRef.current = draft;
      setSelectedScreen(draft);
      setHasUnsavedChanges(true);
      setSaveConflict({ draft, latest });
    } catch {
      toast.error(
        'The Screen changed on the server, but its latest saved state could not be loaded. Your draft remains open.',
      );
    }
  };

  const startRevision = async () => {
    if (!sessionId || startingRevision) return;
    setStartingRevision(true);
    try {
      const result = await startStudioSessionRevision(sessionId);
      setRevisionPromptOpen(false);
      setPanel('elements');
      setRightPanelOpen(true);
      toast.success(
        result.creates_new_release
          ? 'Editable draft created. The current published version remains unchanged.'
          : 'Session returned to Draft for updating.',
      );
      await Promise.all([loadWorkflow(), loadScreens()]);
    } catch (requestError) {
      toast.error(workflowError(requestError).message);
      await loadWorkflow();
    } finally {
      setStartingRevision(false);
    }
  };

  const saveAppliedLayout = async (row: StudioLayoutSummary, layout: Layout) => {
    if (!selectedScreen || applyingLayout || editorReadOnly) return;
    setApplyingLayout(true);
    setError(null);
    const remapped = remapElementsToLayout(selectedScreen.elements, layout);
    const draft: StudioScreen = {
      ...selectedScreen,
      layout_id: row.id,
      creation_mode: 'layout',
      elements: remapped.elements,
    };
    try {
      const saved = await updateStudioScreen(selectedScreen.id, {
        revision_no: latestScreenRevision(selectedScreen),
        title: selectedScreen.title,
        layout_id: row.id,
        elements: remapped.elements,
        tags: selectedScreen.tags,
      });
      rememberScreenRevision(saved);
      selectedScreenRef.current = saved;
      setSelectedScreen(saved);
      setScreenList((current) => ({
        session_revision_no: saved.session_revision_no,
        screens: current.screens.map((screen) => (screen.id === saved.id ? saved : screen)),
      }));
      setPendingLayout(null);
      setSelectedElementId(null);
      setElementPast([]);
      setElementFuture([]);
      setHasUnsavedChanges(false);
      setPanel('elements');
      toast.success(
        `${layout.id} applied successfully${remapped.removed.length ? `; ${remapped.removed.length} incompatible element${remapped.removed.length === 1 ? '' : 's'} removed` : ''}.`,
      );
      await loadWorkflow();
    } catch (requestError) {
      await handleScreenSaveFailure(requestError, draft);
    } finally {
      setApplyingLayout(false);
    }
  };

  const requestLayoutApplication = async (row: StudioLayoutSummary, layout: Layout) => {
    if (editorReadOnly) {
      toast.error('Start an update before changing this Session.');
      return;
    }
    if (!selectedScreen) {
      toast.error('Select or create a Screen before applying a layout.');
      return;
    }
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;
    if (selectedScreen.elements.length > 0) setPendingLayout({ row, layout });
    else void saveAppliedLayout(row, layout);
  };

  const selectedLayout = useMemo(() => {
    const row = layouts.find((layout) => layout.id === selectedScreen?.layout_id);
    if (!row) return null;
    return (
      targetLayouts.find((layout) => layout.id === row.layout_key.toUpperCase()) || {
        id: row.layout_key,
        name: row.name,
        purpose: row.description || 'Custom Studio layout',
        catalog: 'pilot' as const,
        slots: row.layout_data_json?.slots || [],
      }
    );
  }, [layouts, selectedScreen?.layout_id]);

  const commitElements = useCallback((elements: StudioElement[], selectElementId?: string | null) => {
    if (!selectedScreen || editorReadOnly) return;
    setElementPast((past) => [...past.slice(-99), selectedScreen.elements]);
    setElementFuture([]);
    setSelectedScreen({ ...selectedScreen, elements });
    if (selectElementId !== undefined) {
      setSelectedElementId(selectElementId);
      setSelectedElementIds(selectElementId ? [selectElementId] : []);
    }
    setHasUnsavedChanges(true);
  }, [editorReadOnly, selectedScreen]);

  const setAuthoredDrawings = (strokes: AuthorDrawingStroke[], recordHistory = true) => {
    if (!selectedScreen || editorReadOnly) return;
    const current = authoredDrawingStrokes(selectedScreen);
    if (recordHistory) {
      setDrawingPast((past) => [...past, current]);
      setDrawingFuture([]);
    }
    setSelectedScreen({
      ...selectedScreen,
      screen_settings_json: {
        ...(selectedScreen.screen_settings_json ?? {}),
        author_drawings: { strokes },
      },
    });
    setHasUnsavedChanges(true);
  };

  const setScreenTransition = (transition: Record<string, unknown>) => {
    if (!selectedScreen || editorReadOnly) return;
    setSelectedScreen({
      ...selectedScreen,
      screen_settings_json: {
        ...(selectedScreen.screen_settings_json ?? {}),
        transition,
      },
    });
    setHasUnsavedChanges(true);
  };

  const applyTransitionToAllScreens = async (transition: Record<string, unknown>) => {
    if (!selectedScreen || editorReadOnly || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSavingScreen(true);
    setSaveStatus('saving');
    try {
      const sourceScreens = screenList.screens.map((screen) => screen.id === selectedScreen.id
        ? {
            ...selectedScreen,
            screen_settings_json: {
              ...(selectedScreen.screen_settings_json ?? {}),
              transition,
            },
          }
        : screen);
      const savedScreens: StudioScreen[] = [];
      let sessionRevisionNo = screenList.session_revision_no;
      for (const screen of sourceScreens) {
        const saved = await updateStudioScreen(screen.id, {
          revision_no: latestScreenRevision(screen),
          title: screen.title,
          layout_id: screen.layout_id,
          elements: screen.elements,
          tags: screen.tags,
          screen_settings: {
            ...(screen.screen_settings_json ?? {}),
            transition,
          },
        });
        rememberScreenRevision(saved);
        sessionRevisionNo = saved.session_revision_no;
        savedScreens.push(saved);
      }
      setScreenList({ session_revision_no: sessionRevisionNo, screens: savedScreens });
      const savedSelected = savedScreens.find((screen) => screen.id === selectedScreen.id) ?? null;
      setSelectedScreen(savedSelected);
      selectedScreenRef.current = savedSelected;
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      toast.success(`Transition applied to all ${savedScreens.length} Screens.`);
      void loadWorkflow();
    } catch (error) {
      setSaveStatus('error');
      toast.error(getStudioErrorMessage(error));
      throw error;
    } finally {
      saveInFlightRef.current = false;
      setSavingScreen(false);
    }
  };

  const undoDrawing = () => {
    if (!selectedScreen || drawingPast.length === 0) return;
    const previous = drawingPast[drawingPast.length - 1];
    setDrawingPast((past) => past.slice(0, -1));
    setDrawingFuture((future) => [authoredDrawingStrokes(selectedScreen), ...future]);
    setAuthoredDrawings(previous, false);
  };

  const redoDrawing = () => {
    if (!selectedScreen || drawingFuture.length === 0) return;
    const next = drawingFuture[0];
    setDrawingFuture((future) => future.slice(1));
    setDrawingPast((past) => [...past, authoredDrawingStrokes(selectedScreen)]);
    setAuthoredDrawings(next, false);
  };

  const addElement = (slot: Slot, requestedType: ObjectType = slot.allowed[0]) => {
    if (!selectedScreen) return;
    const existing = selectedScreen.elements.find((element) => element.slotId === slot.id);
    if (existing) {
      setSelectedElementId(existing.id);
      return existing.id;
    }
    const element: StudioElement = {
      id: `${slot.id}-${Date.now()}`,
      slotId: slot.id,
      type: requestedType,
      content: requestedType === 'text' ? {
        text: '', kind: 'rectangle', fill: 'transparent', stroke: 'transparent', strokeWidth: 2,
        color: '#25436b', fontSize: 18, alignment: 'left', verticalAlignment: 'top',
      } : { text: '' },
      position: { ...slot.bounds },
    };
    commitElements([...selectedScreen.elements, element], element.id);
    toast.success(`${slot.label} content added. Edit it, then Save.`);
    return element.id;
  };

  const changeSlotType = (slot: Slot, type: ObjectType) => {
    if (!selectedScreen || editorReadOnly) return;
    const existing = selectedScreen.elements.find((element) => element.slotId === slot.id);
    if (existing?.type === type) {
      setSelectedElementId(existing.id);
    } else if (existing) {
      const hasContent = Boolean(existing.resource) || Object.values(existing.content).some((value) =>
        typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined,
      );
      if (hasContent && !window.confirm(`Replace the existing ${existing.type} content with ${type} content?`)) return;
      updateElement({ ...existing, type, content: type === 'text' ? {
        text: '', kind: 'rectangle', fill: 'transparent', stroke: 'transparent', strokeWidth: 2,
        color: '#25436b', fontSize: 18, alignment: 'left', verticalAlignment: 'top',
      } : { text: '' }, resource: undefined });
    } else {
      addElement(slot, type);
    }
    if (['visual', 'media', 'simulation'].includes(type)) {
      setPanel('resources');
      setRightPanelOpen(true);
    }
  };

  const addBlankElement = (
    type: ObjectType,
    region: Slot['region'],
    point?: { x: number; y: number },
    initialContent: Record<string, unknown> = { text: '' },
  ) => {
    if (!selectedScreen || selectedScreen.layout_id || editorReadOnly) return;
    const firstZoomTarget =
      type === 'zoom' ? screenList.screens.find((screen) => screen.id !== selectedScreen.id) : null;
    if (type === 'zoom' && !firstZoomTarget) {
      toast.error('Create at least one more Screen before adding Screen Zoom.');
      return;
    }
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `element-${token}`;
    const defaultPosition =
      region === 'header'
        ? { x: 90, y: 60, width: 1740, height: 150 }
        : region === 'footer'
          ? { x: 90, y: 950, width: 1740, height: 90 }
          : { x: 180, y: 260, width: 760, height: 420 };
    const position = point
      ? {
          x: Math.max(0, Math.min(1920 - (type === 'text' ? 600 : 760), point.x)),
          y: Math.max(0, Math.min(1080 - (type === 'text' ? 150 : 420), point.y)),
          width: type === 'text' ? 600 : 760,
          height: type === 'text' ? 150 : 420,
        }
      : defaultPosition;
    const textFrameDefaults = type === 'text' ? {
      kind: 'rectangle',
      fill: 'transparent',
      stroke: 'transparent',
      strokeWidth: 2,
      color: '#25436b',
      fontSize: 18,
      alignment: 'left',
      verticalAlignment: 'top',
    } : {};
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type,
      content: { ...textFrameDefaults, ...initialContent },
      position,
      ...(type === 'zoom'
        ? {
            zoom: {
              kind: 'screen' as const,
              target_screen_id: firstZoomTarget!.id,
              target_section_id: null,
              return_to_zoom: true,
              transition_enabled: true,
              transition_duration_ms: 500,
              thumbnail_mode: 'auto' as const,
              custom_thumbnail_url: null,
            },
          }
        : {}),
    };
    commitElements([...selectedScreen.elements, element], element.id);
    toast.success(
      `${region === 'content' ? 'Centre content' : region} element added. Edit and position it, then Save.`,
    );
    return id;
  };

  const addDroppedFiles = (files: File[], point: { x: number; y: number }) => {
    if (editorReadOnly) return;
    files.slice(0, 10).forEach((file, index) => {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 8 MB. Upload it through Resources instead.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || '');
        const type: ObjectType = file.type.startsWith('image/')
          ? 'visual'
          : file.type.startsWith('video/') || file.type.startsWith('audio/')
            ? 'media'
            : 'embedded_object';
        addBlankElement(type, 'content', { x: point.x + index * 32, y: point.y + index * 32 }, {
          text: file.name,
          url,
          altText: file.name,
          mimeType: file.type,
          source: 'drag-drop',
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const addMathElement = (latex: string, forceStandalone = false) => {
    if (!selectedScreen || editorReadOnly) return null;
    const inlineTarget = selectedScreen.elements.find(
      (element) =>
        element.id === selectedElementId &&
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
        ].includes(element.type),
    );
    if (inlineTarget && !forceStandalone) {
      const text = String(inlineTarget.content.text ?? '');
      const rememberedCaret = inlineEquationCaretRef.current;
      const offset =
        rememberedCaret?.elementId === inlineTarget.id
          ? Math.min(Math.max(rememberedCaret.offset, 0), text.length)
          : text.length;
      const token = `\\(${latex}\\)`;
      dispatchStudioTextCommand(inlineTarget.id, { type: 'insert-equation', latex, offset });
      inlineEquationCaretRef.current = {
        elementId: inlineTarget.id,
        offset: offset + token.length,
      };
      toast.success('Equation inserted into the selected text element.');
      return inlineTarget.id;
    }
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `math-${token}`;
    const point = equationCanvasPointRef.current;
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type: 'math',
      content: { text: latex, latex, color: '#0f2747', fontSize: 42, alignment: 'center' },
      position: {
        x: Math.max(0, Math.min(1200, point.x - 360)),
        y: Math.max(0, Math.min(920, point.y - 80)),
        width: 720,
        height: 160,
        zIndex: selectedScreen.elements.length + 1,
      },
    };
    commitElements([...selectedScreen.elements, element], element.id);
    toast.success('Equation added. Move or resize it on the canvas, then Save.');
    return element.id;
  };

  const addTableElement = (rowCount = 3, columnCount = 4) => {
    if (!selectedScreen || editorReadOnly) return null;
    const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `table-${token}`;
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type: 'table',
      content: {
        visualType: 'table',
        rows: Array.from({ length: rowCount }, () => Array(columnCount).fill('')),
        headerRow: true,
        totalRow: false,
        firstColumn: false,
        lastColumn: false,
        bandedRows: true,
        bandedColumns: false,
        headerFill: '#1d4ed8',
        bandFill: '#dbeafe',
        cellFill: '#ffffff',
        textColor: '#0f172a',
        borderColor: '#64748b',
        borderWidth: 1,
        borderStyle: 'solid',
        alignment: 'left',
        verticalAlignment: 'middle',
        cellMargin: 8,
        fontSize: 22,
        merges: [],
      },
      position: { x: 360, y: 260, width: 1200, height: 520, zIndex: selectedScreen.elements.length + 1 },
    };
    commitElements([...selectedScreen.elements, element], id);
    setActiveRibbonTab('table-design');
    setRightPanelOpen(false);
    toast.success('Table inserted. Select a cell to edit it or use the table ribbon.');
    return id;
  };

  const openTablePicker = () => {
    const trigger = document.querySelector<HTMLElement>('[aria-label="Table"]');
    const bounds = trigger?.getBoundingClientRect();
    setTablePickerPosition({
      left: Math.max(8, Math.min(bounds?.left ?? 16, window.innerWidth - 250)),
      top: Math.max(8, Math.min((bounds?.bottom ?? 90) + 6, window.innerHeight - 360)),
    });
    setTablePickerHover({ rows: 0, columns: 0 });
    setTablePickerOpen((open) => !open);
  };

  const addShapeElement = (
    kind: string,
    customPath?: string,
    customStyle?: { fill: string; stroke: string; strokeWidth: number },
  ) => {
    if (!selectedScreen || editorReadOnly) return;
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `shape-${token}`;
    const lineLikeShape = ['line', 'diagonal-line', 'arrow', 'double-arrow', 'connector', 'curve'].includes(kind);
    const verticalShape = ['vertical-line', 'up-arrow', 'down-arrow', 'up-down-arrow'].includes(kind);
    const squareShape = ['circle', 'diamond', 'plus', 'minus', 'multiply', 'divide', 'equal', 'not-equal'].includes(kind);
    const defaultSize = verticalShape
      ? { width: 140, height: 400 }
      : lineLikeShape
        ? { width: 400, height: 140 }
        : squareShape
          ? { width: 320, height: 320 }
          : { width: 400, height: 300 };
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type: 'shape',
      content: {
        kind,
        fill: customStyle?.fill ?? (kind === 'custom-drawing' ? 'transparent' : '#dbeafe'),
        stroke: customStyle?.stroke ?? '#1d4ed8',
        strokeWidth: customStyle?.strokeWidth ?? 4,
        opacity: 1,
        text: '',
        color: '#0f2747',
        fontSize: 24,
        alignment: 'center',
        verticalAlignment: 'middle',
        ...(customPath ? { customPath } : {}),
      },
      position: {
        x: 760,
        y: 390,
        ...defaultSize,
        zIndex: selectedScreen.elements.length + 1,
      },
    };
    commitElements([...selectedScreen.elements, element], element.id);
    setPanel('shapes');
    toast.success('Shape added. Move or resize it on the Screen, then Save.');
  };

  const addSmartDiagram = (layoutId: string) => {
    if (!selectedScreen || editorReadOnly) return;
    const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `diagram-${token}`;
    const content = createSmartDiagramContent(layoutId);
    if (selectedLayout) {
      const selectedElement = selectedScreen.elements.find((element) => element.id === selectedElementId);
      const targetSlotId = selectedElement?.slotId || selectedLayoutSlotId;
      const targetSlot = selectedLayout.slots.find((slot) => slot.id === targetSlotId);
      if (!targetSlot) {
        toast.error('Select the layout slot where the Smart Diagram should be inserted.');
        return;
      }
      const existing = selectedScreen.elements.find((element) => element.slotId === targetSlot.id);
      if (existing && !window.confirm(`Replace the existing content in ${targetSlot.label} with this Smart Diagram?`)) return;
      const element: StudioElement = {
        id: existing?.id ?? id,
        slotId: targetSlot.id,
        type: existing && targetSlot.allowed.includes(existing.type as ObjectType) ? existing.type : targetSlot.allowed[0],
        content,
        position: { ...targetSlot.bounds, zIndex: Number(existing?.position.zIndex) || selectedScreen.elements.length + 1 },
      };
      commitElements(
        existing
          ? selectedScreen.elements.map((candidate) => candidate.id === existing.id ? element : candidate)
          : [...selectedScreen.elements, element],
        element.id,
      );
      setSelectedLayoutSlotId(targetSlot.id);
      setDiagramChooserOpen(false);
      setActiveRibbonTab('diagram-design');
      toast.success(`Smart Diagram inserted into ${targetSlot.label}.`);
      return;
    }
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type: 'visual',
      content,
      position: { x: 260, y: 210, width: 1400, height: 700, zIndex: selectedScreen.elements.length + 1 },
    };
    commitElements([...selectedScreen.elements, element], id);
    setDiagramChooserOpen(false);
    setSelectedDiagramNodeId(content.nodes[0]?.id ?? null);
    setActiveRibbonTab('diagram-design');
    toast.success('Smart Diagram inserted. Edit its Text Pane or double-click a node on the Screen.');
  };

  const convertDiagramToShapes = (elementId: string) => {
    if (!selectedScreen || editorReadOnly) return;
    const diagram = selectedScreen.elements.find((element) => element.id === elementId);
    if (!diagram || !isSmartDiagramContent(diagram.content)) return;
    const geometry = layoutSmartDiagram(diagram.content);
    const left = Number(diagram.position.x) || 0;
    const top = Number(diagram.position.y) || 0;
    const width = Number(diagram.position.width) || 1000;
    const height = Number(diagram.position.height) || 600;
    const sx = width / 1000;
    const sy = height / 600;
    const theme = SMART_DIAGRAM_THEMES.find((candidate) => candidate.id === diagram.content.themeId) ?? SMART_DIAGRAM_THEMES[0];
    const boxes = new Map(geometry.boxes.map((box) => [box.id, box]));
    const converted: StudioElement[] = [];
    geometry.edges.forEach((edge, index) => {
      const from = boxes.get(edge.from); const to = boxes.get(edge.to);
      if (!from || !to || diagram.content.connectorStyle === 'none') return;
      const x1 = left + (from.x + from.width / 2) * sx; const y1 = top + (from.y + from.height / 2) * sy;
      const x2 = left + (to.x + to.width / 2) * sx; const y2 = top + (to.y + to.height / 2) * sy;
      converted.push({ id: `${elementId}-connector-${index}`, slotId: `free-${elementId}-connector-${index}`, type: 'shape', content: { kind: 'line', fill: 'transparent', stroke: '#64748b', strokeWidth: 4 }, position: { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.max(80, Math.abs(x2 - x1)), height: Math.max(60, Math.abs(y2 - y1)), zIndex: Number(diagram.position.zIndex) || 0 } });
    });
    diagram.content.nodes.forEach((node, index) => {
      const box = boxes.get(node.id); if (!box) return;
      const x = left + box.x * sx; const y = top + box.y * sy; const nodeWidth = Math.max(80, box.width * sx); const nodeHeight = Math.max(60, box.height * sy);
      const fill = node.fill || theme.colors[index % theme.colors.length];
      const shapeId = `${elementId}-shape-${index}`;
      converted.push({ id: shapeId, slotId: `free-${shapeId}`, type: 'shape', content: { kind: node.shape === 'circle' ? 'ellipse' : node.shape === 'diamond' ? 'diamond' : node.shape === 'rectangle' ? 'rectangle' : 'rounded-rectangle', fill, stroke: '#ffffff', strokeWidth: 3, opacity: 1 }, position: { x, y, width: nodeWidth, height: nodeHeight, zIndex: (Number(diagram.position.zIndex) || 0) + 1 } });
      const textId = `${elementId}-text-${index}`;
      converted.push({ id: textId, slotId: `free-${textId}`, type: 'text', content: { text: `${node.icon ? `${node.icon} ` : ''}${node.text}`, color: node.textColor || '#ffffff', fontSize: Math.max(18, Math.min(34, nodeWidth / 7)), bold: true, alignment: 'center' }, position: { x: x + 8, y: y + 8, width: Math.max(80, nodeWidth - 16), height: Math.max(60, nodeHeight - 16), zIndex: (Number(diagram.position.zIndex) || 0) + 2 } });
    });
    commitElements([...selectedScreen.elements.filter((element) => element.id !== elementId), ...converted], converted.at(-1)?.id ?? null);
    setPanel('elements');
    toast.success('Smart Diagram converted to individual shapes. This conversion is one-way unless you use Undo.');
  };

  const insertInlineShape = (shape: InlineShapeData) => {
    if (!selectedScreen || editorReadOnly) return;
    const target = selectedScreen.elements.find(
      (element) => element.id === selectedElementId && ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(element.type),
    );
    if (!target) return;
    const text = String(target.content.text ?? '');
    const rememberedCaret = inlineEquationCaretRef.current;
    const offset = rememberedCaret?.elementId === target.id
      ? Math.min(Math.max(rememberedCaret.offset, 0), text.length)
      : text.length;
    const token = inlineShapeToken(shape);
    const updated = { ...target, content: { ...target.content, text: `${text.slice(0, offset)}${token}${text.slice(offset)}` } };
    inlineEquationCaretRef.current = { elementId: target.id, offset: offset + token.length };
    commitElements(selectedScreen.elements.map((element) => element.id === target.id ? updated : element), target.id);
    toast.success('Shape inserted into the selected text element.');
  };

  const saveInlineShapeEdit = (shape: InlineShapeData) => {
    if (!selectedScreen || !inlineShapeEdit) return;
    const target = selectedScreen.elements.find((element) => element.id === inlineShapeEdit.elementId);
    if (!target) return;
    const text = String(target.content.text ?? '');
    const token = inlineShapeToken(shape);
    const updated = { ...target, content: { ...target.content, text: `${text.slice(0, inlineShapeEdit.start)}${token}${text.slice(inlineShapeEdit.end)}` } };
    commitElements(selectedScreen.elements.map((element) => element.id === target.id ? updated : element), target.id);
    setInlineShapeEdit(null);
    toast.success('Inline shape updated.');
  };

  const addZoomElements = (items: ZoomInsert[]) => {
    if (!selectedScreen || editorReadOnly || items.length === 0) return;
    const created = items.map((item, index): StudioElement => {
      const token =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${index}`;
      const id = `zoom-${token}`;
      const column = index % 2;
      const row = Math.floor(index / 2);
      return {
        id,
        slotId: `free-${id}`,
        type: 'zoom',
        content: {
          text: item.title,
          ...(item.summaryGroupId
            ? {
                zoom_summary_group: item.summaryGroupId,
                zoom_summary_order: item.summaryOrder ?? index,
              }
            : {}),
        },
        position: {
          x: 160 + column * 800,
          y: 180 + row * 330,
          width: 700,
          height: 270,
          zIndex: selectedScreen.elements.length + index + 1,
        },
        zoom: {
          kind: item.kind,
          target_screen_id: item.kind === 'screen' ? item.targetId : null,
          target_section_id: item.kind === 'section' ? item.targetId : null,
          return_to_zoom: true,
          transition_enabled: true,
          transition_duration_ms: 500,
          thumbnail_mode: 'auto',
          custom_thumbnail_url: null,
        },
      };
    });
    commitElements([...selectedScreen.elements, ...created], created.at(-1)?.id ?? null);
    toast.success(items.length > 1 ? 'Summary Zoom cards added.' : 'Zoom link added.');
  };

  const updateElement = (updated: StudioElement) => {
    if (!selectedScreen || editorReadOnly) return;
    commitElements(
      selectedScreen.elements.map((element) => (element.id === updated.id ? updated : element)),
      updated.id,
    );
  };

  const changeElementContent = (elementId: string, changes: Record<string, unknown>) => {
    if (!selectedScreen || editorReadOnly) return;
    const element = selectedScreen.elements.find((candidate) => candidate.id === elementId);
    if (!element) return;
    updateElement({ ...element, content: { ...element.content, ...changes } });
  };

  const changeElementBounds = (
    elementId: string,
    bounds: { x: number; y: number; width: number; height: number },
  ) => {
    if (!selectedScreen) return;
    const element = selectedScreen.elements.find((candidate) => candidate.id === elementId);
    if (!element) return;
    const previous = {
      x: Number(element.position.x) || 0,
      y: Number(element.position.y) || 0,
      width: Math.max(1, Number(element.position.width) || bounds.width),
      height: Math.max(1, Number(element.position.height) || bounds.height),
    };
    const groupId = typeof element.position.groupId === 'string' ? element.position.groupId : null;
    if (!groupId) {
      updateElement({ ...element, position: { ...element.position, ...bounds } });
      return;
    }
    const scaleX = bounds.width / previous.width;
    const scaleY = bounds.height / previous.height;
    const grouped = selectedScreen.elements.map((candidate) => {
      if (candidate.position.groupId !== groupId) return candidate;
      if (candidate.id === elementId) return { ...candidate, position: { ...candidate.position, ...bounds } };
      const x = Number(candidate.position.x) || 0;
      const y = Number(candidate.position.y) || 0;
      const width = Number(candidate.position.width) || 80;
      const height = Number(candidate.position.height) || 60;
      return {
        ...candidate,
        position: {
          ...candidate.position,
          x: Math.round(bounds.x + (x - previous.x) * scaleX),
          y: Math.round(bounds.y + (y - previous.y) * scaleY),
          width: Math.max(20, Math.round(width * scaleX)),
          height: Math.max(20, Math.round(height * scaleY)),
        },
      };
    });
    commitElements(grouped, elementId);
  };

  const changeElementRotation = (elementId: string, rotation: number) => {
    if (!selectedScreen || editorReadOnly) return;
    const element = selectedScreen.elements.find((candidate) => candidate.id === elementId);
    if (!element) return;
    const groupId = typeof element.position.groupId === 'string' ? element.position.groupId : null;
    commitElements(selectedScreen.elements.map((candidate) =>
      candidate.id === elementId || (groupId && candidate.position.groupId === groupId)
        ? { ...candidate, position: { ...candidate.position, rotation } }
        : candidate), elementId);
  };

  const removeElement = (elementId: string) => {
    if (!selectedScreen) return;
    commitElements(
      selectedScreen.elements.filter((element) => element.id !== elementId),
      null,
    );
    toast.success('Element removed. AutoSave will store the updated draft.');
  };

  const duplicateElement = (elementId: string) => {
    if (!selectedScreen || editorReadOnly) return;
    const source = selectedScreen.elements.find((element) => element.id === elementId);
    if (!source) return;
    if (selectedScreen.layout_id && source.type !== 'math' && source.type !== 'shape') return;
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `element-${token}`;
    const x = Number(source.position.x) || 0;
    const y = Number(source.position.y) || 0;
    const width = Number(source.position.width) || 400;
    const height = Number(source.position.height) || 240;
    const duplicate: StudioElement = {
      ...source,
      id,
      slotId: `free-${id}`,
      content: { ...source.content },
      position: {
        ...source.position,
        x: Math.min(x + 40, 1920 - width),
        y: Math.min(y + 40, 1080 - height),
      },
      resource: source.resource
        ? { ...source.resource, usage: { ...source.resource.usage, slot_id: `free-${id}` } }
        : undefined,
    };
    commitElements([...selectedScreen.elements, duplicate], duplicate.id);
    toast.success('Element duplicated. Move it to the required position, then Save.');
  };

  const updateElementPreservingSelection = (updated: StudioElement) => {
    if (!selectedScreen || editorReadOnly) return;
    commitElements(
      selectedScreen.elements.map((element) => (element.id === updated.id ? updated : element)),
      selectedElementId,
    );
  };

  const placeResourceDirectly = async (
    resource: StudioResourceSummary,
    selectedVersion?: StudioResourceVersion,
  ) => {
    if (editorReadOnly) {
      toast.error('Start an update before changing this Session.');
      return;
    }
    if (!selectedScreen) {
      toast.error('Select a Screen before adding a Resource.');
      return;
    }
    const version = selectedVersion || resource.latest_version;
    if (!version) {
      toast.error('This Resource has no available version.');
      return;
    }
    const type: ObjectType = ['image', 'animation', 'model_3d'].includes(resource.resource_type)
      ? 'visual'
      : ['video', 'presentation'].includes(resource.resource_type)
        ? 'media'
        : 'simulation';
    const token = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}`;
    const id = `resource-${token}`;
    let naturalWidth = Number(version.width);
    let naturalHeight = Number(version.height);
    if (resource.resource_type === 'image' && !(naturalWidth > 0 && naturalHeight > 0)) {
      try {
        const source = version.external_url || (await getStudioResourcePreview(version.id)).url;
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
          image.onerror = () => reject(new Error('Unable to read image dimensions.'));
          image.src = source;
        });
        naturalWidth = dimensions.width;
        naturalHeight = dimensions.height;
      } catch (dimensionError) {
        console.warn('Unable to resolve intrinsic image dimensions; using the default image area.', dimensionError);
      }
    }
    const imageScale = resource.resource_type === 'image' && naturalWidth > 0 && naturalHeight > 0
      ? Math.min(1, 960 / naturalWidth, 540 / naturalHeight)
      : null;
    const imageWidth = imageScale === null ? 960 : Math.max(1, Math.round(naturalWidth * imageScale));
    const imageHeight = imageScale === null ? 540 : Math.max(1, Math.round(naturalHeight * imageScale));
    const size = type === 'visual'
      ? resource.resource_type === 'image'
        ? { x: Math.round((1920 - imageWidth) / 2), y: Math.round((1080 - imageHeight) / 2), width: imageWidth, height: imageHeight }
        : { x: 480, y: 270, width: 960, height: 540 }
      : type === 'media'
        ? { x: 400, y: 225, width: 1120, height: 630 }
        : { x: 320, y: 180, width: 1280, height: 720 };
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type,
      content: {
        text: resource.name,
        url: version.external_url || '',
        altText: resource.description || resource.name,
        source: resource.name,
        mediaTransform: { fit: 'contain', scale: 1, x: 0, y: 0, cropped: false },
      },
      position: { ...size, zIndex: selectedScreen.elements.length + 1 },
      resource: {
        resource_id: resource.id,
        resource_version_id: version.id,
        usage: { slot_id: `free-${id}`, resource_type: resource.resource_type },
      },
    };
    commitElements([...selectedScreen.elements, element], element.id);
    setPanel('elements');
    setRightPanelOpen(true);
    toast.success(`${resource.name} added directly to the current Screen.`);
  };

  const bindResourceToSelectedElement = (
    resource: StudioResourceSummary,
    selectedVersion?: StudioResourceVersion,
  ) => {
    if (editorReadOnly) {
      toast.error('Start an update before changing this Session.');
      return;
    }
    if (!selectedScreen || !selectedElementId) {
      toast.error('Select a visual or media element before choosing a Resource.');
      return;
    }
    const element = selectedScreen.elements.find((candidate) => candidate.id === selectedElementId);
    if (!element) return;
    if (!canPlaceResource(element.type, resource.resource_type)) {
      toast.error(
        `${resource.resource_type} Resources cannot be placed in a ${element.type} element.`,
      );
      return;
    }
    const version = selectedVersion || resource.latest_version;
    if (!version) {
      toast.error('This Resource has no available version.');
      return;
    }
    const updated: StudioElement = {
      ...element,
      content: {
        ...element.content,
        text: resource.name,
        url: version.external_url || '',
        altText: String(element.content.altText || resource.description || resource.name),
        source: String(element.content.source || resource.name),
        mediaTransform: { fit: 'contain', scale: 1, x: 0, y: 0, cropped: false },
      },
      resource: {
        resource_id: resource.id,
        resource_version_id: version.id,
        usage: { slot_id: element.slotId, resource_type: resource.resource_type || 'resource' },
      },
    };
    commitElements(
      selectedScreen.elements.map((candidate) =>
        candidate.id === updated.id ? updated : candidate,
      ),
      updated.id,
    );
    setPanel('elements');
    toast.success(
      `${resource.name} linked to the selected element. AutoSave will store the change.`,
    );
  };

  const undoElementChange = () => {
    if (!selectedScreen || elementPast.length === 0) return;
    const previous = elementPast[elementPast.length - 1];
    setElementPast((past) => past.slice(0, -1));
    setElementFuture((future) => [selectedScreen.elements, ...future]);
    setSelectedScreen({ ...selectedScreen, elements: previous });
    setSelectedElementId(null);
    // Undo changes the current draft even when AutoSave already persisted the
    // newer state, so the restored state must itself be saved.
    setHasUnsavedChanges(true);
    setSaveStatus('pending');
  };

  const redoElementChange = () => {
    if (!selectedScreen || elementFuture.length === 0) return;
    const next = elementFuture[0];
    setElementFuture((future) => future.slice(1));
    setElementPast((past) => [...past, selectedScreen.elements]);
    setSelectedScreen({ ...selectedScreen, elements: next });
    setSelectedElementId(null);
    setHasUnsavedChanges(true);
    setSaveStatus('pending');
  };

  const saveScreenDraft = async (source: 'autosave' | 'manual' | 'navigation' = 'manual') => {
    const draft = selectedScreenRef.current;
    if (!draft || !hasUnsavedChanges || editorReadOnly) return true;
    if (!online) {
      setSaveStatus('offline');
      if (source !== 'autosave')
        toast.error('You are offline. Reconnect before leaving this Screen.');
      return false;
    }
    if (saveInFlightRef.current) return false;
    saveInFlightRef.current = true;
    setSavingScreen(true);
    setSaveStatus('saving');
    try {
      const saved = await updateStudioScreen(draft.id, {
        revision_no: latestScreenRevision(draft),
        title: draft.title,
        layout_id: draft.layout_id,
        elements: draft.elements,
        tags: draft.tags,
        screen_settings: draft.screen_settings_json ?? {},
      });
      rememberScreenRevision(saved);
      const currentDraft = selectedScreenRef.current;
      const changedWhileSaving = currentDraft !== draft;
      const synchronizedDraft = currentDraft?.id === saved.id
        ? changedWhileSaving
          ? { ...currentDraft, revision_no: saved.revision_no }
          : saved
        : null;
      if (synchronizedDraft) selectedScreenRef.current = synchronizedDraft;
      setSelectedScreen((current) => current?.id === saved.id ? synchronizedDraft ?? current : current);
      setScreenList((current) => ({
        session_revision_no: saved.session_revision_no,
        screens: current.screens.map((screen) =>
          screen.id === saved.id ? synchronizedDraft ?? saved : screen,
        ),
      }));
      if (!changedWhileSaving) {
        // AutoSave is persistence, not a new editing session. Preserve undo
        // and redo history until the author changes Screen.
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
      } else {
        setSaveStatus('pending');
      }
      if (source === 'manual') toast.success('Screen saved.');
      void loadWorkflow();
      return !changedWhileSaving;
    } catch (requestError) {
      await handleScreenSaveFailure(requestError, draft);
      return false;
    } finally {
      saveInFlightRef.current = false;
      setSavingScreen(false);
    }
  };

  saveDraftRef.current = saveScreenDraft;

  useEffect(() => {
    if (!hasUnsavedChanges || editorReadOnly || savingScreen || saveConflict) return;
    if (!online) {
      setSaveStatus('offline');
      return;
    }
    setSaveStatus('pending');
    const timer = window.setTimeout(() => {
      void saveDraftRef.current('autosave');
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [editorReadOnly, hasUnsavedChanges, online, saveConflict, savingScreen, selectedScreen]);

  useEffect(() => {
    const saveNow = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveDraftRef.current('manual');
      }
    };
    window.addEventListener('keydown', saveNow);
    return () => window.removeEventListener('keydown', saveNow);
  }, []);

  useEffect(() => {
    const historyShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undoElementChange();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        redoElementChange();
      }
    };
    window.addEventListener('keydown', historyShortcut);
    return () => window.removeEventListener('keydown', historyShortcut);
  }, [elementFuture, elementPast, redoElementChange, selectedScreen, undoElementChange]);

  const selectedElementsForClipboard = () => selectedScreen
    ? collectStudioClipboardElements(selectedScreen.elements, selectedElementIds, selectedElementId)
    : [];

  const selectedCharacterFormat = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const node = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement;
    const editor = node?.closest<HTMLElement>('.studio-canvas-rich-text[contenteditable="true"]');
    const elementRoot = editor?.closest<HTMLElement>('[data-element-id]');
    if (!editor || !elementRoot?.dataset.elementId || !editor.contains(range.endContainer)) return null;
    const styleTarget = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement ?? editor;
    const computed = window.getComputedStyle(styleTarget);
    const offsetAt = (container: Node, offset: number) => {
      const prefix = document.createRange();
      prefix.selectNodeContents(editor);
      prefix.setEnd(container, offset);
      return prefix.toString().length;
    };
    return {
      elementId: elementRoot.dataset.elementId,
      text: selection.toString(),
      start: offsetAt(range.startContainer, range.startOffset),
      end: offsetAt(range.endContainer, range.endOffset),
      styles: {
        'font-family': computed.fontFamily,
        'font-size': computed.fontSize,
        'font-weight': computed.fontWeight,
        'font-style': computed.fontStyle,
        'text-decoration-line': computed.textDecorationLine,
        color: computed.color,
        ...(computed.backgroundColor !== 'rgba(0, 0, 0, 0)' ? { 'background-color': computed.backgroundColor } : {}),
      },
    };
  };

  const runNativeTextClipboardCommand = (command: 'copy' | 'cut') => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return false;
    const container = selection.getRangeAt(0).commonAncestorContainer;
    const owner = container instanceof HTMLElement ? container : container.parentElement;
    if (!owner?.closest('.studio-canvas-rich-text, [contenteditable="true"]')) return false;
    return document.execCommand(command);
  };

  const copySelectedElements = () => {
    if (editorReadOnly) return;
    if (runNativeTextClipboardCommand('copy')) return;
    const copied = selectedElementsForClipboard();
    if (!copied.length) return;
    setEditorClipboard(copied);
    toast.success(`${copied.length === 1 ? 'Element' : `${copied.length} elements`} copied.`);
  };

  const cutSelectedElements = () => {
    if (!selectedScreen || editorReadOnly) return;
    if (runNativeTextClipboardCommand('cut')) return;
    const copied = selectedElementsForClipboard();
    if (!copied.length) return;
    const copiedIds = new Set(copied.map((element) => element.id));
    setEditorClipboard(copied);
    commitElements(selectedScreen.elements.filter((element) => !copiedIds.has(element.id)), null);
    toast.success(`${copied.length === 1 ? 'Element' : `${copied.length} elements`} cut to the Studio clipboard.`);
  };

  const pasteClipboard = (mode: StudioPasteMode = 'source-formatting') => {
    if (!selectedScreen || editorReadOnly || !editorClipboard.length) return;
    const pasted = pasteStudioClipboardElements(editorClipboard, mode);
    commitElements([...selectedScreen.elements, ...pasted], pasted.at(-1)?.id ?? null);
    setSelectedElementIds(pasted.map((element) => element.id));
    if (mode === 'picture' && pasted.length === 1) setActiveRibbonTab('picture-format');
    toast.success(`${pasted.length === 1 ? 'Element' : `${pasted.length} elements`} pasted using ${mode.replaceAll('-', ' ')}.`);
  };

  const toggleFormatPainter = (persistent: boolean) => {
    if (formatPainter) {
      setFormatPainter(null);
      formatPainterAppliedTargetRef.current = null;
      toast.success('Format Painter stopped.');
      return;
    }
    const source = selectedScreen?.elements.find((element) => element.id === selectedElementId);
    if (!source || editorReadOnly) return;
    const characterFormat = selectedCharacterFormat();
    setFormatPainter({
      sourceElementId: source.id,
      format: copyStudioElementFormat(source),
      persistent,
      ...(characterFormat?.elementId === source.id ? { textRangeFormat: characterFormat.styles, sourceSelectionText: characterFormat.text } : {}),
    });
    formatPainterAppliedTargetRef.current = null;
    toast.success(persistent
      ? 'Format Painter locked. Select multiple targets; press Escape when finished.'
      : 'Format Painter ready. Select one target element.');
  };

  useEffect(() => {
    if (!formatPainter || formatPainter.textRangeFormat || !selectedElementId || selectedElementId === formatPainter.sourceElementId) return;
    if (formatPainterAppliedTargetRef.current === selectedElementId) return;
    const target = selectedScreen?.elements.find((element) => element.id === selectedElementId);
    if (!target || editorReadOnly) return;
    if (studioElementFormatFamily(target) !== formatPainter.format.family) {
      toast.error(`Format Painter requires a compatible ${formatPainter.format.family} target.`);
      return;
    }
    formatPainterAppliedTargetRef.current = selectedElementId;
    commitElements(
      selectedScreen.elements.map((element) => element.id === target.id
        ? applyStudioElementFormat(element, formatPainter.format)
        : element),
      target.id,
    );
    toast.success('Formatting applied.');
    if (!formatPainter.persistent) setFormatPainter(null);
  }, [commitElements, editorReadOnly, formatPainter, selectedElementId, selectedScreen]);

  useEffect(() => {
    document.body.classList.toggle('studio-format-painter-active', Boolean(formatPainter));
    return () => document.body.classList.remove('studio-format-painter-active');
  }, [formatPainter]);

  useEffect(() => {
    if (!formatPainter?.textRangeFormat) return;
    let timer: number | null = null;
    const paintSelectedText = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const target = selectedCharacterFormat();
        if (!target || !formatPainter.textRangeFormat) return;
        if (target.elementId === formatPainter.sourceElementId && target.text === formatPainter.sourceSelectionText) return;
        const signature = `text:${target.elementId}:${target.text}`;
        if (formatPainterAppliedTargetRef.current === signature) return;
        formatPainterAppliedTargetRef.current = signature;
        dispatchStudioTextCommand(target.elementId, {
          type: 'apply-character-format',
          styles: formatPainter.textRangeFormat,
          range: { start: target.start, end: target.end },
        });
        toast.success('Character formatting applied to the selected text.');
        if (!formatPainter.persistent) setFormatPainter(null);
      }, 0);
    };
    document.addEventListener('selectionchange', paintSelectedText);
    return () => {
      document.removeEventListener('selectionchange', paintSelectedText);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [formatPainter]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    const commands = (event: KeyboardEvent) => {
      const typingTarget = isTypingTarget(event.target);
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const selected = selectedScreen?.elements.find((element) => element.id === selectedElementId);

      if (!typingTarget && !modifier && !event.altKey && key === 's' && !spectropyShortcutHeldRef.current) {
        spectropyShortcutHeldRef.current = true;
        event.preventDefault();
        return;
      }

      if (!typingTarget && spectropyShortcutHeldRef.current && key !== 's') {
        event.preventDefault();
        spectropyShortcutHeldRef.current = false;
        if (key === 'a' && selectedScreen) {
          const ids = selectedScreen.elements.map((element) => element.id);
          setSelectedElementIds(ids);
          setSelectedElementId(ids.at(-1) ?? null);
        } else if (key === 'c' && selected) copySelectedElements();
        else if (key === 'x' && selected && !editorReadOnly) cutSelectedElements();
        else if (key === 'v' && editorClipboard.length && selectedScreen && !editorReadOnly) pasteClipboard('source-formatting');
        else if (key === 'd' && selected && !editorReadOnly) duplicateElement(selected.id);
        else if (key === 'g' && selectedElementIds.length > 1 && !editorReadOnly) groupSelectedElements();
        else if (key === 'u' && selectedHasGroup && !editorReadOnly) ungroupSelectedElements();
        else if (key === 'z' && !editorReadOnly) undoElementChange();
        else if (key === 'y' && !editorReadOnly) redoElementChange();
        else if (key === 'p') {
          if (event.shiftKey) void openPresentation();
          else void openPreview();
        }
        else if (key === 'r') openScreenScript();
        else if (key === 'l') openSelectionPane();
        else if (key === 'enter' && !editorReadOnly) void saveDraftRef.current('manual');
        return;
      }

      if (typingTarget || editorReadOnly) return;

      if (event.key === 'F5') {
        event.preventDefault();
        if (event.shiftKey) void openPresentation();
        else void openPreview();
        return;
      }
      if (modifier && key === 'a' && selectedScreen) {
        event.preventDefault();
        const ids = selectedScreen.elements.map((element) => element.id);
        setSelectedElementIds(ids);
        setSelectedElementId(ids.at(-1) ?? null);
        return;
      }
      if (key === 'escape') {
        if (formatPainter) {
          setFormatPainter(null);
          formatPainterAppliedTargetRef.current = null;
          return;
        }
        setSelectedElementId(null);
        return;
      }
      if (modifier && key === 'c' && selected) {
        event.preventDefault();
        copySelectedElements();
        return;
      }
      if (modifier && key === 'x' && selected) {
        event.preventDefault();
        cutSelectedElements();
        return;
      }
      if (modifier && key === 'v' && editorClipboard.length && selectedScreen) {
        event.preventDefault();
        pasteClipboard('source-formatting');
        return;
      }
      if (modifier && key === 'd' && selected) {
        event.preventDefault();
        duplicateElement(selected.id);
        return;
      }
      if ((key === 'delete' || key === 'backspace') && selected) {
        event.preventDefault();
        removeElement(selected.id);
        return;
      }
      if (selected && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        const bounds = {
          x: Number(selected.position.x) || 0,
          y: Number(selected.position.y) || 0,
          width: Number(selected.position.width) || 400,
          height: Number(selected.position.height) || 240,
        };
        if (key === 'arrowleft') bounds.x = Math.max(0, bounds.x - amount);
        if (key === 'arrowright') bounds.x = Math.min(1920 - bounds.width, bounds.x + amount);
        if (key === 'arrowup') bounds.y = Math.max(0, bounds.y - amount);
        if (key === 'arrowdown') bounds.y = Math.min(1080 - bounds.height, bounds.y + amount);
        changeElementBounds(selected.id, bounds);
      }
    };
    const releaseSpectropyShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 's') spectropyShortcutHeldRef.current = false;
    };
    const pasteExternal = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target) || editorClipboard.length) return;
      const images = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/'),
      );
      if (!images.length) return;
      event.preventDefault();
      addDroppedFiles(images, { x: 300, y: 260 });
    };
    window.addEventListener('keydown', commands);
    window.addEventListener('keyup', releaseSpectropyShortcut);
    window.addEventListener('paste', pasteExternal);
    return () => {
      window.removeEventListener('keydown', commands);
      window.removeEventListener('keyup', releaseSpectropyShortcut);
      window.removeEventListener('paste', pasteExternal);
    };
    // Command callbacks intentionally refresh with the editor state dependencies below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorClipboard, editorReadOnly, formatPainter, selectedElementId, selectedElementIds, selectedScreen]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges && !savingScreen) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [hasUnsavedChanges, savingScreen]);

  const requestScreenAction = async (action: 'remove-layout' | 'delete-screen') => {
    if (!selectedScreen || editorReadOnly) return;
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;
    setScreenAction(action);
  };

  const openRenameScreen = async () => {
    if (!selectedScreen || editorReadOnly) return;
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;
    setRenameTitle(screenDisplayTitle(selectedScreen));
    setRenameOpen(true);
  };

  const renameScreen = async () => {
    if (!selectedScreen || renamingScreen || editorReadOnly) return;
    const title = renameTitle.trim();
    if (!title) {
      toast.error('Screen title is required.');
      return;
    }
    if (title === selectedScreen.title) {
      setRenameOpen(false);
      return;
    }
    setRenamingScreen(true);
    setError(null);
    try {
      const saved = await updateStudioScreen(selectedScreen.id, {
        revision_no: latestScreenRevision(selectedScreen),
        title,
        layout_id: selectedScreen.layout_id,
        elements: selectedScreen.elements,
        tags: selectedScreen.tags,
      });
      rememberScreenRevision(saved);
      selectedScreenRef.current = saved;
      setSelectedScreen(saved);
      setScreenList((current) => ({
        session_revision_no: saved.session_revision_no,
        screens: current.screens.map((screen) => (screen.id === saved.id ? saved : screen)),
      }));
      setRenameOpen(false);
      setSaveStatus('saved');
      toast.success('Screen renamed.');
      await loadWorkflow();
    } catch (requestError) {
      await handleScreenSaveFailure(requestError, { ...selectedScreen, title });
    } finally {
      setRenamingScreen(false);
    }
  };

  const confirmScreenAction = async () => {
    if (!selectedScreen || !screenAction || screenActionBusy || editorReadOnly) return;
    setScreenActionBusy(true);
    setError(null);
    try {
      if (screenAction === 'remove-layout') {
        const saved = await updateStudioScreen(selectedScreen.id, {
          revision_no: latestScreenRevision(selectedScreen),
          title: selectedScreen.title,
          layout_id: null,
          elements: selectedScreen.elements,
          tags: selectedScreen.tags,
        });
        rememberScreenRevision(saved);
        selectedScreenRef.current = saved;
        setSelectedScreen(saved);
        setScreenList((current) => ({
          session_revision_no: saved.session_revision_no,
          screens: current.screens.map((screen) => (screen.id === saved.id ? saved : screen)),
        }));
        setSelectedElementId(null);
        setElementPast([]);
        setElementFuture([]);
        setHasUnsavedChanges(false);
        setPanel('elements');
        toast.success('Layout removed. Existing elements are preserved as freeform content.');
      } else {
        const deleted = await deleteStudioScreen(selectedScreen.id);
        const remaining = screenList.screens.filter((screen) => screen.id !== selectedScreen.id);
        setScreenList({ session_revision_no: deleted.session_revision_no, screens: remaining });
        setSelectedScreen(null);
        setSelectedElementId(null);
        setElementPast([]);
        setElementFuture([]);
        setHasUnsavedChanges(false);
        if (remaining[0]) setSearchParams({ screen: String(remaining[0].id) });
        else setSearchParams({});
        toast.success('Screen deleted successfully.');
      }
      setScreenAction(null);
      await loadWorkflow();
    } catch (requestError) {
      if (screenAction === 'remove-layout') {
        await handleScreenSaveFailure(requestError, { ...selectedScreen, layout_id: null });
      } else {
        const response = getStudioErrorMessage(requestError);
        setError(response);
        toast.error(response);
      }
    } finally {
      setScreenActionBusy(false);
    }
  };

  const openScreenReorder = () => {
    const ids = screenList.screens.map((screen) => screen.id);
    setReorderIds(ids);
    reorderIdsRef.current = ids;
    setLeftPanelOpen(true);
  };

  const openScreenScript = () => {
    setScriptOverlayOpen(true);
  };

  const moveDraggedScreen = (event: React.PointerEvent) => {
    if (!draggingScreenId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-reorder-screen-id]');
    const targetId = Number(target?.dataset.reorderScreenId);
    if (!Number.isInteger(targetId) || targetId === draggingScreenId) return;
    setReorderIds((current) => {
      const fromIndex = current.indexOf(draggingScreenId);
      const targetIndex = current.indexOf(targetId);
      if (fromIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      next.splice(fromIndex, 1);
      next.splice(targetIndex, 0, draggingScreenId);
      reorderIdsRef.current = next;
      return next;
    });
  };

  const saveScreenOrder = async (orderedIds = reorderIdsRef.current) => {
    if (!sessionId || editorReadOnly || reorderingScreens || orderedIds.length === 0) return;
    setReorderingScreens(true);
    setError(null);
    try {
      const result = await reorderStudioScreens(
        sessionId,
        screenList.session_revision_no,
        orderedIds,
      );
      const byId = new Map(screenList.screens.map((screen) => [screen.id, screen]));
      const ordered = result.screen_ids.map((id, index) => ({
        ...byId.get(id)!,
        display_order: index,
      }));
      setScreenList({ session_revision_no: result.session_revision_no, screens: ordered });
      toast.success('Screens reordered successfully.');
      await loadWorkflow();
    } catch (requestError) {
      const response = getStudioErrorMessage(requestError);
      setError(response);
      toast.error(response);
    } finally {
      setReorderingScreens(false);
    }
  };

  const finishScreenDrag = () => {
    if (!draggingScreenId) return;
    setDraggingScreenId(null);
    const previousOrder = screenList.screens.map((screen) => screen.id);
    if (previousOrder.join(',') !== reorderIdsRef.current.join(','))
      void saveScreenOrder(reorderIdsRef.current);
  };

  const selectedElement =
    selectedScreen?.elements.find((element) => element.id === selectedElementId) ?? null;
  const selectedElementType = selectedElement?.type ?? null;
  const selectedResourceType = String(selectedElement?.resource?.usage?.resource_type || '');
  const selectedVisualType = String(selectedElement?.content?.visualType || '');
  const selectedModel3DSettings = model3DSettingsFrom(selectedElement?.content);
  const selectedDiagramContent = selectedElement && isSmartDiagramContent(selectedElement.content) ? selectedElement.content : null;
  const selectedDiagramNode = selectedDiagramContent?.nodes.find((node) => node.id === selectedDiagramNodeId)
    ?? selectedDiagramContent?.nodes[0]
    ?? null;
  const updateSelectedDiagram = (changes: Partial<NonNullable<typeof selectedDiagramContent>>) => {
    if (!selectedElement || !selectedDiagramContent || editorReadOnly) return;
    updateElement({ ...selectedElement, content: { ...selectedDiagramContent, ...changes } });
  };
  const replaceSelectedDiagramNodes = (nodes: SmartDiagramNode[]) => updateSelectedDiagram({ nodes: rebuildDiagramParents(nodes) });
  const updateSelectedDiagramNode = (changes: Partial<SmartDiagramNode>) => {
    if (!selectedDiagramContent || !selectedDiagramNode) return;
    replaceSelectedDiagramNodes(selectedDiagramContent.nodes.map((node) => node.id === selectedDiagramNode.id ? { ...node, ...changes } : node));
  };
  const addSelectedDiagramNode = (placement: 'before' | 'after' | 'child' | 'assistant') => {
    if (!selectedDiagramContent) return;
    const anchor = selectedDiagramNode ?? selectedDiagramContent.nodes.at(-1);
    const anchorIndex = anchor ? selectedDiagramContent.nodes.findIndex((node) => node.id === anchor.id) : -1;
    const node = createSmartDiagramNode('New item', placement === 'child' ? Math.min(5, (anchor?.level ?? -1) + 1) : anchor?.level ?? 0);
    if (placement === 'assistant') { node.level = Math.min(5, (anchor?.level ?? -1) + 1); node.role = 'assistant'; }
    const nodes = [...selectedDiagramContent.nodes];
    nodes.splice(placement === 'before' ? Math.max(0, anchorIndex) : anchorIndex + 1, 0, node);
    replaceSelectedDiagramNodes(nodes);
    setSelectedDiagramNodeId(node.id);
  };
  const changeSelectedDiagramNodeLevel = (delta: -1 | 1) => {
    if (!selectedDiagramContent || !selectedDiagramNode) return;
    const index = selectedDiagramContent.nodes.findIndex((node) => node.id === selectedDiagramNode.id);
    const maximum = index > 0 ? Math.min(5, selectedDiagramContent.nodes[index - 1].level + 1) : 0;
    const level = Math.max(0, Math.min(maximum, selectedDiagramNode.level + delta));
    replaceSelectedDiagramNodes(selectedDiagramContent.nodes.map((node) => node.id === selectedDiagramNode.id ? { ...node, level } : node));
  };
  const moveSelectedDiagramNode = (delta: -1 | 1) => {
    if (!selectedDiagramContent || !selectedDiagramNode) return;
    const index = selectedDiagramContent.nodes.findIndex((node) => node.id === selectedDiagramNode.id);
    const target = index + delta;
    if (target < 0 || target >= selectedDiagramContent.nodes.length) return;
    const nodes = [...selectedDiagramContent.nodes];
    [nodes[index], nodes[target]] = [nodes[target], nodes[index]];
    replaceSelectedDiagramNodes(nodes);
  };
  const updateSelectedModel3D = (changes: Partial<Model3DSettings>) => {
    if (!selectedElement || editorReadOnly) return;
    changeElementContent(selectedElement.id, { model3d: { ...selectedModel3DSettings, ...changes } });
  };
  const ribbonTabs = useMemo(() => studioRibbonTabs({
    elementType: selectedElementType,
    resourceType: selectedResourceType,
    visualType: selectedVisualType,
    selectionCount: selectedElementIds.length,
    drawingActive: false,
  }), [selectedElementIds.length, selectedElementType, selectedResourceType, selectedVisualType]);
  const contextualRibbonTabKey = ribbonTabs
    .filter((tab) => tab.contextual)
    .map((tab) => tab.id)
    .join('|');
  useEffect(() => {
    const contextualIds = ribbonTabs
      .filter((tab) => tab.contextual)
      .map((tab) => tab.id);
    setActiveRibbonTab((current) => {
      if (contextualIds[0]) return contextualIds[0];
      return ribbonTabs.some((tab) => tab.id === current) ? current : 'home';
    });
  }, [contextualRibbonTabKey, ribbonTabs]);
  const contextualFillColor = selectedElement
    ? String(selectedElement.content[selectedElement.type === 'shape' ? 'fill' : 'backgroundColor'] || '#ffffff')
    : String(selectedScreen?.screen_settings_json?.backgroundColor || '#f9fcff');
  const setContextualFillColor = (color: string) => {
    if (!selectedScreen || editorReadOnly) return;
    if (selectedElement) {
      const key = selectedElement.type === 'shape' ? 'fill' : 'backgroundColor';
      updateElement({ ...selectedElement, content: { ...selectedElement.content, [key]: color } });
      return;
    }
    setSelectedScreen({
      ...selectedScreen,
      screen_settings_json: { ...(selectedScreen.screen_settings_json ?? {}), backgroundColor: color },
    });
    setHasUnsavedChanges(true);
  };
  const setScreenBackgroundColor = (color: string) => {
    if (!selectedScreen || editorReadOnly) return;
    setSelectedScreen({
      ...selectedScreen,
      screen_settings_json: { ...(selectedScreen.screen_settings_json ?? {}), backgroundColor: color },
    });
    setHasUnsavedChanges(true);
  };
  const chooseRibbonShape = (kind: string) => {
    if (selectedElement?.type === 'shape' || selectedElement?.type === 'text') {
      updateElement({ ...selectedElement, content: { ...selectedElement.content, kind } });
      return;
    }
    addShapeElement(kind);
  };
  const updateSelectedTable = (changes: Record<string, unknown>) => {
    if (!selectedElement || selectedElement.type !== 'table' || editorReadOnly) return;
    updateElement({ ...selectedElement, content: { ...selectedElement.content, ...changes } });
  };
  const runTableAction = (action: import('./components/StudioTableElement').StudioTableAction) => {
    if (!selectedElement || selectedElement.type !== 'table' || editorReadOnly) return;
    window.dispatchEvent(new CustomEvent('studio-table-control', { detail: { elementId: selectedElement.id, action } }));
  };
  const applyQuickAnimation = (effect: string, append = false) => {
    if (!selectedElement || editorReadOnly) return;
    const saved = selectedElement.content.animation && typeof selectedElement.content.animation === 'object'
      ? selectedElement.content.animation as Record<string, unknown>
      : {};
    const existingEffects = Array.isArray(saved.effects) ? saved.effects as Array<Record<string, unknown>> : [];
    const screenSequenceLength = buildStudioAnimationSequence(selectedScreen?.elements ?? []).length;
    const selectedIndex = Math.max(0, existingEffects.findIndex((candidate) => String(candidate.id) === selectedAnimationEffectId));
    const currentEffect = existingEffects[selectedIndex];
    const nextEffect = {
      ...(!append && currentEffect ? currentEffect : {}),
      id: `animation-${Date.now()}`,
      effect,
      duration: !append && currentEffect ? Number(currentEffect.duration) || 0.8 : 0.8,
      delay: !append && currentEffect ? Number(currentEffect.delay) || 0 : 0,
      start: !append && currentEffect ? String(currentEffect.start || 'on-click') : 'on-click',
      sequenceOrder: append
        ? screenSequenceLength
        : Number.isFinite(Number(currentEffect?.sequenceOrder))
          ? Number(currentEffect?.sequenceOrder)
          : screenSequenceLength,
    };
    const nextEffects = append
      ? [...existingEffects, nextEffect]
      : existingEffects.length
        ? existingEffects.map((candidate, index) => index === selectedIndex ? nextEffect : candidate)
        : [nextEffect];
    updateElement({
      ...selectedElement,
      content: {
        ...selectedElement.content,
        animation: { ...saved, effects: nextEffects, effect: String(nextEffects[0]?.effect || 'none'), duration: Number(nextEffects[0]?.duration) || 0.8, delay: Number(nextEffects[0]?.delay) || 0 },
      },
    });
    setSelectedAnimationEffectId(String(nextEffect.id));
    setAnimationPreview({ elementId: selectedElement.id, token: Date.now() });
  };
  const selectedAnimationEffects = (() => {
    const animation = selectedElement?.content.animation;
    if (!animation || typeof animation !== 'object') return [] as Array<Record<string, unknown>>;
    const saved = animation as Record<string, unknown>;
    if (Array.isArray(saved.effects)) return saved.effects as Array<Record<string, unknown>>;
    const effect = String(saved.effect || 'none');
    return effect === 'none' ? [] : [{ id: 'legacy', effect, duration: Number(saved.duration) || 0.8, delay: Number(saved.delay) || 0, start: 'on-click' }];
  })();
  const selectedAnimationEffectIndex = Math.max(0, selectedAnimationEffects.findIndex((effect) => String(effect.id) === selectedAnimationEffectId));
  const activeSelectedAnimationEffect = selectedAnimationEffects[selectedAnimationEffectIndex];
  const updateSelectedAnimationEffect = (changes: Record<string, unknown>, index = selectedAnimationEffectIndex) => {
    if (!selectedElement || !selectedAnimationEffects[index]) return;
    const effects = selectedAnimationEffects.map((effect, effectIndex) => effectIndex === index ? { ...effect, ...changes } : effect);
    const first = effects[0];
    updateElement({ ...selectedElement, content: { ...selectedElement.content, animation: { ...(selectedElement.content.animation as Record<string, unknown> | undefined), effects, effect: first?.effect || 'none', duration: first?.duration || 0.8, delay: first?.delay || 0 } } });
  };
  const removeSelectedAnimation = () => {
    if (!selectedElement || !activeSelectedAnimationEffect) return;
    const effects = selectedAnimationEffects.filter((_, index) => index !== selectedAnimationEffectIndex);
    const first = effects[0];
    updateElement({ ...selectedElement, content: { ...selectedElement.content, animation: { ...(selectedElement.content.animation as Record<string, unknown> | undefined), effects, effect: first?.effect || 'none', duration: first?.duration || 0.8, delay: first?.delay || 0 } } });
    setSelectedAnimationEffectId(effects[Math.min(selectedAnimationEffectIndex, effects.length - 1)]?.id ? String(effects[Math.min(selectedAnimationEffectIndex, effects.length - 1)].id) : null);
  };
  const moveSelectedAnimation = (delta: number, index = selectedAnimationEffectIndex) => {
    if (!selectedElement) return;
    const target = index + delta;
    if (target < 0 || target >= selectedAnimationEffects.length) return;
    const effects = [...selectedAnimationEffects];
    [effects[index], effects[target]] = [effects[target], effects[index]];
    const first = effects[0];
    updateElement({ ...selectedElement, content: { ...selectedElement.content, animation: { ...(selectedElement.content.animation as Record<string, unknown> | undefined), effects, effect: first?.effect || 'none', duration: first?.duration || 0.8, delay: first?.delay || 0 } } });
    setSelectedAnimationEffectId(String(effects[target].id));
  };
  const openAnimationPane = () => {
    setPanel('animations');
    setRightPanelOpen(true);
  };
  const openSelectionPane = () => {
    setPanel('layers');
    setRightPanelOpen(true);
  };
  const alignSelectedElement = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedElement) return;
    const width = Number(selectedElement.position.width) || 80;
    const height = Number(selectedElement.position.height) || 60;
    const current = { x: Number(selectedElement.position.x) || 0, y: Number(selectedElement.position.y) || 0, width, height };
    if (alignment === 'left') current.x = 0;
    if (alignment === 'center') current.x = Math.round((1920 - width) / 2);
    if (alignment === 'right') current.x = Math.max(0, 1920 - width);
    if (alignment === 'top') current.y = 0;
    if (alignment === 'middle') current.y = Math.round((1080 - height) / 2);
    if (alignment === 'bottom') current.y = Math.max(0, 1080 - height);
    changeElementBounds(selectedElement.id, current);
  };
  const allowedResourceTypes = resourceTypesForObject(selectedElement?.type);
  const selectElementAndOpenControls = (elementId: string, additive = false) => {
    if (additive) {
      setSelectedElementIds((current) => {
        const next = current.includes(elementId)
          ? current.filter((id) => id !== elementId)
          : [...current, elementId];
        setSelectedElementId(next.at(-1) ?? null);
        return next;
      });
    } else {
      const element = selectedScreen?.elements.find((candidate) => candidate.id === elementId);
      const groupId = typeof element?.position.groupId === 'string' ? element.position.groupId : null;
      const next = groupId
        ? selectedScreen?.elements.filter((candidate) => candidate.position.groupId === groupId).map((candidate) => candidate.id) ?? [elementId]
        : [elementId];
      setSelectedElementIds((current) =>
        current.length === next.length && current.every((id, index) => id === next[index])
          ? current
          : next,
      );
      setSelectedElementId(elementId);
    }
    const element = selectedScreen?.elements.find((candidate) => candidate.id === elementId);
    if (element?.type !== 'math') {
      const controlWindow = window as Window & { __studioActiveEquationElementId?: string };
      delete controlWindow.__studioActiveEquationElementId;
    }
    setSelectedLayoutSlotId(element?.slotId ?? null);
  };
  const selectElementsFromMarquee = (elementIds: string[], additive = false) => {
    const expandedIds = selectedScreen?.elements.reduce<string[]>((ids, element) => {
      if (!elementIds.includes(element.id)) return ids;
      const groupId = typeof element.position.groupId === 'string' ? element.position.groupId : null;
      if (!groupId) return ids.includes(element.id) ? ids : [...ids, element.id];
      for (const member of selectedScreen.elements) {
        if (member.position.groupId === groupId && !ids.includes(member.id)) ids.push(member.id);
      }
      return ids;
    }, []) ?? elementIds;
    setSelectedElementIds((current) => {
      const next = additive ? [...new Set([...current, ...expandedIds])] : expandedIds;
      setSelectedElementId(next.at(-1) ?? null);
      return next;
    });
    setSelectedLayoutSlotId(null);
  };
  const groupSelectedElements = () => {
    if (!selectedScreen || selectedElementIds.length < 2 || editorReadOnly) return;
    const groupId = `group-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    commitElements(selectedScreen.elements.map((element) => selectedElementIds.includes(element.id)
      ? { ...element, position: { ...element.position, groupId } }
      : element));
    setSelectedElementIds(selectedElementIds);
    setSelectedElementId(selectedElementIds.at(-1) ?? null);
    toast.success(`${selectedElementIds.length} elements grouped.`);
  };
  const ungroupSelectedElements = () => {
    if (!selectedScreen || editorReadOnly) return;
    const groupIds = new Set(selectedScreen.elements
      .filter((element) => selectedElementIds.includes(element.id) && typeof element.position.groupId === 'string')
      .map((element) => String(element.position.groupId)));
    if (!groupIds.size) return;
    commitElements(selectedScreen.elements.map((element) => {
      if (!groupIds.has(String(element.position.groupId || ''))) return element;
      const position = { ...element.position };
      delete position.groupId;
      return { ...element, position };
    }));
    toast.success('Elements ungrouped.');
  };
  const selectedHasGroup = Boolean(selectedScreen?.elements.some((element) =>
    selectedElementIds.includes(element.id) && typeof element.position.groupId === 'string'));
  const studioTools = [
    { id: 'resources', label: 'Resources', icon: <Upload size={17} /> },
    { id: 'elements', label: 'Elements', icon: <Boxes size={17} /> },
    { id: 'animations', label: 'Animations', icon: <Sparkles size={17} /> },
    { id: 'transitions', label: 'Transitions', icon: <GalleryHorizontalEnd size={17} /> },
    { id: 'shapes', label: 'Shapes', icon: <Shapes size={17} /> },
    { id: 'diagrams', label: 'Smart Diagram', icon: <Network size={17} /> },
    { id: 'drawing', label: 'Drawing', icon: <Paintbrush size={17} /> },
  ] as const;
  const toggleStudioTool = (tool: (typeof studioTools)[number]['id']) => {
    setPanel(tool);
    setRightPanelOpen((open) => panel === tool ? !open : true);
  };
  const openRibbonTool = (tool: (typeof studioTools)[number]['id']) => () =>
    toggleStudioTool(tool);
  const elementCommands = (primaryTool: (typeof studioTools)[number]['id']): StudioRibbonGroup[] => [
    {
      id: 'selected-element-properties',
      label: 'Properties',
      commands: [
        { id: `open-${primaryTool}`, label: 'Properties', icon: <SlidersHorizontal size={17} />, onExecute: openRibbonTool(primaryTool), active: rightPanelOpen && panel === primaryTool },
        { id: 'element-animations', label: 'Animations', icon: <Sparkles size={17} />, onExecute: openRibbonTool('animations'), active: rightPanelOpen && panel === 'animations' },
      ],
    },
    {
      id: 'selected-element-edit',
      label: 'Edit',
      commands: [
        { id: 'duplicate-element', label: 'Duplicate', icon: <Boxes size={17} />, disabled: editorReadOnly || !selectedElement, onExecute: () => { if (selectedElement) duplicateElement(selectedElement.id); } },
        { id: 'delete-element', label: 'Delete', icon: <Trash2 size={17} />, danger: true, disabled: editorReadOnly || !selectedElement, onExecute: () => { if (selectedElement) removeElement(selectedElement.id); } },
      ],
    },
  ];
  const drawingToolIcons = {
    pen: PenLine,
    pencil: PencilIcon,
    fountain: Brush,
    highlighter: Highlighter,
    laser: Sparkles,
    eraser: Eraser,
    'object-eraser': Trash2,
  } satisfies Record<StudioDrawingTool, typeof PenLine>;
  const drawingRibbonGroups: StudioRibbonGroup[] = [
    {
      id: 'draw-tools', label: 'Drawing Tools', commands: [
        { id: 'draw-select', label: 'Select', icon: <MousePointer2 size={17} />, onExecute: () => setActiveRibbonTab('home') },
        ...(['pen', 'pencil', 'fountain', 'highlighter', 'laser', 'eraser', 'object-eraser'] as StudioDrawingTool[]).map((tool) => {
          const Icon = drawingToolIcons[tool];
          return { id: `draw-${tool}`, label: tool === 'fountain' ? 'Fountain Pen' : tool === 'laser' ? 'Laser Pointer' : tool === 'eraser' ? 'Annotation Eraser' : tool === 'object-eraser' ? 'Object Eraser' : tool[0].toUpperCase() + tool.slice(1), icon: <Icon size={17} />, active: drawingTool === tool, onExecute: () => setDrawingTool(tool) };
        }),
      ],
    },
    {
      id: 'draw-colours', label: 'Colours', content: <div className="flex items-center gap-1 px-1"><label className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border" title="Custom ink colour"><span className="h-5 w-5 rounded-full border" style={{ backgroundColor: drawingColor }} /><input type="color" value={drawingColor} onChange={(event) => setDrawingColor(event.target.value)} className="absolute inset-0 opacity-0" aria-label="Custom ink colour" /></label>{['#0f172a', '#2563eb', '#ef4444', '#16a34a', '#f59e0b', '#9333ea'].map((color) => <button key={color} type="button" title={`Use ${color}`} aria-label={`Use ${color}`} onClick={() => setDrawingColor(color)} className={`h-6 w-6 shrink-0 rounded-full border-2 ${drawingColor === color ? 'border-slate-900 ring-1 ring-slate-300' : 'border-white shadow'}`} style={{ backgroundColor: color }} />)}</div>,
    },
    {
      id: 'draw-stroke', label: 'Stroke', content: <div className="grid w-48 shrink-0 gap-1 px-1 text-[9px] font-semibold text-slate-600"><label className="grid grid-cols-[44px_1fr_36px] items-center gap-2"><span>Width</span><input type="range" min="1" max="28" value={drawingWidth} onChange={(event) => setDrawingWidth(Number(event.target.value))} className="min-w-0 w-full" /><span className="whitespace-nowrap text-right tabular-nums">{drawingWidth}px</span></label><label className="grid grid-cols-[44px_1fr_36px] items-center gap-2"><span>Opacity</span><input type="range" min="0.1" max="1" step="0.1" value={drawingOpacity} onChange={(event) => setDrawingOpacity(Number(event.target.value))} className="min-w-0 w-full" /><span className="whitespace-nowrap text-right tabular-nums">{Math.round(drawingOpacity * 100)}%</span></label></div>,
    },
    {
      id: 'draw-history', label: 'Ink History', commands: [
        { id: 'undo-ink', label: 'Undo Ink', icon: <Undo2 size={17} />, disabled: drawingPast.length === 0, onExecute: undoDrawing },
        { id: 'redo-ink', label: 'Redo Ink', icon: <Redo2 size={17} />, disabled: drawingFuture.length === 0, onExecute: redoDrawing },
        { id: 'clear-ink', label: 'Clear Ink', icon: <Trash2 size={17} />, danger: true, disabled: authoredDrawingStrokes(selectedScreen).length === 0, onExecute: () => setAuthoredDrawings([]) },
      ],
    },
  ];
  const ribbonGroups: StudioRibbonGroup[] = (() => {
    switch (activeRibbonTab) {
      case 'home':
        return [
          {
            id: 'clipboard',
            label: 'Clipboard',
            content: (
              <StudioClipboardGroup
                canPaste={!editorReadOnly && editorClipboard.length > 0 && Boolean(selectedScreen)}
                canCopy={!editorReadOnly && Boolean(selectedElementIds.length || selectedElement)}
                canCut={!editorReadOnly && Boolean(selectedElementIds.length || selectedElement)}
                formatPainterActive={Boolean(formatPainter)}
                formatPainterLocked={formatPainter?.persistent === true}
                availablePasteModes={studioPasteModesForElements(editorClipboard)}
                onPaste={pasteClipboard}
                onCopy={copySelectedElements}
                onCut={cutSelectedElements}
                onFormatPainter={toggleFormatPainter}
              />
            ),
          },
          {
            id: 'history', label: 'History', commands: [
              { id: 'go-back', label: 'Back', icon: <ArrowLeft size={17} />, onExecute: () => void leaveEditor() },
              { id: 'undo', label: 'Undo', icon: <Undo2 size={17} />, disabled: editorReadOnly || elementPast.length === 0, onExecute: undoElementChange },
              { id: 'redo', label: 'Redo', icon: <Redo2 size={17} />, disabled: editorReadOnly || elementFuture.length === 0, onExecute: redoElementChange },
              { id: 'save-now', label: 'Save', icon: savingScreen ? <LoaderCircle size={17} className="animate-spin" aria-label="Saving" /> : <Save size={17} />, disabled: editorReadOnly || !hasUnsavedChanges || savingScreen, onExecute: () => void saveScreenDraft('manual') },
            ],
            content: <span className="inline-flex h-8 w-20 shrink-0 items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-semibold text-slate-600" title={`AutoSave: ${saveStatus}`}>{saveStatus === 'saving' ? <LoaderCircle size={13} className="animate-spin" /> : saveStatus === 'saved' ? <Check size={13} className="text-emerald-600" /> : saveStatus === 'offline' || saveStatus === 'error' ? <CloudOff size={13} className="text-amber-700" /> : <Cloud size={13} />}<span className="w-11 text-center">{saveStatus === 'idle' ? 'AutoSave' : saveStatus}</span></span>,
          },
          {
            id: 'screen', label: 'Screen', commands: [
              { id: 'add-screen', label: 'Add Screen', icon: <Plus size={17} />, disabled: editorReadOnly, onExecute: () => setCreateScreenOpen(true) },
              { id: 'screen-metadata', label: 'Metadata', icon: <SlidersHorizontal size={17} />, disabled: editorReadOnly || !selectedScreenId, onExecute: () => void openScreenMetadata() },
              { id: 'rename-screen', label: 'Rename', icon: <Pencil size={17} />, disabled: editorReadOnly || !selectedScreen, onExecute: () => void openRenameScreen() },
              { id: 'delete-screen', label: 'Delete', icon: <Trash2 size={17} />, danger: true, disabled: editorReadOnly || !selectedScreen, onExecute: () => void requestScreenAction('delete-screen') },
              { id: 'edit-layout', label: 'Edit Layout', icon: <LayoutTemplate size={17} />, disabled: editorReadOnly || !selectedScreen?.layout_id, onExecute: () => { if (!selectedScreen?.layout_id) return; setLayoutGalleryOpen(true); setLayoutEditRequest({ layoutId: selectedScreen.layout_id, requestId: Date.now() }); } },
              { id: 'remove-layout', label: 'Remove Layout', icon: <Unlink size={17} />, danger: true, disabled: editorReadOnly || !selectedScreen?.layout_id, onExecute: () => void requestScreenAction('remove-layout') },
            ],
          },
          {
            id: 'selection', label: 'Selection', commands: [
              { id: 'open-layers', label: 'Layers', icon: <ListOrdered size={17} />, disabled: !selectedScreen, onExecute: openSelectionPane, active: rightPanelOpen && panel === 'layers' },
              { id: 'open-elements', label: 'Properties', icon: <SlidersHorizontal size={17} />, onExecute: openRibbonTool('elements'), active: rightPanelOpen && panel === 'elements' },
              { id: 'edit-hyperlink', label: 'Link', icon: <Link2 size={17} />, disabled: editorReadOnly || !selectedElement, onExecute: () => window.dispatchEvent(new Event('studio-open-hyperlink')) },
              { id: 'crop-fit-media', label: 'Crop & Fit', icon: <Focus size={17} />, disabled: editorReadOnly || !selectedElement || !['image', 'animation', 'video'].includes(selectedResourceType), onExecute: () => window.dispatchEvent(new Event('studio-open-crop-fit')) },
              { id: 'group-elements-home', label: 'Group', icon: <Boxes size={17} />, disabled: editorReadOnly || selectedElementIds.length < 2, onExecute: groupSelectedElements },
              { id: 'ungroup-elements-home', label: 'Ungroup', icon: <Unlink size={17} />, disabled: editorReadOnly || !selectedHasGroup, onExecute: ungroupSelectedElements },
            ],
          },
        ];
      case 'insert':
        return [
          { id: 'insert-screen', label: 'Slides', commands: [
            { id: 'insert-new-screen', label: 'New Screen', icon: <Plus size={17} />, disabled: editorReadOnly, onExecute: () => setCreateScreenOpen(true) },
          ] },
          {
            id: 'insert-text', label: 'Text', commands: [
              { id: 'insert-text', label: 'Text', icon: <FileText size={17} />, disabled: editorReadOnly || !selectedScreen || Boolean(selectedScreen.layout_id), onExecute: () => { addBlankElement('text', 'content', undefined, { text: 'Type here' }); } },
              { id: 'insert-table', label: 'Table', icon: <Grid3X3 size={17} />, disabled: editorReadOnly || !selectedScreen || Boolean(selectedScreen.layout_id), active: tablePickerOpen, onExecute: openTablePicker },
            ],
          },
          { id: 'insert-media', label: 'Resources', content: (
            <StudioInsertResourceButtons
              disabled={editorReadOnly || !selectedScreen}
              onUpload={(type) => {
                setInsertResourceType(type);
                setResourceUploadOpen(true);
              }}
              onFromResource={(type) => {
                setInsertResourceType(type);
                setInsertResourceFilter(type);
                setPanel('insert-resources');
                setRightPanelOpen(true);
              }}
            />
          ), launcher: {
            label: 'Open Resources',
            onExecute: () => {
              setInsertResourceFilter(null);
              setPanel('insert-resources');
              setRightPanelOpen(true);
            },
          } },
          { id: 'insert-illustrations', label: 'Illustrations', commands: [
              { id: 'discover-assets', label: 'Discover Assets', icon: <Sparkles size={17} />, disabled: editorReadOnly || !selectedScreen, onExecute: () => setAssetCatalogOpen(true) },
              { id: 'insert-diagram', label: 'Diagram', icon: <Network size={17} />, onExecute: () => setDiagramChooserOpen(true), active: diagramChooserOpen },
          ], content: <div className="flex items-center gap-0.5 px-1" aria-label="Shapes and Zoom"><div className="flex items-center gap-0.5" aria-label="Shapes gallery">{RIBBON_VISIBLE_SHAPES.slice(0, 6).map((kind) => <button key={kind} type="button" title={`Insert ${kind.replaceAll('-', ' ')}`} disabled={editorReadOnly || !selectedScreen} onClick={() => addShapeElement(kind)} className="h-8 w-8 rounded border border-slate-200 bg-white p-1 hover:border-blue-500 hover:bg-blue-50"><StudioShapeElement kind={kind} fill="#ffffff" stroke="#1e3a5f" strokeWidth={2} /></button>)}<select aria-label="More shapes" defaultValue="" disabled={editorReadOnly || !selectedScreen} onChange={(event) => { if (event.target.value) addShapeElement(event.target.value); event.currentTarget.value = ''; }} className="h-8 w-16 rounded border px-1 text-[9px]"><option value="">More</option>{STUDIO_SHAPE_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.shapes.map((kind) => <option key={`${group.label}-${kind}`} value={kind}>{kind.replaceAll('-', ' ')}</option>)}</optgroup>)}</select></div><StudioZoomMenu disabled={editorReadOnly || !selectedScreen} active={Boolean(zoomDialogMode)} onSelect={setZoomDialogMode} /></div> },
        ];
      case 'equation':
        return [
          ...STUDIO_EQUATION_GROUPS.map((group) => ({
            id: `equation-${group.name.toLowerCase()}`,
            label: group.name,
            commands: group.items.map(([label, latex, glyph]) => ({
              id: `equation-${group.name.toLowerCase()}-${label.toLowerCase().replaceAll(' ', '-')}`,
              label,
              icon: <span className="grid min-h-5 min-w-6 place-items-center font-serif text-base font-semibold leading-none" aria-hidden="true">{glyph}</span>,
              disabled: editorReadOnly || !selectedScreen,
              onExecute: () => {
                const activeEquationId = (window as Window & { __studioActiveEquationElementId?: string }).__studioActiveEquationElementId;
                const targetEquationId = selectedElement?.type === 'math' ? selectedElement.id : activeEquationId;
                if (targetEquationId) {
                  window.dispatchEvent(new CustomEvent('studio-equation-control', { detail: { elementId: targetEquationId, action: 'insert', latex } }));
                } else addMathElement(latex);
              },
            })),
          })),
          {
            id: 'equation-editor',
            label: 'Edit & Insert',
            content: (
              <StudioEquationRibbon
                screen={selectedScreen}
                selectedElementId={selectedElementId}
                readOnly={editorReadOnly}
                onDuplicate={duplicateElement}
                onRemove={removeElement}
                preferInlineControl={Boolean(selectedElement && ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(selectedElement.type) && inlineEquationCaretRef.current?.elementId === selectedElement.id)}
                onRequestControl={(action, location) => {
                  const caret = inlineEquationCaretRef.current;
                  const textTarget = selectedElement && ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(selectedElement.type)
                    ? selectedElement
                    : null;
                  if (textTarget && caret?.elementId === textTarget.id) {
                    const text = String(textTarget.content.text ?? '');
                    const offset = Math.min(Math.max(caret.offset, 0), text.length);
                    const latex = '';
                    dispatchStudioTextCommand(textTarget.id, {
                      type: 'insert-equation',
                      latex,
                      offset,
                      openControl: action,
                      controlLocation: location,
                    });
                    inlineEquationCaretRef.current = {
                      elementId: textTarget.id,
                      offset: offset + `\\(${latex}\\)`.length,
                    };
                    return;
                  }
                  const elementId = addMathElement('', true);
                  if (!elementId) return;
                  const detail = { elementId, action, ...(location ?? {}) };
                  (window as Window & { __studioPendingEquationControl?: typeof detail }).__studioPendingEquationControl = detail;
                  window.setTimeout(() => window.dispatchEvent(new CustomEvent('studio-equation-control', { detail })), 0);
                }}
              />
            ),
          },
        ];
      case 'draw':
        return drawingRibbonGroups;
      case 'design':
        return [
          {
            id: 'screen-layouts', label: 'Layouts', content: <StudioLayoutRibbon layouts={layouts} selectedLayoutId={selectedScreen?.layout_id ?? null} applying={applyingLayout} disabled={editorReadOnly || !selectedScreen} onApply={requestLayoutApplication} onMore={() => setLayoutGalleryOpen(true)} />,
          },
          { id: 'screen-background', label: 'Background', content: <StudioColourMenu label="Screen background colour" noColourLabel="No Fill" value={String(selectedScreen?.screen_settings_json?.backgroundColor || '#f9fcff')} disabled={editorReadOnly || !selectedScreen} onChange={setScreenBackgroundColor} /> },
        ];
      case 'transitions':
        return [
          { id: 'transition-controls', label: 'Transition to This Screen', content: (
            <StudioTransitionRibbon
              settings={selectedScreen?.screen_settings_json ?? null}
              disabled={editorReadOnly || !selectedScreen}
              screenCount={screenList.screens.length}
              onChange={setScreenTransition}
              onApplyToAll={applyTransitionToAllScreens}
            />
          ) },
        ];
      case 'animations':
        return [
          { id: 'animation-preview', label: 'Preview', content: <button type="button" title="Preview animation" aria-label="Preview animation" disabled={!selectedElement || selectedAnimationEffects.length === 0} onClick={() => selectedElement && setAnimationPreview({ elementId: selectedElement.id, token: Date.now() })} className="grid h-10 w-10 place-items-center rounded-lg text-blue-900 hover:bg-blue-50 disabled:opacity-35"><Eye size={18}/></button> },
          {
            id: 'animation-gallery', label: 'Animation', content: <StudioAnimationRibbonGallery activeEffect={String(activeSelectedAnimationEffect?.effect || 'none')} disabled={!selectedElement || editorReadOnly} onSelect={(effect) => applyQuickAnimation(effect)} onRemove={removeSelectedAnimation} />,
          },
          { id: 'animation-effect-options', label: 'Effect Options', content: <div className="grid gap-0.5"><select aria-label="Animation effect direction" disabled={!activeSelectedAnimationEffect} value={String(activeSelectedAnimationEffect?.direction || 'default')} onChange={(event) => updateSelectedAnimationEffect({ direction: event.target.value })} className="h-6 w-24 rounded bg-slate-50 px-1 text-[9px] outline-none hover:bg-slate-100"><option value="default">Default</option><option value="left">From left</option><option value="right">From right</option><option value="top">From top</option><option value="bottom">From bottom</option><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select><select aria-label="Animate text" disabled={!activeSelectedAnimationEffect} value={String(activeSelectedAnimationEffect?.textSequence || 'object')} onChange={(event) => updateSelectedAnimationEffect({ textSequence: event.target.value })} className="h-6 w-24 rounded bg-slate-50 px-1 text-[9px] outline-none hover:bg-slate-100"><option value="object">As object</option><option value="paragraph">Paragraph</option><option value="word">By word</option><option value="letter">By letter</option></select>{activeSelectedAnimationEffect?.effect === 'color-pulse' ? <input type="color" aria-label="Colour Pulse colour" value={String(activeSelectedAnimationEffect.color || '#2563eb')} onChange={(event) => updateSelectedAnimationEffect({ color: event.target.value })} className="h-5 w-24 rounded p-0.5"/> : null}</div> },
          { id: 'advanced-animation', label: 'Advanced Animation', commands: [
            { id: 'animation-pane', label: 'Animation Pane', icon: <ListOrdered size={17} />, disabled: !selectedScreen, active: rightPanelOpen && panel === 'animations', onExecute: openAnimationPane },
          ], content: <div className="flex items-center gap-1"><StudioAnimationMenu label="Add Animation" addMode disabled={!selectedElement || editorReadOnly} onSelect={(effect) => applyQuickAnimation(effect, true)}/><label title={activeSelectedAnimationEffect?.triggerElementId ? 'Change animation trigger' : 'Choose animation trigger'} className="relative flex h-10 w-14 cursor-pointer flex-col items-center justify-center rounded-lg text-[9px] font-semibold text-slate-700 hover:bg-slate-50"><MousePointer2 size={16}/><span>Trigger</span><select aria-label="Animation trigger" disabled={!activeSelectedAnimationEffect} value={String(activeSelectedAnimationEffect?.triggerElementId || '')} onChange={(event) => updateSelectedAnimationEffect({ triggerElementId: event.target.value || undefined, start: event.target.value ? 'trigger' : 'on-click' })} className="absolute inset-0 cursor-pointer opacity-0"><option value="">No trigger</option>{selectedScreen?.elements.filter((element) => element.id !== selectedElementId).map((element, index) => <option key={element.id} value={element.id}>On {String(element.content.layerName || element.content.text || `${element.type} ${index + 1}`).slice(0, 20)}</option>)}</select></label></div> },
          { id: 'animation-timing', label: 'Timing', content: <div className="grid gap-0.5"><select aria-label="Animation start" disabled={!activeSelectedAnimationEffect} value={String(activeSelectedAnimationEffect?.start || 'on-click')} onChange={(event) => updateSelectedAnimationEffect({ start: event.target.value })} className="h-5 w-28 rounded border px-1 text-[9px]"><option value="on-click">Start: On Click</option><option value="with-previous">Start: With Previous</option><option value="after-previous">Start: After Previous</option><option value="trigger">Start: Trigger</option></select><label className="flex items-center justify-between gap-1 text-[9px]">Duration<input aria-label="Animation duration" type="number" min="0.1" max="60" step="0.1" disabled={!activeSelectedAnimationEffect} value={Number(activeSelectedAnimationEffect?.duration) || 0.8} onChange={(event) => updateSelectedAnimationEffect({ duration: Number(event.target.value) })} className="h-5 w-14 rounded border px-1" /></label><label className="flex items-center justify-between gap-1 text-[9px]">Delay<input aria-label="Animation delay" type="number" min="0" max="60" step="0.1" disabled={!activeSelectedAnimationEffect} value={Number(activeSelectedAnimationEffect?.delay) || 0} onChange={(event) => updateSelectedAnimationEffect({ delay: Number(event.target.value) })} className="h-5 w-14 rounded border px-1" /></label><label className="flex items-center justify-between gap-1 text-[9px]">Repeat<select aria-label="Animation repeat" disabled={!activeSelectedAnimationEffect} value={Number(activeSelectedAnimationEffect?.repeat) || 1} onChange={(event) => updateSelectedAnimationEffect({ repeat: Number(event.target.value) })} className="h-5 w-14 rounded border px-1 text-[9px]"><option value="1">Once</option><option value="2">2x</option><option value="3">3x</option><option value="999">Until click</option></select></label></div> },
          { id: 'animation-reorder', label: 'Reorder Animation', content: <div className="grid gap-0.5"><button type="button" disabled={selectedAnimationEffectIndex <= 0} onClick={() => moveSelectedAnimation(-1)} className="flex h-6 items-center gap-1 rounded px-1 text-[9px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-35"><ChevronUp size={13}/>Move Earlier</button><button type="button" disabled={selectedAnimationEffectIndex >= selectedAnimationEffects.length - 1} onClick={() => moveSelectedAnimation(1)} className="flex h-6 items-center gap-1 rounded px-1 text-[9px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-35"><ChevronDown size={13}/>Move Later</button></div> },
        ];
      case 'present':
        return [
          {
            id: 'presentation', label: 'Presentation', commands: [
              { id: 'preview', label: 'Preview', icon: <Eye size={17} />, disabled: !selectedScreen, onExecute: () => void openPreview() },
              { id: 'present-display', label: 'Present', icon: <Presentation size={17} />, disabled: !selectedScreen, onExecute: () => void openPresentation() },
              { id: 'editor-fullscreen', label: editorFocusMode ? 'Exit Fullscreen' : 'Fullscreen', icon: editorFocusMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />, onExecute: () => void toggleEditorFocusMode(), active: editorFocusMode },
            ],
          },
        ];
      case 'review':
        return [
          {
            id: 'publication', label: 'Publication', commands: [
              { id: 'check-readiness', label: 'Check', icon: <Check size={17} />, disabled: loadingWorkflow, onExecute: () => void loadWorkflow(true) },
              { id: 'review-issues', label: 'Issue Details', icon: <CircleAlert size={17} />, disabled: loadingWorkflow, active: workflowDetailsOpen, onExecute: () => void openWorkflowDetails() },
              ...(workflowStatus?.status === 'rejected' ? [{ id: 'rejection-feedback', label: 'Rejected Feedback', icon: <CircleAlert size={17} />, active: rejectionDetailsOpen, onExecute: () => setRejectionDetailsOpen(true) }] : []),
              { id: 'submit-session', label: workflowAction === 'submit' ? 'Submitting' : 'Submit', icon: <Upload size={17} />, disabled: loadingWorkflow || workflowAction !== null || !workflowStatus?.can_submit, onExecute: () => void runWorkflowAction('submit') },
            ],
            content: <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${workflowStatus?.validation.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{workflowStatus?.validation.valid ? 'Ready' : 'Action required'}</span>,
          },
        ];
      case 'view':
        return [
          { id: 'view-show', label: 'Show', commands: [
            { id: 'view-guides', label: 'Guides', icon: <Grid3X3 size={17} />, disabled: !selectedLayout, active: showCanvasGuides, onExecute: () => setShowCanvasGuides((visible) => !visible) },
            { id: 'view-layers', label: 'Selection Pane', icon: <ListOrdered size={17} />, disabled: !selectedScreen, onExecute: openSelectionPane, active: rightPanelOpen && panel === 'layers' },
            { id: 'view-script', label: 'Screen Script', icon: <FileText size={17} />, disabled: !selectedScreen, active: scriptOverlayOpen, onExecute: openScreenScript },
          ] },
          { id: 'view-window', label: 'Window', commands: [
            { id: 'view-refresh', label: 'Refresh', icon: <RefreshCw size={17} className={loadingScreens ? 'animate-spin' : ''} />, disabled: loadingScreens, onExecute: () => void refreshScreens() },
            { id: 'view-fullscreen', label: editorFocusMode ? 'Exit Fullscreen' : 'Fullscreen', icon: editorFocusMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />, active: editorFocusMode, onExecute: () => void toggleEditorFocusMode() },
          ] },
        ];
      case 'picture-format':
        return [
          { id: 'picture-adjust', label: 'Adjust', commands: [
            { id: 'replace-media', label: 'Change Picture', icon: <Upload size={17} />, onExecute: openRibbonTool('resources'), active: rightPanelOpen && panel === 'resources' },
            { id: 'picture-reset', label: 'Reset Picture', icon: <RefreshCw size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && updateElement({ ...selectedElement, content: { ...selectedElement.content, brightness: 1, contrast: 1, saturate: 1, grayscale: 0, blur: 0 } }) },
            { id: 'picture-adjust-more', label: 'Corrections', icon: <SlidersHorizontal size={17} />, onExecute: openRibbonTool('elements'), active: rightPanelOpen && panel === 'elements' },
          ] },
          { id: 'picture-style', label: 'Picture Styles', content: <div className="flex items-center gap-1 px-1">{['#0f172a', '#2563eb', '#ffffff'].map((color) => <button key={color} type="button" title={`Apply ${color} picture border`} disabled={!selectedElement} onClick={() => selectedElement && updateElement({ ...selectedElement, content: { ...selectedElement.content, borderColor: color, borderWidth: color === '#ffffff' ? 0 : 3, borderRadius: color === '#2563eb' ? 16 : 0 } })} className="h-9 w-10 rounded border-2 bg-slate-50" style={{ borderColor: color }} />)}</div> },
          { id: 'picture-arrange', label: 'Arrange', commands: [
            { id: 'picture-forward', label: 'Bring Forward', icon: <ChevronUp size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && selectedScreen && commitElements(moveStudioLayer(selectedScreen.elements, selectedElement.id, 'forward'), selectedElement.id) },
            { id: 'picture-backward', label: 'Send Backward', icon: <ChevronDown size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && selectedScreen && commitElements(moveStudioLayer(selectedScreen.elements, selectedElement.id, 'backward'), selectedElement.id) },
            { id: 'picture-layers', label: 'Selection Pane', icon: <ListOrdered size={17} />, onExecute: openSelectionPane, active: rightPanelOpen && panel === 'layers' },
            { id: 'picture-rotate', label: 'Rotate 90°', icon: <RefreshCw size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && changeElementRotation(selectedElement.id, (Number(selectedElement.position.rotation) || 0) + 90) },
          ] },
          { id: 'picture-size', label: 'Size', commands: [
            { id: 'picture-fit', label: 'Fit', icon: <Minimize2 size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && changeElementContent(selectedElement.id, { mediaTransform: { ...(selectedElement.content.mediaTransform as Record<string, unknown> | undefined), fit: 'contain', scale: 1, x: 0, y: 0, cropped: false } }) },
            { id: 'picture-fill', label: 'Fill', icon: <Maximize2 size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && changeElementContent(selectedElement.id, { mediaTransform: { ...(selectedElement.content.mediaTransform as Record<string, unknown> | undefined), fit: 'cover', scale: 1, x: 0, y: 0, cropped: true } }) },
            { id: 'picture-crop', label: 'Crop', icon: <Focus size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && setCropRequest({ elementId: selectedElement.id, token: Date.now() }) },
          ], content: selectedElement ? <div className="grid gap-0.5 px-1 text-[9px]"><label>W <input aria-label="Picture width" type="number" min="20" value={Math.round(Number(selectedElement.position.width) || 0)} onChange={(event) => changeElementBounds(selectedElement.id, { x: Number(selectedElement.position.x) || 0, y: Number(selectedElement.position.y) || 0, width: Number(event.target.value), height: Number(selectedElement.position.height) || 60 })} className="h-6 w-14 rounded border px-1" /></label><label>H <input aria-label="Picture height" type="number" min="20" value={Math.round(Number(selectedElement.position.height) || 0)} onChange={(event) => changeElementBounds(selectedElement.id, { x: Number(selectedElement.position.x) || 0, y: Number(selectedElement.position.y) || 0, width: Number(selectedElement.position.width) || 80, height: Number(event.target.value) })} className="h-6 w-14 rounded border px-1" /></label></div> : null },
        ];
      case 'shape-format':
        return [
          { id: 'shape-insert', label: 'Shapes & Text', content: <ShapeGalleryDropdown groups={STUDIO_SHAPE_GROUPS} selectedKind={String(selectedElement?.content.kind || 'rectangle')} disabled={!selectedElement || editorReadOnly} onChange={chooseRibbonShape} /> },
          { id: 'shape-styles', label: 'Shape Styles', content: <div className="flex items-center gap-1 px-1">{[['#dbeafe', '#1d4ed8'], ['#fee2e2', '#dc2626'], ['#dcfce7', '#16a34a'], ['#ffffff', '#0f172a']].map(([fill, stroke]) => <button key={`${fill}-${stroke}`} type="button" title="Apply shape style" disabled={!selectedElement} onClick={() => selectedElement && updateElement({ ...selectedElement, content: { ...selectedElement.content, fill, stroke, strokeWidth: 2 } })} className="h-9 w-10 rounded-lg border-2" style={{ backgroundColor: fill, borderColor: stroke }} />)}</div> },
          { id: 'shape-colours', label: 'Shape Formatting', content: <ShapeAppearanceControls elementId={selectedElement?.id || ''} fill={String(selectedElement?.content.fill || 'transparent')} stroke={String(selectedElement?.content.stroke || 'transparent')} strokeWidth={Math.max(0, Number(selectedElement?.content.strokeWidth) || 0)} strokeDash={String(selectedElement?.content.strokeDash || 'solid')} effect={String(selectedElement?.content.shapeEffect || 'none')} disabled={!selectedElement || editorReadOnly} onChange={(changes) => selectedElement && updateElement({ ...selectedElement, content: { ...selectedElement.content, ...changes } })} /> },
          { id: 'shape-text', label: 'Text in Shape', content: <div className="grid gap-0.5 px-1"><select aria-label="Vertical text alignment" value={String(selectedElement?.content.verticalAlignment || (selectedElement?.type === 'shape' ? 'middle' : 'top'))} disabled={!selectedElement || editorReadOnly} onChange={(event) => selectedElement && updateElement({ ...selectedElement, content: { ...selectedElement.content, verticalAlignment: event.target.value } })} className="h-6 w-24 rounded bg-slate-50 px-1 text-[10px] outline-none ring-0"><option value="top">Align top</option><option value="middle">Align middle</option><option value="bottom">Align bottom</option></select><button type="button" disabled={!selectedElement || editorReadOnly} onClick={() => selectedElement && window.dispatchEvent(new CustomEvent('studio-edit-element-text', { detail: { elementId: selectedElement.id } }))} className="h-7 rounded bg-blue-50 px-2 text-[10px] font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-40">Add Text</button></div> },
          { id: 'shape-accessibility', label: 'Accessibility', content: <label className="grid px-1 text-[9px]">Alt Text<input aria-label="Shape alt text" type="text" value={String(selectedElement?.content.altText || '')} disabled={!selectedElement} onChange={(event) => selectedElement && updateElement({ ...selectedElement, content: { ...selectedElement.content, altText: event.target.value } })} className="h-8 w-24 rounded border px-1 text-[10px]" /></label> },
          { id: 'shape-arrange', label: 'Arrange & Rotate', content: <ShapeArrangeControls disabled={!selectedElement || editorReadOnly} groupDisabled={editorReadOnly || selectedElementIds.length < 2} rotation={Number(selectedElement?.position.rotation) || 0} selectionPaneActive={rightPanelOpen && panel === 'layers'} onForward={() => selectedElement && selectedScreen && commitElements(moveStudioLayer(selectedScreen.elements, selectedElement.id, 'forward'), selectedElement.id)} onBackward={() => selectedElement && selectedScreen && commitElements(moveStudioLayer(selectedScreen.elements, selectedElement.id, 'backward'), selectedElement.id)} onSelectionPane={openSelectionPane} onGroup={groupSelectedElements} onAlign={alignSelectedElement} onRotate={(rotation) => selectedElement && changeElementRotation(selectedElement.id, rotation)} /> },
          { id: 'shape-size', label: 'Size', content: selectedElement ? <ShapeSizeControls width={Number(selectedElement.position.width) || 80} height={Number(selectedElement.position.height) || 60} disabled={editorReadOnly} onChange={(size) => changeElementBounds(selectedElement.id, { x: Number(selectedElement.position.x) || 0, y: Number(selectedElement.position.y) || 0, width: size.width ?? (Number(selectedElement.position.width) || 80), height: size.height ?? (Number(selectedElement.position.height) || 60) })} /> : null },
        ];
      case 'table-design':
        return [
          { id: 'table-options', label: 'Table Style Options', content: <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 px-1 text-[9px] font-semibold text-slate-700">{([['headerRow', 'Header Row'], ['totalRow', 'Total Row'], ['firstColumn', 'First Column'], ['lastColumn', 'Last Column'], ['bandedRows', 'Banded Rows'], ['bandedColumns', 'Banded Columns']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-1 whitespace-nowrap"><input type="checkbox" checked={selectedElement?.content[key] === true} disabled={editorReadOnly || selectedElement?.type !== 'table'} onChange={(event) => updateSelectedTable({ [key]: event.target.checked })} />{label}</label>)}</div> },
          { id: 'table-styles', label: 'Table Styles', content: <div className="flex items-center gap-1 px-1">{[['#1d4ed8', '#dbeafe', '#ffffff'], ['#0f766e', '#ccfbf1', '#ffffff'], ['#b45309', '#fef3c7', '#ffffff'], ['#334155', '#e2e8f0', '#ffffff'], ['#7e22ce', '#f3e8ff', '#ffffff']].map(([headerFill, bandFill, cellFill]) => <button key={headerFill} type="button" title="Apply table style" disabled={editorReadOnly || selectedElement?.type !== 'table'} onClick={() => updateSelectedTable({ headerFill, bandFill, cellFill, borderColor: headerFill })} className="grid h-9 w-10 grid-rows-3 overflow-hidden rounded border border-slate-300"><span style={{ backgroundColor: headerFill }} /><span style={{ backgroundColor: cellFill }} /><span style={{ backgroundColor: bandFill }} /></button>)}</div> },
          { id: 'table-colours', label: 'Table Formatting', content: <div className="flex items-center gap-1 px-1"><StudioColourMenu label="Table shading" noColourLabel="No Shading" value={String(selectedElement?.content.cellFill || '#ffffff')} disabled={editorReadOnly || selectedElement?.type !== 'table'} onChange={(cellFill) => updateSelectedTable({ cellFill })} /><StudioColourMenu outline label="Table borders" noColourLabel="No Borders" value={String(selectedElement?.content.borderColor || '#64748b')} disabled={editorReadOnly || selectedElement?.type !== 'table'} onChange={(borderColor) => updateSelectedTable({ borderColor, borderWidth: borderColor === 'transparent' ? 0 : Number(selectedElement?.content.borderWidth) || 1 })} /><select aria-label="Table border width" value={Number(selectedElement?.content.borderWidth) || 0} disabled={editorReadOnly || selectedElement?.type !== 'table'} onChange={(event) => updateSelectedTable({ borderWidth: Number(event.target.value) })} className="h-9 w-16 rounded border px-1 text-[10px]"><option value="0">0 px</option><option value="1">1 px</option><option value="2">2 px</option><option value="3">3 px</option><option value="4">4 px</option></select><select aria-label="Table border style" value={String(selectedElement?.content.borderStyle || 'solid')} disabled={editorReadOnly || selectedElement?.type !== 'table'} onChange={(event) => updateSelectedTable({ borderStyle: event.target.value })} className="h-9 w-20 rounded border px-1 text-[10px]"><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option><option value="double">Double</option></select></div> },
          { id: 'table-effects', label: 'Effects', content: <select aria-label="Table effect" value={String(selectedElement?.content.effect || 'none')} disabled={editorReadOnly || selectedElement?.type !== 'table'} onChange={(event) => updateSelectedTable({ effect: event.target.value })} className="h-9 w-24 rounded border px-1 text-[10px]"><option value="none">No effect</option><option value="shadow">Shadow</option></select> },
        ];
      case 'table-layout':
        return [
          { id: 'table-rows-columns', label: 'Rows & Columns', commands: [
            { id: 'table-row-above', label: 'Insert Above', icon: <ChevronUp size={17} />, disabled: editorReadOnly || selectedElement?.type !== 'table', onExecute: () => runTableAction('insert-row-above') },
            { id: 'table-row-below', label: 'Insert Below', icon: <ChevronDown size={17} />, disabled: editorReadOnly || selectedElement?.type !== 'table', onExecute: () => runTableAction('insert-row-below') },
            { id: 'table-column-left', label: 'Insert Left', icon: <ChevronLeft size={17} />, disabled: editorReadOnly || selectedElement?.type !== 'table', onExecute: () => runTableAction('insert-column-left') },
            { id: 'table-column-right', label: 'Insert Right', icon: <ChevronRight size={17} />, disabled: editorReadOnly || selectedElement?.type !== 'table', onExecute: () => runTableAction('insert-column-right') },
          ] },
          { id: 'table-delete', label: 'Delete', commands: [
            { id: 'table-delete-row', label: 'Delete Row', icon: <Trash2 size={17} />, danger: true, disabled: editorReadOnly || selectedElement?.type !== 'table', onExecute: () => runTableAction('delete-row') },
            { id: 'table-delete-column', label: 'Delete Column', icon: <Trash2 size={17} />, danger: true, disabled: editorReadOnly || selectedElement?.type !== 'table', onExecute: () => runTableAction('delete-column') },
            { id: 'table-delete-table', label: 'Delete Table', icon: <Trash2 size={17} />, danger: true, disabled: editorReadOnly || selectedElement?.type !== 'table', onExecute: () => selectedElement && removeElement(selectedElement.id) },
          ] },
          { id: 'table-merge', label: 'Merge', commands: [
            { id: 'table-merge-right', label: 'Merge Right', icon: <Boxes size={17} />, disabled: editorReadOnly || selectedElement?.type !== 'table', onExecute: () => runTableAction('merge-right') },
            { id: 'table-split-cell', label: 'Split Cell', icon: <Grid3X3 size={17} />, disabled: editorReadOnly || selectedElement?.type !== 'table', onExecute: () => runTableAction('split-cell') },
          ] },
          { id: 'table-cell-size', label: 'Cell Size', content: selectedElement?.type === 'table' ? <div className="grid gap-0.5 px-1 text-[9px]"><label>Width <input aria-label="Table width" type="number" min="120" value={Math.round(Number(selectedElement.position.width) || 0)} onChange={(event) => changeElementBounds(selectedElement.id, { x: Number(selectedElement.position.x) || 0, y: Number(selectedElement.position.y) || 0, width: Number(event.target.value), height: Number(selectedElement.position.height) || 200 })} className="h-6 w-16 rounded border px-1" /></label><label>Height <input aria-label="Table height" type="number" min="80" value={Math.round(Number(selectedElement.position.height) || 0)} onChange={(event) => changeElementBounds(selectedElement.id, { x: Number(selectedElement.position.x) || 0, y: Number(selectedElement.position.y) || 0, width: Number(selectedElement.position.width) || 300, height: Number(event.target.value) })} className="h-6 w-16 rounded border px-1" /></label></div> : null },
          { id: 'table-alignment', label: 'Alignment', content: <div className="flex items-center gap-1 px-1"><select aria-label="Cell horizontal alignment" value={String(selectedElement?.content.alignment || 'left')} disabled={editorReadOnly || selectedElement?.type !== 'table'} onChange={(event) => updateSelectedTable({ alignment: event.target.value })} className="h-9 w-20 rounded border px-1 text-[10px]"><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select><select aria-label="Cell vertical alignment" value={String(selectedElement?.content.verticalAlignment || 'middle')} disabled={editorReadOnly || selectedElement?.type !== 'table'} onChange={(event) => updateSelectedTable({ verticalAlignment: event.target.value })} className="h-9 w-20 rounded border px-1 text-[10px]"><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></select><label className="grid text-[9px]">Margin<input aria-label="Cell margin" type="number" min="0" max="40" value={Number(selectedElement?.content.cellMargin) || 0} disabled={editorReadOnly || selectedElement?.type !== 'table'} onChange={(event) => updateSelectedTable({ cellMargin: Number(event.target.value) })} className="h-6 w-12 rounded border px-1" /></label></div> },
        ];
      case 'diagram-design':
        return [
          { id: 'diagram-create', label: 'Create Graphic', commands: [
            { id: 'diagram-add-after', label: 'Add Shape', icon: <Plus size={17}/>, disabled: !selectedDiagramContent, onExecute: () => addSelectedDiagramNode('after') },
            { id: 'diagram-promote', label: 'Promote', icon: <ChevronLeft size={17}/>, disabled: !selectedDiagramNode || selectedDiagramNode.level === 0, onExecute: () => changeSelectedDiagramNodeLevel(-1) },
            { id: 'diagram-demote', label: 'Demote', icon: <ChevronRight size={17}/>, disabled: !selectedDiagramNode || selectedDiagramContent?.nodes[0]?.id === selectedDiagramNode.id, onExecute: () => changeSelectedDiagramNodeLevel(1) },
            { id: 'diagram-move-before', label: 'Move Before', icon: <ChevronUp size={17}/>, disabled: !selectedDiagramNode || selectedDiagramContent?.nodes[0]?.id === selectedDiagramNode.id, onExecute: () => moveSelectedDiagramNode(-1) },
            { id: 'diagram-move-after', label: 'Move After', icon: <ChevronDown size={17}/>, disabled: !selectedDiagramNode || selectedDiagramContent?.nodes.at(-1)?.id === selectedDiagramNode.id, onExecute: () => moveSelectedDiagramNode(1) },
            { id: 'diagram-text-pane', label: 'Text Pane', icon: <FileText size={17}/>, disabled: !selectedDiagramContent, onExecute: () => setDiagramTextPaneOpen((open) => !open), active: diagramTextPaneOpen },
            { id: 'diagram-direction', label: 'Right to Left', icon: <RefreshCw size={17}/>, disabled: !selectedDiagramContent, onExecute: () => updateSelectedDiagram({ direction: selectedDiagramContent?.direction === 'rtl' ? 'ltr' : 'rtl' }) },
          ] },
          { id: 'diagram-layouts', label: 'Layouts', content: <div className="flex items-center gap-1 px-1">{SMART_DIAGRAM_LAYOUTS.filter((layout) => layout.category === selectedDiagramContent?.category).slice(0, 5).map((layout) => <button key={layout.id} type="button" title={layout.name} onMouseEnter={() => setDiagramLivePreview({ layout: layout.id, category: layout.category })} onMouseLeave={() => setDiagramLivePreview(null)} onFocus={() => setDiagramLivePreview({ layout: layout.id, category: layout.category })} onBlur={() => setDiagramLivePreview(null)} onClick={() => { setDiagramLivePreview(null); updateSelectedDiagram({ layout: layout.id, category: layout.category }); }} className={`h-11 w-14 overflow-hidden rounded border bg-white p-0.5 ${selectedDiagramContent?.layout === layout.id ? 'border-blue-700 ring-1 ring-blue-300' : 'border-slate-200 hover:border-blue-400'}`}><StudioDiagramThumbnail layout={layout}/></button>)}<button type="button" title="More diagram layouts" onClick={() => setDiagramLayoutGalleryOpen(true)} className="grid h-11 w-6 place-items-center rounded border border-slate-200 hover:bg-blue-50"><ChevronDown size={14}/></button></div> },
          { id: 'diagram-colours', label: 'Change Colours', content: <div className="flex items-center gap-1 px-1">{SMART_DIAGRAM_THEMES.map((theme) => <button key={theme.id} type="button" title={theme.name} onMouseEnter={() => setDiagramLivePreview({ themeId: theme.id })} onMouseLeave={() => setDiagramLivePreview(null)} onFocus={() => setDiagramLivePreview({ themeId: theme.id })} onBlur={() => setDiagramLivePreview(null)} onClick={() => { setDiagramLivePreview(null); updateSelectedDiagram({ themeId: theme.id }); }} className={`flex h-9 w-9 overflow-hidden rounded-full border-2 ${selectedDiagramContent?.themeId === theme.id ? 'border-blue-800' : 'border-white ring-1 ring-slate-300'}`}>{theme.colors.slice(0, 3).map((colour) => <span key={colour} className="h-full flex-1" style={{ backgroundColor: colour }}/>)}</button>)}</div> },
          { id: 'diagram-styles', label: 'Diagram Styles', content: <div className="flex gap-1 px-1">{(['flat', 'outline', 'soft', 'polished', 'bevel'] as const).map((style) => <button key={style} type="button" onMouseEnter={() => setDiagramLivePreview({ styleId: style })} onMouseLeave={() => setDiagramLivePreview(null)} onFocus={() => setDiagramLivePreview({ styleId: style })} onBlur={() => setDiagramLivePreview(null)} onClick={() => { setDiagramLivePreview(null); updateSelectedDiagram({ styleId: style }); }} className={`h-9 rounded-lg border px-2 text-[9px] font-semibold capitalize ${selectedDiagramContent?.styleId === style ? 'border-blue-700 bg-blue-50' : 'border-slate-200'}`}>{style}</button>)}</div> },
          { id: 'diagram-reset', label: 'Reset', commands: [
            { id: 'diagram-reset-graphic', label: 'Reset Graphic', icon: <RefreshCw size={17}/>, disabled: !selectedDiagramContent, onExecute: () => updateSelectedDiagram({ themeId: 'spectropy', styleId: 'soft', connectorStyle: 'straight', nodes: selectedDiagramContent?.nodes.map((node) => ({ id: node.id, text: node.text, level: node.level, parentId: node.parentId, role: node.role, icon: node.icon })) }) },
            { id: 'diagram-convert', label: 'Convert', icon: <Shapes size={17}/>, disabled: !selectedElement, onExecute: () => selectedElement && convertDiagramToShapes(selectedElement.id) },
          ] },
        ];
      case 'diagram-format':
        return [
          { id: 'diagram-node', label: 'Selected Shape', commands: [
            { id: 'diagram-add-before', label: 'Add Before', icon: <Plus size={17}/>, disabled: !selectedDiagramContent, onExecute: () => addSelectedDiagramNode('before') },
            { id: 'diagram-add-child', label: 'Add Below', icon: <Plus size={17}/>, disabled: !selectedDiagramContent, onExecute: () => addSelectedDiagramNode('child') },
            { id: 'diagram-add-assistant', label: 'Assistant', icon: <Plus size={17}/>, disabled: selectedDiagramContent?.category !== 'hierarchy', onExecute: () => addSelectedDiagramNode('assistant') },
          ] },
          { id: 'diagram-node-colours', label: 'Shape & Text', content: <div className="flex items-center gap-1 px-1"><label className="relative grid h-9 w-9 place-items-center rounded border" title="Node fill"><span className="h-5 w-5 rounded" style={{ backgroundColor: selectedDiagramNode?.fill || '#1d4ed8' }}/><input type="color" value={selectedDiagramNode?.fill || '#1d4ed8'} disabled={!selectedDiagramNode} onChange={(event) => updateSelectedDiagramNode({ fill: event.target.value })} className="absolute inset-0 opacity-0" aria-label="Diagram node fill"/></label><label className="relative grid h-9 w-9 place-items-center rounded border" title="Node text colour"><span className="text-base font-black" style={{ color: selectedDiagramNode?.textColor || '#ffffff' }}>A</span><input type="color" value={selectedDiagramNode?.textColor || '#ffffff'} disabled={!selectedDiagramNode} onChange={(event) => updateSelectedDiagramNode({ textColor: event.target.value })} className="absolute inset-0 opacity-0" aria-label="Diagram node text colour"/></label></div> },
          { id: 'diagram-connectors', label: 'Connectors', content: <select aria-label="Diagram connector style" value={selectedDiagramContent?.connectorStyle || 'straight'} disabled={!selectedDiagramContent} onChange={(event) => updateSelectedDiagram({ connectorStyle: event.target.value as SmartDiagramContent['connectorStyle'] })} className="mx-1 h-9 rounded border px-2 text-[10px]"><option value="straight">Straight</option><option value="elbow">Elbow</option><option value="curve">Curved</option><option value="none">None</option></select> },
          { id: 'diagram-animation', label: 'Diagram Animation', content: <div className="flex gap-1 px-1"><select aria-label="Diagram animation mode" value={selectedDiagramContent?.revealMode || 'as-one-object'} disabled={!selectedDiagramContent} onChange={(event) => updateSelectedDiagram({ revealMode: event.target.value as SmartDiagramContent['revealMode'] })} className="h-9 w-28 rounded border px-1 text-[9px]"><option value="as-one-object">As one object</option><option value="all-at-once">All at once</option><option value="one-by-one">One by one</option><option value="level-at-once">Level at once</option><option value="level-one-by-one">Level one by one</option></select><button type="button" disabled={!selectedDiagramContent} onClick={() => updateSelectedDiagram({ reverseAnimation: !selectedDiagramContent?.reverseAnimation })} className={`h-9 rounded border px-2 text-[9px] font-semibold ${selectedDiagramContent?.reverseAnimation ? 'border-blue-700 bg-blue-50' : 'border-slate-200'}`}>Reverse</button></div> },
          { id: 'diagram-accessibility', label: 'Accessibility', content: <label className="grid px-1 text-[9px]">Alt Text<input aria-label="Diagram accessibility description" type="text" value={selectedDiagramContent?.altText || ''} disabled={!selectedDiagramContent} onChange={(event) => updateSelectedDiagram({ altText: event.target.value })} className="h-8 w-32 rounded border px-1 text-[10px]"/></label> },
        ];
      case '3d-model':
        return [
          { id: 'model-adjust', label: 'Adjust', commands: [
            { id: 'model-reset', label: 'Reset 3D Model', icon: <RefreshCw size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && updateElement({ ...selectedElement, content: { ...selectedElement.content, model3d: {} } }) },
            { id: 'model-properties', label: 'Properties', icon: <SlidersHorizontal size={17} />, onExecute: openRibbonTool('elements'), active: rightPanelOpen && panel === 'elements' },
          ] },
          { id: 'model-views', label: '3D Model Views', content: <div className="flex items-center gap-1 px-1">{(['front', 'back', 'left', 'right', 'top', 'isometric'] as const).map((view) => <button key={view} type="button" disabled={!selectedElement} title={`${view} 3D view`} onClick={() => updateSelectedModel3D({ cameraOrbit: standardModel3DView(view), cameraTarget: '', fieldOfView: '30deg' })} className="grid h-10 w-12 place-items-center rounded-md border border-slate-200 bg-gradient-to-br from-white to-slate-100 text-[9px] font-semibold capitalize text-slate-700 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-40"><span className="grid h-5 w-5 place-items-center rounded bg-amber-300 text-[8px] text-amber-950">3D</span>{view === 'isometric' ? 'Iso' : view}</button>)}</div> },
          { id: 'model-accessibility', label: 'Accessibility', content: <label className="grid px-1 text-[9px]">Alt Text<input aria-label="3D model alt text" type="text" value={String(selectedElement?.content.altText || '')} disabled={!selectedElement} onChange={(event) => selectedElement && changeElementContent(selectedElement.id, { altText: event.target.value })} className="h-8 w-28 rounded border px-1 text-[10px]" /></label> },
          { id: 'model-arrange', label: 'Arrange', commands: [
            { id: 'model-forward', label: 'Bring Forward', icon: <ChevronUp size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && selectedScreen && commitElements(moveStudioLayer(selectedScreen.elements, selectedElement.id, 'forward'), selectedElement.id) },
            { id: 'model-backward', label: 'Send Backward', icon: <ChevronDown size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && selectedScreen && commitElements(moveStudioLayer(selectedScreen.elements, selectedElement.id, 'backward'), selectedElement.id) },
            { id: 'model-layers', label: 'Selection Pane', icon: <ListOrdered size={17} />, onExecute: openSelectionPane, active: rightPanelOpen && panel === 'layers' },
            { id: 'model-align', label: 'Align Center', icon: <Focus size={17} />, disabled: !selectedElement, onExecute: () => alignSelectedElement('center') },
            { id: 'model-group', label: 'Group', icon: <Boxes size={17} />, disabled: selectedElementIds.length < 2, onExecute: groupSelectedElements },
          ] },
          { id: 'model-interaction', label: 'Interaction', commands: [
            { id: 'model-pan-zoom', label: 'Pan & Zoom', icon: <Focus size={17} />, disabled: !selectedElement, onExecute: () => selectedElement && setModel3DModeRequest({ elementId: selectedElement.id, token: Date.now() }) },
            { id: 'model-auto-rotate', label: selectedModel3DSettings.autoRotate ? 'Stop Rotate' : 'Auto Rotate', icon: <RefreshCw size={17} />, disabled: !selectedElement, active: selectedModel3DSettings.autoRotate, onExecute: () => updateSelectedModel3D({ autoRotate: !selectedModel3DSettings.autoRotate }) },
          ] },
          { id: 'model-size', label: 'Size', content: selectedElement ? <div className="grid gap-0.5 px-1 text-[9px]"><label>W <input aria-label="3D model width" type="number" min="20" value={Math.round(Number(selectedElement.position.width) || 0)} onChange={(event) => changeElementBounds(selectedElement.id, { x: Number(selectedElement.position.x) || 0, y: Number(selectedElement.position.y) || 0, width: Number(event.target.value), height: Number(selectedElement.position.height) || 60 })} className="h-6 w-14 rounded border px-1" /></label><label>H <input aria-label="3D model height" type="number" min="20" value={Math.round(Number(selectedElement.position.height) || 0)} onChange={(event) => changeElementBounds(selectedElement.id, { x: Number(selectedElement.position.x) || 0, y: Number(selectedElement.position.y) || 0, width: Number(selectedElement.position.width) || 80, height: Number(event.target.value) })} className="h-6 w-14 rounded border px-1" /></label></div> : null },
        ];
      case 'simulation-format':
        return elementCommands('elements');
      case 'drawing-format':
        return drawingRibbonGroups;
      case 'group-format':
        return [
          { id: 'group-actions', label: 'Group', commands: [
            { id: 'group-selected', label: 'Group', icon: <Boxes size={17} />, disabled: editorReadOnly || selectedElementIds.length < 2, onExecute: groupSelectedElements },
            { id: 'ungroup-selected', label: 'Ungroup', icon: <Unlink size={17} />, disabled: editorReadOnly || !selectedHasGroup, onExecute: ungroupSelectedElements },
          ] },
          { id: 'group-arrange', label: 'Arrange', commands: [
            { id: 'group-layers', label: 'Layers', icon: <ListOrdered size={17} />, onExecute: openSelectionPane, active: rightPanelOpen && panel === 'layers' },
            { id: 'group-animations', label: 'Animations', icon: <Sparkles size={17} />, onExecute: () => setActiveRibbonTab('animations'), active: activeRibbonTab === 'animations' },
          ] },
        ];
      default:
        return [];
    }
  })();
  const workflowDetailItems = workflowProblems.length
    ? workflowProblems.map((problem) => ({ problem, severity: 'error' as const }))
    : [
        ...(workflowStatus?.validation.errors ?? []).map((problem) => ({ problem, severity: 'error' as const })),
        ...(workflowStatus?.validation.warnings ?? []).map((problem) => ({ problem, severity: 'warning' as const })),
      ];

  if (rawSessionId && !sessionId) {
    return (
      <StudioShell title="Screen Editor" subtitle="Studio editor">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800" role="alert">
          <h2 className="font-semibold">Invalid Session</h2>
          <p className="mt-1 text-sm">Select a valid Studio Session to open the editor.</p>
        </div>
      </StudioShell>
    );
  }

  if (!sessionId) {
    return (
      <StudioShell title="Screen Editor" subtitle="Create and edit Session Screens">
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Select a Studio Session</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Choose a curriculum hierarchy and Session to open its editor. The selected Session will
            open here without creating a second copy of its data.
          </p>
        </section>
      </StudioShell>
    );
  }

  return (
    <StudioShell
      title="Screen Editor"
      subtitle={`Session ${sessionId}`}
      scrollContent={false}
      wrapContent={false}
      hideHeader
      actions={
        <div className="flex items-center gap-2">
          <div
            className="flex min-w-[82px] items-center justify-end gap-1 text-xs font-semibold text-slate-600"
            aria-live="polite"
          >
            {saveStatus === 'saving' && (
              <>
                <LoaderCircle size={15} className="animate-spin" />
                Saving
              </>
            )}
            {saveStatus === 'pending' && (
              <>
                <Cloud size={15} />
                Pending
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check size={15} className="text-emerald-600" />
                Saved
              </>
            )}
            {saveStatus === 'offline' && (
              <>
                <CloudOff size={15} className="text-amber-700" />
                Offline
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <CloudOff size={15} className="text-red-700" />
                Save failed
              </>
            )}
            {saveStatus === 'idle' && (
              <>
                <Cloud size={15} />
                AutoSave
              </>
            )}
          </div>
          <StudioIconButton
            label="Back"
            icon={<ArrowLeft size={17} />}
            onClick={() => void leaveEditor()}
          />
          <StudioIconButton
            label={loadingScreens ? 'Refreshing Screens' : 'Refresh Screens'}
            icon={<RefreshCw size={17} className={loadingScreens ? 'animate-spin' : ''} />}
            onClick={() => void refreshScreens()}
            disabled={loadingScreens}
          />
        </div>
      }
    >
      <div ref={editorViewportRef} className={`studio-editor-viewport relative flex h-full min-h-0 flex-col gap-1 overflow-hidden bg-slate-100 p-1.5 ${editorFocusMode ? 'studio-editor-focus-mode' : ''}`}>
        <section className="studio-context-bar hidden" aria-hidden="true">
            <div className="studio-context-primary flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overscroll-contain">
              <span className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-bold text-white" title={`Screen Editor · Session ${sessionId}`}>
                Editor · S{sessionId}
              </span>
              <span
                title={sessionContext?.chapter_name || '—'}
                className="w-44 min-w-0 shrink truncate rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs"
              >
                <b>Chapter:</b> {sessionContext?.chapter_name || '—'}
              </span>
              <span
                title={sessionContext?.topic_name || '—'}
                className="w-44 min-w-0 shrink truncate rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs"
              >
                <b>Topic:</b> {sessionContext?.topic_name || '—'}
              </span>
              <span
                title={sessionContext?.subtopic_name || '—'}
                className="w-44 min-w-0 shrink truncate rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs"
              >
                <b>Subtopic:</b> {sessionContext?.subtopic_name || '—'}
              </span>
              <label className="relative flex h-9 shrink-0 items-center rounded-lg bg-blue-900 pl-2 text-xs font-semibold text-white">
                <select aria-label="Select Session" value={sessionId} onChange={(event) => navigate(`/studio/editor/${event.target.value}`)} className="studio-context-select h-9 max-w-28 cursor-pointer appearance-none rounded-r-lg border-0 bg-blue-900 py-0 pl-2 pr-7 text-xs font-semibold text-white outline-none">
                  {sessionOptions.map((session) => <option key={session.id} value={session.id}>Session {session.session_number}: {session.title}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-2" aria-hidden="true" />
              </label>
              <label className="relative flex h-9 shrink-0 items-center rounded-lg bg-blue-900 pl-2 text-xs font-semibold text-white">
                <select aria-label="Select Screen" value={selectedScreenId || ''} onChange={(event) => void selectScreen(Number(event.target.value))} className="studio-context-select h-9 max-w-24 cursor-pointer appearance-none rounded-r-lg border-0 bg-blue-900 py-0 pl-2 pr-7 text-xs font-semibold text-white outline-none">
                  {screenList.screens.map((screen) => <option key={screen.id} value={screen.id}>Screen {screen.screen_number}: {screenDisplayTitle(screen)}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-2" aria-hidden="true" />
              </label>
              <StudioIconButton
                label="Rename Screen"
                icon={<Pencil size={15} />}
                disabled={editorReadOnly || !selectedScreen}
                onClick={() => void openRenameScreen()}
              />
              <StudioIconButton
                label="Delete Screen"
                icon={<Trash2 size={15} />}
                disabled={editorReadOnly || !selectedScreen}
                onClick={() => void requestScreenAction('delete-screen')}
              />
              <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
                <span className="inline-flex h-9 w-20 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-600" title={`AutoSave: ${saveStatus}`} aria-live="polite">
                  {saveStatus === 'saving' ? <LoaderCircle size={14} className="animate-spin" /> : saveStatus === 'saved' ? <Check size={14} className="text-emerald-600" /> : saveStatus === 'offline' || saveStatus === 'error' ? <CloudOff size={14} className="text-amber-700" /> : <Cloud size={14} />}
                  <span className="hidden w-11 text-center xl:inline">{saveStatus === 'idle' ? 'AutoSave' : saveStatus}</span>
                </span>
                <StudioIconButton label="Back" icon={<ArrowLeft size={15} />} onClick={() => void leaveEditor()} />
                <StudioIconButton label={loadingScreens ? 'Refreshing Screens' : 'Refresh Screens'} icon={<RefreshCw size={15} className={loadingScreens ? 'animate-spin' : ''} />} onClick={() => void refreshScreens()} disabled={loadingScreens} />
                <StudioIconButton
                  label="Undo"
                  icon={<Undo2 size={15} />}
                  disabled={editorReadOnly || elementPast.length === 0}
                  onClick={undoElementChange}
                />
                <StudioIconButton
                  label="Redo"
                  icon={<Redo2 size={15} />}
                  disabled={editorReadOnly || elementFuture.length === 0}
                  onClick={redoElementChange}
                />
                <StudioIconButton
                  label={savingScreen ? 'Saving Screen' : 'Save now'}
                  icon={
                    savingScreen ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} />
                    )
                  }
                  disabled={editorReadOnly || !hasUnsavedChanges || savingScreen}
                  onClick={() => void saveScreenDraft('manual')}
                />
                <StudioIconButton
                  label="Preview Session"
                  icon={<Eye size={15} />}
                  tone="primary"
                  disabled={!selectedScreen}
                  onClick={() => void openPreview()}
                />
                <StudioIconButton
                  label="Present on another display"
                  icon={<Presentation size={15} />}
                  disabled={!selectedScreen}
                  onClick={() => void openPresentation()}
                />
                <StudioIconButton
                  label={showCanvasGuides ? 'Hide layout guides' : 'Show layout guides'}
                  icon={<Grid3X3 size={15} />}
                  active={showCanvasGuides}
                  disabled={!selectedLayout}
                  onClick={() => setShowCanvasGuides((visible) => !visible)}
                />
                <label className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50" title={selectedElement ? 'Element fill colour' : 'Screen fill colour'}>
                  <span className="h-5 w-5 rounded border border-slate-400" style={{ backgroundColor: contextualFillColor }} />
                  <input type="color" value={contextualFillColor} disabled={editorReadOnly || !selectedScreen} onChange={(event) => setContextualFillColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" aria-label={selectedElement ? 'Element fill colour' : 'Screen fill colour'} />
                </label>
                <StudioIconButton
                  label={editorFocusMode ? 'Exit Editor Fullscreen' : 'Editor Fullscreen'}
                  icon={editorFocusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  active={editorFocusMode}
                  onClick={() => void toggleEditorFocusMode()}
                />
                <StudioIconButton
                  label={
                    loadingWorkflow
                      ? 'Checking publication readiness'
                      : 'Check publication readiness'
                  }
                  icon={
                    loadingWorkflow ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Check size={15} />
                    )
                  }
                  onClick={() => void loadWorkflow(true)}
                  disabled={loadingWorkflow}
                />
                <button
                  type="button"
                  onClick={() => void runWorkflowAction('submit')}
                  disabled={
                    loadingWorkflow || workflowAction !== null || !workflowStatus?.can_submit
                  }
                  title={
                    workflowStatus?.can_submit
                      ? 'Submit this Session for review'
                      : 'Resolve the publication requirements before submitting'
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                >
                  {workflowAction === 'submit' && (
                    <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                  )}
                  {workflowAction === 'submit' ? 'Submitting…' : 'Submit'}
                </button>
                {workflowStatus && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${workflowStatus.validation.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
                  >
                    Publication: {workflowStatus.validation.valid ? 'Ready' : 'Action required'}
                  </span>
                )}
              </div>
            </div>
        </section>
        <StudioAdaptiveRibbon
          tabs={ribbonTabs}
          activeTab={activeRibbonTab}
          groups={ribbonGroups}
          onTabChange={(tab) => {
            startTransition(() => setActiveRibbonTab(tab));
            if (tab === 'transitions' && panel === 'transitions') setRightPanelOpen(false);
            if (tab === 'equation') setRightPanelOpen(false);
          }}
          collapsed={ribbonCollapsed}
          onToggleCollapsed={() => setRibbonCollapsed((collapsed) => !collapsed)}
        />
        {workflowStatus && editorReadOnly && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900">
            <span>
              <strong className="capitalize">{workflowStatus.status}</strong> Sessions are
              view-only. Return this Session to an editable Draft when changes are required.
            </span>
            {canStartRevision && (
              <button
                type="button"
                onClick={() => setRevisionPromptOpen(true)}
                className="rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {workflowStatus.status === 'published'
                  ? 'Edit published Session'
                  : 'Return to Draft'}
              </button>
            )}
          </div>
        )}
        {error && (
          <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <div
          className={`studio-editor-workspace relative grid min-h-0 flex-1 overflow-hidden ${leftPanelOpen ? 'has-left-panel' : ''} ${toolPanelOpen ? 'has-right-panel has-compact-right-panel' : ''} ${toolPanelOpen && panel === 'layers' ? 'has-layers-panel' : ''} ${toolPanelOpen && panel === 'animations' ? 'has-animation-panel' : ''}`}
        >
          <aside className={`studio-editor-left-panel ${leftPanelOpen ? 'is-expanded' : ''} flex min-h-0 overflow-visible`}>
            {!leftPanelOpen ? <nav aria-label="Open Screen navigation" className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={openScreenReorder}
                disabled={screenList.screens.length === 0 || hasUnsavedChanges}
                title={hasUnsavedChanges ? 'Wait for AutoSave before opening Screens' : 'Open Screens'}
                aria-label="Open Screens"
                aria-expanded={false}
                className="inline-flex h-9 w-8 items-center justify-center rounded-r-lg border border-l-0 border-white/80 bg-white/90 text-slate-700 shadow-lg backdrop-blur hover:bg-white disabled:opacity-35"
              >
                <ListOrdered size={16} />
              </button>
            </nav> : null}
              {leftPanelOpen ? <section onPointerMove={moveDraggedScreen} onPointerUp={finishScreenDrag} onPointerCancel={finishScreenDrag} className="studio-editor-left-content is-open flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2">
                <div className="mb-1.5 flex h-8 shrink-0 items-center justify-between rounded-lg bg-slate-100 px-2" aria-label="Screen navigation">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-950"><ListOrdered size={13} />Screens</span>
                  <button type="button" title="Close Screens" aria-label="Close Screens" onClick={() => setLeftPanelOpen(false)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800"><X size={13} /></button>
                </div>
                <label className="relative mb-2 flex h-9 shrink-0 items-center rounded-lg bg-blue-900 text-[11px] font-semibold text-white">
                  <span className="pl-2">Session</span>
                  <select aria-label="Select Session" value={sessionId} onChange={(event) => navigate(`/studio/editor/${event.target.value}`)} className="h-9 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg border-0 bg-blue-900 py-0 pl-2 pr-7 text-[11px] font-semibold text-white outline-none">
                    {sessionOptions.map((session) => <option key={session.id} value={session.id}>Session {session.session_number}: {session.title}</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2" />
                </label>
                <>
                    <div className="flex shrink-0 items-center justify-between gap-2">
                      <div><h2 className="font-semibold">Screens</h2><p className="text-[11px] text-slate-500">Select or drag to reorder</p></div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{screenList.screens.length}</span>
                    </div>
                    <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {reorderIds.map((screenId, index) => {
                        const screen = screenList.screens.find((candidate) => candidate.id === screenId);
                        if (!screen) return null;
                        const selected = selectedScreenId === screenId;
                        return (
                          <div key={screenId} data-reorder-screen-id={screenId} className={`flex items-stretch gap-1 rounded-lg border p-1 transition ${draggingScreenId === screenId ? 'border-blue-700 bg-blue-100 opacity-70' : selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                            <button type="button" onClick={() => void selectScreen(screenId)} className="min-w-0 flex-1 text-left" aria-current={selected ? 'page' : undefined}>
                              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Screen {index + 1}</span>
                              <span className="grid aspect-video w-full place-items-center overflow-hidden rounded border border-slate-200 bg-gradient-to-br from-white to-slate-100 px-2 text-center text-xs font-semibold text-slate-700 shadow-sm">
                                <span><span className="line-clamp-2">{screenDisplayTitle(screen)}</span><span className="mt-1 block text-[9px] font-normal text-slate-500">{screen.elements.length} elements</span></span>
                              </span>
                            </button>
                            {!editorReadOnly && <button type="button" title="Drag Screen to reorder" aria-label={`Drag Screen ${index + 1} to reorder`} onPointerDown={(event) => { event.preventDefault(); setDraggingScreenId(screenId); reorderIdsRef.current = reorderIds; event.currentTarget.setPointerCapture(event.pointerId); }} className="flex w-8 touch-none items-center justify-center rounded text-slate-500 hover:bg-slate-100"><GripVertical size={18} /></button>}
                          </div>
                        );
                      })}
                    </div>
                    {reorderingScreens && <p className="mt-2 text-center text-xs font-semibold text-blue-800">Saving Screen order…</p>}
                </>
              </section> : null}
          </aside>
          <main
            className="studio-editor-canvas flex min-h-0 flex-col overflow-hidden"
            onContextMenu={(event) => {
              const target = (event.target as HTMLElement).closest<HTMLElement>('[data-element-id]');
              const elementId = target?.dataset.elementId;
              if (!elementId) return;
              event.preventDefault();
              setSelectedElementId(elementId);
              setSelectedElementIds((current) => current.includes(elementId) ? current : [elementId]);
              setElementContextMenu({ elementId, x: event.clientX, y: event.clientY });
            }}
          >
            <div className="min-h-0 flex-1">
              <BlankScreenCanvas
                screen={selectedScreen}
                screenTitle={selectedScreen ? screenDisplayTitle(selectedScreen) : undefined}
                contextBreadcrumb={[sessionContext?.chapter_name, sessionContext?.topic_name, sessionContext?.subtopic_name].filter(Boolean).join(' › ')}
                loading={loadingScreen}
                layout={selectedLayout}
                showGuides={showCanvasGuides}
                animationPreview={animationPreview}
                cropRequest={cropRequest}
                model3DModeRequest={model3DModeRequest}
                selectedElementId={selectedElementId}
                selectedElementIds={selectedElementIds}
                selectedDiagramNodeId={selectedDiagramNodeId}
                diagramLivePreview={diagramLivePreview}
                diagramTextPaneOpen={diagramTextPaneOpen}
                onCloseDiagramTextPane={() => setDiagramTextPaneOpen(false)}
                selectedSlotId={selectedLayoutSlotId}
                onSelectElement={selectElementAndOpenControls}
                onSelectElements={selectElementsFromMarquee}
                onSelectDiagramNode={(elementId, nodeId) => { setSelectedElementId(elementId); setSelectedDiagramNodeId(nodeId); }}
                onSelectSlot={(slotId) => { setSelectedElementId(null); setSelectedElementIds([]); setSelectedLayoutSlotId(slotId); }}
                onClearElementSelection={() => { setSelectedElementId(null); setSelectedElementIds([]); setSelectedLayoutSlotId(null); }}
                onChangeElement={editorReadOnly ? undefined : updateElement}
                onCommitElementChange={editorReadOnly ? undefined : updateElementPreservingSelection}
                onChangeElementBounds={editorReadOnly ? undefined : changeElementBounds}
                onChangeElementRotation={editorReadOnly ? undefined : changeElementRotation}
                onChangeElementContent={editorReadOnly ? undefined : changeElementContent}
                onTextCaretChange={(elementId, offset) => {
                  inlineEquationCaretRef.current = { elementId, offset };
                  const controlWindow = window as Window & { __studioActiveEquationElementId?: string };
                  delete controlWindow.__studioActiveEquationElementId;
                }}
                onCanvasPointChange={(point) => {
                  equationCanvasPointRef.current = point;
                  inlineEquationCaretRef.current = null;
                  const controlWindow = window as Window & { __studioActiveEquationElementId?: string };
                  delete controlWindow.__studioActiveEquationElementId;
                }}
                onEditInlineShape={(elementId, shape, start, end) => {
                  setSelectedElementId(elementId);
                  setInlineShapeEdit({ elementId, shape, start, end });
                  setPanel('shapes');
                  setRightPanelOpen(true);
                }}
                onEditInlineEquation={(elementId, latex, start, end) => {
                  const element = selectedScreen?.elements.find((candidate) => candidate.id === elementId);
                  if (!element) return;
                  const text = String(element.content.text ?? '');
                  const content = { ...element.content };
                  delete content.richTextHtml;
                  updateElement({ ...element, content: { ...content, text: `${text.slice(0, start)}\\(${latex}\\)${text.slice(end)}` } });
                }}
                onRemoveElement={editorReadOnly ? undefined : removeElement}
                drawingStrokes={authoredDrawingStrokes(selectedScreen)}
                drawingEnabled={!editorReadOnly && (activeRibbonTab === 'draw' || activeRibbonTab === 'drawing-format')}
                drawingTool={drawingTool}
                drawingColor={drawingColor}
                drawingWidth={drawingWidth}
                drawingOpacity={drawingOpacity}
                onDrawingChange={editorReadOnly ? undefined : setAuthoredDrawings}
                onCreateTextAt={
                  editorReadOnly
                    ? undefined
                    : (point) => addBlankElement('text', 'content', point, { text: 'Type here' })
                }
                onActivateSlotAt={
                  editorReadOnly || !selectedLayout
                    ? undefined
                    : (point) => {
                        const slot = selectedLayout.slots.find(({ bounds }) =>
                          point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
                          point.y >= bounds.y && point.y <= bounds.y + bounds.height,
                        );
                        return slot ? addElement(slot) : undefined;
                      }
                }
                onDropFiles={editorReadOnly ? undefined : addDroppedFiles}
              />
            </div>
            {elementContextMenu ? <StudioElementContextMenu
              position={{ x: elementContextMenu.x, y: elementContextMenu.y }}
              canPaste={!editorReadOnly && editorClipboard.length > 0}
              canGroup={!editorReadOnly && selectedElementIds.length > 1}
              canUngroup={!editorReadOnly && selectedHasGroup}
              onCut={cutSelectedElements}
              onCopy={copySelectedElements}
              onPaste={() => pasteClipboard('source-formatting')}
              onDuplicate={() => duplicateElement(elementContextMenu.elementId)}
              onDelete={() => removeElement(elementContextMenu.elementId)}
              onGroup={groupSelectedElements}
              onUngroup={ungroupSelectedElements}
              onLayers={openSelectionPane}
              onClose={() => setElementContextMenu(null)}
            /> : null}
            {presentationActive ? (
              <div className="absolute bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-blue-200 bg-slate-950/92 p-2 text-white shadow-2xl backdrop-blur" role="toolbar" aria-label="Audience presentation controls">
                <span className="px-2 text-xs font-bold">Presenting · {presentationDisplayName}</span>
                <button type="button" onClick={() => sendPresentationCommand('previous')} className="rounded-lg p-2 hover:bg-white/15" title="Previous"><ChevronLeft size={19} /></button>
                <button type="button" onClick={() => sendPresentationCommand('next')} className="rounded-lg p-2 hover:bg-white/15" title="Next"><ChevronRight size={19} /></button>
                <button type="button" onClick={() => sendPresentationCommand('fullscreen')} className="rounded-lg p-2 hover:bg-white/15" title="Audience fullscreen"><Maximize2 size={17} /></button>
                <button type="button" onClick={closePresentationControls} className="rounded-lg p-2 text-red-200 hover:bg-red-500/20" title="End presentation"><X size={17} /></button>
              </div>
            ) : null}
          </main>
          {!editorReadOnly && rightPanelOpen && (
            <aside className={`studio-editor-tools-panel ${toolPanelOpen ? 'is-expanded is-compact' : ''} ${panel === 'layers' ? 'is-layers' : ''} ${panel === 'animations' ? 'is-animation' : ''} flex min-h-0 overflow-visible`}>
              <nav aria-label="Studio tools" className="hidden">
                {studioTools.filter((tool) => !('hidden' in tool && tool.hidden)).map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleStudioTool(tool.id)}
                    title={tool.label}
                    aria-label={tool.label}
                    aria-expanded={rightPanelOpen && panel === tool.id}
                    className={`inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg ${rightPanelOpen && panel === tool.id ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {tool.icon}
                  </button>
                ))}
              </nav>
              <div aria-hidden={!toolPanelOpen} className={`studio-editor-tools-content ${toolPanelOpen ? 'is-open' : 'is-closed'} relative min-h-0 min-w-0 flex-1 overscroll-contain ${panel === 'animations' ? 'overflow-hidden p-2' : 'overflow-auto [scrollbar-gutter:stable]'} ${panel === 'layers' ? 'p-1.5' : panel === 'animations' ? '' : 'p-2'}`}>
                {panel !== 'insert-resources' ? panel === 'animations' ? <button type="button" title="Close pane" aria-label="Close pane" onClick={() => setRightPanelOpen(false)} className="absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"><X size={13} /></button> : <div className="mb-1 flex justify-end"><button type="button" title="Close pane" aria-label="Close pane" onClick={() => setRightPanelOpen(false)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"><X size={13} /></button></div> : null}
                {panel === 'layers' && (
                  <StudioLayersPanel screen={selectedScreen} selectedElementId={selectedElementId} readOnly={editorReadOnly} onSelect={selectElementAndOpenControls} onCommit={commitElements} />
                )}
                {panel === 'resources' && (
                  <ResourceLibrary mode="picker" onPick={bindResourceToSelectedElement} />
                )}
                {panel === 'insert-resources' && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-bold text-slate-900">From Resource</h2>
                        <button type="button" title="Close pane" aria-label="Close pane" onClick={() => setRightPanelOpen(false)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-slate-100"><X size={13} /></button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Choose a Resource to add directly to the current Screen.</p>
                    </div>
                    <ResourceLibrary
                      mode="picker"
                      initialType={insertResourceFilter ?? ''}
                      allowedTypes={insertResourceFilter ? [insertResourceFilter] : undefined}
                      onPick={placeResourceDirectly}
                    />
                  </div>
                )}
                {panel === 'elements' && (
                  <StudioElementPanel
                    layout={selectedLayout}
                    screen={selectedScreen}
                    selectedElementId={selectedElementId}
                    onSelect={selectElementAndOpenControls}
                    onAdd={addElement}
                    onChangeSlotType={changeSlotType}
                    onAddBlank={addBlankElement}
                    onUpdate={updateElement}
                    onDuplicate={duplicateElement}
                    onRemove={removeElement}
                    availableScreens={screenList.screens}
                  />
                )}
                {panel === 'shapes' && (
                  <StudioShapesPanel
                    screen={selectedScreen}
                    selectedElementId={selectedElementId}
                    onAdd={addShapeElement}
                    onInsertInline={insertInlineShape}
                    canInsertInline={Boolean(selectedElement && ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(selectedElement.type))}
                    inlineEditRequest={inlineShapeEdit ? { shape: inlineShapeEdit.shape, onSave: saveInlineShapeEdit, onCancel: () => setInlineShapeEdit(null) } : null}
                    onUpdate={updateElement}
                    onDuplicate={duplicateElement}
                    onRemove={removeElement}
                  />
                )}
                {panel === 'diagrams' && (
                  <StudioSmartDiagramPanel
                    screen={selectedScreen}
                    selectedElementId={selectedElementId}
                    onSelect={selectElementAndOpenControls}
                    onInsert={addSmartDiagram}
                    onUpdate={updateElement}
                    onDuplicate={duplicateElement}
                    onRemove={removeElement}
                    onConvertToShapes={convertDiagramToShapes}
                  />
                )}
                {panel === 'animations' && (
                  <StudioAnimationsPanel
                    screen={selectedScreen}
                    selectedElementId={selectedElementId}
                    onCommit={commitElements}
                    onSelectElement={selectElementAndOpenControls}
                    onSelectAnimation={setSelectedAnimationEffectId}
                  />
                )}
                {panel === 'drawing' && (
                  <StudioDrawingPanel
                    tool={drawingTool}
                    color={drawingColor}
                    width={drawingWidth}
                    opacity={drawingOpacity}
                    canUndo={drawingPast.length > 0}
                    canRedo={drawingFuture.length > 0}
                    hasDrawing={authoredDrawingStrokes(selectedScreen).length > 0}
                    onToolChange={setDrawingTool}
                    onColorChange={setDrawingColor}
                    onWidthChange={setDrawingWidth}
                    onOpacityChange={setDrawingOpacity}
                    onUndo={undoDrawing}
                    onRedo={redoDrawing}
                    onClear={() => setAuthoredDrawings([])}
                  />
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
      {showLegacyEditor && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setLayoutGalleryOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"
            >
              <LayoutTemplate size={17} />
              Layouts
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === 'script' ? null : 'script')}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"
            >
              <FileText size={17} />
              Script View
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === 'resources' ? null : 'resources')}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"
            >
              <Upload size={17} />
              Resources
            </button>
            <span className="mx-1 h-7 w-px bg-gray-200" />
            <button
              type="button"
              disabled={elementPast.length === 0}
              onClick={undoElementChange}
              title="Undo the latest element change"
              className="rounded-lg p-2 text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <Undo2 size={18} />
            </button>
            <button
              type="button"
              disabled={elementFuture.length === 0}
              onClick={redoElementChange}
              title="Redo the latest element change"
              className="rounded-lg p-2 text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <Redo2 size={18} />
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === 'elements' ? null : 'elements')}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"
            >
              <Boxes size={17} />
              Elements
            </button>
            {hasUnsavedChanges && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Unsaved changes
              </span>
            )}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                disabled={!hasUnsavedChanges || savingScreen}
                onClick={() => void saveScreenDraft()}
                title={
                  hasUnsavedChanges
                    ? 'Save this Screen draft'
                    : 'There are no unsaved canvas changes'
                }
                className="inline-flex items-center gap-2 rounded-lg border border-blue-900 px-3 py-2 text-sm font-semibold text-blue-900 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-slate-400"
              >
                <Save size={16} />
                {savingScreen ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                disabled={!selectedScreen}
                onClick={() => void openPreview()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Eye size={16} />
                Preview
              </button>
            </div>
          </div>

          <StudioWorkflowPanel
            status={workflowStatus}
            problems={workflowProblems}
            loading={loadingWorkflow}
            action={workflowAction}
            onRefresh={() => void loadWorkflow(true)}
            onAction={(action) => void runWorkflowAction(action)}
          />

          {panel && (
            <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              {panel === 'resources' && (
                <>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">Resources</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Select a visual, media, or simulation element, then attach a compatible
                        immutable Resource version.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/studio/resources')}
                      className="rounded-lg border border-blue-800 px-3 py-2 text-sm font-semibold text-blue-900"
                    >
                      Manage Resource library
                    </button>
                  </div>
                  {supportsResourcePlacement(selectedElement?.type) ? (
                    <ResourceLibrary
                      mode="picker"
                      onPick={bindResourceToSelectedElement}
                      allowedTypes={allowedResourceTypes}
                    />
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                      Select a visual, media, or simulation element to see compatible Resources.
                    </p>
                  )}
                </>
              )}
              {panel === 'insert-resources' && (
                <>
                  <div className="mb-3">
                    <h2 className="font-semibold">From Resource</h2>
                    <p className="mt-1 text-sm text-slate-500">Choose a Resource to add directly to the current Screen.</p>
                  </div>
                  <ResourceLibrary mode="picker" initialType={insertResourceFilter ?? ''} allowedTypes={insertResourceFilter ? [insertResourceFilter] : undefined} onPick={placeResourceDirectly} />
                </>
              )}
              {panel === 'script' && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Screen Script</h2>
                    {!editorReadOnly ? (
                      <button
                        type="button"
                        disabled={!selectedScreenId}
                        onClick={() => void editSelectedScreenScript()}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    ) : null}
                  </div>
                  {(() => {
                    const entries = screenScriptEntries(
                      scripts.find((row) => row.screen_id === selectedScreenId)?.content_json,
                    );
                    return entries.length > 0 ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {entries.map(([key, value]) => (
                          <div key={key} className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              {key.replaceAll('_', ' ')}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">{value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        No saved script exists for the selected Screen.
                      </p>
                    );
                  })()}
                </>
              )}
              {panel === 'elements' && (
                <StudioElementPanel
                  layout={selectedLayout}
                  screen={selectedScreen}
                  selectedElementId={selectedElementId}
                  onSelect={setSelectedElementId}
                  onAdd={addElement}
                  onChangeSlotType={changeSlotType}
                  onAddBlank={addBlankElement}
                  onUpdate={updateElement}
                  onDuplicate={duplicateElement}
                  onRemove={removeElement}
                  availableScreens={screenList.screens}
                />
              )}
            </section>
          )}

          {error ? (
            <div
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadScreens()}
                className="font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
            <StudioScreenNavigator
              screens={screenList.screens}
              selectedScreenId={selectedScreenId}
              loading={loadingScreens}
              creating={creating}
              onSelect={selectScreen}
              onCreateBlank={() => void createBlankScreen()}
            />
            <BlankScreenCanvas
              screen={selectedScreen}
              loading={loadingScreen}
              layout={selectedLayout}
              showGuides={showCanvasGuides}
              selectedElementId={selectedElementId}
              onSelectElement={(elementId) => {
                setSelectedElementId(elementId);
                setPanel('elements');
              }}
            />
          </div>
        </>
      )}
      {tablePickerOpen && selectedScreen && (
        <>
          <button type="button" aria-label="Close table picker" onClick={() => setTablePickerOpen(false)} className="fixed inset-0 z-[89] cursor-default bg-transparent" />
          <div className="fixed z-[90] w-[242px] rounded-md border border-slate-300 bg-white shadow-2xl" style={{ left: tablePickerPosition.left, top: tablePickerPosition.top }} role="menu" aria-label="Insert table options">
            <div className="border-b border-slate-200 px-3 py-2 text-xs font-bold text-slate-900">{tablePickerHover.rows && tablePickerHover.columns ? `${tablePickerHover.columns} × ${tablePickerHover.rows} Table` : 'Insert Table'}</div>
            <div className="grid grid-cols-10 gap-1 p-2" onMouseLeave={() => setTablePickerHover({ rows: 0, columns: 0 })} aria-label="Choose table dimensions">
              {Array.from({ length: 8 }, (_, row) => Array.from({ length: 10 }, (__, column) => {
                const rows = row + 1;
                const columns = column + 1;
                const highlighted = rows <= tablePickerHover.rows && columns <= tablePickerHover.columns;
                return <button key={`${rows}-${columns}`} type="button" title={`${columns} columns by ${rows} rows`} aria-label={`Insert ${columns} columns by ${rows} rows table`} onMouseEnter={() => setTablePickerHover({ rows, columns })} onFocus={() => setTablePickerHover({ rows, columns })} onClick={() => { setTablePickerOpen(false); addTableElement(rows, columns); }} className={`h-4 w-4 border ${highlighted ? 'border-blue-700 bg-blue-200' : 'border-slate-500 bg-white hover:bg-blue-100'}`} />;
              }))}
            </div>
          </div>
        </>
      )}
      {renameOpen && selectedScreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Rename screen"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void renameScreen();
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">Rename Screen</h2>
            <p className="mt-1 text-sm text-slate-600">
              The title is saved immediately, and AutoSave continues for later canvas changes.
            </p>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Screen title
              <input
                autoFocus
                maxLength={250}
                value={renameTitle}
                onChange={(event) => setRenameTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={renamingScreen}
                onClick={() => setRenameOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={renamingScreen || !renameTitle.trim()}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {renamingScreen ? 'Saving…' : 'Save title'}
              </button>
            </div>
          </form>
        </div>
      )}
      {screenAction && selectedScreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={
            screenAction === 'delete-screen' ? 'Confirm screen deletion' : 'Confirm layout removal'
          }
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">
              {screenAction === 'delete-screen'
                ? 'Delete this Screen?'
                : 'Remove the applied layout?'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {screenAction === 'delete-screen'
                ? 'This removes the complete Screen and its element placements. This action cannot be undone.'
                : 'The Screen will become blank/freeform. Existing elements, positions and exact Resource versions will be preserved.'}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={screenActionBusy}
                onClick={() => setScreenAction(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={screenActionBusy}
                onClick={() => void confirmScreenAction()}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${screenAction === 'delete-screen' ? 'bg-red-700' : 'bg-blue-900'}`}
              >
                {screenActionBusy
                  ? 'Working…'
                  : screenAction === 'delete-screen'
                    ? 'Delete Screen'
                    : 'Remove Layout'}
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingLayout &&
        selectedScreen &&
        (() => {
          const result = remapElementsToLayout(selectedScreen.elements, pendingLayout.layout);
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Confirm layout change"
            >
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="text-lg font-semibold text-slate-900">
                  Apply {pendingLayout.layout.id}?
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Existing elements are never changed silently. {result.elements.length} compatible
                  element{result.elements.length === 1 ? '' : 's'} will be kept and remapped.{' '}
                  {result.removed.length} incompatible element
                  {result.removed.length === 1 ? '' : 's'} will be removed.
                </p>
                {result.removed.length > 0 && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    Removed: {result.removed.map((element) => element.id).join(', ')}
                  </p>
                )}
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingLayout(null)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={applyingLayout}
                    onClick={() => void saveAppliedLayout(pendingLayout.row, pendingLayout.layout)}
                    className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {applyingLayout ? 'Applying...' : 'Keep compatible and apply'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      {saveConflict && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Screen save conflict"
        >
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">This Screen changed elsewhere</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your unsaved draft is still safe in this editor, but a newer saved copy is available
              on the server. Nothing has been overwritten.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <b>Your draft:</b> {saveConflict.draft.elements.length} element
                {saveConflict.draft.elements.length === 1 ? '' : 's'}
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                <b>Latest saved Screen:</b> {saveConflict.latest.elements.length} element
                {saveConflict.latest.elements.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  rememberScreenRevision(saveConflict.latest);
                  selectedScreenRef.current = saveConflict.latest;
                  setSelectedScreen(saveConflict.latest);
                  setScreenList((current) => ({
                    ...current,
                    screens: current.screens.map((screen) =>
                      screen.id === saveConflict.latest.id ? saveConflict.latest : screen,
                    ),
                  }));
                  setElementPast([]);
                  setElementFuture([]);
                  setDrawingPast([]);
                  setDrawingFuture([]);
                  setHasUnsavedChanges(false);
                  setSaveConflict(null);
                  toast.success('Loaded the latest saved Screen.');
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Discard draft and load server
              </button>
              <button
                type="button"
                onClick={() => {
                  const retryDraft = {
                    ...saveConflict.draft,
                    revision_no: saveConflict.latest.revision_no,
                  };
                  rememberScreenRevision(saveConflict.latest);
                  selectedScreenRef.current = retryDraft;
                  setSelectedScreen(retryDraft);
                  setScreenList((current) => ({
                    ...current,
                    screens: current.screens.map((screen) =>
                      screen.id === retryDraft.id ? retryDraft : screen,
                    ),
                  }));
                  setHasUnsavedChanges(true);
                  setSaveConflict(null);
                  toast.success('Your draft is ready to retry against the latest saved Screen.');
                }}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Keep draft and retry
              </button>
            </div>
          </div>
        </div>
      )}
      {screenMetadataOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Screen metadata"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Screen metadata</h2>
            <p className="mt-1 text-sm text-slate-600">
              Screen values override optional Topic defaults. Screen Scripts remain optional.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Pedagogy <span className="text-red-600">*</span>
                <select
                  value={newScreenPedagogyId}
                  onChange={(event) => setNewScreenPedagogyId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
                >
                  <option value="">Select pedagogy</option>
                  {taxonomyTerms
                    .filter((term) => term.type === 'pedagogy')
                    .map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.label}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Bloom <span className="font-normal text-slate-500">(optional)</span>
                <select
                  value={newScreenBloomId}
                  onChange={(event) => setNewScreenBloomId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
                >
                  <option value="">Use Topic default / none</option>
                  {taxonomyTerms
                    .filter((term) => term.type === 'bloom')
                    .map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.label}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={creating}
                onClick={() => setScreenMetadataOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || !newScreenPedagogyId}
                onClick={() => void saveScreenMetadata()}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {creating ? 'Saving…' : 'Save metadata'}
              </button>
            </div>
          </div>
        </div>
      )}
      {scriptOverlayOpen ? (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Screen Script viewer">
          <section className="flex h-[min(90dvh,900px)] w-[min(94vw,1280px)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-950">Screen Script</h2>
                <p className="truncate text-xs text-slate-500">{selectedScreen ? `Screen ${selectedScreen.screen_number}: ${screenDisplayTitle(selectedScreen)}` : 'No Screen selected'}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" disabled={!sessionId} onClick={() => void studioDocumentsApi.downloadScreenScriptSource(sessionId).catch((downloadError) => toast.error(getStudioErrorMessage(downloadError)))} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-900 px-3 text-xs font-semibold text-white disabled:opacity-40"><Download size={15} />Download script</button>
                <button type="button" onClick={() => setScriptOverlayOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label="Close Screen Script"><X size={17} /></button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-5">
              {(() => {
                const script = scripts.find((row) => row.screen_id === selectedScreenId)?.content_json;
                if (script?.sections?.length) return <StructuredScreenScriptEditor content={script} editable={false} onChange={() => undefined} />;
                const entries = screenScriptEntries(script);
                if (!entries.length) return <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">No saved script is available for this Screen.</div>;
                return <div className="mx-auto max-w-5xl space-y-3">{entries.map(([key, value]) => <section key={key} className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{key.replaceAll('_', ' ')}</h3><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800"><StudioScreenScriptMath text={value || '—'} /></div></section>)}</div>;
              })()}
            </div>
          </section>
        </div>
      ) : null}
      {diagramChooserOpen ? <StudioDiagramChooser onInsert={addSmartDiagram} onClose={() => setDiagramChooserOpen(false)} /> : null}
      {diagramLayoutGalleryOpen ? <StudioDiagramChooser onInsert={(layoutId) => { const layout = SMART_DIAGRAM_LAYOUTS.find((candidate) => candidate.id === layoutId); if (layout) updateSelectedDiagram({ layout: layout.id, category: layout.category }); setDiagramLayoutGalleryOpen(false); }} onClose={() => setDiagramLayoutGalleryOpen(false)} /> : null}
      {layoutGalleryOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Layouts"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setLayoutGalleryOpen(false);
          }}
        >
          <section className="flex h-[min(90dvh,780px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900">Layouts</h2>
                <p className="truncate text-xs text-slate-500">Choose a reusable Screen layout or manage custom layouts.</p>
              </div>
              <button type="button" onClick={() => setLayoutGalleryOpen(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label="Close layouts">
                <X size={16} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden">
              <StudioLayoutGallery
                layouts={layouts}
                selectedLayoutId={selectedScreen?.layout_id ?? null}
                applying={applyingLayout}
                onApply={(row, layout) => {
                  requestLayoutApplication(row, layout);
                  setLayoutGalleryOpen(false);
                }}
                onLayoutsChanged={loadLayouts}
                onCancel={() => setLayoutGalleryOpen(false)}
                editRequest={layoutEditRequest}
              />
            </div>
          </section>
        </div>
      )}
      {rejectionDetailsOpen && workflowStatus?.status === 'rejected' ? <StudioRejectionDetailsDialog status={workflowStatus} onClose={() => setRejectionDetailsOpen(false)} /> : null}
      {workflowDetailsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Publication issue details">
          <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-slate-900"><CircleAlert size={18} className={workflowStatus?.validation.valid ? 'text-emerald-700' : 'text-amber-700'} />Publication readiness details</h2>
                <p className="mt-1 text-xs text-slate-500">Review blocking issues and optional warnings for this Session.</p>
              </div>
              <button type="button" onClick={() => setWorkflowDetailsOpen(false)} className="grid h-8 w-8 shrink-0 place-items-center text-slate-500 hover:text-slate-900" aria-label="Close publication issue details"><X size={17} /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
              {workflowDetailItems.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {workflowDetailItems.map(({ problem, severity }, index) => (
                    <li key={`${severity}-${problem.code}-${problem.screen_id ?? index}`} className="flex gap-3 py-4 first:pt-2">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${severity === 'warning' ? 'bg-blue-500' : 'bg-amber-500'}`} aria-hidden="true" />
                      <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{severity === 'warning' ? 'Warning' : 'Required'} · {problem.code.replaceAll('_', ' ')}</p>
                          {problem.code !== 'SCREEN_SCRIPT_MISSING' ? <p className="mt-1 text-sm text-slate-800">{problem.message}</p> : null}
                          {problem.screen_id ? <p className="mt-1 text-xs text-slate-500">Screen ID {problem.screen_id}</p> : null}
                        </div>
                        {['SESSION_PLAN_MISSING', 'SCREENS_MISSING', 'SCREEN_SCRIPT_MISSING'].includes(problem.code) ? (
                          <button type="button" disabled={editorReadOnly} onClick={() => void openWorkflowProblemTarget(problem)} className="inline-flex shrink-0 items-center gap-1 py-1 text-xs font-semibold text-blue-700 hover:text-blue-950 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
                            {problem.code === 'SESSION_PLAN_MISSING' ? 'Open Session Plan' : problem.code === 'SCREENS_MISSING' ? 'Add Screen' : 'Edit Screen Script'} <ChevronRight size={13} />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8 text-center">
                  <Check size={24} className="mx-auto text-emerald-700" />
                  <p className="mt-2 font-semibold text-emerald-900">No publication issues found.</p>
                  <p className="mt-1 text-sm text-emerald-700">This Session currently satisfies the readiness checks.</p>
                </div>
              )}
            </div>
            <footer className="flex justify-end px-6 pb-5 pt-1">
              <button type="button" onClick={() => setWorkflowDetailsOpen(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Close</button>
            </footer>
          </div>
        </div>
      )}
      {assetCatalogOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Discover Assets"
        >
          <div className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <div>
                <h2 className="font-bold text-slate-900">Discover Assets</h2>
                <p className="text-xs text-slate-500">Choose a reusable asset to add directly to the current Screen.</p>
              </div>
              <button type="button" onClick={() => setAssetCatalogOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label="Close Discover Assets">
                <X size={17} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <AssetCatalogPanel
                mode="picker"
                onImported={(resource) => {
                  setAssetCatalogOpen(false);
                  placeResourceDirectly(resource);
                }}
              />
            </div>
          </div>
        </div>
      )}
      {zoomDialogMode && sessionId && selectedScreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label={`${zoomDialogMode} Zoom`} onPointerDown={(event) => { if (event.target === event.currentTarget) setZoomDialogMode(null); }}>
          <div className="relative flex h-[84dvh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-2.5">
              <h2 className="shrink-0 text-base font-semibold text-slate-900">{zoomDialogMode === 'summary' ? 'Insert Summary Zoom' : zoomDialogMode === 'section' ? 'Insert Section Zoom' : 'Insert Screen (Slide) Zoom'}</h2>
              <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{zoomDialogMode === 'summary' ? 'Select the Sections to include in the ordered Summary Zoom.' : zoomDialogMode === 'section' ? 'Select a Section, or create one from Screens.' : 'Select the Screen to open before returning to this Screen.'}</p>
              <button type="button" onClick={() => setZoomDialogMode(null)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label="Close Zoom window"><X size={14} /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
              <StudioZoomPanel
                mode={zoomDialogMode}
                sessionId={sessionId}
                screens={screenList.screens}
                currentScreenId={selectedScreen.id}
                disabled={editorReadOnly}
                onInsert={addZoomElements}
                onCancel={() => setZoomDialogMode(null)}
              />
            </div>
          </div>
        </div>
      )}
      {resourceUploadOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Upload ${insertResourceType} Resource`}
        >
          <div className="relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setResourceUploadOpen(false)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              aria-label="Close Resource upload"
            >
              <X size={16} />
            </button>
            <div className="pr-8">
              <StudioResourceInsertUpload
                type={insertResourceType}
                onUploaded={(resource) => {
                  setResourceUploadOpen(false);
                  placeResourceDirectly(resource);
                }}
              />
            </div>
          </div>
        </div>
      )}
      {createScreenOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add Screen details"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Add Screen</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pedagogy is required and Bloom is optional. The Screen Script starts blank.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Screen title
                <input
                  value={newScreenTitle}
                  onChange={(event) => setNewScreenTitle(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Pedagogy <span className="text-red-600">*</span>
                <select
                  value={newScreenPedagogyId}
                  onChange={(event) => setNewScreenPedagogyId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
                >
                  <option value="">Select pedagogy</option>
                  {taxonomyTerms
                    .filter((term) => term.type === 'pedagogy')
                    .map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.label}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Bloom <span className="font-normal text-slate-500">(optional)</span>
                <select
                  value={newScreenBloomId}
                  onChange={(event) => setNewScreenBloomId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
                >
                  <option value="">No Screen override</option>
                  {taxonomyTerms
                    .filter((term) => term.type === 'bloom')
                    .map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.label}
                      </option>
                    ))}
                </select>
              </label>
              <div className="hidden sm:block" />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={creating}
                onClick={() => setCreateScreenOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || !newScreenPedagogyId}
                onClick={() => void confirmCreateBlankScreen()}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {creating ? 'Creating…' : 'Create Screen'}
              </button>
            </div>
          </div>
        </div>
      )}
      {revisionPromptOpen && workflowStatus && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Start Session update"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">
              {workflowStatus.status === 'published'
                ? 'Edit the published Session?'
                : 'Return this Session to Draft?'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {workflowStatus.status === 'published'
                ? 'The current published release remains unchanged for viewers. An editable Draft will open for your changes; it must pass review and approval before it can replace the published release.'
                : `This Session is currently ${workflowStatus.status}. Returning it to Draft clears the current review or approval so it can be edited and submitted again.`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={startingRevision}
                onClick={() => setRevisionPromptOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={startingRevision}
                onClick={() => void startRevision()}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {startingRevision
                  ? 'Preparing…'
                  : workflowStatus.status === 'published'
                    ? 'Create editable Draft'
                    : 'Return to Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudioShell>
  );
}
