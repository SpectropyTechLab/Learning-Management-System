export type StudioHyperlink = {
  url: string;
  tooltip?: string;
  target?: '_blank' | '_self';
};
export const normalizeStudioHyperlink = (value: unknown): StudioHyperlink | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  let url = String(candidate.url || '').trim();
  if (!url) return null;
  if (!/^[a-z][a-z\d+.-]*:/i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return null;
    return {
      url: parsed.toString(),
      tooltip:
        String(candidate.tooltip || '')
          .trim()
          .slice(0, 240) || undefined,
      target: candidate.target === '_self' ? '_self' : '_blank',
    };
  } catch {
    return null;
  }
};
