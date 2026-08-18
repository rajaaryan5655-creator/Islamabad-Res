'use client';

import { create } from 'zustand';
import { api, setAccessToken, type AuthUser } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'guest';
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: { name: string; email: string; phone: string; password: string }) => Promise<AuthUser>;
  oauth: (provider: 'google' | 'facebook') => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  status: 'idle',

  setUser: (user) => set({ user, status: user ? 'authenticated' : 'guest' }),

  login: async (email, password) => {
    const res = await api.post<{ user: AuthUser; accessToken: string }>('/api/auth/login', { email, password });
    setAccessToken(res.accessToken);
    set({ user: res.user, status: 'authenticated' });
    return res.user;
  },

  register: async (input) => {
    const res = await api.post<{ user: AuthUser; accessToken: string }>('/api/auth/register', input);
    setAccessToken(res.accessToken);
    set({ user: res.user, status: 'authenticated' });
    return res.user;
  },

  oauth: async (provider) => {
    // The provider SDK supplies this token in production; the API verifies it
    // against the provider before trusting any profile data.
    const token = `demo-${provider}-${Date.now()}`;
    const res = await api.post<{ user: AuthUser; accessToken: string }>('/api/auth/oauth', { provider, token });
    setAccessToken(res.accessToken);
    set({ user: res.user, status: 'authenticated' });
    return res.user;
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
      set({ user: null, status: 'guest' });
    }
  },

  refresh: async () => {
    set((s) => (s.status === 'idle' ? { status: 'loading' } : s));
    try {
      const res = await api.post<{ user: AuthUser; accessToken: string }>('/api/auth/refresh');
      setAccessToken(res.accessToken);
      set({ user: res.user, status: 'authenticated' });
    } catch {
      setAccessToken(null);
      set({ user: null, status: 'guest' });
    }
  },
}));
