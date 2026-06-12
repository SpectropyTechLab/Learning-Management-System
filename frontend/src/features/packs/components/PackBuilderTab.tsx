import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, GhostButton, PrimaryButton } from '@/pages/dashboard/superadmin/components/ui';
import type {
  CourseContentPreviewItem,
  CourseSearchResult,
  PaginatedResponse,
  PackSummary,
} from '../types';
import { formatCourseMeta, formatCourseScope, prettyPackItemType } from '../packUi';

interface PackBuilderTabProps {
  selectedPack: PackSummary | null;
  targetCourse: CourseSearchResult | null;
  courseQuery: string;
  onCourseQueryChange: (value: string) => void;
  onOpenCreateCourse: () => void;
  courseResults: CourseSearchResult[];
  courseResultsTotal: number;
  coursesLoading: boolean;
  coursesError: string | null;
  selectedCourse: CourseSearchResult | null;
  onSelectCourse: (course: CourseSearchResult) => void;
  onLoadMoreCourses: () => void;
  courseContent: PaginatedResponse<CourseContentPreviewItem> | null;
  courseContentLoading: boolean;
  courseContentError: string | null;
  selectedItemIds: number[];
  onToggleItemSelection: (itemId: number) => void;
  onClearSelection: () => void;
  addSubmitting: boolean;
  attachSubmitting: boolean;
  importSubmitting: boolean;
  onAddSelectedItems: () => void;
  onAttachCourse: () => void;
  onImportSelectedItemsToCourse: () => void;
}

type CourseTreeNode = CourseContentPreviewItem & {
  children: CourseTreeNode[];
};

type SelectionStats = {
  allSelected: boolean;
  partiallySelected: boolean;
  selectedCount: number;
  selectableCount: number;
};

type SelectedTreeNode = CourseTreeNode & {
  children: SelectedTreeNode[];
  selectedChildrenCount: number;
  totalChildrenCount: number;
};

const FOLDER_ITEM_TYPES = new Set(['folder', 'chapter', 'topic']);

const isFolderNode = (itemType: string) => FOLDER_ITEM_TYPES.has(String(itemType).toLowerCase());

const collectNodeIds = (node: CourseTreeNode): number[] => [
  node.id,
  ...node.children.flatMap((child) => collectNodeIds(child)),
];

const countDescendants = (node: CourseTreeNode): number =>
  node.children.reduce((total, child) => total + 1 + countDescendants(child), 0);

const countLeafDescendants = (node: CourseTreeNode): number => {
  if (node.children.length === 0) return 1;
  return node.children.reduce((total, child) => total + countLeafDescendants(child), 0);
};

const sortTreeNodes = <T extends { order_index: number; children: T[] }>(nodes: T[]): T[] =>
  [...nodes]
    .sort((left, right) => left.order_index - right.order_index)
    .map((node) => ({ ...node, children: sortTreeNodes(node.children) }));

const getSelectionStats = (node: CourseTreeNode, selectedIds: Set<number>): SelectionStats => {
  const nodeIds = collectNodeIds(node);
  const selectedCount = nodeIds.filter((id) => selectedIds.has(id)).length;
  const selectableCount = nodeIds.length;

  return {
    allSelected: selectableCount > 0 && selectedCount === selectableCount,
    partiallySelected: selectedCount > 0 && selectedCount < selectableCount,
    selectedCount,
    selectableCount,
  };
};

function ContentTreeNode({
  node,
  depth,
  selectedIds,
  onToggleItemSelection,
  expandedNodeIds,
  onToggleExpanded,
}: {
  node: CourseTreeNode;
  depth: number;
  selectedIds: Set<number>;
  onToggleItemSelection: (itemId: number) => void;
  expandedNodeIds: Set<number>;
  onToggleExpanded: (itemId: number) => void;
}) {
  const checkboxRef = useRef<HTMLInputElement | null>(null);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodeIds.has(node.id);
  const stats = getSelectionStats(node, selectedIds);
  const isSelected = stats.allSelected;

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = stats.partiallySelected;
    }
  }, [stats.partiallySelected]);

  return (
    <div className="space-y-2">
      <div
        className="flex items-start gap-3 border-b border-slate-200 py-3"
        style={{ marginLeft: `${depth * 18}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpanded(node.id)}
            className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            aria-label={isExpanded ? `Collapse ${node.title}` : `Expand ${node.title}`}
          >
            {isExpanded ? '−' : '+'}
          </button>
        ) : (
          <div className="h-6 w-6" />
        )}
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleItemSelection(node.id)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#073b8a]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="border-slate-200 bg-slate-50 text-slate-700">
              {prettyPackItemType(node.item_type)}
            </Badge>
            <span className="truncate text-sm font-semibold text-slate-900">{node.title}</span>
            {hasChildren && (
              <span className="text-xs text-slate-400">
                {countDescendants(node)} nested item{countDescendants(node) === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>Order {node.order_index + 1}</span>
            {hasChildren && (
              <span>
                {countLeafDescendants(node)} content item{countLeafDescendants(node) === 1 ? '' : 's'} in branch
              </span>
            )}
            {stats.partiallySelected && (
              <span>
                {stats.selectedCount} of {stats.selectableCount} selected
              </span>
            )}
          </div>
        </div>
      </div>

      {hasChildren && isExpanded &&
        node.children.map((child) => (
          <ContentTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedIds={selectedIds}
            onToggleItemSelection={onToggleItemSelection}
            expandedNodeIds={expandedNodeIds}
            onToggleExpanded={onToggleExpanded}
          />
        ))}
    </div>
  );
}

const buildCourseTree = (items: CourseContentPreviewItem[]) => {
  const nodeMap = new Map<number, CourseTreeNode>();
  const roots: CourseTreeNode[] = [];

  items.forEach((item) => {
    nodeMap.set(item.id, { ...item, children: [] });
  });

  items.forEach((item) => {
    const node = nodeMap.get(item.id);
    if (!node) return;

    if (item.parent_id && nodeMap.has(item.parent_id)) {
      nodeMap.get(item.parent_id)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  return sortTreeNodes(roots);
};

const buildSelectedTree = (
  nodes: CourseTreeNode[],
  selectedIds: Set<number>,
): SelectedTreeNode[] =>
  nodes.flatMap((node) => {
    const selectedChildren = buildSelectedTree(node.children, selectedIds);
    const isSelected = selectedIds.has(node.id);

    if (!isSelected && selectedChildren.length === 0) {
      return [];
    }

    return [
      {
        ...node,
        children: selectedChildren,
        selectedChildrenCount: selectedChildren.length,
        totalChildrenCount: node.children.length,
      },
    ];
  });

function SelectedSummaryNode({
  node,
  depth,
}: {
  node: SelectedTreeNode;
  depth: number;
}) {
  const hasChildren = node.children.length > 0;
  const descendantCount = countDescendants(node);
  const isFullySelectedBranch = hasChildren && node.selectedChildrenCount === node.totalChildrenCount;

  return (
    <div className="space-y-2">
      <div className="border-b border-slate-200 py-4" style={{ marginLeft: `${depth * 18}px` }}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="border-slate-200 bg-slate-50 text-slate-700">
            {prettyPackItemType(node.item_type)}
          </Badge>
          <div className="text-sm font-semibold text-slate-900">{node.title}</div>
          {hasChildren && (
            <span className="text-xs text-slate-400">
              {isFullySelectedBranch
                ? `Full branch selected (${descendantCount} nested item${descendantCount === 1 ? '' : 's'})`
                : `${node.selectedChildrenCount} of ${node.totalChildrenCount} child branch${node.totalChildrenCount === 1 ? '' : 'es'} selected`}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>Order {node.order_index + 1}</span>
          <span>{node.course_name}</span>
        </div>
      </div>

      {hasChildren &&
        node.children.map((child) => (
          <SelectedSummaryNode key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="border-b border-dashed border-slate-200 py-5 text-sm text-slate-500">{message}</div>
);

export default function PackBuilderTab({
  selectedPack,
  targetCourse,
  courseQuery,
  onCourseQueryChange,
  onOpenCreateCourse,
  courseResults,
  courseResultsTotal,
  coursesLoading,
  coursesError,
  selectedCourse,
  onSelectCourse,
  onLoadMoreCourses,
  courseContent,
  courseContentLoading,
  courseContentError,
  selectedItemIds,
  onToggleItemSelection,
  onClearSelection,
  addSubmitting,
  attachSubmitting,
  importSubmitting,
  onAddSelectedItems,
  onAttachCourse,
  onImportSelectedItemsToCourse,
}: PackBuilderTabProps) {
  const courseTree = useMemo(() => buildCourseTree(courseContent?.data ?? []), [courseContent?.data]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<number[]>([]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasMoreCourses = courseResults.length < courseResultsTotal;
  const isInitialCourseLoad = coursesLoading && courseResults.length === 0;
  const isLoadingMoreCourses = coursesLoading && courseResults.length > 0;
  const selectedIdSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
  const expandedNodeIdSet = useMemo(() => new Set(expandedNodeIds), [expandedNodeIds]);
  const visibleCourseResults = useMemo(
    () => courseResults.filter((course) => course.id !== targetCourse?.id),
    [courseResults, targetCourse?.id],
  );

  const allNodesById = useMemo(() => {
    const nodeMap = new Map<number, CourseTreeNode>();
    const visit = (node: CourseTreeNode) => {
      nodeMap.set(node.id, node);
      node.children.forEach(visit);
    };
    courseTree.forEach(visit);
    return nodeMap;
  }, [courseTree]);

  const selectionBreakdown = useMemo(() => {
    const selectedFolderIds: number[] = [];
    const selectedLeafIds: number[] = [];

    const visit = (node: CourseTreeNode) => {
      if (!selectedIdSet.has(node.id)) {
        node.children.forEach(visit);
        return;
      }

      if (isFolderNode(node.item_type)) {
        selectedFolderIds.push(node.id);
      } else {
        selectedLeafIds.push(node.id);
      }
      node.children.forEach(visit);
    };

    courseTree.forEach(visit);
    return {
      folderCount: selectedFolderIds.length,
      contentCount: selectedLeafIds.length,
    };
  }, [courseTree, selectedIdSet]);
  const selectedTree = useMemo(() => buildSelectedTree(courseTree, selectedIdSet), [courseTree, selectedIdSet]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMoreCourses || coursesLoading || coursesError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreCourses();
        }
      },
      { rootMargin: '160px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [coursesError, coursesLoading, hasMoreCourses, onLoadMoreCourses]);

  useEffect(() => {
    if (!courseTree.length) {
      setExpandedNodeIds([]);
      return;
    }

    const nextExpandedIds: number[] = [];
    const collectExpandedIds = (node: CourseTreeNode) => {
      if (node.children.length > 0) {
        nextExpandedIds.push(node.id);
        node.children.forEach(collectExpandedIds);
      }
    };

    courseTree.forEach(collectExpandedIds);
    setExpandedNodeIds(nextExpandedIds);
  }, [courseTree]);

  const handleToggleExpanded = (itemId: number) => {
    setExpandedNodeIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  };

  const handleToggleTreeSelection = (itemId: number) => {
    const node = allNodesById.get(itemId);
    if (!node) {
      onToggleItemSelection(itemId);
      return;
    }

    const branchIds = collectNodeIds(node);
    const allSelected = branchIds.every((id) => selectedIdSet.has(id));

    branchIds.forEach((id) => {
      const isSelected = selectedIdSet.has(id);
      if (allSelected && isSelected) {
        onToggleItemSelection(id);
        return;
      }

      if (!allSelected && !isSelected) {
        onToggleItemSelection(id);
      }
    });
  };

  return (
    <div className="grid gap-10 xl:grid-cols-[0.95fr_1.2fr_0.85fr] xl:gap-0 xl:divide-x xl:divide-slate-200">
      <section className="space-y-5 xl:pr-8">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Course Browser</h3>
            <p className="mt-1 text-sm text-slate-500">
              {targetCourse
                ? 'Browse existing courses and pick the content you want to add into the new course.'
                : 'Search global and client-owned courses by name, grade, or subject.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge tone="border-slate-200 bg-slate-50 text-slate-700">All course scopes</Badge>
            <GhostButton onClick={onOpenCreateCourse} className="!rounded-full !px-4 !py-2 !text-sm">
              Create Course
            </GhostButton>
          </div>
        </div>

        <input
          value={courseQuery}
          onChange={(event) => onCourseQueryChange(event.target.value)}
          placeholder="Search courses"
          className="w-full border-b border-slate-300 bg-transparent px-0 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
        />

        <div className="space-y-0">
          {isInitialCourseLoad && <EmptyState message="Loading courses..." />}
          {!isInitialCourseLoad && coursesError && (
            <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{coursesError}</div>
          )}
          {!isInitialCourseLoad && !coursesError && visibleCourseResults.length === 0 && (
            <EmptyState message="No courses matched your search." />
          )}
          {!isInitialCourseLoad &&
            !coursesError &&
            visibleCourseResults.map((course) => {
              const isSelected = selectedCourse?.id === course.id;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onSelectCourse(course)}
                  className={`w-full border-b border-slate-200 px-1 py-4 text-left transition ${
                    isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{course.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{formatCourseMeta(course.grade, course.subject)}</span>
                        <Badge tone="border-slate-200 bg-slate-50 text-slate-700">
                          {formatCourseScope(course.client_id)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-500">{course.content_item_count}</div>
                  </div>
                </button>
              );
            })}
          {!isInitialCourseLoad && !coursesError && visibleCourseResults.length > 0 && (
            <div ref={loadMoreRef} className="border-b border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
              {isLoadingMoreCourses
                ? 'Loading more courses...'
                : hasMoreCourses
                  ? `Showing ${visibleCourseResults.length} of ${Math.max(courseResultsTotal - (targetCourse ? 1 : 0), 0)} courses`
                  : `All ${courseResultsTotal} courses loaded`}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-5 xl:px-8">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Content Picker</h3>
            <p className="mt-1 text-sm text-slate-500">
              {targetCourse
                ? 'Pick content from an existing source course and add it into the new course.'
                : 'Select a course and choose the exact items you want to attach to the pack.'}
            </p>
          </div>
          {selectedItemIds.length > 0 && (
            <Badge tone="border-emerald-200 bg-emerald-50 text-emerald-700">
              {selectedItemIds.length} item{selectedItemIds.length === 1 ? '' : 's'} selected
            </Badge>
          )}
        </div>

        <div className="border-b border-slate-200 pb-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {targetCourse ? 'New Course Destination' : 'Selected Course'}
          </div>
          <div className="mt-2 text-base font-semibold text-slate-950">
            {targetCourse?.name ?? selectedCourse?.name ?? 'Select a course first'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {targetCourse
              ? formatCourseMeta(targetCourse.grade, targetCourse.subject)
              : selectedCourse
                ? formatCourseMeta(selectedCourse.grade, selectedCourse.subject)
                : 'No course chosen yet'}
          </div>
          {targetCourse && (
            <>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Browsing From</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {selectedCourse?.name ?? 'Select an existing course from the left'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {selectedCourse
                  ? formatCourseMeta(selectedCourse.grade, selectedCourse.subject)
                  : 'No source course chosen yet'}
              </div>
            </>
          )}
        </div>

        <div className="space-y-0">
          {!selectedCourse && <EmptyState message="Pick a course from the left to browse its content." />}
          {selectedCourse && courseContentLoading && <EmptyState message="Loading course content..." />}
          {selectedCourse && courseContentError && (
            <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{courseContentError}</div>
          )}
          {selectedCourse && !courseContentLoading && !courseContentError && courseTree.length === 0 && (
            <EmptyState message="This course does not contain any items yet." />
          )}
          {selectedCourse &&
            !courseContentLoading &&
            !courseContentError &&
            courseTree.map((node) => (
              <ContentTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedIds={selectedIdSet}
                onToggleItemSelection={handleToggleTreeSelection}
                expandedNodeIds={expandedNodeIdSet}
                onToggleExpanded={handleToggleExpanded}
              />
            ))}
        </div>
      </section>

      <section className="space-y-5 xl:pl-8">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Selection Summary</h3>
            <p className="mt-1 text-sm text-slate-500">
              {targetCourse
                ? 'Add the selected source content into the new course, or keep using the pack actions below.'
                : 'Attach a full course or only the selected items.'}
            </p>
          </div>
          {selectedPack && (
            <Badge tone="border-slate-200 bg-slate-50 text-slate-700">{selectedPack.item_count} in pack</Badge>
          )}
        </div>

        {targetCourse && (
          <div className="border-b border-slate-200 pb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">New Course</div>
            <div className="mt-2 text-base font-semibold text-slate-950">{targetCourse.name}</div>
            <div className="mt-1 text-xs text-slate-500">
              Selected content will be copied into this course.
            </div>
          </div>
        )}

        <div className="border-b border-slate-200 pb-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Working Pack</div>
          <div className="mt-2 text-base font-semibold text-slate-950">
            {selectedPack?.name ?? 'Select a pack first'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {selectedPack
              ? `${selectedPack.item_count} items already attached`
              : 'A pack is required before adding content'}
          </div>
        </div>

        <div className="space-y-3 border-b border-slate-200 pb-5">
          {targetCourse && (
            <PrimaryButton
              onClick={onImportSelectedItemsToCourse}
              disabled={!targetCourse || !selectedCourse || selectedItemIds.length === 0 || importSubmitting}
            >
              {importSubmitting ? 'Adding to Course...' : 'Add Selected to New Course'}
            </PrimaryButton>
          )}
          <GhostButton
            onClick={onAttachCourse}
            disabled={!selectedCourse || !selectedPack || attachSubmitting}
            className="!w-full !rounded-full !px-4 !py-3 !text-sm"
          >
            {attachSubmitting ? 'Attaching...' : 'Attach Entire Course'}
          </GhostButton>
          <PrimaryButton
            onClick={onAddSelectedItems}
            disabled={!selectedPack || selectedItemIds.length === 0 || addSubmitting}
          >
            {addSubmitting ? 'Adding...' : 'Add Selected to Pack'}
          </PrimaryButton>
          <GhostButton
            onClick={onClearSelection}
            disabled={selectedItemIds.length === 0}
            className="!w-full !rounded-full !px-4 !py-3 !text-sm"
          >
            Clear Selection
          </GhostButton>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected Items</div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{selectionBreakdown.folderCount} folders</span>
            <span>•</span>
            <span>{selectionBreakdown.contentCount} content items</span>
          </div>
          <div className="mt-4 space-y-0">
            {selectedTree.length === 0 && <EmptyState message="No items selected yet." />}
            {selectedTree.map((node) => (
              <SelectedSummaryNode key={node.id} node={node} depth={0} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
