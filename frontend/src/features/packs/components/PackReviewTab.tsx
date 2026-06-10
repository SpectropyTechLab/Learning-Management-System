import { Badge, GhostButton } from '@/pages/dashboard/superadmin/components/ui';
import type { PackCompositionSummary, PackItemPreview, PackSummary, PaginatedResponse } from '../types';
import { formatCourseMeta, prettyPackItemType } from '../packUi';

interface PackReviewTabProps {
  selectedPack: PackSummary | null;
  packItems: PaginatedResponse<PackItemPreview> | null;
  packItemsLoading: boolean;
  packItemsError: string | null;
  pendingRemoveIds: number[];
  onRemoveItem: (item: PackItemPreview) => void;
  packSummary: PackCompositionSummary | null;
  packSummaryLoading: boolean;
  packSummaryError: string | null;
  collapsedGroups: string[];
  onToggleGroup: (groupKey: string) => void;
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="border-b border-dashed border-slate-200 py-5 text-sm text-slate-500">{message}</div>
);

type SummaryTreeNode = PackCompositionSummary['groups'][number]['items'][number] & {
  children: SummaryTreeNode[];
};

const buildSummaryTree = (items: PackCompositionSummary['groups'][number]['items']) => {
  const nodeMap = new Map<number, SummaryTreeNode>();
  const roots: SummaryTreeNode[] = [];

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

  const sortNodes = (nodes: SummaryTreeNode[]) => {
    nodes.sort((left, right) => {
      if (left.order_index !== right.order_index) return left.order_index - right.order_index;
      return left.title.localeCompare(right.title);
    });
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
};

function SummaryTreeItem({ node, depth }: { node: SummaryTreeNode; depth: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm" style={{ marginLeft: `${depth * 18}px` }}>
        <span className="text-slate-700">{node.title}</span>
        <Badge tone="border-slate-200 bg-slate-50 text-slate-700">
          {prettyPackItemType(node.item_type)}
        </Badge>
      </div>

      {node.children.map((child) => (
        <SummaryTreeItem key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function AttachedTreeItem({
  node,
  depth,
  courseName,
  grade,
  subject,
  pendingRemoveIds,
  onRemoveItem,
}: {
  node: SummaryTreeNode;
  depth: number;
  courseName: string;
  grade: string | null;
  subject: string | null;
  pendingRemoveIds: number[];
  onRemoveItem: (item: PackItemPreview) => void;
}) {
  const isPending = pendingRemoveIds.includes(node.id);

  return (
    <div className="space-y-2">
      <div
        className="flex items-start justify-between gap-4 border-b border-slate-200 py-4"
        style={{ marginLeft: `${depth * 18}px` }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="border-slate-200 bg-slate-50 text-slate-700">
              {prettyPackItemType(node.item_type)}
            </Badge>
            <span className="truncate text-sm font-semibold text-slate-900">{node.title}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {courseName} | {formatCourseMeta(grade, subject)}
          </div>
        </div>
        <GhostButton
          onClick={() =>
            onRemoveItem({
              id: node.id,
              course_id: 0,
              course_name: courseName,
              item_type: node.item_type,
              title: node.title,
              created_at: '',
              attached_at: null,
              grade,
              subject,
            })
          }
          disabled={isPending}
          className="!rounded-full !px-3 !py-2"
        >
          {isPending ? 'Undo window...' : 'Remove'}
        </GhostButton>
      </div>

      {node.children.map((child) => (
        <AttachedTreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          courseName={courseName}
          grade={grade}
          subject={subject}
          pendingRemoveIds={pendingRemoveIds}
          onRemoveItem={onRemoveItem}
        />
      ))}
    </div>
  );
}

export default function PackReviewTab({
  selectedPack,
  packItems,
  packItemsLoading,
  packItemsError,
  pendingRemoveIds,
  onRemoveItem,
  packSummary,
  packSummaryLoading,
  packSummaryError,
  collapsedGroups,
  onToggleGroup,
}: PackReviewTabProps) {
  if (!selectedPack) {
    return (
      <section className="border-b border-dashed border-slate-300 py-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900">No pack selected for review</h3>
        <p className="mt-2 text-sm text-slate-500">
          Choose a pack first, then come here to inspect attached items and grouped composition.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_0.95fr] xl:gap-0 xl:divide-x xl:divide-slate-200">
      <section className="space-y-5 xl:pr-8">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Attached Items</h3>
            <p className="mt-1 text-sm text-slate-500">Review each item currently inside the selected pack.</p>
          </div>
          <Badge tone="border-slate-200 bg-slate-50 text-slate-700">{selectedPack.item_count} attached</Badge>
        </div>

        <div className="space-y-0">
          {packItemsLoading && <EmptyState message="Loading pack items..." />}
          {packItemsError && (
            <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{packItemsError}</div>
          )}
          {!packItemsLoading && !packItemsError && packSummary?.groups.length === 0 && (
            <EmptyState message="This pack does not contain any items yet." />
          )}
          {!packItemsLoading &&
            !packItemsError &&
            packSummary?.groups.map((group) => {
              const hierarchy = buildSummaryTree(group.items);

              return (
                <div key={`${group.course_id}:${group.subject ?? ''}`} className="border-b border-slate-200 py-4">
                  <div className="pb-3">
                    <div className="text-sm font-semibold text-slate-900">{group.course_name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatCourseMeta(group.grade, group.subject)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {hierarchy.map((item) => (
                      <AttachedTreeItem
                        key={item.id}
                        node={item}
                        depth={0}
                        courseName={group.course_name}
                        grade={group.grade}
                        subject={group.subject}
                        pendingRemoveIds={pendingRemoveIds}
                        onRemoveItem={onRemoveItem}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <section className="space-y-5 xl:pl-8">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Grouped Summary</h3>
            <p className="mt-1 text-sm text-slate-500">Check coverage by course and subject before you ship the pack.</p>
          </div>
          {packSummary && (
            <Badge tone="border-emerald-200 bg-emerald-50 text-emerald-700">{packSummary.total_items} total</Badge>
          )}
        </div>

        <div className="space-y-0">
          {packSummaryLoading && <EmptyState message="Loading summary..." />}
          {packSummaryError && (
            <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{packSummaryError}</div>
          )}
          {!packSummaryLoading && !packSummaryError && packSummary?.groups.length === 0 && (
            <EmptyState message="No grouped content to summarize yet." />
          )}
          {!packSummaryLoading &&
            !packSummaryError &&
            packSummary?.groups.map((group) => {
              const groupKey = `${group.course_id}:${group.subject ?? ''}`;
              const collapsed = collapsedGroups.includes(groupKey);
              const hierarchy = buildSummaryTree(group.items);

              return (
                <div key={groupKey} className="border-b border-slate-200 py-4">
                  <button
                    type="button"
                    onClick={() => onToggleGroup(groupKey)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{group.course_name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatCourseMeta(group.grade, group.subject)}
                      </div>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {group.item_count} items {collapsed ? '+' : '-'}
                    </span>
                  </button>

                  {!collapsed && (
                    <div className="mt-4 space-y-3">
                      {hierarchy.map((item) => (
                        <SummaryTreeItem key={item.id} node={item} depth={0} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
