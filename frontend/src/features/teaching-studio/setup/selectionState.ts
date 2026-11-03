export const hierarchyKeys = [
  'boardId', 'programId', 'gradeId', 'subjectId', 'chapterId', 'topicId', 'subtopicId', 'sessionId',
] as const;

export type SelectionKey = (typeof hierarchyKeys)[number];
export type StudioSelection = Record<SelectionKey, number | null>;

export const emptyStudioSelection = (): StudioSelection => ({
  boardId: null,
  programId: null,
  gradeId: null,
  subjectId: null,
  chapterId: null,
  topicId: null,
  subtopicId: null,
  sessionId: null,
});

export const changeSelection = (
  current: StudioSelection,
  key: SelectionKey,
  value: number | null,
): StudioSelection => {
  const changedIndex = hierarchyKeys.indexOf(key);
  return hierarchyKeys.reduce<StudioSelection>((next, item, index) => {
    next[item] = index < changedIndex ? current[item] : index === changedIndex ? value : null;
    return next;
  }, emptyStudioSelection());
};

const positiveId = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const selectionFromSearchParams = (params: URLSearchParams): StudioSelection =>
  hierarchyKeys.reduce<StudioSelection>((selection, key) => {
    selection[key] = positiveId(params.get(key));
    return selection;
  }, emptyStudioSelection());

export const selectionSearchParams = (
  selection: StudioSelection,
  includeSession = true,
): URLSearchParams => {
  const params = new URLSearchParams();
  hierarchyKeys.forEach((key) => {
    if (key === 'sessionId' && !includeSession) return;
    const value = selection[key];
    if (value) params.set(key, String(value));
  });
  return params;
};

export const selectionPath = (
  path: string,
  selection: StudioSelection,
  includeSession = true,
): string => {
  const query = selectionSearchParams(selection, includeSession).toString();
  return query ? `${path}?${query}` : path;
};

export const hasCompleteHierarchy = (selection: StudioSelection | null): boolean =>
  Boolean(selection && hierarchyKeys.slice(0, -1).every((key) => selection[key]));
