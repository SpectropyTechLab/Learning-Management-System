const PLATFORM_OWNER_CLIENT_ID = 17;

export const prettyPackItemType = (value: string) => {
  if (value === 'exam') return 'Quiz';
  if (value === 'pdf') return 'PDF';
  if (value === 'video') return 'Video';
  if (value === 'html') return 'HTML';
  if (value === 'folder') return 'Folder';
  if (value === 'chapter') return 'Chapter';
  if (value === 'topic') return 'Topic';
  return value;
};

export const formatCourseMeta = (grade: string | null, subject: string | null) =>
  [grade, subject].filter(Boolean).join(' | ') || 'No grade/subject';

export const formatCourseScope = (clientId: number | null) =>
  clientId === null || Number(clientId) === PLATFORM_OWNER_CLIENT_ID ? 'Global' : `Client ${clientId}`;
