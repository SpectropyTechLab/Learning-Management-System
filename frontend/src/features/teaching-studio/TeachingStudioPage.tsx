import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Boxes,
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
  Eye,
  FileText,
  GalleryHorizontalEnd,
  LayoutTemplate,
  ListOrdered,
  LoaderCircle,
  Paintbrush,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Shapes,
  Sigma,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Unlink,
  Upload,
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
import StudioIconButton from './components/StudioIconButton';
import StudioDrawingPanel from './components/StudioDrawingPanel';
import StudioTransitionsPanel from './components/StudioTransitionsPanel';
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
    | null
  >('elements');
  const [previewOpen, setPreviewOpen] = useState(false);
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
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [contextBarOpen, setContextBarOpen] = useState(true);
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
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderIds, setReorderIds] = useState<number[]>([]);
  const [reorderingScreens, setReorderingScreens] = useState(false);
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
  const selectedScreenRef = useRef<StudioScreen | null>(null);
  const saveInFlightRef = useRef(false);
  const saveDraftRef = useRef<(source?: 'autosave' | 'manual' | 'navigation') => Promise<boolean>>(
    async () => true,
  );

  useEffect(() => {
    selectedScreenRef.current = selectedScreen;
  }, [selectedScreen]);

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

  useEffect(() => {
    if (!previewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [previewOpen]);

  const selectedScreenId = useMemo(() => {
    if (requestedScreenId && screenList.screens.some((screen) => screen.id === requestedScreenId)) {
      return requestedScreenId;
    }
    return screenList.screens[0]?.id ?? null;
  }, [requestedScreenId, screenList.screens]);

  const loadScreens = useCallback(async () => {
    if (!sessionId) return;
    setLoadingScreens(true);
    setError(null);
    try {
      setScreenList(await listStudioScreens(sessionId));
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

    let active = true;
    setSelectedScreen(null);
    setLoadingScreen(true);
    void getStudioScreen(selectedScreenId)
      .then((screen) => {
        if (active) {
          setSelectedScreen(screen);
          setSelectedElementId(null);
          setElementPast([]);
          setElementFuture([]);
          setDrawingPast([]);
          setDrawingFuture([]);
          setHasUnsavedChanges(false);
          setSaveStatus('idle');
          setSaveConflict(null);
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
  }, [screenRequestVersion, selectedScreenId]);

  const selectScreen = async (screenId: number) => {
    if (hasUnsavedChanges) {
      const saved = await saveDraftRef.current('navigation');
      if (!saved) return;
    }
    setError(null);
    setSearchParams({ screen: String(screenId) });
  };

  const createBlankScreen = async () => {
    if (!sessionId || creating || editorReadOnly) return;
    if (hasUnsavedChanges) {
      const saved = await saveDraftRef.current('navigation');
      if (!saved) return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await createBlankStudioScreen(sessionId);
      await loadScreens();
      setSearchParams({ screen: String(created.id) });
      toast.success('Blank Screen created successfully.');
    } catch (requestError) {
      const response = getStudioErrorMessage(requestError);
      setError(response);
      toast.error(response);
    } finally {
      setCreating(false);
    }
  };

  const leaveEditor = async () => {
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;
    navigate(-1);
  };

  const openPreview = async () => {
    if (hasUnsavedChanges && !(await saveDraftRef.current('navigation'))) return;
    setPreviewOpen(true);
  };

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
        revision_no: selectedScreen.revision_no,
        title: selectedScreen.title,
        layout_id: row.id,
        elements: remapped.elements,
        tags: selectedScreen.tags,
      });
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
    setElementPast((past) => [...past, selectedScreen.elements]);
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

  const addElement = (slot: Slot) => {
    if (!selectedScreen) return;
    const existing = selectedScreen.elements.find((element) => element.slotId === slot.id);
    if (existing) {
      setSelectedElementId(existing.id);
      return;
    }
    const element: StudioElement = {
      id: `${slot.id}-${Date.now()}`,
      slotId: slot.id,
      type: slot.allowed[0],
      content: { text: '' },
      position: { ...slot.bounds },
    };
    commitElements([...selectedScreen.elements, element], element.id);
    toast.success(`${slot.label} content added. Edit it, then Save.`);
  };

  const addBlankElement = (type: ObjectType, region: Slot['region']) => {
    if (!selectedScreen || selectedScreen.layout_id || editorReadOnly) return;
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `element-${token}`;
    const position =
      region === 'header'
        ? { x: 90, y: 60, width: 1740, height: 150 }
        : region === 'footer'
          ? { x: 90, y: 950, width: 1740, height: 90 }
          : { x: 180, y: 260, width: 760, height: 420 };
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type,
      content: { text: '' },
      position,
    };
    commitElements([...selectedScreen.elements, element], element.id);
    toast.success(
      `${region === 'content' ? 'Centre content' : region} element added. Edit and position it, then Save.`,
    );
  };

  const addMathElement = (latex: string) => {
    if (!selectedScreen || editorReadOnly) return;
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `math-${token}`;
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type: 'math',
      content: { text: latex, latex, color: '#0f2747', fontSize: 42, alignment: 'center' },
      position: {
        x: 420,
        y: 360,
        width: 1080,
        height: 260,
        zIndex: selectedScreen.elements.length + 1,
      },
    };
    commitElements([...selectedScreen.elements, element], element.id);
    toast.success('Equation added. Move or resize it on the canvas, then Save.');
  };

  const addShapeElement = (kind: string) => {
    if (!selectedScreen || editorReadOnly) return;
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `shape-${token}`;
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type: 'shape',
      content: { kind, fill: '#dbeafe', stroke: '#1d4ed8', strokeWidth: 4, opacity: 1 },
      position: {
        x: 560,
        y: 380,
        width: 800,
        height: 320,
        zIndex: selectedScreen.elements.length + 1,
      },
    };
    commitElements([...selectedScreen.elements, element], element.id);
    setPanel('shapes');
    toast.success('Shape added. Move or resize it on the Screen, then Save.');
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
    setHasUnsavedChanges(elementPast.length > 1);
  };

  const redoElementChange = () => {
    if (!selectedScreen || elementFuture.length === 0) return;
    const next = elementFuture[0];
    setElementFuture((future) => future.slice(1));
    setElementPast((past) => [...past, selectedScreen.elements]);
    setSelectedScreen({ ...selectedScreen, elements: next });
    setSelectedElementId(null);
    setHasUnsavedChanges(true);
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
        revision_no: draft.revision_no,
        title: draft.title,
        layout_id: draft.layout_id,
        elements: draft.elements,
        tags: draft.tags,
        screen_settings: draft.screen_settings_json ?? {},
      });
      const changedWhileSaving = selectedScreenRef.current !== draft;
      setSelectedScreen((current) => {
        if (!current || current.id !== saved.id) return current;
        return changedWhileSaving ? { ...current, revision_no: saved.revision_no } : saved;
      });
      setScreenList((current) => ({
        session_revision_no: saved.session_revision_no,
        screens: current.screens.map((screen) =>
          screen.id === saved.id
            ? changedWhileSaving
              ? { ...screen, revision_no: saved.revision_no }
              : saved
            : screen,
        ),
      }));
      if (!changedWhileSaving) {
        setElementPast([]);
        setElementFuture([]);
        setDrawingPast([]);
        setDrawingFuture([]);
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
    setRenameTitle(selectedScreen.title);
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
        revision_no: selectedScreen.revision_no,
        title,
        layout_id: selectedScreen.layout_id,
        elements: selectedScreen.elements,
        tags: selectedScreen.tags,
      });
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
          revision_no: selectedScreen.revision_no,
          title: selectedScreen.title,
          layout_id: null,
          elements: selectedScreen.elements,
          tags: selectedScreen.tags,
        });
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
    if (editorReadOnly) return;
    setReorderIds(screenList.screens.map((screen) => screen.id));
    setReorderOpen(true);
  };

  const moveReorderedScreen = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= reorderIds.length) return;
    setReorderIds((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const saveScreenOrder = async () => {
    if (!sessionId || editorReadOnly || reorderingScreens || reorderIds.length === 0) return;
    setReorderingScreens(true);
    setError(null);
    try {
      const result = await reorderStudioScreens(
        sessionId,
        screenList.session_revision_no,
        reorderIds,
      );
      const byId = new Map(screenList.screens.map((screen) => [screen.id, screen]));
      const ordered = result.screen_ids.map((id, index) => ({
        ...byId.get(id)!,
        display_order: index,
      }));
      setScreenList({ session_revision_no: result.session_revision_no, screens: ordered });
      setReorderOpen(false);
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

  const selectedElement =
    selectedScreen?.elements.find((element) => element.id === selectedElementId) ?? null;
  const allowedResourceTypes = resourceTypesForObject(selectedElement?.type);

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
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden bg-slate-100 p-2">
        {contextBarOpen ? (
          <section className="grid shrink-0 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <div className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden">
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
              <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
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
                  label="Preview Screen"
                  icon={<Eye size={15} />}
                  tone="primary"
                  disabled={!selectedScreen}
                  onClick={() => void openPreview()}
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
                {workflowStatus?.can_submit && (
                  <button
                    type="button"
                    onClick={() => void runWorkflowAction('submit')}
                    className="shrink-0 rounded-lg bg-blue-900 px-2 py-1.5 text-xs font-semibold text-white"
                  >
                    Submit
                  </button>
                )}
                {workflowStatus && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${workflowStatus.validation.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
                  >
                    Publication: {workflowStatus.validation.valid ? 'Ready' : 'Action required'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <label className="flex h-8 shrink-0 items-center rounded-lg bg-blue-900 pl-2 text-xs font-semibold text-white">
                Session{' '}
                <span className="relative ml-1 inline-flex h-8 w-8 items-center justify-center rounded-r-lg bg-blue-900 text-white">
                  <ChevronDown size={15} aria-hidden="true" />
                  <select
                    aria-label="Select Session"
                    value={sessionId}
                    onChange={(event) => navigate(`/studio/editor/${event.target.value}`)}
                    className="absolute inset-0 h-full w-full cursor-pointer bg-white text-slate-900 opacity-0"
                  >
                    {sessionOptions.map((session) => (
                      <option
                        key={session.id}
                        value={session.id}
                        className="bg-white text-slate-900"
                      >
                        Session {session.session_number}: {session.title}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label className="flex h-8 shrink-0 items-center rounded-lg bg-blue-900 pl-2 text-xs font-semibold text-white">
                Screen{' '}
                <span className="relative ml-1 inline-flex h-8 w-8 items-center justify-center rounded-r-lg bg-blue-900 text-white">
                  <ChevronDown size={15} aria-hidden="true" />
                  <select
                    aria-label="Select Screen"
                    value={selectedScreenId || ''}
                    onChange={(event) => void selectScreen(Number(event.target.value))}
                    className="absolute inset-0 h-full w-full cursor-pointer bg-white text-slate-900 opacity-0"
                  >
                    {screenList.screens.map((screen) => (
                      <option key={screen.id} value={screen.id} className="bg-white text-slate-900">
                        Screen {screen.screen_number}: {screen.title}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <StudioIconButton
                  label="Edit layout"
                  icon={<Pencil size={15} />}
                  disabled={editorReadOnly || !selectedScreen?.layout_id}
                  onClick={() => {
                    if (!selectedScreen?.layout_id || editorReadOnly) return;
                    setRightPanelOpen(true);
                    setPanel('layouts');
                    setLayoutEditRequest({
                      layoutId: selectedScreen.layout_id,
                      requestId: Date.now(),
                    });
                  }}
                />
                {selectedScreen?.layout_id && (
                  <StudioIconButton
                    label="Remove layout"
                    icon={<Unlink size={15} />}
                    disabled={editorReadOnly}
                    onClick={() => requestScreenAction('remove-layout')}
                  />
                )}
                <StudioIconButton
                  label="Rename Screen"
                  icon={<Type size={15} />}
                  disabled={editorReadOnly || !selectedScreen}
                  onClick={openRenameScreen}
                />
                <StudioIconButton
                  label={
                    hasUnsavedChanges ? 'Wait for AutoSave before reordering' : 'Reorder Screens'
                  }
                  icon={<ListOrdered size={15} />}
                  disabled={editorReadOnly || screenList.screens.length < 2 || hasUnsavedChanges}
                  onClick={openScreenReorder}
                />
                <StudioIconButton
                  label="Delete Screen"
                  icon={<Trash2 size={15} />}
                  tone="danger"
                  disabled={editorReadOnly || !selectedScreen}
                  onClick={() => requestScreenAction('delete-screen')}
                />
                <StudioIconButton
                  label="Hide context controls"
                  icon={<ChevronUp size={15} />}
                  onClick={() => setContextBarOpen(false)}
                />
              </div>
            </div>
          </section>
        ) : (
          <StudioIconButton
            label="Show context and actions"
            icon={<ChevronDown size={15} />}
            onClick={() => setContextBarOpen(true)}
            className="shadow-sm"
          />
        )}
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
          className="grid min-h-0 flex-1 gap-2 overflow-x-auto"
          style={{
            gridTemplateColumns:
              `${leftPanelOpen ? 'minmax(220px, 260px)' : '40px'} minmax(560px, 1fr) ${toolPanelOpen ? 'minmax(280px, 340px)' : editorReadOnly ? '' : '40px'}`.trim(),
          }}
        >
          {leftPanelOpen && (
            <aside className="min-h-0 overflow-hidden">
              <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="flex shrink-0 items-center justify-between gap-2">
                  <h2 className="font-semibold">Screen Script</h2>
                  <button
                    type="button"
                    onClick={() => setLeftPanelOpen(false)}
                    title="Close script"
                    aria-label="Close script"
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                  >
                    <PanelLeftClose size={16} />
                  </button>
                </div>
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
                          <p className="mt-1 whitespace-pre-wrap text-xs">{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 min-h-0 flex-1 overflow-y-auto text-xs text-slate-500">
                      No saved script for this Screen.
                    </p>
                  );
                })()}
              </section>
            </aside>
          )}
          {!leftPanelOpen && (
            <aside className="flex min-h-0 items-start justify-center rounded-xl border border-slate-200 bg-white py-2 shadow-sm">
              <button
                type="button"
                onClick={() => setLeftPanelOpen(true)}
                title="Open script"
                aria-label="Open script"
                className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
              >
                <PanelLeftOpen size={18} />
              </button>
            </aside>
          )}
          <main className="flex min-h-0 flex-col gap-1 overflow-hidden">
            <div className="min-h-0 flex-1">
              <BlankScreenCanvas
                screen={selectedScreen}
                loading={loadingScreen}
                layout={selectedLayout}
                selectedElementId={selectedElementId}
                onSelectElement={(elementId) => {
                  setSelectedElementId(elementId);
                  if (!editorReadOnly) {
                    const type = selectedScreen?.elements.find(
                      (element) => element.id === elementId,
                    )?.type;
                    setPanel(type === 'math' ? 'math' : type === 'shape' ? 'shapes' : 'elements');
                  }
                }}
                onChangeElementBounds={editorReadOnly ? undefined : changeElementBounds}
                onChangeElementContent={editorReadOnly ? undefined : changeElementContent}
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
              />
            </div>
            {!editorReadOnly && (
              <button
                type="button"
                onClick={() => void createBlankScreen()}
                disabled={creating || loadingScreens}
                className="inline-flex w-44 shrink-0 self-center items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Plus size={16} />
                {creating ? 'Adding Screen…' : 'Add Screen'}
              </button>
            )}
          </main>
          {toolPanelOpen && (
            <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="grid shrink-0 grid-cols-9 gap-1 border-b p-2">
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(false)}
                  title="Close tools"
                  aria-label="Close tools"
                  className="inline-flex items-center justify-center rounded-lg px-1 py-2 text-slate-600 hover:bg-slate-100"
                >
                  <PanelRightClose size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('layouts')}
                  title="Layouts"
                  aria-label="Layouts"
                  className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'layouts' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}
                >
                  <LayoutTemplate size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('resources')}
                  title="Resources"
                  aria-label="Resources"
                  className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'resources' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}
                >
                  <Upload size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('elements')}
                  title="Elements"
                  aria-label="Elements"
                  className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'elements' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}
                >
                  <Boxes size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('animations')}
                  title="Animations"
                  aria-label="Animations"
                  className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'animations' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}
                >
                  <Sparkles size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('math')}
                  title="Math equations"
                  aria-label="Math equations"
                  className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'math' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}
                >
                  <Sigma size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('transitions')}
                  title="Transitions"
                  aria-label="Transitions"
                  className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'transitions' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}
                >
                  <GalleryHorizontalEnd size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('shapes')}
                  title="Shapes"
                  aria-label="Shapes"
                  className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'shapes' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}
                >
                  <Shapes size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('drawing')}
                  title="Drawing"
                  aria-label="Drawing"
                  className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'drawing' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}
                >
                  <Paintbrush size={17} />
                </button>
              </div>
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
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
                    onSelect={setSelectedElementId}
                    onAdd={addElement}
                    onAddBlank={addBlankElement}
                    onUpdate={updateElement}
                    onDuplicate={duplicateElement}
                    onRemove={removeElement}
                  />
                )}
                {panel === 'math' && (
                  <StudioMathPanel
                    screen={selectedScreen}
                    selectedElementId={selectedElementId}
                    onSelect={setSelectedElementId}
                    onAdd={addMathElement}
                    onUpdate={updateElement}
                    onDuplicate={duplicateElement}
                    onRemove={removeElement}
                  />
                )}
                {panel === 'shapes' && (
                  <StudioShapesPanel
                    screen={selectedScreen}
                    selectedElementId={selectedElementId}
                    onAdd={addShapeElement}
                    onUpdate={updateElement}
                    onDuplicate={duplicateElement}
                    onRemove={removeElement}
                  />
                )}
                {panel === 'animations' && (
                  <StudioAnimationsPanel
                    screen={selectedScreen}
                    selectedElementId={selectedElementId}
                    onUpdate={updateElement}
                  />
                )}
                {panel === 'transitions' && (
                  <StudioTransitionsPanel
                    settings={selectedScreen?.screen_settings_json ?? null}
                    onChange={setScreenTransition}
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
          {!editorReadOnly && !rightPanelOpen && (
            <aside className="flex min-h-0 items-start justify-center rounded-xl border border-slate-200 bg-white py-2 shadow-sm">
              <button
                type="button"
                onClick={() => setRightPanelOpen(true)}
                title="Open tools"
                aria-label="Open tools"
                className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
              >
                <PanelRightOpen size={18} />
              </button>
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
                onClick={() => setPreviewOpen(true)}
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
                  <h2 className="font-semibold">Screen Script</h2>
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
                  onAddBlank={addBlankElement}
                  onUpdate={updateElement}
                  onDuplicate={duplicateElement}
                  onRemove={removeElement}
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
              selectedElementId={selectedElementId}
              onSelectElement={(elementId) => {
                setSelectedElementId(elementId);
                setPanel('elements');
              }}
            />
          </div>
        </>
      )}
      {reorderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reorder screens"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Reorder Screens</h2>
            <p className="mt-1 text-sm text-slate-600">
              Move Screens into the required teaching order. The new order is saved to the working
              draft.
            </p>
            <div className="mt-4 max-h-[55dvh] space-y-2 overflow-y-auto pr-1">
              {reorderIds.map((screenId, index) => {
                const screen = screenList.screens.find((candidate) => candidate.id === screenId);
                return (
                  <div
                    key={screenId}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-900">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {screen?.title || `Screen ${screenId}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        Current Screen {screen?.screen_number ?? '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveReorderedScreen(index, -1)}
                      title="Move up"
                      aria-label={`Move ${screen?.title || 'Screen'} up`}
                      className="rounded-lg border bg-white p-2 disabled:opacity-30"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={index === reorderIds.length - 1}
                      onClick={() => moveReorderedScreen(index, 1)}
                      title="Move down"
                      aria-label={`Move ${screen?.title || 'Screen'} down`}
                      className="rounded-lg border bg-white p-2 disabled:opacity-30"
                    >
                      <ArrowDown size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={reorderingScreens}
                onClick={() => setReorderOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reorderingScreens}
                onClick={() => void saveScreenOrder()}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {reorderingScreens ? 'Saving…' : 'Save order'}
              </button>
            </div>
          </div>
        </div>
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
                  setSelectedScreen({
                    ...saveConflict.draft,
                    revision_no: saveConflict.latest.revision_no,
                  });
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
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/80 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Screen Preview"
        >
          <div className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)]">
            <div className="flex flex-none items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <h2 className="font-semibold">Flattened Screen Preview</h2>
                <p className="text-xs text-slate-500">
                  Read-only output without editor guides or controls.
                </p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-4">
              <BlankScreenCanvas
                screen={selectedScreen}
                loading={false}
                layout={selectedLayout}
                showGuides={false}
                previewMode
              />
            </div>
          </div>
        </div>
      )}
    </StudioShell>
  );
}
