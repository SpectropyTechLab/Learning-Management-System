import {
  type FormEvent,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import PackOverviewTab from './PackOverviewTab';
import PackBuilderTab from './PackBuilderTab';
import PackReviewTab from './PackReviewTab';
import PackWorkspaceTabs, { type PackWorkspaceTab } from './PackWorkspaceTabs';
import { CreateCourseDialog } from './PackDialogs';
import { Badge, GhostButton } from '@/pages/dashboard/superadmin/components/ui';
import type {
  AddPackItemsResponse,
  CourseContentPreviewItem,
  CourseSearchResult,
  CreateCourseResponse,
  EditableCourseFormValues,
  ImportCourseContentResponse,
  PackCompositionSummary,
  PackItemPreview,
  PackSummary,
  PaginatedResponse,
  RemovePackItemResponse,
} from '../types';

const PACK_PAGE_SIZE = 8;
const COURSE_PAGE_SIZE = 8;
const EMPTY_COURSE_FORM: EditableCourseFormValues = { name: '', grade: '', subject: '' };

const readError = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { response?: { data?: { error?: string } } }).response?.data?.error
    ? String((error as { response?: { data?: { error?: string } } }).response?.data?.error)
    : fallback;

const buildPackItemPreview = (item: CourseContentPreviewItem): PackItemPreview => ({
  id: item.id,
  course_id: item.course_id,
  course_name: item.course_name,
  item_type: item.item_type,
  title: item.title,
  created_at: item.created_at,
  attached_at: new Date().toISOString(),
  grade: item.grade,
  subject: item.subject,
});

const isSelectablePackRoot = (item: CourseContentPreviewItem) =>
  item.parent_id !== null && ['folder', 'chapter', 'topic'].includes(String(item.item_type).toLowerCase());

type PendingRemoval = {
  packId: number;
  timerId: number;
  toastId: string;
  packItems: PaginatedResponse<PackItemPreview> | null;
  packSummary: PackCompositionSummary | null;
  selectedPack: PackSummary | null;
};

type PackEntitlementSyncResponse = {
  pack_id: number;
  synced_client_ids: number[];
  synced_client_count: number;
};

interface PackBuilderWorkspaceProps {
  packId: number;
}

export default function PackBuilderWorkspace({ packId }: PackBuilderWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<PackWorkspaceTab>('review');
  const [selectedPack, setSelectedPack] = useState<PackSummary | null>(null);
  const [packMetaLoading, setPackMetaLoading] = useState(true);
  const [packMetaError, setPackMetaError] = useState<string | null>(null);

  const [packItems, setPackItems] = useState<PaginatedResponse<PackItemPreview> | null>(null);
  const [packItemsLoading, setPackItemsLoading] = useState(false);
  const [packItemsError, setPackItemsError] = useState<string | null>(null);
  const [packItemsPage, setPackItemsPage] = useState(1);

  const [packSummary, setPackSummary] = useState<PackCompositionSummary | null>(null);
  const [packSummaryLoading, setPackSummaryLoading] = useState(false);
  const [packSummaryError, setPackSummaryError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const [courseQuery, setCourseQuery] = useState('');
  const deferredQuery = useDeferredValue(courseQuery.trim());
  const [courseResults, setCourseResults] = useState<CourseSearchResult[]>([]);
  const [courseResultsTotal, setCourseResultsTotal] = useState(0);
  const [courseResultsPage, setCourseResultsPage] = useState(1);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseSearchResult | null>(null);
  const [targetCourse, setTargetCourse] = useState<CourseSearchResult | null>(null);

  const [courseContent, setCourseContent] = useState<PaginatedResponse<CourseContentPreviewItem> | null>(null);
  const [courseContentLoading, setCourseContentLoading] = useState(false);
  const [courseContentError, setCourseContentError] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  const [addSubmitting, setAddSubmitting] = useState(false);
  const [attachSubmitting, setAttachSubmitting] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [syncSubmitting, setSyncSubmitting] = useState(false);
  const [pendingRemoveIds, setPendingRemoveIds] = useState<number[]>([]);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [createCourseSubmitting, setCreateCourseSubmitting] = useState(false);
  const [createCourseForm, setCreateCourseForm] = useState<EditableCourseFormValues>(EMPTY_COURSE_FORM);
  const [createCourseErrors, setCreateCourseErrors] = useState<{ name?: string; grade?: string }>({});

  const pendingRemovalRef = useRef<Map<number, PendingRemoval>>(new Map());

  const selectedCourseItems = useMemo(
    () => (courseContent?.data ?? []).filter((item) => selectedItemIds.includes(item.id) && isSelectablePackRoot(item)),
    [courseContent?.data, selectedItemIds],
  );

  const syncPackMetrics = (itemCount: number, groups?: PackCompositionSummary['groups']) => {
    setSelectedPack((current) =>
      current
        ? {
            ...current,
            item_count: itemCount,
            course_count: groups ? new Set(groups.map((group) => group.course_id)).size : current.course_count,
          }
        : current,
    );
  };

  const refreshSelectedPack = async (silent = false) => {
    try {
      if (!silent) setPackMetaLoading(true);
      setPackMetaError(null);
      const response = await api.get<PaginatedResponse<PackSummary>>('/packs', {
        params: { page: 1, page_size: 100 },
      });
      const pack = response.data.data.find((entry) => entry.id === packId) ?? null;
      if (!pack) {
        setSelectedPack(null);
        setPackMetaError('Pack not found.');
      } else {
        setSelectedPack(pack);
      }
    } catch (error) {
      setPackMetaError(readError(error, 'Failed to load pack.'));
    } finally {
      if (!silent) setPackMetaLoading(false);
    }
  };

  const refreshPackData = async (page = packItemsPage, silent = false) => {
    try {
      if (!silent) {
        setPackItemsLoading(true);
        setPackSummaryLoading(true);
      }
      setPackItemsError(null);
      setPackSummaryError(null);

      const [itemsResponse, summaryResponse] = await Promise.all([
        api.get<PaginatedResponse<PackItemPreview>>(`/packs/${packId}/items`, {
          params: { page, page_size: PACK_PAGE_SIZE },
        }),
        api.get<PackCompositionSummary>(`/packs/${packId}/summary`),
      ]);

      setPackItems(itemsResponse.data);
      setPackSummary(summaryResponse.data);
      syncPackMetrics(summaryResponse.data.total_items, summaryResponse.data.groups);
    } catch (error) {
      const message = readError(error, 'Failed to load pack data.');
      setPackItemsError(message);
      setPackSummaryError(message);
    } finally {
      if (!silent) {
        setPackItemsLoading(false);
        setPackSummaryLoading(false);
      }
    }
  };

  useEffect(() => {
    void refreshSelectedPack();
    return () => {
      pendingRemovalRef.current.forEach((entry) => window.clearTimeout(entry.timerId));
      pendingRemovalRef.current.clear();
    };
  }, [packId]);

  useEffect(() => {
    setActiveTab('review');
    setSelectedPack(null);
    setPackItemsPage(1);
    setCollapsedGroups([]);
    setSelectedItemIds([]);
    setSelectedCourse(null);
    setTargetCourse(null);
  }, [packId]);

  useEffect(() => {
    void refreshPackData(packItemsPage);
  }, [packId, packItemsPage]);

  const loadCourses = async ({ page = 1, query = deferredQuery }: { page?: number; query?: string } = {}) => {
    try {
      setCoursesLoading(true);
      setCoursesError(null);
      const response = await api.get<PaginatedResponse<CourseSearchResult>>('/courses', {
        params: { page, page_size: COURSE_PAGE_SIZE, q: query || undefined },
      });
      setCourseResults((current) => (page === 1 ? response.data.data : [...current, ...response.data.data]));
      setCourseResultsTotal(response.data.total);
      setCourseResultsPage(response.data.page);
      return response.data.data;
    } catch (error) {
      setCoursesError(readError(error, 'Failed to search courses.'));
      return [];
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCourseResults([]);
      setCourseResultsTotal(0);
      setCourseResultsPage(1);
      void loadCourses({ page: 1, query: deferredQuery });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [deferredQuery]);

  const loadMoreCourses = async () => {
    if (coursesLoading || courseResults.length >= courseResultsTotal) return;
    await loadCourses({ page: courseResultsPage + 1, query: deferredQuery });
  };

  useEffect(() => {
    setSelectedItemIds([]);
  }, [selectedCourse?.id]);

  useEffect(() => {
    if (!selectedCourse) {
      setCourseContent(null);
      setCourseContentError(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setCourseContentLoading(true);
        setCourseContentError(null);
        const response = await api.get<PaginatedResponse<CourseContentPreviewItem>>(
          `/courses/${selectedCourse.id}/content`,
          { params: { view: 'tree' } },
        );
        if (!cancelled) setCourseContent(response.data);
      } catch (error) {
        if (!cancelled) setCourseContentError(readError(error, 'Failed to load course content.'));
      } finally {
        if (!cancelled) setCourseContentLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedCourse]);

  const addSelectedItems = async () => {
    if (!selectedPack || selectedCourseItems.length === 0) return;

    const optimisticItems = selectedCourseItems.map((item) => buildPackItemPreview(item));
    const snapshot = { packItems, packSummary, selectedPack };

    setAddSubmitting(true);
    setPackItems((current) =>
      current
        ? {
            ...current,
            total: current.total + optimisticItems.length,
            data:
              current.page === 1
                ? [...optimisticItems, ...current.data].slice(0, current.page_size)
                : current.data,
          }
        : current,
    );
    syncPackMetrics((selectedPack.item_count ?? 0) + optimisticItems.length);
    setSelectedItemIds([]);

    try {
      const response = await api.post<AddPackItemsResponse>(`/packs/${packId}/items`, {
        item_ids: optimisticItems.map((item) => item.id),
      });
      const addedCount = response.data.added_item_ids.length;
      toast.success(
        addedCount > 0
          ? `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to the pack.`
          : 'Those items are already in the pack.',
      );
      setActiveTab('review');
    } catch (error) {
      setPackItems(snapshot.packItems);
      setPackSummary(snapshot.packSummary);
      setSelectedPack(snapshot.selectedPack);
      toast.error(readError(error, 'Failed to add items to the pack.'));
    } finally {
      setAddSubmitting(false);
      await refreshSelectedPack(true);
      await refreshPackData(packItemsPage, true);
    }
  };

  const attachCourse = async () => {
    if (!selectedCourse) return;

    try {
      setAttachSubmitting(true);
      const response = await api.post<AddPackItemsResponse>(`/packs/${packId}/attach-course`, {
        course_id: selectedCourse.id,
      });
      toast.success(
        response.data.added_item_ids.length > 0
          ? `Attached ${response.data.added_item_ids.length} items from ${selectedCourse.name}.`
          : 'This course had no new items to attach.',
      );
      setActiveTab('review');
      await refreshSelectedPack(true);
      await refreshPackData(packItemsPage, true);
    } catch (error) {
      toast.error(readError(error, 'Failed to attach course.'));
    } finally {
      setAttachSubmitting(false);
    }
  };

  const importSelectedItemsToCourse = async () => {
    if (!targetCourse || !selectedCourse || selectedCourseItems.length === 0) return;

    try {
      setImportSubmitting(true);
      const response = await api.post<ImportCourseContentResponse>(`/courses/${targetCourse.id}/import-content`, {
        source_course_id: selectedCourse.id,
        item_ids: selectedCourseItems.map((item) => item.id),
      });
      setSelectedItemIds([]);
      toast.success(
        response.data.imported_count > 0
          ? `Added ${response.data.imported_count} item${response.data.imported_count === 1 ? '' : 's'} to ${targetCourse.name}.`
          : `${targetCourse.name} already has those items.`,
      );
    } catch (error) {
      toast.error(readError(error, 'Failed to add selected content to the course.'));
    } finally {
      setImportSubmitting(false);
    }
  };

  const syncPackEntitlements = async () => {
    try {
      setSyncSubmitting(true);
      const response = await api.post<PackEntitlementSyncResponse>(
        `/platform/content-packs/${packId}/sync-entitlements`,
      );
      const syncedCount = response.data.synced_client_count;
      toast.success(
        syncedCount > 0
          ? `Synced active entitlements for ${syncedCount} client${syncedCount === 1 ? '' : 's'}.`
          : 'No active client entitlements to sync.',
      );
      await Promise.all([refreshSelectedPack(true), refreshPackData(packItemsPage, true)]);
    } catch (error) {
      toast.error(readError(error, 'Failed to sync pack entitlements.'));
    } finally {
      setSyncSubmitting(false);
    }
  };

  const undoRemove = async (itemId: number) => {
    const pending = pendingRemovalRef.current.get(itemId);
    if (!pending) return;

    window.clearTimeout(pending.timerId);
    toast.dismiss(pending.toastId);
    pendingRemovalRef.current.delete(itemId);
    setPendingRemoveIds((current) => current.filter((id) => id !== itemId));

    if (pending.packId === packId) {
      setPackItems(pending.packItems);
      setPackSummary(pending.packSummary);
      setSelectedPack(pending.selectedPack);
    }

    toast('Removal cancelled.');
  };

  const removeItem = (item: PackItemPreview) => {
    if (!selectedPack || pendingRemovalRef.current.has(item.id)) return;

    const snapshot = { packItems, packSummary, selectedPack };
    setPackItems((current) =>
      current
        ? {
            ...current,
            total: Math.max(current.total - 1, 0),
            data: current.data.filter((entry) => entry.id !== item.id),
          }
        : current,
    );
    syncPackMetrics(Math.max(selectedPack.item_count - 1, 0));
    setPendingRemoveIds((current) => [...current, item.id]);

    const timerId = window.setTimeout(async () => {
      try {
        await api.delete<RemovePackItemResponse>(`/packs/${packId}/items/${item.id}`);
        toast.success(`Removed ${item.title} from the pack.`);
      } catch (error) {
        setPackItems(snapshot.packItems);
        setPackSummary(snapshot.packSummary);
        setSelectedPack(snapshot.selectedPack);
        toast.error(readError(error, 'Failed to remove item.'));
      } finally {
        const pending = pendingRemovalRef.current.get(item.id);
        if (pending) {
          toast.dismiss(pending.toastId);
          pendingRemovalRef.current.delete(item.id);
        }
        setPendingRemoveIds((current) => current.filter((id) => id !== item.id));
        await refreshSelectedPack(true);
        await refreshPackData(packItemsPage, true);
      }
    }, 3000);

    const toastId = toast.custom(
      () => (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <span className="text-sm text-slate-700">Removed {item.title}</span>
          <button
            type="button"
            onClick={() => {
              void undoRemove(item.id);
            }}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            Undo
          </button>
        </div>
      ),
      { duration: 3200 },
    );

    pendingRemovalRef.current.set(item.id, {
      packId,
      timerId,
      toastId,
      packItems: snapshot.packItems,
      packSummary: snapshot.packSummary,
      selectedPack: snapshot.selectedPack,
    });
  };

  const handleToggleItemSelection = (itemId: number) => {
    setSelectedItemIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  };

  const handleToggleGroup = (groupKey: string) => {
    setCollapsedGroups((current) =>
      current.includes(groupKey)
        ? current.filter((value) => value !== groupKey)
        : [...current, groupKey],
    );
  };

  const openCreateCourseDialog = () => {
    setCreateCourseForm(EMPTY_COURSE_FORM);
    setCreateCourseErrors({});
    setCreateCourseOpen(true);
  };

  const closeCreateCourseDialog = () => {
    setCreateCourseOpen(false);
    setCreateCourseSubmitting(false);
    setCreateCourseForm(EMPTY_COURSE_FORM);
    setCreateCourseErrors({});
  };

  const submitCreateCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = {
      name: createCourseForm.name.trim() ? undefined : 'Course name is required.',
      grade: createCourseForm.grade.trim() ? undefined : 'Grade is required.',
    };
    setCreateCourseErrors(nextErrors);
    if (nextErrors.name || nextErrors.grade) return;

    const payload = {
      name: createCourseForm.name.trim(),
      grade: createCourseForm.grade.trim(),
      subject: createCourseForm.subject.trim() || undefined,
    };

    try {
      setCreateCourseSubmitting(true);
      const response = await api.post<CreateCourseResponse>('/courses', payload);
      toast.success('Course created.');

      startTransition(() => setCourseQuery(''));
      const refreshedCourses = await loadCourses({ page: 1, query: '' });
      const createdCourse =
        refreshedCourses.find((course) => course.id === response.data.course_id) ??
        refreshedCourses.find((course) => course.name.trim().toLowerCase() === payload.name.toLowerCase()) ??
        {
          id: response.data.course_id,
          name: payload.name,
          grade: payload.grade,
          subject: payload.subject ?? null,
          client_id: null,
          content_item_count: 0,
          created_at: new Date().toISOString(),
        };

      if (createdCourse) {
        setTargetCourse(createdCourse);
        setCourseResults((current) =>
          current.some((course) => course.id === createdCourse.id) ? current : [createdCourse, ...current],
        );
        setSelectedCourse((current) => {
          if (current && current.id !== createdCourse.id) {
            return current;
          }
          return refreshedCourses.find((course) => course.id !== createdCourse.id) ?? null;
        });
      }

      closeCreateCourseDialog();
    } catch (error) {
      const message = readError(error, 'Failed to create course.');
      setCreateCourseErrors((current) => ({
        ...current,
        name: message.includes('already exists') ? message : current.name,
      }));
      toast.error(message);
    } finally {
      setCreateCourseSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="border-b border-slate-200 pb-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Pack Workspace
            </div>
            <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950">
              {packMetaLoading ? 'Loading pack...' : selectedPack?.name ?? 'Pack not found'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {selectedPack?.description?.trim() ||
                'Use this workspace to review attached items, add content from courses, and keep the pack composition clean.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {selectedPack && (
              <Badge
                tone={
                  selectedPack.is_active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600'
                }
              >
                {selectedPack.is_active ? 'Active pack' : 'Inactive pack'}
              </Badge>
            )}
            <GhostButton onClick={() => void refreshSelectedPack()} className="!rounded-full !px-4 !py-2 !text-sm">
              Refresh Pack
            </GhostButton>
            <GhostButton
              onClick={() => void syncPackEntitlements()}
              disabled={!selectedPack || syncSubmitting}
              className="!rounded-full !px-4 !py-2 !text-sm"
            >
              {syncSubmitting ? 'Syncing...' : 'Sync Entitlements'}
            </GhostButton>
          </div>
        </div>

        {packMetaError && (
          <div className="mt-4 border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{packMetaError}</div>
        )}
      </section>

      <PackWorkspaceTabs
        activeTab={activeTab}
        onChange={(tab) => startTransition(() => setActiveTab(tab))}
      />

      {activeTab === 'overview' && (
        <PackOverviewTab
          selectedPack={selectedPack}
          packItems={packItems?.data ?? null}
          packItemsLoading={packItemsLoading}
          packItemsError={packItemsError}
          packSummary={packSummary}
          packSummaryLoading={packSummaryLoading}
          packSummaryError={packSummaryError}
          onOpenBuilder={() => setActiveTab('builder')}
          onOpenReview={() => setActiveTab('review')}
        />
      )}

      {activeTab === 'builder' && (
        <PackBuilderTab
          selectedPack={selectedPack}
          targetCourse={targetCourse}
          courseQuery={courseQuery}
          onCourseQueryChange={(value) => startTransition(() => setCourseQuery(value))}
          onOpenCreateCourse={openCreateCourseDialog}
          courseResults={courseResults}
          courseResultsTotal={courseResultsTotal}
          coursesLoading={coursesLoading}
          coursesError={coursesError}
          selectedCourse={selectedCourse}
          onSelectCourse={setSelectedCourse}
          onLoadMoreCourses={() => {
            void loadMoreCourses();
          }}
          courseContent={courseContent}
          courseContentLoading={courseContentLoading}
          courseContentError={courseContentError}
          selectedItemIds={selectedItemIds}
          onToggleItemSelection={handleToggleItemSelection}
          onClearSelection={() => setSelectedItemIds([])}
          addSubmitting={addSubmitting}
          attachSubmitting={attachSubmitting}
          importSubmitting={importSubmitting}
          onAddSelectedItems={() => {
            void addSelectedItems();
          }}
          onAttachCourse={() => {
            void attachCourse();
          }}
          onImportSelectedItemsToCourse={() => {
            void importSelectedItemsToCourse();
          }}
        />
      )}

      {activeTab === 'review' && (
        <PackReviewTab
          selectedPack={selectedPack}
          packItems={packItems}
          packItemsLoading={packItemsLoading}
          packItemsError={packItemsError}
          pendingRemoveIds={pendingRemoveIds}
          onRemoveItem={removeItem}
          packSummary={packSummary}
          packSummaryLoading={packSummaryLoading}
          packSummaryError={packSummaryError}
          collapsedGroups={collapsedGroups}
          onToggleGroup={handleToggleGroup}
        />
      )}

      <CreateCourseDialog
        open={createCourseOpen}
        submitting={createCourseSubmitting}
        form={createCourseForm}
        errors={createCourseErrors}
        onClose={closeCreateCourseDialog}
        onSubmit={submitCreateCourse}
        onFormChange={(field, value) => {
          setCreateCourseForm((current) => ({ ...current, [field]: value }));
        }}
      />
    </div>
  );
}
