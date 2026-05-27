import api from '@/lib/api';
import type { ModuleEntitlement } from '@/features/module-entitlements/types';

const buildPath = (modulePath: string) => `/platform/${modulePath}`;

export const moduleEntitlementsApi = {
  list: async (modulePath: string, clientId?: string | number) => {
    const res = await api.get<ModuleEntitlement[]>(buildPath(modulePath), {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return res.data;
  },

  create: async (modulePath: string, payload: Record<string, unknown>) => {
    const res = await api.post<ModuleEntitlement>(buildPath(modulePath), payload);
    return res.data;
  },

  update: async (modulePath: string, id: string | number, payload: Record<string, unknown>) => {
    const res = await api.patch<ModuleEntitlement>(`${buildPath(modulePath)}/${id}`, payload);
    return res.data;
  },
};
