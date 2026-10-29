const DEFAULT_API_BASE_URL = 'http://localhost:5000';

const isLocalHostname = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';

export const resolveApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

  if (typeof window === 'undefined') {
    return configuredBaseUrl;
  }

  try {
    const configuredUrl = new URL(configuredBaseUrl);
    const currentHostname = window.location.hostname;

    if (isLocalHostname(currentHostname) && !isLocalHostname(configuredUrl.hostname)) {
      return `${configuredUrl.protocol}//localhost${configuredUrl.port ? `:${configuredUrl.port}` : ''}`;
    }

    return configuredUrl.toString().replace(/\/$/, '');
  } catch {
    return configuredBaseUrl.replace(/\/$/, '');
  }
};

export const resolveAssetUrl = (assetPath?: string | null) => {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${resolveApiBaseUrl()}${normalizedPath}`;
};
