const DEFAULT_STUDIO_CDN_ORIGINS = [
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
  'https://ajax.googleapis.com',
  'https://code.jquery.com',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

const normalizeOrigin = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
};

export const studioCdnOrigins = () => {
  const configured = String(process.env.STUDIO_RUNTIME_CDN_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set([...DEFAULT_STUDIO_CDN_ORIGINS, ...configured])];
};

export const studioCdnOriginForUrl = (value) => {
  const raw = String(value || '').trim();
  const origin = normalizeOrigin(raw.startsWith('//') ? `https:${raw}` : raw);
  return origin && studioCdnOrigins().includes(origin) ? origin : null;
};
