import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Eye,
  Focus,
  FileText,
  GalleryHorizontalEnd,
  Grid3X3,
  GripVertical,
  LayoutTemplate,
  ListOrdered,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Paintbrush,
  Network,
  Pencil,
  Plus,
  Presentation,
  Redo2,
  RefreshCw,
  Save,
  Shapes,
  Sigma,
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
import StudioWorkflowPanel from './components/StudioWorkflowPanel';
import StudioElementPanel from './components/StudioElementPanel';
import StudioAnimationsPanel from './components/StudioAnimationsPanel';
import StudioMathPanel from './components/StudioMathPanel';
import StudioShapesPanel from './components/StudioShapesPanel';
import { inlineShapeToken, type InlineShapeData } from './components/studioInlineShape';
import StudioIconButton from './components/StudioIconButton';
import StudioDrawingPanel from './components/StudioDrawingPanel';
import StudioTransitionsPanel from './components/StudioTransitionsPanel';
import StudioZoomPanel, { type ZoomInsert } from './components/StudioZoomPanel';
import StudioSmartDiagramPanel from './components/StudioSmartDiagramPanel';
import StudioScreenScriptMath from './components/StudioScreenScriptMath';
import { clickerNavigationAction } from './components/studioClickerRuntime';
import {
  SMART_DIAGRAM_THEMES,
  createSmartDiagramContent,
  isSmartDiagramContent,
  layoutSmartDiagram,
} from './components/smartDiagramModel';
import ResourceLibrary from './components/resources/ResourceLibrary';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import { ensureTargetStudioLayouts } from './api/studioEditorApi';
import type { StudioLayoutSummary } from './api/studioEditorApi';
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
    | 'layouts'
    | 'script'
    | 'resources'
    | 'elements'
    | 'math'
    | 'shapes'
    | 'animations'
    | 'transitions'
    | 'drawing'
    | 'zoom'
    | 'diagrams'
    | null
  >('elements');
  const [animationPreview, setAnimationPreview] = useState<{
    elementId: string;
    token: number;
  } | null>(null);
  const [layouts, setLayouts] = useState<StudioLayoutSummary[]>([]);
  const [scripts, setScripts] = useState<ScreenScriptRow[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<StudioWorkflowStatus | null>(null);
  const [workflowProblems, setWorkflowProblems] = useState<StudioValidationProblem[]>([]);
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
  const [selectedLayoutSlotId, setSelectedLayoutSlotId] = useState<string | null>(null);
  const inlineEquationCaretRef = useRef<{ elementId: string; offset: number } | null>(null);
  const editorClipboardRef = useRef<StudioElement[]>([]);
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
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [leftPanelView, setLeftPanelView] = useState<'screens' | 'script'>('screens');
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
  const [renameTitle, setRenameTitle] = useState('');
  const [renamingScreen, setRenamingScreen] = useState(false);
  const [reorderIds, setReorderIds] = useState<number[]>([]);
  const [reorderingScreens, setReorderingScreens] = useState(false);
  const [draggingScreenId, setDraggingScreenId] = useState<number | null>(null);
  const reorderIdsRef = useRef<number[]>([]);
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

  const commitElements = (elements: StudioElement[], selectElementId?: string | null) => {
    if (!selectedScreen || editorReadOnly) return;
    setElementPast((past) => [...past.slice(-99), selectedScreen.elements]);
    setElementFuture([]);
    setSelectedScreen({ ...selectedScreen, elements });
    if (selectElementId !== undefined) setSelectedElementId(selectElementId);
    setHasUnsavedChanges(true);
  };

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
      content: { text: '' },
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
      updateElement({ ...existing, type, content: { text: '' }, resource: undefined });
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
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type,
      content: initialContent,
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
    if (!selectedScreen || editorReadOnly) return;
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
      const nextContent = { ...inlineTarget.content };
      delete nextContent.richTextHtml;
      const updated = {
        ...inlineTarget,
        content: {
          ...nextContent,
          text: `${text.slice(0, offset)}${token}${text.slice(offset)}`,
        },
      };
      inlineEquationCaretRef.current = {
        elementId: inlineTarget.id,
        offset: offset + token.length,
      };
      commitElements(
        selectedScreen.elements.map((element) => element.id === inlineTarget.id ? updated : element),
        inlineTarget.id,
      );
      toast.success('Equation inserted into the selected text element.');
      return;
    }
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `math-${token}`;
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type: 'math',
      content: { text: latex, latex, color: '#0f2747', fontSize: 42, alignment: 'center' },
      position: {
        x: 600,
        y: 410,
        width: 720,
        height: 160,
        zIndex: selectedScreen.elements.length + 1,
      },
    };
    commitElements([...selectedScreen.elements, element], element.id);
    toast.success('Equation added. Move or resize it on the canvas, then Save.');
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
      setPanel('diagrams');
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
    setPanel('diagrams');
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
    updateElement({ ...element, position: { ...element.position, ...bounds } });
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
        mediaTransform: { fit: 'contain', scale: 1, x: 0, y: 0 },
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

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    const cloneForPaste = (source: StudioElement, offset = 40): StudioElement => {
      const token =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const id = `element-${token}`;
      const width = Number(source.position.width) || 400;
      const height = Number(source.position.height) || 240;
      return {
        ...source,
        id,
        slotId: `free-${id}`,
        content: structuredClone(source.content),
        position: {
          ...source.position,
          x: Math.min((Number(source.position.x) || 0) + offset, 1920 - width),
          y: Math.min((Number(source.position.y) || 0) + offset, 1080 - height),
        },
        resource: source.resource
          ? {
              ...source.resource,
              usage: { ...source.resource.usage, slot_id: `free-${id}` },
            }
          : undefined,
      };
    };
    const commands = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || editorReadOnly) return;
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const selected = selectedScreen?.elements.find((element) => element.id === selectedElementId);

      if (event.key === 'F5') {
        event.preventDefault();
        if (event.shiftKey) void openPresentation();
        else void openPreview();
        return;
      }
      if (key === 'escape') {
        setSelectedElementId(null);
        return;
      }
      if (modifier && key === 'c' && selected) {
        event.preventDefault();
        editorClipboardRef.current = [structuredClone(selected)];
        return;
      }
      if (modifier && key === 'x' && selected) {
        event.preventDefault();
        editorClipboardRef.current = [structuredClone(selected)];
        removeElement(selected.id);
        return;
      }
      if (modifier && key === 'v' && editorClipboardRef.current.length && selectedScreen) {
        event.preventDefault();
        const pasted = editorClipboardRef.current.map((element, index) =>
          cloneForPaste(element, 40 + index * 20),
        );
        commitElements([...selectedScreen.elements, ...pasted], pasted.at(-1)?.id ?? null);
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
    const pasteExternal = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target) || editorClipboardRef.current.length) return;
      const images = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/'),
      );
      if (!images.length) return;
      event.preventDefault();
      addDroppedFiles(images, { x: 300, y: 260 });
    };
    window.addEventListener('keydown', commands);
    window.addEventListener('paste', pasteExternal);
    return () => {
      window.removeEventListener('keydown', commands);
      window.removeEventListener('paste', pasteExternal);
    };
  }, [editorReadOnly, selectedElementId, selectedScreen]);

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
    if (leftPanelOpen && leftPanelView === 'screens') {
      setLeftPanelOpen(false);
      return;
    }
    const ids = screenList.screens.map((screen) => screen.id);
    setReorderIds(ids);
    reorderIdsRef.current = ids;
    setLeftPanelView('screens');
    setLeftPanelOpen(true);
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
  const allowedResourceTypes = resourceTypesForObject(selectedElement?.type);
  const selectElementAndOpenControls = (elementId: string) => {
    setSelectedElementId(elementId);
    if (editorReadOnly) return;
    const element = selectedScreen?.elements.find((candidate) => candidate.id === elementId);
    setSelectedLayoutSlotId(element?.slotId ?? null);
    const nextPanel = isSmartDiagramContent(element?.content)
      ? 'diagrams'
      : element?.type === 'math'
        ? 'math'
        : element?.type === 'shape'
          ? 'shapes'
          : 'elements';
    setPanel(nextPanel);
    setRightPanelOpen(true);
  };
  const studioTools = [
    { id: 'layouts', label: 'Layouts', icon: <LayoutTemplate size={17} /> },
    { id: 'resources', label: 'Resources', icon: <Upload size={17} /> },
    { id: 'elements', label: 'Elements', icon: <Boxes size={17} /> },
    { id: 'animations', label: 'Animations', icon: <Sparkles size={17} /> },
    { id: 'math', label: 'Math equations', icon: <Sigma size={17} /> },
    { id: 'transitions', label: 'Transitions', icon: <GalleryHorizontalEnd size={17} /> },
    { id: 'shapes', label: 'Shapes', icon: <Shapes size={17} /> },
    { id: 'diagrams', label: 'Smart Diagram', icon: <Network size={17} /> },
    { id: 'drawing', label: 'Drawing', icon: <Paintbrush size={17} /> },
    { id: 'zoom', label: 'Zoom navigation', icon: <Focus size={17} /> },
  ] as const;
  const toggleStudioTool = (tool: (typeof studioTools)[number]['id']) => {
    if (rightPanelOpen && panel === tool) {
      setRightPanelOpen(false);
      return;
    }
    setPanel(tool);
    setRightPanelOpen(true);
  };

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
        <section className="studio-context-bar shrink-0 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-md">
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
                <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-600" title={`AutoSave: ${saveStatus}`} aria-live="polite">
                  {saveStatus === 'saving' ? <LoaderCircle size={14} className="animate-spin" /> : saveStatus === 'saved' ? <Check size={14} className="text-emerald-600" /> : saveStatus === 'offline' || saveStatus === 'error' ? <CloudOff size={14} className="text-amber-700" /> : <Cloud size={14} />}
                  <span className="hidden xl:inline">{saveStatus === 'idle' ? 'AutoSave' : saveStatus}</span>
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
          className={`studio-editor-workspace relative grid min-h-0 flex-1 overflow-hidden ${leftPanelOpen ? 'has-left-panel' : ''} ${toolPanelOpen ? 'has-right-panel' : ''}`}
        >
          <aside className={`studio-editor-left-panel ${leftPanelOpen ? 'is-expanded' : ''} flex min-h-0 overflow-visible`}>
            <nav aria-label="Screen actions" className="flex w-11 shrink-0 flex-col items-center justify-center gap-1 border-r border-slate-200 p-1">
              <button
                type="button"
                onClick={openScreenReorder}
                disabled={screenList.screens.length === 0 || (hasUnsavedChanges && !(leftPanelOpen && leftPanelView === 'screens'))}
                title={hasUnsavedChanges ? 'Wait for AutoSave before reordering' : 'Screens and reorder'}
                aria-label="Screens and reorder"
                aria-expanded={leftPanelOpen && leftPanelView === 'screens'}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-35 ${leftPanelOpen && leftPanelView === 'screens' ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <ListOrdered size={18} />
              </button>
              <button
                type="button"
                onClick={() => { setLeftPanelView('script'); setLeftPanelOpen((open) => leftPanelView !== 'script' || !open); }}
                title="Screen Script"
                aria-label="Screen Script"
                aria-expanded={leftPanelOpen && leftPanelView === 'script'}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${leftPanelOpen && leftPanelView === 'script' ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <FileText size={18} />
              </button>
              <span className="my-1 h-px w-7 bg-slate-200" />
              <button type="button" title={creating ? 'Adding Screen' : 'Add Screen'} aria-label="Add Screen" disabled={editorReadOnly || creating || loadingScreens} onClick={() => void createBlankScreen()} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-blue-800 hover:bg-blue-50 disabled:opacity-35"><Plus size={18} /></button>
              <button type="button" title="Screen metadata" aria-label="Screen metadata" disabled={editorReadOnly || creating || !selectedScreenId} onClick={() => void openScreenMetadata()} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-35"><SlidersHorizontal size={18} /></button>
              <button type="button" title="Edit layout" aria-label="Edit layout" disabled={editorReadOnly || !selectedScreen?.layout_id} onClick={() => { if (!selectedScreen?.layout_id || editorReadOnly) return; setRightPanelOpen(true); setPanel('layouts'); setLayoutEditRequest({ layoutId: selectedScreen.layout_id, requestId: Date.now() }); }} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-35"><Pencil size={18} /></button>
              <button type="button" title="Remove layout" aria-label="Remove layout" disabled={editorReadOnly || !selectedScreen?.layout_id} onClick={() => requestScreenAction('remove-layout')} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-35"><Unlink size={18} /></button>
            </nav>
              <section aria-hidden={!leftPanelOpen} onPointerMove={leftPanelView === 'screens' ? moveDraggedScreen : undefined} onPointerUp={leftPanelView === 'screens' ? finishScreenDrag : undefined} onPointerCancel={leftPanelView === 'screens' ? finishScreenDrag : undefined} className={`studio-editor-left-content ${leftPanelOpen ? 'is-open' : 'is-closed'} flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2`}>
                {leftPanelView === 'screens' ? (
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
                ) : <>
                  <h2 className="shrink-0 font-semibold">Screen Script</h2>
                  {(() => {
                  const entries = screenScriptEntries(
                    scripts.find((row) => row.screen_id === selectedScreenId)?.content_json,
                  );
                  return entries.length > 0 ? (
                    <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {entries.map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-slate-50 p-2">
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            {key.replaceAll('_', ' ')}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-xs"><StudioScreenScriptMath text={value || '—'} /></p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 min-h-0 flex-1 overflow-y-auto text-xs text-slate-500">
                      No saved script for this Screen.
                    </p>
                  );
                  })()}
                </>}
              </section>
          </aside>
          <main className="studio-editor-canvas flex min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1">
              <BlankScreenCanvas
                screen={selectedScreen}
                screenTitle={selectedScreen ? screenDisplayTitle(selectedScreen) : undefined}
                loading={loadingScreen}
                layout={selectedLayout}
                showGuides={showCanvasGuides}
                animationPreview={animationPreview}
                selectedElementId={selectedElementId}
                selectedSlotId={selectedLayoutSlotId}
                onSelectElement={selectElementAndOpenControls}
                onSelectSlot={(slotId) => { setSelectedElementId(null); setSelectedLayoutSlotId(slotId); }}
                onClearElementSelection={() => { setSelectedElementId(null); setSelectedLayoutSlotId(null); }}
                onChangeElement={editorReadOnly ? undefined : updateElement}
                onChangeElementBounds={editorReadOnly ? undefined : changeElementBounds}
                onChangeElementContent={editorReadOnly ? undefined : changeElementContent}
                onTextCaretChange={(elementId, offset) => {
                  inlineEquationCaretRef.current = { elementId, offset };
                }}
                onEditInlineShape={(elementId, shape, start, end) => {
                  setSelectedElementId(elementId);
                  setInlineShapeEdit({ elementId, shape, start, end });
                  setRightPanelOpen(true);
                  setPanel('shapes');
                }}
                onDuplicateElement={editorReadOnly ? undefined : duplicateElement}
                onRemoveElement={editorReadOnly ? undefined : removeElement}
                onOpenTool={
                  editorReadOnly
                    ? undefined
                    : (tool) => {
                        setRightPanelOpen(true);
                        setPanel(tool);
                      }
                }
                drawingStrokes={authoredDrawingStrokes(selectedScreen)}
                drawingEnabled={!editorReadOnly && panel === 'drawing'}
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
          {!editorReadOnly && (
            <aside className={`studio-editor-tools-panel ${toolPanelOpen ? 'is-expanded' : ''} flex min-h-0 overflow-visible`}>
              <nav aria-label="Studio tools" className="studio-tools-tabs flex w-11 shrink-0 flex-col items-center justify-center gap-1 overflow-y-auto border-r border-slate-200 p-1">
                {studioTools.map((tool) => (
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
              <div aria-hidden={!toolPanelOpen} className={`studio-editor-tools-content ${toolPanelOpen ? 'is-open' : 'is-closed'} min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain p-3 [scrollbar-gutter:stable]`}>
                {panel === 'layouts' && (
                  <StudioLayoutGallery
                    layouts={layouts}
                    selectedLayoutId={selectedScreen?.layout_id ?? null}
                    applying={applyingLayout}
                    onApply={requestLayoutApplication}
                    onLayoutsChanged={loadLayouts}
                    editRequest={layoutEditRequest}
                  />
                )}
                {panel === 'resources' && (
                  <ResourceLibrary mode="picker" onPick={bindResourceToSelectedElement} />
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
                {panel === 'zoom' && sessionId && selectedScreen ? (
                  <StudioZoomPanel
                    sessionId={sessionId}
                    screens={screenList.screens}
                    currentScreenId={selectedScreen.id}
                    disabled={editorReadOnly}
                    onInsert={addZoomElements}
                  />
                ) : null}
                {panel === 'math' && (
                  <StudioMathPanel
                    screen={selectedScreen}
                    selectedElementId={selectedElementId}
                    onSelect={selectElementAndOpenControls}
                    onAddStandalone={(latex) => addMathElement(latex, true)}
                    onInsertInline={(latex) => addMathElement(latex)}
                    onUpdate={updateElement}
                    onDuplicate={duplicateElement}
                    onRemove={removeElement}
                    inlineTarget={Boolean(
                      selectedElement &&
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
                      ].includes(selectedElement.type),
                    )}
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
                    onUpdate={updateElement}
                    onPreview={(elementId) => setAnimationPreview({ elementId, token: Date.now() })}
                  />
                )}
                {panel === 'transitions' && (
                  <StudioTransitionsPanel
                    settings={selectedScreen?.screen_settings_json ?? null}
                    onChange={setScreenTransition}
                    onApplyToAll={applyTransitionToAllScreens}
                    screenCount={screenList.screens.length}
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
              onClick={() => setPanel(panel === 'layouts' ? null : 'layouts')}
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
              {panel === 'layouts' && (
                <StudioLayoutGallery
                  layouts={layouts}
                  selectedLayoutId={selectedScreen?.layout_id ?? null}
                  applying={applyingLayout}
                  onApply={requestLayoutApplication}
                  onLayoutsChanged={loadLayouts}
                />
              )}
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
