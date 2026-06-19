'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { closeSession, createSession } from '@/lib/teacher-api';

type SessionContextValue = {
  isActive: boolean;
  isHydrated: boolean;
  module: string;
  room: string;
  code: string;
  sessionId: number | null;
  startedAt: string | null;
  durationMinutes: number;
  remainingSeconds: number;
  startSession: (details: {
    moduleId: number;
    moduleCode: string;
    moduleName: string;
    room?: string;
    durationMinutes?: number;
  }) => Promise<void>;
  stopSession: () => Promise<void>;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

const SESSION_STORAGE_KEY = 'moncnam_active_session';

type PersistedSession = {
  isActive: boolean;
  module: string;
  room: string;
  code: string;
  sessionId: number | null;
  startedAt: string | null;
  durationMinutes: number;
};

function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

function savePersistedSession(s: PersistedSession) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function clearPersistedSession() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

function calcRemaining(startedAt: string, durationMinutes: number): number {
  // The backend serializes naive UTC datetimes without a timezone suffix
  // (e.g. "2025-10-08T10:00:00.123456"). Browsers interpret bare ISO strings as
  // LOCAL time, not UTC — causing a 1–2 h offset in France that instantly expires
  // the session. Append Z to force UTC interpretation when no offset is present.
  const utcStr = /(Z|[+-]\d{2}:\d{2})$/.test(startedAt) ? startedAt : startedAt + 'Z';
  const startedMs = new Date(utcStr).getTime();
  if (isNaN(startedMs)) return 0;
  const elapsed = Math.floor((Date.now() - startedMs) / 1000);
  return Math.max(durationMinutes * 60 - elapsed, 0);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();

  // SSR-safe defaults — sessionStorage is loaded in useEffect below.
  const [isActive, setIsActive] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [module, setModule] = React.useState('—');
  const [room, setRoom] = React.useState('—');
  const [code, setCode] = React.useState('—');
  const [sessionId, setSessionId] = React.useState<number | null>(null);
  const [startedAt, setStartedAt] = React.useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = React.useState(90);
  const [remainingSeconds, setRemainingSeconds] = React.useState(0);

  // Restore persisted session after mount (client-only).
  React.useEffect(() => {
    const p = loadPersistedSession();
    if (p?.isActive && p?.startedAt) {
      const remaining = calcRemaining(p.startedAt, p.durationMinutes);
      if (remaining > 0) {
        setModule(p.module);
        setRoom(p.room);
        setCode(p.code);
        setSessionId(p.sessionId);
        setStartedAt(p.startedAt);
        setDurationMinutes(p.durationMinutes);
        setRemainingSeconds(remaining);
        setIsActive(true);
      } else {
        clearPersistedSession();
      }
    }
    setIsHydrated(true);
  }, []);

  // Countdown — recalculates from startedAt each tick to stay accurate.
  React.useEffect(() => {
    if (!isActive || !startedAt) return;

    const interval = setInterval(() => {
      const next = calcRemaining(startedAt, durationMinutes);
      setRemainingSeconds(next);
      if (next === 0) {
        clearPersistedSession();
        setIsActive(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startedAt, durationMinutes]);

  const stopSession = React.useCallback(async () => {
    if (token && sessionId) {
      try {
        await closeSession(token, sessionId);
      } catch {
        // Best-effort: still clear local state.
      }
    }
    clearPersistedSession();
    setIsActive(false);
    setRemainingSeconds(0);
  }, [token, sessionId]);

  const startSession = React.useCallback(
    async (details: {
      moduleId: number;
      moduleCode: string;
      moduleName: string;
      room?: string;
      durationMinutes?: number;
    }) => {
      if (!token) throw new Error('Not authenticated');

      const result = await createSession(token, {
        module_id: details.moduleId,
        duration_minutes: details.durationMinutes ?? 90,
        room: details.room ?? null,
      });

      const newModule = details.moduleCode || details.moduleName;
      const newRoom = result.room ?? details.room ?? '—';
      const newCode = result.share_code;
      const newSessionId = result.session_id;
      const newStartedAt = result.date_time;
      const newDuration = result.duration_minutes;

      setModule(newModule);
      setRoom(newRoom);
      setCode(newCode);
      setSessionId(newSessionId);
      setStartedAt(newStartedAt);
      setDurationMinutes(newDuration);
      setRemainingSeconds(newDuration * 60);
      setIsActive(true);

      savePersistedSession({
        isActive: true,
        module: newModule,
        room: newRoom,
        code: newCode,
        sessionId: newSessionId,
        startedAt: newStartedAt,
        durationMinutes: newDuration,
      });
    },
    [token]
  );

  return (
    <SessionContext.Provider
      value={{
        isActive,
        isHydrated,
        module,
        room,
        code,
        sessionId,
        startedAt,
        durationMinutes,
        remainingSeconds,
        startSession,
        stopSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionState() {
  const context = React.useContext(SessionContext);

  if (!context) {
    throw new Error('useSessionState must be used within <SessionProvider />');
  }

  return context;
}
