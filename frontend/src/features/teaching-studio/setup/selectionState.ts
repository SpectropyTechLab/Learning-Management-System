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
