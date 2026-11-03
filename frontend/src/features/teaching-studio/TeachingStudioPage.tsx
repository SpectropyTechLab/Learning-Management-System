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
import StudioElementDialog from './components/StudioElementDialog';
import StudioLayoutGallery from './components/StudioLayoutGallery';
import StudioScreenNavigator from './components/StudioScreenNavigator';
import StudioShell from './components/StudioShell';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import {
  deleteStudioScreen,
  listStudioLayouts,
  listStudioResources,
  saveStudioScreen,
} from './api/studioEditorApi';
import type {
  StudioLayoutSlot,
  StudioLayoutSummary,
  StudioResourceSummary,
} from './api/studioEditorApi';
import type { ScreenScriptRow } from './api/studioDocumentsApi';
import type { StudioElement, StudioScreen, StudioScreenList } from './types';

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
  const [layoutsLoading, setLayoutsLoading] = useState(false);
  const [layoutsError, setLayoutsError] = useState('');
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [applyingLayout, setApplyingLayout] = useState(false);
  const [elementEditor, setElementEditor] = useState<{
    slot: StudioLayoutSlot;
    element: StudioElement | null;
  } | null>(null);
  const [savingElement, setSavingElement] = useState(false);
  const [resources, setResources] = useState<StudioResourceSummary[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [scripts, setScripts] = useState<ScreenScriptRow[]>([]);

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
    Promise.all([listStudioResources(), studioDocumentsApi.screenScripts(sessionId)])
      .then(([resourceRows, scriptRows]) => {
        setResources(resourceRows);
        setScripts(scriptRows);
      })
      .catch(() => {
        /* Individual editor panels show their empty state. */
      });
  }, [sessionId]);

  const loadLayouts = useCallback(async () => {
    setLayoutsLoading(true);
    setLayoutsError('');
    try {
      setLayouts(await listStudioLayouts());
    } catch (requestError) {
      setLayoutsError(getStudioErrorMessage(requestError));
    } finally {
      setLayoutsLoading(false);
    }
  }, []);

  const toggleLayouts = () => {
    if (panel === 'layouts') {
      setPanel(null);
      return;
    }
    setPanel('layouts');
    setSelectedLayoutId(selectedScreen?.layout_id ?? null);
    void loadLayouts();
  };

  const applyLayout = async () => {
    if (!selectedScreen || !selectedLayoutId || applyingLayout) return;
    const layout = layouts.find((item) => item.id === selectedLayoutId);
    if (!layout) return;
    const slots = layout.layout_data_json?.slots ?? [];
    const usedSlots = new Set<string>();
    const remappedElements = [] as StudioScreen['elements'];
    const incompatible: string[] = [];
    let remappedCount = 0;
    for (const element of selectedScreen.elements) {
      const current = slots.find(
        (slot) =>
          slot.id === element.slotId &&
          slot.allowed.includes(element.type) &&
          !usedSlots.has(slot.id),
      );
      const target =
        current ??
        slots.find((slot) => slot.allowed.includes(element.type) && !usedSlots.has(slot.id));
      if (!target) {
        incompatible.push(element.id);
        continue;
      }
      usedSlots.add(target.id);
      if (target.id !== element.slotId) remappedCount += 1;
      remappedElements.push({ ...element, slotId: target.id });
    }
    if (incompatible.length) {
      toast.error(`Layout cannot be applied: no compatible slot for ${incompatible.join(', ')}.`);
      return;
    }
    if (
      remappedCount > 0 &&
      !window.confirm(
        `${remappedCount} existing element${remappedCount === 1 ? '' : 's'} will be moved to compatible slots. Apply this layout?`,
      )
    ) {
      return;
    }
    setApplyingLayout(true);
    try {
      const saved = await saveStudioScreen(selectedScreen.id, {
        revision_no: selectedScreen.revision_no,
        title: selectedScreen.title,
        layout_id: layout.id,
        creation_mode: 'layout',
        elements: remappedElements,
        tags: selectedScreen.tags,
      });
      setSelectedScreen(saved);
      setScreenList((current) => ({
        session_revision_no: saved.session_revision_no,
        screens: current.screens.map((screen) => (screen.id === saved.id ? saved : screen)),
      }));
      toast.success(`${layout.name} applied successfully.`);
    } catch (requestError) {
      toast.error(getStudioErrorMessage(requestError));
    } finally {
      setApplyingLayout(false);
    }
  };

  const storeSavedScreen = (saved: StudioScreen & { session_revision_no: number }) => {
    setSelectedScreen(saved);
    setScreenList((current) => ({
      session_revision_no: saved.session_revision_no,
      screens: current.screens.map((screen) => (screen.id === saved.id ? saved : screen)),
    }));
  };

  const persistElements = async (elements: StudioElement[]) => {
    if (!selectedScreen) return null;
    return saveStudioScreen(selectedScreen.id, {
      revision_no: selectedScreen.revision_no,
      title: selectedScreen.title,
      layout_id: selectedScreen.layout_id,
      creation_mode: selectedScreen.creation_mode,
      elements,
      tags: selectedScreen.tags,
    });
  };

  const saveElementContent = async (type: string, text: string) => {
    if (!selectedScreen || !elementEditor || savingElement) return;
    const currentElement = elementEditor.element;
    const nextElement: StudioElement = currentElement
      ? {
          ...currentElement,
          type,
          slotId: elementEditor.slot.id,
          content: { ...currentElement.content, text: text.trim() },
        }
      : {
          id: `element-${crypto.randomUUID()}`,
          slotId: elementEditor.slot.id,
          type,
          content: { text: text.trim() },
          position: {},
        };
    const elements = currentElement
      ? selectedScreen.elements.map((element) =>
          element.id === currentElement.id ? nextElement : element,
        )
      : [...selectedScreen.elements, nextElement];
    setSavingElement(true);
    try {
      const saved = await persistElements(elements);
      if (saved) storeSavedScreen(saved);
      setElementEditor(null);
      toast.success(
        currentElement ? 'Content updated successfully.' : 'Content added successfully.',
      );
    } catch (requestError) {
      toast.error(getStudioErrorMessage(requestError));
    } finally {
      setSavingElement(false);
    }
  };

  const removeElement = async (element: StudioElement) => {
    if (
      !selectedScreen ||
      savingElement ||
      !window.confirm(`Remove ${element.id} from this Screen?`)
    )
      return;
    setSavingElement(true);
    try {
      const saved = await persistElements(
        selectedScreen.elements.filter((item) => item.id !== element.id),
      );
      if (saved) storeSavedScreen(saved);
      toast.success('Content removed successfully.');
    } catch (requestError) {
      toast.error(getStudioErrorMessage(requestError));
    } finally {
      setSavingElement(false);
    }
  };

  const renameScreen = async (screen: StudioScreen) => {
    const title = window.prompt('Enter a new Screen name', screen.title);
    if (title === null || !title.trim() || title.trim() === screen.title) return;
    try {
      const saved = await saveStudioScreen(screen.id, {
        revision_no: screen.revision_no,
        title: title.trim(),
        layout_id: screen.layout_id,
        creation_mode: screen.creation_mode,
        elements: screen.elements,
        tags: screen.tags,
      });
      storeSavedScreen(saved);
      toast.success('Screen renamed successfully.');
    } catch (requestError) {
      toast.error(getStudioErrorMessage(requestError));
    }
  };

  const deleteScreen = async (screen: StudioScreen) => {
    if (
      !window.confirm(
        `Delete “${screen.title || `Screen ${screen.screen_number}`}”? This removes its elements and cannot be undone.`,
      )
    )
      return;
    try {
      const deleted = await deleteStudioScreen(screen.id);
      const remaining = screenList.screens.filter((item) => item.id !== screen.id);
      setScreenList({ session_revision_no: deleted.session_revision_no, screens: remaining });
      setSelectedScreen(null);
      const next = remaining[0];
      if (next) setSearchParams({ screen: String(next.id) });
      else setSearchParams({});
      toast.success('Screen deleted successfully.');
    } catch (requestError) {
      toast.error(getStudioErrorMessage(requestError));
    }
  };

  const placeResource = async (slot: StudioLayoutSlot) => {
    if (!selectedScreen || !selectedResourceId) return;
    const resource = resources.find((item) => item.id === selectedResourceId);
    const versionId = resource?.latest_version?.id;
    if (!resource || !versionId) {
      toast.error('This Resource has no available version.');
      return;
    }
    const typeByResource: Record<string, string> = {
      image: 'visual',
      animation: 'visual',
      video: 'media',
      simulation: 'simulation',
      external_link: 'activity',
      html: 'activity',
      zip: 'activity',
      scorm: 'activity',
    };
    const preferredType = typeByResource[resource.resource_type || ''] || 'visual';
    const type = slot.allowed.includes(preferredType)
      ? preferredType
      : slot.allowed.find((item) =>
          ['visual', 'media', 'simulation', 'activity', 'graph', 'data'].includes(item),
        );
    if (!type) {
      toast.error('The selected Resource is not compatible with this slot.');
      return;
    }
    const existing = selectedScreen.elements.find((element) => element.slotId === slot.id);
    if (existing && !window.confirm(`Replace the content currently in ${slot.label}?`)) return;
    const resourceElement: StudioElement = {
      id: existing?.id ?? `resource-${crypto.randomUUID()}`,
      slotId: slot.id,
      type,
      content: {
        text: resource.name,
        resource_type: resource.resource_type || 'resource',
        external_url: resource.latest_version?.external_url || null,
      },
      position: existing?.position ?? {},
      resource: {
        resource_id: resource.id,
        resource_version_id: versionId,
        usage: { slot_id: slot.id },
      },
    };
    const elements = existing
      ? selectedScreen.elements.map((item) => (item.id === existing.id ? resourceElement : item))
      : [...selectedScreen.elements, resourceElement];
    setSavingElement(true);
    try {
      const saved = await persistElements(elements);
      if (saved) storeSavedScreen(saved);
      setSelectedResourceId(null);
      toast.success(`${resource.name} placed in ${slot.label}.`);
    } catch (requestError) {
      toast.error(getStudioErrorMessage(requestError));
    } finally {
      setSavingElement(false);
    }
  };

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
      setError(response);
      toast.error(response);
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
      subtitle={`Session ${sessionId} · Revision ${screenList.session_revision_no || '—'}`}
      actions={
        <button
          type="button"
          onClick={() => void refreshScreens()}
          disabled={loadingScreens}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingScreens ? 'Refreshing...' : 'Refresh'}
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={toggleLayouts}
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
          onClick={() => {
            setPanel(panel === 'resources' ? null : 'resources');
            if (layouts.length === 0) void loadLayouts();
          }}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"
        >
          <Upload size={17} />
          Resources
        </button>
        <span className="mx-1 h-7 w-px bg-gray-200" />
        <button
          type="button"
          disabled
          title="Undo becomes active after an element change"
          className="rounded-lg p-2 text-slate-400 disabled:cursor-not-allowed"
        >
          <Undo2 size={18} />
        </button>
        <button
          type="button"
          disabled
          title="Redo becomes active after an undo"
          className="rounded-lg p-2 text-slate-400 disabled:cursor-not-allowed"
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
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled
            title="There are no unsaved canvas changes"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            Save
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

      {panel && (
        <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {panel === 'layouts' && (
            <StudioLayoutGallery
              layouts={layouts}
              loading={layoutsLoading}
              error={layoutsError}
              selectedLayoutId={selectedLayoutId}
              applying={applyingLayout}
              canApply={
                !!selectedScreen &&
                !!selectedLayoutId &&
                selectedScreen.layout_id !== selectedLayoutId
              }
              onSelect={setSelectedLayoutId}
              onRetry={() => void loadLayouts()}
              onApply={() => void applyLayout()}
            />
          )}
          {panel === 'resources' && (
            <>
              <h2 className="font-semibold">Resources</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a Resource, then choose a compatible layout box.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {resources.map((resource) => (
                  <button
                    type="button"
                    onClick={() => setSelectedResourceId(resource.id)}
                    key={resource.id}
                    className={`rounded-lg border p-3 text-left ${selectedResourceId === resource.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
                  >
                    <p className="text-sm font-semibold">{resource.name}</p>
                    <p className="text-xs text-slate-500">{resource.resource_type || 'Resource'}</p>
                  </button>
                ))}
                {resources.length === 0 && (
                  <p className="text-sm text-slate-500">No resources are available.</p>
                )}
              </div>
              {selectedResourceId ? (
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-700">Place in layout box</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      layouts.find((layout) => layout.id === selectedScreen?.layout_id)
                        ?.layout_data_json.slots ?? []
                    )
                      .filter((slot) =>
                        slot.allowed.some((type) =>
                          ['visual', 'media', 'simulation', 'activity', 'graph', 'data'].includes(
                            type,
                          ),
                        ),
                      )
                      .map((slot) => (
                        <button
                          type="button"
                          key={slot.id}
                          onClick={() => void placeResource(slot)}
                          disabled={savingElement}
                          className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-40"
                        >
                          {slot.label}
                        </button>
                      ))}
                    {!selectedScreen?.layout_id ? (
                      <p className="text-sm text-amber-700">
                        Apply a layout before placing a Resource.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
          {panel === 'script' && (
            <>
              <h2 className="font-semibold">Screen Script</h2>
              {(() => {
                const script = scripts.find((row) => row.screen_id === selectedScreenId);
                return script?.content_json ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {Object.entries(script.content_json)
                      .filter(([, value]) => typeof value === 'string')
                      .map(([key, value]) => (
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
            <>
              <h2 className="font-semibold">Elements</h2>
              {selectedScreen?.elements.length ? (
                <div className="mt-3 space-y-2">
                  {selectedScreen.elements.map((element) => (
                    <div key={element.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                      <strong>{element.id}</strong>
                      <span className="ml-2 text-slate-500">{element.type}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  The selected Screen has no elements yet.
                </p>
              )}
            </>
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
          onRename={(screen) => void renameScreen(screen)}
          onDelete={(screen) => void deleteScreen(screen)}
        />
        <BlankScreenCanvas
          screen={selectedScreen}
          layout={layouts.find((layout) => layout.id === selectedScreen?.layout_id) ?? null}
          loading={loadingScreen}
          editable={!!selectedScreen?.layout_id && !savingElement}
          onEditElement={(slot, element) => setElementEditor({ slot, element })}
          onRemoveElement={(element) => void removeElement(element)}
        />
      </div>
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
                <h2 className="font-semibold">Screen Preview</h2>
                <p className="text-xs text-slate-500">
                  Press Escape or Close to return to the editor.
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
            <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-4">
              <BlankScreenCanvas
                screen={selectedScreen}
                layout={layouts.find((layout) => layout.id === selectedScreen?.layout_id) ?? null}
                loading={false}
              />
            </div>
          </div>
        </div>
      )}
      {elementEditor ? (
        <StudioElementDialog
          slot={elementEditor.slot}
          element={elementEditor.element}
          saving={savingElement}
          onClose={() => setElementEditor(null)}
          onSave={(type, text) => void saveElementContent(type, text)}
        />
      ) : null}
    </StudioShell>
  );
}
