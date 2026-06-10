/* eslint-disable react-refresh/only-export-components */
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { applyToken } from '@/lib/api';
import type { Role } from '@/features/auth/types';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active?: boolean;
  client_id?: number | null;
  user_id?: string | null;
  client_name?: string | null;
  school_name?: string | null;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (
    identifier: string,
    password: string,
    identifierType?: 'email' | 'user_id'
  ) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  register: (
    email: string,
    full_name: string,
    password: string,
    role: Role,
    client_id?: number | null,
    user_id?: string | null
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem('auth_user');
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(() => {
    const initialToken = localStorage.getItem('token');
    return Boolean(initialToken);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const nextToken = (event as CustomEvent<string | null>).detail ?? null;
      setToken((prev) => (prev === nextToken ? prev : nextToken));
    };
    window.addEventListener('auth-token', handler as EventListener);
    return () => window.removeEventListener('auth-token', handler as EventListener);
  }, []);

  const syncAuthCookie = useCallback((nextToken: string | null) => {
    const maxAge = nextToken ? 60 * 60 * 24 * 30 : 0; // 30 days
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    const sameSite = import.meta.env.VITE_AUTH_COOKIE_SAMESITE || 'Lax';
    const cookieDomain = import.meta.env.VITE_AUTH_COOKIE_DOMAIN
      ? `; Domain=${import.meta.env.VITE_AUTH_COOKIE_DOMAIN}`
      : '';
    document.cookie = `token=${nextToken || ''}; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}${cookieDomain}`;
  }, []);

  useEffect(() => {
    applyToken(token);
    syncAuthCookie(token);
  }, [token, syncAuthCookie]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', null, { _skipAuthRefresh: true } as { _skipAuthRefresh: boolean });
    } catch (error) {
      console.log('Failed to logout:', error);
      // ignore logout errors, clear local state anyway
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user');
      setToken(null);
      setUser(null);
      syncAuthCookie(null);
    }
  }, [syncAuthCookie]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      localStorage.removeItem('auth_user');
      return;
    }

    const res = await api.get('/auth/me');
    const permissions = Array.isArray(res.data?.permissions) ? res.data.permissions : [];
    setUser({ ...res.data.user, permissions });
  }, [token]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        localStorage.removeItem('auth_user');
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        await refreshUser();
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem('auth_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token, logout, refreshUser]);

  const login = useCallback(async (
    identifier: string,
    password: string,
    identifierType: 'email' | 'user_id' = 'email'
  ) => {
    const payload =
      identifierType === 'user_id'
        ? { user_id: identifier, password }
        : { email: identifier, password };
    const res = await api.post('/auth/login', payload);

    const { token, user, permissions } = res.data;
    const nextUser =
      Array.isArray(permissions)
        ? { ...user, permissions }
        : user;

    localStorage.setItem('token', token);
    localStorage.setItem('auth_user', JSON.stringify(nextUser));
    setToken(token);
    setUser(nextUser);
  }, []);

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      localStorage.setItem('auth_user', JSON.stringify(next));
      return next;
    });
  };

  const register = useCallback(async (
    email: string,
    full_name: string,
    password: string,
    role: Role,
    client_id?: number | null,
    user_id?: string | null
  ) => {
    const res = await api.post('/auth/register', {
      email,
      full_name,
      password,
      role,
      client_id,
      user_id,
    });
    const { token, user, permissions } = res.data;
    const nextUser =
      Array.isArray(permissions)
        ? { ...user, permissions }
        : user;
    localStorage.setItem('token', token);
    localStorage.setItem('auth_user', JSON.stringify(nextUser));
    setToken(token);
    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, updateUser, register, refreshUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

