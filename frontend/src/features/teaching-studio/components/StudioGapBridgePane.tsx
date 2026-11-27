import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  GitBranch,
  GripVertical,
  LoaderCircle,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudioErrorDetails } from '../api/studioScreensApi';
import {
  createStudioChildGapBridge,
  createStudioExternalGapBridge,
  deleteStudioGapBridge,
  listStudioGapBridges,
  reorderStudioGapBridges,
  searchStudioGapBridgeTargets,
  updateStudioGapBridge,
  type StudioGapBridge,
  type StudioGapBridgeExternalTarget,
  type StudioGapBridgeTarget,
  type StudioGapBridgeTargetFacets,
  type StudioGapBridgeTargetFilters,
} from '../api/studioGapBridgesApi';
import StudioPublishedScreenThumbnail from './StudioPublishedScreenThumbnail';

type Props = {
  sourceSessionId: number;
  sourceScreenId: number;
  sourceScreenTitle: string;
  sessionRevisionNo: number;
  selectedBridgeId: number | null;
  onSelectBridge: (bridgeId: number | null) => void;
  onRevisionChange: (revision: number) => void;
  onBridgesChange: (screenId: number, bridges: StudioGapBridge[]) => void;
  onOpenChild: (bridge: StudioGapBridge) => void;
  command?: {
    action: 'add-new' | 'select-existing' | 'rename' | 'preview' | 'delete';
    token: number;
  } | null;
  onCommandHandled?: () => void;
};

const emptyFacets: StudioGapBridgeTargetFacets = {
  topics: [],
  subtopics: [],
  pedagogy: [],
  bloom: [],
  target_exam: [],
};
const targetText = (bridge: StudioGapBridge) =>
  bridge.target_kind === 'child'
    ? 'title' in bridge.target
      ? bridge.target.title || 'Untitled child Screen'
      : 'Child Screen'
    : `${(bridge.target as StudioGapBridgeExternalTarget).session_title || 'Published Session'} · ${(bridge.target as StudioGapBridgeExternalTarget).screen_title || 'Screen'}`;

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-[11px] font-semibold text-slate-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-normal"
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PublishedScreenCard({
  target,
  selected,
  nested = false,
  onSelect,
}: {
  target: StudioGapBridgeTarget;
  selected: boolean;
  nested?: boolean;
  onSelect: () => void;
}) {
  const isChild = target.screen_kind === 'gap_bridge_child';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 p-3 text-left transition ${nested ? 'ml-7 w-[calc(100%-1.75rem)] border-l-2 border-violet-200' : ''} ${selected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : 'hover:bg-slate-50'}`}
    >
      <StudioPublishedScreenThumbnail target={target} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${isChild ? 'bg-violet-100 text-violet-800' : 'bg-blue-100 text-blue-800'}`}
          >
            {isChild ? 'Gap Bridge child' : `Screen ${target.screen_number ?? '—'}`}
          </span>
          <span className="text-[9px] font-semibold text-slate-400">
            Published v{target.release_number}
          </span>
        </span>
        <span className="mt-1 block truncate text-sm font-bold text-slate-900">
          {target.screen_title || `Screen ${target.screen_number ?? target.screen_id}`}
        </span>
        {isChild ? (
          <span className="mt-1 block truncate text-[10px] text-violet-700">
            Parent: Screen {target.parent_screen_number ?? '—'} ·{' '}
            {target.parent_screen_title || 'Untitled Screen'}
          </span>
        ) : null}
        <span className="mt-1 block truncate text-[10px] text-slate-500">
          Session: {target.session_title} · Topic: {target.topic_name}
        </span>
      </span>
    </button>
  );
}

export default function StudioGapBridgePane({
  sourceSessionId,
  sourceScreenId,
  sourceScreenTitle,
  sessionRevisionNo,
  selectedBridgeId,
  onSelectBridge,
  onRevisionChange,
  onBridgesChange,
  onOpenChild,
  command,
  onCommandHandled,
}: Props) {
  const [bridges, setBridges] = useState<StudioGapBridge[]>([]);
  const [revision, setRevision] = useState(sessionRevisionNo);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<'child' | 'external' | 'rename' | null>(null);
  const [replacementId, setReplacementId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [childTitle, setChildTitle] = useState('');
  const [targets, setTargets] = useState<StudioGapBridgeTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<StudioGapBridgeTarget | null>(null);
  const [filters, setFilters] = useState<StudioGapBridgeTargetFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [facets, setFacets] = useState(emptyFacets);
  const [targetContext, setTargetContext] = useState<{
    chapter_id: number;
    chapter_name: string;
    chapter_number: number;
  } | null>(null);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetView, setTargetView] = useState<'hierarchy' | 'all'>('hierarchy');
  const [draggingBridgeId, setDraggingBridgeId] = useState<number | null>(null);
  const bridgeOrderRef = useRef<number[]>([]);
  const dragStartOrderRef = useRef<number[]>([]);

  useEffect(() => {
    if (menuId === null) return;
    const closeMenu = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-gap-bridge-menu]')) return;
      setMenuId(null);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [menuId]);

  useEffect(() => setRevision(sessionRevisionNo), [sessionRevisionNo]);
  const publish = useCallback(
    (next: StudioGapBridge[], nextRevision: number) => {
      const ordered = [...next].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
      setBridges(ordered);
      bridgeOrderRef.current = ordered.map((bridge) => bridge.id);
      setRevision(nextRevision);
      onRevisionChange(nextRevision);
      onBridgesChange(sourceScreenId, ordered);
    },
    [onBridgesChange, onRevisionChange, sourceScreenId],
  );
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listStudioGapBridges(sourceScreenId);
      publish(result.bridges, result.source_session_revision_no);
    } catch (error) {
      toast.error(getStudioErrorDetails(error).message);
    } finally {
      setLoading(false);
    }
  }, [publish, sourceScreenId]);
  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (dialog !== 'external') return;
    let active = true;
    const timer = window.setTimeout(() => {
      setTargetsLoading(true);
      void searchStudioGapBridgeTargets(sourceSessionId, { ...filters, limit: 100 })
        .then((result) => {
          if (!active) return;
          setTargets(result.targets);
          setFacets(result.facets || emptyFacets);
          setTargetContext(result.context || null);
          setSelectedTarget((current) =>
            current &&
            result.targets.some(
              (target) =>
                target.screen_id === current.screen_id && target.session_id === current.session_id,
            )
              ? current
              : null,
          );
        })
        .catch((error) => active && toast.error(getStudioErrorDetails(error).message))
        .finally(() => active && setTargetsLoading(false));
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [dialog, filters, sourceSessionId]);

  const resetDialog = () => {
    setDialog(null);
    setReplacementId(null);
    setName('');
    setChildTitle('');
    setSelectedTarget(null);
    setFilters({});
  };
  const openAdd = (kind: 'child' | 'external') => {
    setReplacementId(null);
    setName('');
    setChildTitle('');
    setSelectedTarget(null);
    setDialog(kind);
  };
  const selectedBridge = bridges.find((bridge) => bridge.id === selectedBridgeId) || null;

  useEffect(() => {
    if (!command) return;
    if (command.action === 'add-new') openAdd('child');
    if (command.action === 'select-existing') openAdd('external');
    if (command.action === 'rename' && selectedBridge) {
      setName(selectedBridge.name);
      setDialog('rename');
    }
    if (command.action === 'preview' && selectedBridge) preview(selectedBridge);
    if (command.action === 'delete' && selectedBridge) void remove(selectedBridge);
    onCommandHandled?.();
    // The command token intentionally makes each ribbon click a distinct request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command?.token]);

  const preview = (bridge: StudioGapBridge) => {
    if (bridge.target_kind === 'child')
      window.open(
        `/studio/player/${sourceSessionId}/preview?screen=${bridge.target.screen_id}`,
        '_blank',
        'noopener,noreferrer',
      );
    else {
      const target = bridge.target as StudioGapBridgeExternalTarget;
      if (target.available && target.release_number)
        window.open(
          `/studio/player/${target.session_id}/releases/${target.release_number}?screen=${target.screen_id}`,
          '_blank',
          'noopener,noreferrer',
        );
    }
  };
  const save = async () => {
    const normalized = name.trim();
    if (!normalized) return toast.error('Enter a teacher-facing name.');
    setBusy(true);
    try {
      if (dialog === 'rename' && selectedBridge) {
        const result = await updateStudioGapBridge(selectedBridge.id, {
          name: normalized,
          source_session_revision_no: revision,
        });
        publish(
          bridges.map((bridge) =>
            bridge.id === selectedBridge.id
              ? { ...result.gap_bridge, target: bridge.target }
              : bridge,
          ),
          result.source_session_revision_no,
        );
      } else if (dialog === 'child') {
        if (replacementId) {
          const existing = bridges.find((bridge) => bridge.id === replacementId);
          if (
            existing?.target_kind === 'child' &&
            !window.confirm(
              'Replace and permanently delete the current child Screen and its draft content?',
            )
          )
            return;
          const result = await updateStudioGapBridge(replacementId, {
            name: normalized,
            target_kind: 'child',
            title: childTitle.trim() || normalized,
            replace_child: true,
            source_session_revision_no: revision,
          });
          publish(
            bridges.map((bridge) => (bridge.id === replacementId ? result.gap_bridge : bridge)),
            result.source_session_revision_no,
          );
          onOpenChild(result.gap_bridge);
        } else {
          const result = await createStudioChildGapBridge(sourceScreenId, {
            name: normalized,
            title: childTitle.trim() || normalized,
            source_session_revision_no: revision,
          });
          publish([...bridges, result.gap_bridge], result.source_session_revision_no);
          onSelectBridge(result.gap_bridge.id);
          onOpenChild(result.gap_bridge);
        }
      } else if (dialog === 'external' && selectedTarget) {
        const existing = replacementId
          ? bridges.find((bridge) => bridge.id === replacementId)
          : null;
        if (
          existing?.target_kind === 'child' &&
          !window.confirm(
            'Replace and permanently delete the current child Screen and its draft content?',
          )
        )
          return;
        const result = replacementId
          ? await updateStudioGapBridge(replacementId, {
              name: normalized,
              target_kind: 'external',
              external_session_id: selectedTarget.session_id,
              external_screen_id: selectedTarget.screen_id,
              source_session_revision_no: revision,
            })
          : await createStudioExternalGapBridge(sourceScreenId, {
              name: normalized,
              external_session_id: selectedTarget.session_id,
              external_screen_id: selectedTarget.screen_id,
              source_session_revision_no: revision,
            });
        publish(
          replacementId
            ? bridges.map((bridge) => (bridge.id === replacementId ? result.gap_bridge : bridge))
            : [...bridges, result.gap_bridge],
          result.source_session_revision_no,
        );
        onSelectBridge(result.gap_bridge.id);
      }
      resetDialog();
      toast.success('Gap Bridge saved.');
    } catch (error) {
      const details = getStudioErrorDetails(error);
      toast.error(details.message);
      if (details.status === 409) await reload();
    } finally {
      setBusy(false);
    }
  };
  const remove = async (bridge: StudioGapBridge) => {
    const warning =
      bridge.target_kind === 'child'
        ? 'This permanently deletes the child Screen and its draft content. Continue?'
        : 'Remove this Gap Bridge mapping?';
    if (!window.confirm(warning)) return;
    setBusy(true);
    try {
      const result = await deleteStudioGapBridge(bridge.id, revision);
      publish(
        bridges.filter((item) => item.id !== bridge.id),
        result.source_session_revision_no,
      );
      if (selectedBridgeId === bridge.id) onSelectBridge(null);
    } catch (error) {
      toast.error(getStudioErrorDetails(error).message);
      await reload();
    } finally {
      setBusy(false);
    }
  };
  const saveBridgeOrder = async (ids: number[]) => {
    if (ids.length !== bridges.length) return;
    const byId = new Map(bridges.map((bridge) => [bridge.id, bridge]));
    const next = ids.map((id) => byId.get(id)).filter(Boolean) as StudioGapBridge[];
    setBusy(true);
    try {
      const result = await reorderStudioGapBridges(
        sourceScreenId,
        ids,
        revision,
      );
      publish(
        next.map((item, display_order) => ({ ...item, display_order })),
        result.source_session_revision_no,
      );
    } catch (error) {
      toast.error(getStudioErrorDetails(error).message);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const moveDraggedBridge = (event: React.PointerEvent) => {
    if (!draggingBridgeId) return;
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-gap-bridge-id]');
    const targetId = Number(target?.dataset.gapBridgeId);
    if (!Number.isInteger(targetId) || targetId === draggingBridgeId) return;
    setBridges((current) => {
      const fromIndex = current.findIndex((bridge) => bridge.id === draggingBridgeId);
      const targetIndex = current.findIndex((bridge) => bridge.id === targetId);
      if (fromIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [dragged] = next.splice(fromIndex, 1);
      next.splice(targetIndex, 0, dragged);
      bridgeOrderRef.current = next.map((bridge) => bridge.id);
      return next;
    });
  };

  const finishBridgeDrag = () => {
    if (!draggingBridgeId) return;
    setDraggingBridgeId(null);
    if (dragStartOrderRef.current.join(',') !== bridgeOrderRef.current.join(',')) {
      void saveBridgeOrder(bridgeOrderRef.current);
    }
  };

  const startReplacement = (bridge: StudioGapBridge, kind: 'child') => {
    setReplacementId(bridge.id);
    setName(bridge.name);
    setChildTitle('');
    setSelectedTarget(null);
    setMenuId(null);
    setDialog(kind);
  };

  const groupedTargets = useMemo(() => {
    const topics = new Map<
      number,
      {
        title: string;
        sessions: Map<number, { title: string; targets: StudioGapBridgeTarget[] }>;
      }
    >();
    for (const target of targets) {
      const topic = topics.get(target.topic_id) || {
        title: target.topic_name,
        sessions: new Map<number, { title: string; targets: StudioGapBridgeTarget[] }>(),
      };
      const session = topic.sessions.get(target.session_id) || {
        title: target.session_title,
        targets: [],
      };
      session.targets.push(target);
      topic.sessions.set(target.session_id, session);
      topics.set(target.topic_id, topic);
    }
    return [...topics.entries()].map(([topicId, topic]) => ({
      topicId,
      title: topic.title,
      sessions: [...topic.sessions.entries()],
    }));
  }, [targets]);
  const visibleSubtopics = facets.subtopics.filter(
    (item) => !filters.topicId || item.topic_id === filters.topicId,
  );

  return (
    <div className="space-y-3">
      <header>
        <div className="flex items-center gap-2">
          <GitBranch size={17} className="text-violet-700" />
          <h2 className="font-bold text-slate-950">Gap Bridges</h2>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{sourceScreenTitle}</p>
      </header>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
        <p className="text-[10px] font-bold uppercase text-blue-700">Parent Screen</p>
        <p className="mt-1 truncate text-sm font-semibold text-blue-950">{sourceScreenTitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openAdd('child')}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-900 px-2 py-2 text-xs font-bold text-white"
        >
          <Plus size={14} />
          Create new
        </button>
        <button
          type="button"
          onClick={() => openAdd('external')}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-blue-300 bg-white px-2 py-2 text-xs font-bold text-blue-900"
        >
          <ExternalLink size={13} />
          Select existing
        </button>
      </div>
      {loading ? (
        <p className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
          <LoaderCircle size={15} className="animate-spin" />
          Loading…
        </p>
      ) : bridges.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-500">
          No child or external Gap Bridges.
        </p>
      ) : (
        <div
          className="space-y-2"
          onPointerMove={moveDraggedBridge}
          onPointerUp={finishBridgeDrag}
          onPointerCancel={finishBridgeDrag}
        >
          {bridges.map((bridge) => (
            <article
              key={bridge.id}
              data-gap-bridge-id={bridge.id}
              onClick={() => onSelectBridge(bridge.id)}
              className={`relative ml-3 rounded-xl border p-3 ${draggingBridgeId === bridge.id ? 'border-violet-600 bg-violet-100 opacity-70' : selectedBridgeId === bridge.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  disabled={busy}
                  title="Drag to reorder"
                  aria-label={`Drag ${bridge.name} to reorder`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const order = bridges.map((item) => item.id);
                    bridgeOrderRef.current = order;
                    dragStartOrderRef.current = order;
                    setDraggingBridgeId(bridge.id);
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  className="mt-0.5 flex h-6 w-5 touch-none items-center justify-center rounded text-violet-600 hover:bg-violet-100 disabled:opacity-40"
                >
                  <GripVertical size={15} />
                </button>
                <ChevronRight size={14} className="mt-1 text-violet-600" />
                <button type="button" className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-bold">{bridge.name}</span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {bridge.target_kind === 'child'
                      ? 'Local child'
                      : (bridge.target as StudioGapBridgeExternalTarget).screen_kind ===
                          'gap_bridge_child'
                        ? 'External Gap Bridge child'
                        : 'External main Screen'}{' '}
                    · {targetText(bridge)}
                  </span>
                </button>
                <button
                  type="button"
                  data-gap-bridge-menu
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuId(menuId === bridge.id ? null : bridge.id);
                  }}
                  className="rounded p-1 hover:bg-slate-100"
                  aria-label={`Actions for ${bridge.name}`}
                >
                  <MoreVertical size={16} />
                </button>
              </div>
              {menuId === bridge.id ? (
                <div
                  data-gap-bridge-menu
                  className="absolute right-2 top-9 z-20 w-44 rounded-lg border bg-white p-1 text-xs shadow-xl"
                >
                  <button
                    className="flex w-full gap-2 rounded px-2 py-2 hover:bg-slate-50"
                    onClick={() => {
                      onSelectBridge(bridge.id);
                      setName(bridge.name);
                      setDialog('rename');
                      setMenuId(null);
                    }}
                  >
                    <Pencil size={13} />
                    Rename
                  </button>
                  <button
                    className="flex w-full gap-2 rounded px-2 py-2 hover:bg-slate-50"
                    onClick={() => preview(bridge)}
                  >
                    <Eye size={13} />
                    Preview
                  </button>
                  <button
                    className="flex w-full gap-2 rounded px-2 py-2 hover:bg-slate-50"
                    onClick={() => startReplacement(bridge, 'child')}
                  >
                    <Plus size={13} />
                    Replace with child
                  </button>
                  <button
                    className="flex w-full gap-2 rounded px-2 py-2 text-red-700 hover:bg-red-50"
                    onClick={() => void remove(bridge)}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {dialog && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Gap Bridge editor"
            >
              <section
                className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${dialog === 'external' ? 'h-[min(840px,calc(100dvh-2rem))] w-[min(1180px,calc(100vw-2rem))]' : 'max-h-[min(640px,calc(100dvh-2rem))] w-[min(560px,calc(100vw-2rem))]'}`}
              >
                <header className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <h2 className="font-bold">
                      {dialog === 'external'
                        ? 'Select an existing published Screen'
                        : dialog === 'rename'
                          ? 'Rename Gap Bridge'
                          : 'Create a child Screen'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Browse the current chapter using the same discovery levels as Branching.
                    </p>
                  </div>
                  <button onClick={resetDialog} className="rounded-lg border p-2">
                    <X size={16} />
                  </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  <label className="text-xs font-bold uppercase text-slate-600">
                    Teacher-facing name
                    <input
                      value={name}
                      maxLength={120}
                      onChange={(event) => setName(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border px-3 text-sm font-normal normal-case"
                    />
                  </label>
                  {dialog === 'child' ? (
                    <label className="mt-4 block text-xs font-bold uppercase text-slate-600">
                      Child Screen title
                      <input
                        value={childTitle}
                        maxLength={250}
                        onChange={(event) => setChildTitle(event.target.value)}
                        placeholder="Defaults to the Gap Bridge name"
                        className="mt-1 h-10 w-full rounded-lg border px-3 text-sm font-normal normal-case"
                      />
                    </label>
                  ) : null}
                  {dialog === 'external' ? (
                    <>
                      {targetContext ? (
                        <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
                          <span className="text-xs font-bold text-blue-950">
                            Chapter {targetContext.chapter_number}: {targetContext.chapter_name}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                            Branching scope
                          </span>
                        </div>
                      ) : null}
                      <label className="relative mt-4 block">
                        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          value={filters.search || ''}
                          onChange={(event) =>
                            setFilters((current) => ({ ...current, search: event.target.value }))
                          }
                          placeholder="Search Sessions and Screens"
                          className="h-10 w-full rounded-lg border pl-9 pr-3 text-sm"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFiltersOpen((open) => !open)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-900"
                      >
                        <Filter size={14} />
                        All Branching filters
                      </button>
                      {filtersOpen ? (
                        <div className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
                          <SelectFilter
                            label="Topic"
                            value={String(filters.topicId || '')}
                            options={facets.topics.map((item) => ({
                              value: String(item.id),
                              label: item.name,
                            }))}
                            onChange={(value) =>
                              setFilters((current) => ({
                                ...current,
                                topicId: value ? Number(value) : null,
                                subtopicId: null,
                              }))
                            }
                          />
                          <SelectFilter
                            label="Subtopic"
                            value={String(filters.subtopicId || '')}
                            options={visibleSubtopics.map((item) => ({
                              value: String(item.id),
                              label: item.name,
                            }))}
                            onChange={(value) =>
                              setFilters((current) => ({
                                ...current,
                                subtopicId: value ? Number(value) : null,
                              }))
                            }
                          />
                          <label className="text-[11px] font-semibold text-slate-600">
                            Tags
                            <input
                              value={filters.tags || ''}
                              onChange={(event) =>
                                setFilters((current) => ({ ...current, tags: event.target.value }))
                              }
                              placeholder="light, reflection"
                              className="mt-1 h-9 w-full rounded-lg border px-2 text-xs font-normal"
                            />
                          </label>
                          <SelectFilter
                            label="Pedagogy"
                            value={filters.pedagogy || ''}
                            options={facets.pedagogy.map((item) => ({
                              value: item.code,
                              label: item.label,
                            }))}
                            onChange={(value) =>
                              setFilters((current) => ({ ...current, pedagogy: value }))
                            }
                          />
                          <SelectFilter
                            label="Bloom level"
                            value={filters.bloom || ''}
                            options={facets.bloom.map((item) => ({
                              value: item.code,
                              label: item.label,
                            }))}
                            onChange={(value) =>
                              setFilters((current) => ({ ...current, bloom: value }))
                            }
                          />
                          <SelectFilter
                            label="Target exam"
                            value={filters.targetExam || ''}
                            options={facets.target_exam.map((item) => ({
                              value: item.code,
                              label: item.label,
                            }))}
                            onChange={(value) =>
                              setFilters((current) => ({ ...current, targetExam: value }))
                            }
                          />
                        </div>
                      ) : null}
                      <div className="mt-4 flex justify-end gap-1">
                        <button
                          onClick={() => setTargetView('hierarchy')}
                          className={`rounded px-3 py-1.5 text-xs font-semibold ${targetView === 'hierarchy' ? 'bg-blue-900 text-white' : 'bg-slate-100'}`}
                        >
                          Hierarchy
                        </button>
                        <button
                          onClick={() => setTargetView('all')}
                          className={`rounded px-3 py-1.5 text-xs font-semibold ${targetView === 'all' ? 'bg-blue-900 text-white' : 'bg-slate-100'}`}
                        >
                          All results
                        </button>
                      </div>
                      <div className="mt-3 h-[min(480px,50dvh)] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                        {targetsLoading ? (
                          <p className="flex justify-center gap-2 py-8 text-sm text-slate-500">
                            <LoaderCircle size={16} className="animate-spin" />
                            Searching…
                          </p>
                        ) : (
                          groupedTargets.map((topic) => (
                            <section
                              key={topic.topicId}
                              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60"
                            >
                              <h3 className="border-b border-slate-200 bg-blue-950 px-4 py-2.5 text-xs font-bold text-white">
                                Topic · {topic.title}
                              </h3>
                              <div className="space-y-3 p-3">
                                {topic.sessions.map(([sessionId, group]) => (
                                  <section
                                    key={sessionId}
                                    className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                                  >
                                    <h4 className="border-b bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                                      Session · {group.title}
                                    </h4>
                                    <div className="divide-y">
                                      {group.targets
                                        .filter((target) => target.screen_kind === 'main')
                                        .map((target) => {
                                          const children = group.targets.filter(
                                            (child) =>
                                              child.screen_kind === 'gap_bridge_child' &&
                                              child.parent_screen_id === target.screen_id,
                                          );
                                          const renderTarget = (
                                            item: StudioGapBridgeTarget,
                                            nested = false,
                                          ) => (
                                            <PublishedScreenCard
                                              key={item.screen_id}
                                              target={item}
                                              nested={nested}
                                              selected={
                                                selectedTarget?.screen_id === item.screen_id &&
                                                selectedTarget.session_id === item.session_id
                                              }
                                              onSelect={() => setSelectedTarget(item)}
                                            />
                                          );
                                          return (
                                            <div key={target.screen_id}>
                                              {renderTarget(target)}
                                              {targetView === 'hierarchy'
                                                ? children.map((child) => renderTarget(child, true))
                                                : null}
                                            </div>
                                          );
                                        })}
                                      {targetView === 'all'
                                        ? group.targets
                                            .filter(
                                              (target) => target.screen_kind === 'gap_bridge_child',
                                            )
                                            .map((target) => (
                                              <PublishedScreenCard
                                                key={`child-${target.screen_id}`}
                                                target={target}
                                                selected={
                                                  selectedTarget?.screen_id === target.screen_id &&
                                                  selectedTarget.session_id === target.session_id
                                                }
                                                onSelect={() => setSelectedTarget(target)}
                                              />
                                            ))
                                        : null}
                                    </div>
                                  </section>
                                ))}
                              </div>
                            </section>
                          ))
                        )}
                      </div>
                    </>
                  ) : null}
                  <button
                    disabled={busy || !name.trim() || (dialog === 'external' && !selectedTarget)}
                    onClick={() => void save()}
                    className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-900 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {busy ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    Save Gap Bridge
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
