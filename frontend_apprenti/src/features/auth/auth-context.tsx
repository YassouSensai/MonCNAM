'use client';

import * as React from 'react';
import type { User } from '@/types';

const AUTH_KEY = 'moncnam_apprenti_auth';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) {
        const { user, token } = JSON.parse(stored);
        setUser(user);
        setToken(token);
      }
    } catch {}
  }, []);

  const login = React.useCallback((user: User, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user, token }));
  }, []);

  const logout = React.useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
