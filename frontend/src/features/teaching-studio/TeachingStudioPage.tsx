import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Boxes, Eye, FileText, LayoutTemplate, Redo2, Save, Undo2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createBlankStudioScreen,
  getStudioErrorMessage,
  getStudioScreen,
  listStudioScreens,
} from './api/studioScreensApi';
import BlankScreenCanvas from './components/BlankScreenCanvas';
import StudioScreenNavigator from './components/StudioScreenNavigator';
import StudioShell from './components/StudioShell';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import { listStudioLayouts, listStudioResources } from './api/studioEditorApi';
import type { StudioLayoutSummary, StudioResourceSummary } from './api/studioEditorApi';
import type { ScreenScriptRow } from './api/studioDocumentsApi';
import type { StudioScreen, StudioScreenList } from './types';

const positiveInteger = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export default function TeachingStudioPage() {
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
  const [panel, setPanel] = useState<'layouts' | 'script' | 'resources' | 'elements' | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [layouts, setLayouts] = useState<StudioLayoutSummary[]>([]);
  const [resources, setResources] = useState<StudioResourceSummary[]>([]);
  const [scripts, setScripts] = useState<ScreenScriptRow[]>([]);

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
    Promise.all([listStudioLayouts(), listStudioResources(), studioDocumentsApi.screenScripts(sessionId)])
      .then(([layoutRows, resourceRows, scriptRows]) => { setLayouts(layoutRows); setResources(resourceRows); setScripts(scriptRows); })
      .catch(() => { /* Individual editor panels show their empty state. */ });
  }, [sessionId]);

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
        if (active) setSelectedScreen(screen);
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
    setError(null);
    setSearchParams({ screen: String(screenId) });
  };

  const createBlankScreen = async () => {
    if (!sessionId || creating) return;
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
      actions={(
        <button
          type="button"
          onClick={() => void refreshScreens()}
          disabled={loadingScreens}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingScreens ? 'Refreshing...' : 'Refresh'}
        </button>
      )}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <button type="button" onClick={() => setPanel(panel === 'layouts' ? null : 'layouts')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><LayoutTemplate size={17} />Layouts</button>
        <button type="button" onClick={() => setPanel(panel === 'script' ? null : 'script')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><FileText size={17} />Script View</button>
        <button type="button" onClick={() => setPanel(panel === 'resources' ? null : 'resources')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><Upload size={17} />Resources</button>
        <span className="mx-1 h-7 w-px bg-gray-200" />
        <button type="button" disabled title="Undo becomes active after an element change" className="rounded-lg p-2 text-slate-400 disabled:cursor-not-allowed"><Undo2 size={18} /></button>
        <button type="button" disabled title="Redo becomes active after an undo" className="rounded-lg p-2 text-slate-400 disabled:cursor-not-allowed"><Redo2 size={18} /></button>
        <button type="button" onClick={() => setPanel(panel === 'elements' ? null : 'elements')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><Boxes size={17} />Elements</button>
        <div className="ml-auto flex gap-2"><button type="button" disabled title="There are no unsaved canvas changes" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed"><Save size={16} />Save</button><button type="button" disabled={!selectedScreen} onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><Eye size={16} />Preview</button></div>
      </div>

      {panel && <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">{panel === 'layouts' && <><h2 className="font-semibold">Layouts</h2><p className="mb-3 text-sm text-slate-500">Available validated layout versions.</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{layouts.map((layout) => <div key={layout.id} className="rounded-lg border border-gray-200 p-3"><p className="text-sm font-semibold">{layout.name}</p><p className="text-xs text-slate-500">{layout.layout_key} · v{layout.version_no}</p></div>)}{layouts.length === 0 && <p className="text-sm text-slate-500">No layouts are available.</p>}</div></>}{panel === 'resources' && <><h2 className="font-semibold">Resources</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{resources.map((resource) => <div key={resource.id} className="rounded-lg border border-gray-200 p-3"><p className="text-sm font-semibold">{resource.name}</p><p className="text-xs text-slate-500">{resource.resource_type || 'Resource'}</p></div>)}{resources.length === 0 && <p className="text-sm text-slate-500">No resources are available.</p>}</div></>}{panel === 'script' && <><h2 className="font-semibold">Screen Script</h2>{(() => { const script = scripts.find((row) => row.screen_id === selectedScreenId); return script?.content_json ? <div className="mt-3 grid gap-3 md:grid-cols-2">{Object.entries(script.content_json).filter(([, value]) => typeof value === 'string').map(([key, value]) => <div key={key} className="rounded-lg bg-gray-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">{key.replaceAll('_', ' ')}</p><p className="mt-1 whitespace-pre-wrap text-sm">{value || '—'}</p></div>)}</div> : <p className="mt-2 text-sm text-slate-500">No saved script exists for the selected Screen.</p>; })()}</>}{panel === 'elements' && <><h2 className="font-semibold">Elements</h2>{selectedScreen?.elements.length ? <div className="mt-3 space-y-2">{selectedScreen.elements.map((element) => <div key={element.id} className="rounded-lg border border-gray-200 p-3 text-sm"><strong>{element.id}</strong><span className="ml-2 text-slate-500">{element.type}</span></div>)}</div> : <p className="mt-2 text-sm text-slate-500">The selected Screen has no elements yet.</p>}</>}</section>}

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
        <BlankScreenCanvas screen={selectedScreen} loading={loadingScreen} />
      </div>
      {previewOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/80 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Screen Preview"><div className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)]"><div className="flex flex-none items-center justify-between border-b border-gray-200 px-4 py-3"><div><h2 className="font-semibold">Screen Preview</h2><p className="text-xs text-slate-500">Press Escape or Close to return to the editor.</p></div><button type="button" autoFocus onClick={() => setPreviewOpen(false)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">Close</button></div><div className="min-h-0 flex-1 overflow-auto p-2 sm:p-4"><BlankScreenCanvas screen={selectedScreen} loading={false} /></div></div></div>}
    </StudioShell>
  );
}
