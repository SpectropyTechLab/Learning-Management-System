// frontend/src/services/api.ts
import axios from 'axios';
import { resolveApiBaseUrl } from './apiBaseUrl';

const apiBaseUrl = resolveApiBaseUrl();

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
});

const authClient = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
});

const notifyAuthChange = (token: string | null) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('auth-token', { detail: token }));
};

const applyToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
  notifyAuthChange(token);
};

const clearToken = () => {
  localStorage.removeItem('token');
  applyToken(null);
};

const syncTokenFromResponse = (response: { headers?: Record<string, unknown> }) => {
  const headerValue = response?.headers?.['x-access-token'];
  const nextToken = typeof headerValue === 'string' ? headerValue : null;
  if (!nextToken) return;

  const currentToken = localStorage.getItem('token');
  if (currentToken === nextToken) return;

  localStorage.setItem('token', nextToken);
  applyToken(nextToken);
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

const isAuthError = (status?: number, data?: unknown) => {
  const payload = typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
  const code = String(payload.code ?? '').toUpperCase();
  if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_INVALID') return true;
  if (status === 401) return true;
  if (status !== 403) return false;

  const rawMessage = payload.error ?? payload.message ?? '';
  const message = String(rawMessage).toLowerCase();

  return (
    message.includes('invalid or expired token') ||
    message.includes('invalid token') ||
    message.includes('access token required')
  );
};

const shouldSkipRefreshForUrl = (url: string) => {
  if (!url) return false;
  return (
    url.includes('/auth/refresh') ||
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/logout')
  );
};

const refreshAccessToken = async () => {
  try {
    const res = await authClient.post('/auth/refresh');
    syncTokenFromResponse(res);
    const newToken = res.data?.token || null;
    if (newToken) {
      localStorage.setItem('token', newToken);
      applyToken(newToken);
    } else {
      clearToken();
    }
    return newToken;
  } catch {
    clearToken();
    return null;
  }
};

api.interceptors.response.use(
  (response) => {
    syncTokenFromResponse(response);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const data = error.response?.data;
    const requestUrl = String(originalRequest?.url || '');
    const skipRefresh = Boolean(originalRequest?._skipAuthRefresh);

    if (
      originalRequest &&
      !originalRequest._retry &&
      !skipRefresh &&
      !shouldSkipRefreshForUrl(requestUrl) &&
      isAuthError(status, data)
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export { applyToken };
export default api;
