import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Boxes, ChevronDown, ChevronUp, Eraser, Eye, FileText, LayoutTemplate, ListOrdered, Paintbrush, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Pencil, PencilLine, PenLine, Plus, Redo2, Save, Shapes, Sigma, Sparkles, Trash2, Type, Undo2, Unlink, Upload } from 'lucide-react';
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
import type { AuthorDrawingStroke, StudioElement, StudioScreen, StudioScreenList } from './types';
import type { Layout, ObjectType, Slot } from './layouts';
import { targetLayouts } from './targetLayouts';
import { remapElementsToLayout } from './layoutApplication';
import { canPlaceResource, resourceTypesForObject, supportsResourcePlacement } from './resourcePlacement';
import { studioSetupApi } from './api/studioSetupApi';
import type { StudioSession } from './api/studioSetupApi';

const positiveInteger = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const screenScriptEntries = (content: ScreenScriptRow['content_json'] | undefined): Array<[string, string]> =>
  Object.entries(content ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string');

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
  const [panel, setPanel] = useState<'layouts' | 'script' | 'resources' | 'elements' | 'math' | 'shapes' | 'animations' | 'drawing' | null>('elements');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [layouts, setLayouts] = useState<StudioLayoutSummary[]>([]);
  const [scripts, setScripts] = useState<ScreenScriptRow[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<StudioWorkflowStatus | null>(null);
  const [workflowProblems, setWorkflowProblems] = useState<StudioValidationProblem[]>([]);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<'submit' | 'approve' | 'publish' | null>(null);
  const [applyingLayout, setApplyingLayout] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<{ row: StudioLayoutSummary; layout: Layout } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [elementPast, setElementPast] = useState<StudioElement[][]>([]);
  const [elementFuture, setElementFuture] = useState<StudioElement[][]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingScreen, setSavingScreen] = useState(false);
  const [sessionContext, setSessionContext] = useState<StudioSession | null>(null);
  const [sessionOptions, setSessionOptions] = useState<StudioSession[]>([]);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [contextBarOpen, setContextBarOpen] = useState(true);
  const [revisionPromptOpen, setRevisionPromptOpen] = useState(false);
  const [startingRevision, setStartingRevision] = useState(false);
  const editorReadOnly = !workflowStatus || !['draft', 'rejected'].includes(workflowStatus.status);
  const canStartRevision = Boolean(workflowStatus && ['submitted', 'approved', 'published'].includes(workflowStatus.status));
  const toolPanelOpen = rightPanelOpen && !editorReadOnly;
  const showLegacyEditor = false;
  const [screenAction, setScreenAction] = useState<'remove-layout' | 'delete-screen' | null>(null);
  const [screenActionBusy, setScreenActionBusy] = useState(false);
  const [layoutEditRequest, setLayoutEditRequest] = useState<{ layoutId: number; requestId: number } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [renamingScreen, setRenamingScreen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderIds, setReorderIds] = useState<number[]>([]);
  const [reorderingScreens, setReorderingScreens] = useState(false);
  const [drawingTool, setDrawingTool] = useState<'pen' | 'eraser'>('pen');
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [drawingWidth, setDrawingWidth] = useState(6);
  const [drawingPast, setDrawingPast] = useState<AuthorDrawingStroke[][]>([]);
  const [drawingFuture, setDrawingFuture] = useState<AuthorDrawingStroke[][]>([]);
  const [saveConflict, setSaveConflict] = useState<{
    draft: StudioScreen;
    latest: StudioScreen;
  } | null>(null);

  useEffect(() => {
    if (!previewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreviewOpen(false); };
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
    if (hasUnsavedChanges) {
      toast.error('Save or undo the current Screen changes before refreshing.');
      return;
    }
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
    void studioSetupApi.session(sessionId, controller.signal).then(async (session) => {
      setSessionContext(session);
      setSessionOptions(await studioSetupApi.sessions(session.subtopic_id, controller.signal));
    }).catch(() => { /* The editor remains usable if context labels cannot load. */ });
    return () => controller.abort();
  }, [sessionId]);

  const loadLayouts = useCallback(async () => {
    setLayouts(await ensureTargetStudioLayouts());
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([ensureTargetStudioLayouts(), studioDocumentsApi.screenScripts(sessionId)])
      .then(([layoutRows, scriptRows]) => { setLayouts(layoutRows); setScripts(scriptRows); })
      .catch(() => { /* Individual editor panels show their empty state. */ });
  }, [sessionId]);

  const loadWorkflow = useCallback(async (showSuccess = false) => {
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
  }, [sessionId]);

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

  const selectScreen = (screenId: number) => {
    if (hasUnsavedChanges) {
      toast.error('Save or undo the current Screen changes before switching Screens.');
      return;
    }
    setError(null);
    setSearchParams({ screen: String(screenId) });
  };

  const createBlankScreen = async () => {
    if (!sessionId || creating || editorReadOnly) return;
    if (hasUnsavedChanges) {
      toast.error('Save or undo the current Screen changes before creating another Screen.');
      return;
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
      setError(response); toast.error(response);
    } finally {
      setCreating(false);
    }
  };

  const runWorkflowAction = async (action: 'submit' | 'approve' | 'publish') => {
    if (!sessionId || workflowAction) return;
    setWorkflowAction(action);
    setWorkflowProblems([]);
    try {
      if (action === 'submit') await submitStudioSession(sessionId);
      if (action === 'approve') await approveStudioSession(sessionId);
      if (action === 'publish') await publishStudioSession(sessionId);
      toast.success(action === 'submit' ? 'Session submitted for review.' : action === 'approve' ? 'Session revision approved.' : 'Session published successfully.');
      await loadWorkflow();
    } catch (requestError) {
      const response = workflowError(requestError);
      toast.error(response.message);
      await loadWorkflow();
      setWorkflowProblems(response.problems.length > 0 ? response.problems : [{
        code: 'WORKFLOW_ACTION_FAILED',
        message: response.message,
      }]);
    } finally {
      setWorkflowAction(null);
    }
  };

  const handleScreenSaveFailure = async (requestError: unknown, draft: StudioScreen) => {
    const details = getStudioErrorDetails(requestError);
    setError(details.message);
    toast.error(details.message);
    if (details.status !== 409) return;
    try {
      const latest = await getStudioScreen(draft.id);
      setSelectedScreen(draft);
      setHasUnsavedChanges(true);
      setSaveConflict({ draft, latest });
    } catch {
      toast.error('The Screen changed on the server, but its latest revision could not be loaded. Your draft remains open.');
    }
  };

  const startRevision = async () => {
    if (!sessionId || startingRevision) return;
    setStartingRevision(true);
    try {
      const result = await startStudioSessionRevision(sessionId);
      setRevisionPromptOpen(false);
      setRightPanelOpen(true);
      toast.success(result.creates_new_release
        ? 'New draft started. Publishing it later will create a new release version.'
        : 'Session returned to Draft for updating.');
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
        screens: current.screens.map((screen) => screen.id === saved.id ? saved : screen),
      }));
      setPendingLayout(null);
      setSelectedElementId(null);
      setElementPast([]);
      setElementFuture([]);
      setHasUnsavedChanges(false);
      setPanel('elements');
      toast.success(`${layout.id} applied successfully${remapped.removed.length ? `; ${remapped.removed.length} incompatible element${remapped.removed.length === 1 ? '' : 's'} removed` : ''}.`);
      await loadWorkflow();
    } catch (requestError) {
      await handleScreenSaveFailure(requestError, draft);
    } finally {
      setApplyingLayout(false);
    }
  };

  const requestLayoutApplication = (row: StudioLayoutSummary, layout: Layout) => {
    if (editorReadOnly) {
      toast.error('Start an update before changing this Session.');
      return;
    }
    if (!selectedScreen) {
      toast.error('Select or create a Screen before applying a layout.');
      return;
    }
    if (hasUnsavedChanges) {
      toast.error('Save or undo the current Screen changes before changing its layout.');
      return;
    }
    if (selectedScreen.elements.length > 0) setPendingLayout({ row, layout });
    else void saveAppliedLayout(row, layout);
  };

  const selectedLayout = useMemo(() => {
    const row = layouts.find((layout) => layout.id === selectedScreen?.layout_id);
    if (!row) return null;
    return targetLayouts.find((layout) => layout.id === row.layout_key.toUpperCase()) || {
      id: row.layout_key,
      name: row.name,
      purpose: row.description || 'Custom Studio layout',
      catalog: 'pilot' as const,
      slots: row.layout_data_json?.slots || [],
    };
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
    const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `element-${token}`;
    const position = region === 'header'
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
    toast.success(`${region === 'content' ? 'Centre content' : region} element added. Edit and position it, then Save.`);
  };

  const addMathElement = (latex: string) => {
    if (!selectedScreen || editorReadOnly) return;
    const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `math-${token}`;
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type: 'math',
      content: { text: latex, latex, color: '#0f2747', fontSize: 42, alignment: 'center' },
      position: { x: 420, y: 360, width: 1080, height: 260, zIndex: selectedScreen.elements.length + 1 },
    };
    commitElements([...selectedScreen.elements, element], element.id);
    toast.success('Equation added. Move or resize it on the canvas, then Save.');
  };

  const addShapeElement = (kind: string) => {
    if (!selectedScreen || editorReadOnly) return;
    const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const id = `shape-${token}`;
    const element: StudioElement = {
      id,
      slotId: `free-${id}`,
      type: 'shape',
      content: { kind, fill: '#dbeafe', stroke: '#1d4ed8', strokeWidth: 4, opacity: 1 },
      position: { x: 560, y: 380, width: 800, height: 320, zIndex: selectedScreen.elements.length + 1 },
    };
    commitElements([...selectedScreen.elements, element], element.id);
    setPanel('shapes');
    toast.success('Shape added. Move or resize it on the Screen, then Save.');
  };

  const updateElement = (updated: StudioElement) => {
    if (!selectedScreen || editorReadOnly) return;
    commitElements(selectedScreen.elements.map((element) => element.id === updated.id ? updated : element), updated.id);
  };

  const changeElementContent = (elementId: string, changes: Record<string, unknown>) => {
    if (!selectedScreen || editorReadOnly) return;
    const element = selectedScreen.elements.find((candidate) => candidate.id === elementId);
    if (!element) return;
    updateElement({ ...element, content: { ...element.content, ...changes } });
  };

  const changeElementBounds = (elementId: string, bounds: { x: number; y: number; width: number; height: number }) => {
    if (!selectedScreen) return;
    const element = selectedScreen.elements.find((candidate) => candidate.id === elementId);
    if (!element) return;
    updateElement({ ...element, position: { ...element.position, ...bounds } });
  };

  const removeElement = (elementId: string) => {
    if (!selectedScreen) return;
    commitElements(selectedScreen.elements.filter((element) => element.id !== elementId), null);
    toast.success('Element removed from the draft. Save to persist the change.');
  };

  const duplicateElement = (elementId: string) => {
    if (!selectedScreen || editorReadOnly) return;
    const source = selectedScreen.elements.find((element) => element.id === elementId);
    if (!source) return;
    if (selectedScreen.layout_id && source.type !== 'math' && source.type !== 'shape') return;
    const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
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
      position: { ...source.position, x: Math.min(x + 40, 1920 - width), y: Math.min(y + 40, 1080 - height) },
      resource: source.resource ? { ...source.resource, usage: { ...source.resource.usage, slot_id: `free-${id}` } } : undefined,
    };
    commitElements([...selectedScreen.elements, duplicate], duplicate.id);
    toast.success('Element duplicated. Move it to the required position, then Save.');
  };

  const bindResourceToSelectedElement = (resource: StudioResourceSummary, selectedVersion?: StudioResourceVersion) => {
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
      toast.error(`${resource.resource_type} Resources cannot be placed in a ${element.type} element.`);
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
    commitElements(selectedScreen.elements.map((candidate) => candidate.id === updated.id ? updated : candidate), updated.id);
    setPanel('elements');
    toast.success(`${resource.name} linked to the selected element. Save to persist it.`);
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

  const saveScreenDraft = async () => {
    if (!selectedScreen || !hasUnsavedChanges || savingScreen || editorReadOnly) return;
    setSavingScreen(true);
    try {
      const saved = await updateStudioScreen(selectedScreen.id, {
        revision_no: selectedScreen.revision_no,
        title: selectedScreen.title,
        layout_id: selectedScreen.layout_id,
        elements: selectedScreen.elements,
        tags: selectedScreen.tags,
        screen_settings: selectedScreen.screen_settings_json ?? {},
      });
      setSelectedScreen(saved);
      setScreenList((current) => ({
        session_revision_no: saved.session_revision_no,
        screens: current.screens.map((screen) => screen.id === saved.id ? saved : screen),
      }));
      setElementPast([]);
      setElementFuture([]);
      setDrawingPast([]);
      setDrawingFuture([]);
      setHasUnsavedChanges(false);
      toast.success(`Screen ${saved.screen_number} saved as revision ${saved.revision_no}.`);
      await loadWorkflow();
    } catch (requestError) {
      await handleScreenSaveFailure(requestError, selectedScreen);
    } finally {
      setSavingScreen(false);
    }
  };

  const requestScreenAction = (action: 'remove-layout' | 'delete-screen') => {
    if (!selectedScreen || editorReadOnly) return;
    if (hasUnsavedChanges) {
      toast.error('Save or undo the current Screen changes before continuing.');
      return;
    }
    setScreenAction(action);
  };

  const openRenameScreen = () => {
    if (!selectedScreen || editorReadOnly) return;
    if (hasUnsavedChanges) {
      toast.error('Save or undo the current Screen changes before renaming it.');
      return;
    }
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
        screens: current.screens.map((screen) => screen.id === saved.id ? saved : screen),
      }));
      setRenameOpen(false);
      toast.success(`Screen renamed and saved as revision ${saved.revision_no}.`);
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
          screens: current.screens.map((screen) => screen.id === saved.id ? saved : screen),
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
      const result = await reorderStudioScreens(sessionId, screenList.session_revision_no, reorderIds);
      const byId = new Map(screenList.screens.map((screen) => [screen.id, screen]));
      const ordered = result.screen_ids.map((id, index) => ({ ...byId.get(id)!, display_order: index }));
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

  const selectedElement = selectedScreen?.elements.find((element) => element.id === selectedElementId) ?? null;
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
            Choose a curriculum hierarchy and Session to open its editor. The selected Session will open here without creating a second copy of its data.
          </p>
        </section>
      </StudioShell>
    );
  }

  return (
    <StudioShell
      title="Screen Editor"
      subtitle={`Session ${sessionId} · Revision ${screenList.session_revision_no || '—'}`}
      scrollContent={false}
      wrapContent={false}
      actions={(
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft size={16} />Back</button>
          {canStartRevision && <button type="button" onClick={() => setRevisionPromptOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"><PencilLine size={16} />{workflowStatus?.status === 'published' ? 'New version' : 'Update'}</button>}
          <button type="button" onClick={() => void refreshScreens()} disabled={loadingScreens} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">{loadingScreens ? 'Refreshing...' : 'Refresh'}</button>
        </div>
      )}
    >
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden bg-slate-100 p-2">
        {contextBarOpen ? <section className="grid shrink-0 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <div className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden">
            <span title={sessionContext?.chapter_name || '—'} className="w-44 min-w-0 shrink truncate rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs"><b>Chapter:</b> {sessionContext?.chapter_name || '—'}</span>
            <span title={sessionContext?.topic_name || '—'} className="w-44 min-w-0 shrink truncate rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs"><b>Topic:</b> {sessionContext?.topic_name || '—'}</span>
            <span title={sessionContext?.subtopic_name || '—'} className="w-44 min-w-0 shrink truncate rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs"><b>Subtopic:</b> {sessionContext?.subtopic_name || '—'}</span>
            {workflowStatus && <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${workflowStatus.validation.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>Publication: {workflowStatus.validation.valid ? 'Ready' : 'Action required'}</span>}
          </div>
          <div className="flex min-w-0 items-center gap-1 overflow-hidden">
            <label className="flex h-8 shrink-0 items-center rounded-lg bg-blue-900 pl-2 text-xs font-semibold text-white">Session <span className="relative ml-1 inline-flex h-8 w-8 items-center justify-center rounded-r-lg bg-blue-900 text-white"><ChevronDown size={15} aria-hidden="true" /><select aria-label="Select Session" value={sessionId} onChange={(event) => navigate(`/studio/editor/${event.target.value}`)} className="absolute inset-0 h-full w-full cursor-pointer bg-white text-slate-900 opacity-0">{sessionOptions.map((session) => <option key={session.id} value={session.id} className="bg-white text-slate-900">Session {session.session_number}: {session.title}</option>)}</select></span></label>
            <label className="flex h-8 shrink-0 items-center rounded-lg bg-blue-900 pl-2 text-xs font-semibold text-white">Screen <span className="relative ml-1 inline-flex h-8 w-8 items-center justify-center rounded-r-lg bg-blue-900 text-white"><ChevronDown size={15} aria-hidden="true" /><select aria-label="Select Screen" value={selectedScreenId || ''} onChange={(event) => selectScreen(Number(event.target.value))} className="absolute inset-0 h-full w-full cursor-pointer bg-white text-slate-900 opacity-0">{screenList.screens.map((screen) => <option key={screen.id} value={screen.id} className="bg-white text-slate-900">Screen {screen.screen_number}: {screen.title}</option>)}</select></span></label>
            <div className="ml-auto flex shrink-0 items-center gap-1">
            <button type="button" disabled={editorReadOnly || elementPast.length === 0} onClick={undoElementChange} title="Undo the latest element change" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"><Undo2 size={14} />Undo</button>
            <button type="button" disabled={editorReadOnly || elementFuture.length === 0} onClick={redoElementChange} title="Redo the latest element change" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"><Redo2 size={14} />Redo</button>
            <button type="button" onClick={() => void loadWorkflow(true)} disabled={loadingWorkflow} className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold">Check</button>
            {workflowStatus?.can_submit && <button type="button" onClick={() => void runWorkflowAction('submit')} className="rounded-lg bg-blue-900 px-2.5 py-1.5 text-xs font-semibold text-white">Submit</button>}
            <button type="button" disabled={editorReadOnly || !hasUnsavedChanges || savingScreen} onClick={() => void saveScreenDraft()} className="inline-flex items-center gap-1 rounded-lg border border-blue-900 px-2.5 py-1.5 text-xs font-semibold text-blue-900 disabled:opacity-40"><Save size={14} />Save</button>
            <button type="button" disabled={!selectedScreen} onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"><Eye size={14} />Preview</button>
            <button type="button" disabled={editorReadOnly || screenList.screens.length < 2} onClick={openScreenReorder} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"><ListOrdered size={14} />Reorder</button>
            <button type="button" disabled={editorReadOnly || !selectedScreen} onClick={openRenameScreen} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"><Type size={14} />Rename screen</button>
            <button type="button" disabled={editorReadOnly || !selectedScreen?.layout_id} onClick={() => { if (!selectedScreen?.layout_id || editorReadOnly) return; setRightPanelOpen(true); setPanel('layouts'); setLayoutEditRequest({ layoutId: selectedScreen.layout_id, requestId: Date.now() }); }} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"><Pencil size={14} />Edit layout</button>
            {selectedScreen?.layout_id && <button type="button" disabled={editorReadOnly} onClick={() => requestScreenAction('remove-layout')} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-2.5 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-40"><Unlink size={14} />Remove layout</button>}
            <button type="button" disabled={editorReadOnly || !selectedScreen} onClick={() => requestScreenAction('delete-screen')} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"><Trash2 size={14} />Delete screen</button>
            <button type="button" onClick={() => setContextBarOpen(false)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold" aria-label="Hide context controls"><ChevronUp size={15} />Hide</button>
            </div>
          </div>
        </section> : <button type="button" onClick={() => setContextBarOpen(true)} className="inline-flex w-fit shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm"><ChevronDown size={15} />Show context and actions</button>}
        {workflowStatus && editorReadOnly && <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900"><span><strong className="capitalize">{workflowStatus.status}</strong> Sessions are view-only. Start an update to edit this working Session.</span>{canStartRevision && <button type="button" onClick={() => setRevisionPromptOpen(true)} className="rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white">{workflowStatus.status === 'published' ? 'Create new version' : 'Update Session'}</button>}</div>}
        {error && <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
        <div className="grid min-h-0 flex-1 gap-2 overflow-x-auto" style={{ gridTemplateColumns: `${leftPanelOpen ? 'minmax(220px, 260px)' : '40px'} minmax(560px, 1fr) ${toolPanelOpen ? 'minmax(280px, 340px)' : editorReadOnly ? '' : '40px'}`.trim() }}>
          {leftPanelOpen && <aside className="min-h-0 overflow-hidden">
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm"><div className="flex shrink-0 items-center justify-between gap-2"><h2 className="font-semibold">Screen Script</h2><button type="button" onClick={() => setLeftPanelOpen(false)} title="Close script" aria-label="Close script" className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"><PanelLeftClose size={16} /></button></div>{(() => { const entries = screenScriptEntries(scripts.find((row) => row.screen_id === selectedScreenId)?.content_json); return entries.length > 0 ? <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{entries.map(([key, value]) => <div key={key} className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] font-bold uppercase text-slate-500">{key.replaceAll('_', ' ')}</p><p className="mt-1 whitespace-pre-wrap text-xs">{value || '—'}</p></div>)}</div> : <p className="mt-2 min-h-0 flex-1 overflow-y-auto text-xs text-slate-500">No saved script for this Screen.</p>; })()}</section>
          </aside>}
          {!leftPanelOpen && <aside className="flex min-h-0 items-start justify-center rounded-xl border border-slate-200 bg-white py-2 shadow-sm"><button type="button" onClick={() => setLeftPanelOpen(true)} title="Open script" aria-label="Open script" className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"><PanelLeftOpen size={18} /></button></aside>}
          <main className="flex min-h-0 flex-col gap-1 overflow-hidden"><div className="min-h-0 flex-1"><BlankScreenCanvas screen={selectedScreen} loading={loadingScreen} layout={selectedLayout} selectedElementId={selectedElementId} onSelectElement={(elementId) => { setSelectedElementId(elementId); if (!editorReadOnly) { const type = selectedScreen?.elements.find((element) => element.id === elementId)?.type; setPanel(type === 'math' ? 'math' : type === 'shape' ? 'shapes' : 'elements'); } }} onChangeElementBounds={editorReadOnly ? undefined : changeElementBounds} onChangeElementContent={editorReadOnly ? undefined : changeElementContent} onOpenTool={editorReadOnly ? undefined : (tool) => { setRightPanelOpen(true); setPanel(tool); }} drawingStrokes={authoredDrawingStrokes(selectedScreen)} drawingEnabled={!editorReadOnly && panel === 'drawing'} drawingTool={drawingTool} drawingColor={drawingColor} drawingWidth={drawingWidth} onDrawingChange={editorReadOnly ? undefined : setAuthoredDrawings} /></div>{!editorReadOnly && <button type="button" onClick={() => void createBlankScreen()} disabled={creating || loadingScreens} className="inline-flex w-44 shrink-0 self-center items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"><Plus size={16} />{creating ? 'Adding Screen…' : 'Add Screen'}</button>}</main>
          {toolPanelOpen && <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid shrink-0 grid-cols-8 gap-1 border-b p-2"><button type="button" onClick={() => setRightPanelOpen(false)} title="Close tools" aria-label="Close tools" className="inline-flex items-center justify-center rounded-lg px-1 py-2 text-slate-600 hover:bg-slate-100"><PanelRightClose size={17} /></button><button type="button" onClick={() => setPanel('layouts')} title="Layouts" aria-label="Layouts" className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'layouts' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><LayoutTemplate size={17} /></button><button type="button" onClick={() => setPanel('resources')} title="Resources" aria-label="Resources" className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'resources' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><Upload size={17} /></button><button type="button" onClick={() => setPanel('elements')} title="Elements" aria-label="Elements" className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'elements' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><Boxes size={17} /></button><button type="button" onClick={() => setPanel('animations')} title="Animations" aria-label="Animations" className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'animations' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><Sparkles size={17} /></button><button type="button" onClick={() => setPanel('math')} title="Math equations" aria-label="Math equations" className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'math' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><Sigma size={17} /></button><button type="button" onClick={() => setPanel('shapes')} title="Shapes" aria-label="Shapes" className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'shapes' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><Shapes size={17} /></button><button type="button" onClick={() => setPanel('drawing')} title="Drawing" aria-label="Drawing" className={`inline-flex items-center justify-center rounded-lg px-1 py-2 ${panel === 'drawing' ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><Paintbrush size={17} /></button></div>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3">{panel === 'layouts' && <StudioLayoutGallery layouts={layouts} selectedLayoutId={selectedScreen?.layout_id ?? null} applying={applyingLayout} onApply={requestLayoutApplication} onLayoutsChanged={loadLayouts} editRequest={layoutEditRequest} />}{panel === 'resources' && <ResourceLibrary mode="picker" onPick={bindResourceToSelectedElement} />}{panel === 'elements' && <StudioElementPanel layout={selectedLayout} screen={selectedScreen} selectedElementId={selectedElementId} onSelect={setSelectedElementId} onAdd={addElement} onAddBlank={addBlankElement} onUpdate={updateElement} onDuplicate={duplicateElement} onRemove={removeElement} />}{panel === 'math' && <StudioMathPanel screen={selectedScreen} selectedElementId={selectedElementId} onSelect={setSelectedElementId} onAdd={addMathElement} onUpdate={updateElement} onDuplicate={duplicateElement} onRemove={removeElement} />}{panel === 'shapes' && <StudioShapesPanel screen={selectedScreen} selectedElementId={selectedElementId} onAdd={addShapeElement} onUpdate={updateElement} onDuplicate={duplicateElement} onRemove={removeElement} />}{panel === 'animations' && <StudioAnimationsPanel screen={selectedScreen} selectedElementId={selectedElementId} onUpdate={updateElement} />}{panel === 'drawing' && <div><h2 className="font-semibold text-slate-900">Author drawing</h2><p className="mt-1 text-xs text-slate-500">Saved with this Screen revision. Teacher run annotations remain separate.</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDrawingTool('pen')} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${drawingTool === 'pen' ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-300'}`}><PenLine size={16} />Pen</button><button type="button" onClick={() => setDrawingTool('eraser')} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${drawingTool === 'eraser' ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-300'}`}><Eraser size={16} />Eraser</button></div><label className="mt-4 block text-sm font-semibold text-slate-700">Color<input type="color" value={drawingColor} onChange={(event) => setDrawingColor(event.target.value)} className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1" /></label><label className="mt-4 block text-sm font-semibold text-slate-700">Stroke width: {drawingWidth}<input type="range" min="2" max="24" value={drawingWidth} onChange={(event) => setDrawingWidth(Number(event.target.value))} className="mt-2 w-full" /></label><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={drawingPast.length === 0} onClick={undoDrawing} className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40"><Undo2 size={15} />Undo</button><button type="button" disabled={drawingFuture.length === 0} onClick={redoDrawing} className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40"><Redo2 size={15} />Redo</button></div><button type="button" disabled={authoredDrawingStrokes(selectedScreen).length === 0} onClick={() => setAuthoredDrawings([])} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-40"><Trash2 size={15} />Clear authored drawing</button></div>}</div>
          </aside>}
          {!editorReadOnly && !rightPanelOpen && <aside className="flex min-h-0 items-start justify-center rounded-xl border border-slate-200 bg-white py-2 shadow-sm"><button type="button" onClick={() => setRightPanelOpen(true)} title="Open tools" aria-label="Open tools" className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"><PanelRightOpen size={18} /></button></aside>}
        </div>
      </div>
      {showLegacyEditor && <>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <button type="button" onClick={() => setPanel(panel === 'layouts' ? null : 'layouts')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><LayoutTemplate size={17} />Layouts</button>
        <button type="button" onClick={() => setPanel(panel === 'script' ? null : 'script')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><FileText size={17} />Script View</button>
        <button type="button" onClick={() => setPanel(panel === 'resources' ? null : 'resources')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><Upload size={17} />Resources</button>
        <span className="mx-1 h-7 w-px bg-gray-200" />
        <button type="button" disabled={elementPast.length === 0} onClick={undoElementChange} title="Undo the latest element change" className="rounded-lg p-2 text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"><Undo2 size={18} /></button>
        <button type="button" disabled={elementFuture.length === 0} onClick={redoElementChange} title="Redo the latest element change" className="rounded-lg p-2 text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"><Redo2 size={18} /></button>
        <button type="button" onClick={() => setPanel(panel === 'elements' ? null : 'elements')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><Boxes size={17} />Elements</button>
        {hasUnsavedChanges && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Unsaved changes</span>}
        <div className="ml-auto flex gap-2"><button type="button" disabled={!hasUnsavedChanges || savingScreen} onClick={() => void saveScreenDraft()} title={hasUnsavedChanges ? 'Save this Screen draft' : 'There are no unsaved canvas changes'} className="inline-flex items-center gap-2 rounded-lg border border-blue-900 px-3 py-2 text-sm font-semibold text-blue-900 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-slate-400"><Save size={16} />{savingScreen ? 'Saving...' : 'Save'}</button><button type="button" disabled={!selectedScreen} onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><Eye size={16} />Preview</button></div>
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
          {panel === 'resources' && <><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Resources</h2><p className="mt-1 text-sm text-slate-500">Select a visual, media, or simulation element, then attach a compatible immutable Resource version.</p></div><button type="button" onClick={() => navigate('/studio/resources')} className="rounded-lg border border-blue-800 px-3 py-2 text-sm font-semibold text-blue-900">Manage Resource library</button></div>{supportsResourcePlacement(selectedElement?.type) ? <ResourceLibrary mode="picker" onPick={bindResourceToSelectedElement} allowedTypes={allowedResourceTypes} /> : <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Select a visual, media, or simulation element to see compatible Resources.</p>}</>}
          {panel === 'script' && <><h2 className="font-semibold">Screen Script</h2>{(() => { const entries = screenScriptEntries(scripts.find((row) => row.screen_id === selectedScreenId)?.content_json); return entries.length > 0 ? <div className="mt-3 grid gap-3 md:grid-cols-2">{entries.map(([key, value]) => <div key={key} className="rounded-lg bg-gray-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">{key.replaceAll('_', ' ')}</p><p className="mt-1 whitespace-pre-wrap text-sm">{value || '—'}</p></div>)}</div> : <p className="mt-2 text-sm text-slate-500">No saved script exists for the selected Screen.</p>; })()}</>}
          {panel === 'elements' && <StudioElementPanel layout={selectedLayout} screen={selectedScreen} selectedElementId={selectedElementId} onSelect={setSelectedElementId} onAdd={addElement} onAddBlank={addBlankElement} onUpdate={updateElement} onDuplicate={duplicateElement} onRemove={removeElement} />}
        </section>
      )}

      {error ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadScreens()} className="font-semibold underline underline-offset-2">
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
        <BlankScreenCanvas screen={selectedScreen} loading={loadingScreen} layout={selectedLayout} selectedElementId={selectedElementId} onSelectElement={(elementId) => { setSelectedElementId(elementId); setPanel('elements'); }} />
      </div>
      </>}
      {reorderOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Reorder screens">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-900">Reorder Screens</h2>
          <p className="mt-1 text-sm text-slate-600">Move Screens into the required teaching order. Saving creates the next Session revision.</p>
          <div className="mt-4 max-h-[55dvh] space-y-2 overflow-y-auto pr-1">{reorderIds.map((screenId, index) => { const screen = screenList.screens.find((candidate) => candidate.id === screenId); return <div key={screenId} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-900">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{screen?.title || `Screen ${screenId}`}</p><p className="text-xs text-slate-500">Current Screen {screen?.screen_number ?? '—'}</p></div><button type="button" disabled={index === 0} onClick={() => moveReorderedScreen(index, -1)} title="Move up" aria-label={`Move ${screen?.title || 'Screen'} up`} className="rounded-lg border bg-white p-2 disabled:opacity-30"><ArrowUp size={15} /></button><button type="button" disabled={index === reorderIds.length - 1} onClick={() => moveReorderedScreen(index, 1)} title="Move down" aria-label={`Move ${screen?.title || 'Screen'} down`} className="rounded-lg border bg-white p-2 disabled:opacity-30"><ArrowDown size={15} /></button></div>; })}</div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={reorderingScreens} onClick={() => setReorderOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button><button type="button" disabled={reorderingScreens} onClick={() => void saveScreenOrder()} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{reorderingScreens ? 'Saving…' : 'Save order'}</button></div>
        </div>
      </div>}
      {renameOpen && selectedScreen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Rename screen">
        <form onSubmit={(event) => { event.preventDefault(); void renameScreen(); }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-900">Rename Screen</h2>
          <p className="mt-1 text-sm text-slate-600">The new title will be saved as the next Screen revision.</p>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Screen title
            <input autoFocus maxLength={250} value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" disabled={renamingScreen} onClick={() => setRenameOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={renamingScreen || !renameTitle.trim()} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{renamingScreen ? 'Saving…' : 'Save title'}</button>
          </div>
        </form>
      </div>}
      {screenAction && selectedScreen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label={screenAction === 'delete-screen' ? 'Confirm screen deletion' : 'Confirm layout removal'}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-900">{screenAction === 'delete-screen' ? 'Delete this Screen?' : 'Remove the applied layout?'}</h2>
          <p className="mt-2 text-sm text-slate-600">{screenAction === 'delete-screen' ? 'This removes the complete Screen and its element placements. This action cannot be undone.' : 'The Screen will become blank/freeform. Existing elements, positions and exact Resource versions will be preserved.'}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" disabled={screenActionBusy} onClick={() => setScreenAction(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button>
            <button type="button" disabled={screenActionBusy} onClick={() => void confirmScreenAction()} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${screenAction === 'delete-screen' ? 'bg-red-700' : 'bg-blue-900'}`}>{screenActionBusy ? 'Working…' : screenAction === 'delete-screen' ? 'Delete Screen' : 'Remove Layout'}</button>
          </div>
        </div>
      </div>}
      {pendingLayout && selectedScreen && (() => {
        const result = remapElementsToLayout(selectedScreen.elements, pendingLayout.layout);
        return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Confirm layout change"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-semibold text-slate-900">Apply {pendingLayout.layout.id}?</h2><p className="mt-2 text-sm text-slate-600">Existing elements are never changed silently. {result.elements.length} compatible element{result.elements.length === 1 ? '' : 's'} will be kept and remapped. {result.removed.length} incompatible element{result.removed.length === 1 ? '' : 's'} will be removed.</p>{result.removed.length > 0 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Removed: {result.removed.map((element) => element.id).join(', ')}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setPendingLayout(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="button" disabled={applyingLayout} onClick={() => void saveAppliedLayout(pendingLayout.row, pendingLayout.layout)} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{applyingLayout ? 'Applying...' : 'Keep compatible and apply'}</button></div></div></div>;
      })()}
      {saveConflict && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label="Screen save conflict">
        <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-900">A newer Screen revision already exists</h2>
          <p className="mt-2 text-sm text-slate-600">Your unsaved draft is still safe in this editor. The server is now at revision {saveConflict.latest.revision_no}, while your draft started from revision {saveConflict.draft.revision_no}. Nothing has been overwritten.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><b>Your draft:</b> {saveConflict.draft.elements.length} element{saveConflict.draft.elements.length === 1 ? '' : 's'}</div>
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900"><b>Server revision {saveConflict.latest.revision_no}:</b> {saveConflict.latest.elements.length} element{saveConflict.latest.elements.length === 1 ? '' : 's'}</div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => {
              setSelectedScreen(saveConflict.latest);
              setScreenList((current) => ({ ...current, screens: current.screens.map((screen) => screen.id === saveConflict.latest.id ? saveConflict.latest : screen) }));
              setElementPast([]);
              setElementFuture([]);
              setDrawingPast([]);
              setDrawingFuture([]);
              setHasUnsavedChanges(false);
              setSaveConflict(null);
              toast.success(`Loaded server revision ${saveConflict.latest.revision_no}.`);
            }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Discard draft and load server</button>
            <button type="button" onClick={() => {
              setSelectedScreen({ ...saveConflict.draft, revision_no: saveConflict.latest.revision_no });
              setHasUnsavedChanges(true);
              setSaveConflict(null);
              toast.success(`Your draft is ready to save on top of revision ${saveConflict.latest.revision_no}.`);
            }} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white">Keep draft and retry</button>
          </div>
        </div>
      </div>}
      {revisionPromptOpen && workflowStatus && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Start Session update"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-semibold text-slate-900">{workflowStatus.status === 'published' ? 'Create a new Session version?' : 'Update this Session?'}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{workflowStatus.status === 'published' ? 'The published release will remain unchanged and available to viewers. This action creates a new editable Draft; after review and approval, publishing it will create the next immutable release.' : `This Session is currently ${workflowStatus.status}. Updating it will return it to Draft and clear the current review or approval so it can be submitted again.`}</p><div className="mt-6 flex justify-end gap-2"><button type="button" disabled={startingRevision} onClick={() => setRevisionPromptOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="button" disabled={startingRevision} onClick={() => void startRevision()} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{startingRevision ? 'Preparing…' : workflowStatus.status === 'published' ? 'Create new Draft' : 'Return to Draft'}</button></div></div></div>}
      {previewOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/80 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Screen Preview"><div className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)]"><div className="flex flex-none items-center justify-between border-b border-gray-200 px-4 py-3"><div><h2 className="font-semibold">Flattened Screen Preview</h2><p className="text-xs text-slate-500">Read-only output without editor guides or controls.</p></div><button type="button" autoFocus onClick={() => setPreviewOpen(false)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">Close</button></div><div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-4"><BlankScreenCanvas screen={selectedScreen} loading={false} layout={selectedLayout} showGuides={false} previewMode /></div></div></div>}
    </StudioShell>
  );
}
