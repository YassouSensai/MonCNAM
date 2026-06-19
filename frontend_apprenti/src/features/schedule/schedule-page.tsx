'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { StudentProfile } from '@/types';
import { cn } from '@/lib/utils';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

const DAYS: { key: string; label: string }[] = [
  { key: 'Monday', label: 'Lundi' },
  { key: 'Tuesday', label: 'Mardi' },
  { key: 'Wednesday', label: 'Mercredi' },
  { key: 'Thursday', label: 'Jeudi' },
  { key: 'Friday', label: 'Vendredi' },
  { key: 'Saturday', label: 'Samedi' },
];

const DAY_KEYS = DAYS.map((d) => d.key);

function getTodayKey(): string {
  const map: Record<number, string> = {
    0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
    4: 'Thursday', 5: 'Friday', 6: 'Saturday',
  };
  return map[new Date().getDay()] ?? 'Monday';
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 4);
  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

function isCurrentWeek(weekStart: Date): boolean {
  const now = startOfWeekMonday(new Date());
  return weekStart.getTime() === now.getTime();
}

export default function SchedulePage() {
  const { user, token } = useAuth();
  const todayKey = getTodayKey();

  const [weekOffset, setWeekOffset] = React.useState(0);
  const [activeDay, setActiveDay] = React.useState<string>(
    DAY_KEYS.includes(todayKey) ? todayKey : 'Monday'
  );

  const weekStart = React.useMemo(() => {
    const base = startOfWeekMonday(new Date());
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekStartIso = toIso(weekStart);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['schedule', user?.id, weekStartIso],
    queryFn: () =>
      apiFetch<StudentProfile>(`/student/profile?week_start=${weekStartIso}`, { token: token! }).then(
        (r) => r.data
      ),
    enabled: !!token,
  });

  const sdays = Array.isArray(profile?.sdays) ? profile.sdays : [];

  const sessions = sdays.filter((s) => {
    const dayVal = (s.day ?? '').trim();
    return dayVal === activeDay;
  });

  const hasCourseOnDay = (dayKey: string) =>
    sdays.some((s) => (s.day ?? '').trim() === dayKey);

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border bg-card p-6'>
        <h2 className='font-semibold text-lg mb-1'>Emploi du temps</h2>
        <p className='text-sm text-muted-foreground'>
          Sélectionnez un jour pour voir vos cours.
        </p>
      </div>

      {/* Week navigation */}
      <div className='flex items-center gap-3'>
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className='rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors flex items-center gap-1'
        >
          <IconChevronLeft className='h-4 w-4' />
          Sem. précédente
        </button>
        <div className='flex-1 text-center'>
          <span className='text-sm font-medium'>{formatWeekRange(weekStart)}</span>
          {isCurrentWeek(weekStart) && (
            <span className='ml-2 text-xs text-primary font-semibold'>• Cette semaine</span>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className='rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors flex items-center gap-1'
        >
          Sem. suivante
          <IconChevronRight className='h-4 w-4' />
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className='rounded-lg border border-primary/50 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors'
          >
            Aujourd&apos;hui
          </button>
        )}
      </div>

      {/* Day selector */}
      <div className='flex flex-wrap gap-2'>
        {DAYS.map((d) => {
          const hasCourse = hasCourseOnDay(d.key);
          const isToday = d.key === todayKey && isCurrentWeek(weekStart);
          return (
            <button
              key={d.key}
              onClick={() => setActiveDay(d.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors border relative',
                activeDay === d.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-accent border-border',
                isToday && activeDay !== d.key && 'border-primary/50 text-primary'
              )}
            >
              {d.label}
              {isToday && (
                <span className='ml-1.5 text-xs opacity-70'>• Aujourd&apos;hui</span>
              )}
              {hasCourse && activeDay !== d.key && (
                <span className='absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary' />
              )}
            </button>
          );
        })}
      </div>

      {/* Sessions */}
      <div className='rounded-xl border bg-card'>
        {isLoading ? (
          <div className='p-8 text-center text-muted-foreground text-sm'>
            Chargement…
          </div>
        ) : sessions.length === 0 ? (
          <div className='p-8 text-center text-muted-foreground text-sm'>
            Aucun cours ce jour.
          </div>
        ) : (
          <div className='divide-y'>
            <div className='grid grid-cols-3 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
              <span>Horaire</span>
              <span>Module</span>
              <span>Salle</span>
            </div>
            {sessions.map((s) => (
              <div
                key={s.id}
                className='grid grid-cols-3 px-4 py-4 hover:bg-accent/50 transition-colors'
              >
                <span className='text-sm font-medium text-primary'>{s.time}</span>
                <div>
                  <p className='text-sm font-medium'>{s.module_name}</p>
                  <p className='text-xs text-muted-foreground'>{s.module_code}</p>
                </div>
                <span className='text-sm text-muted-foreground'>
                  {s.room ? `Salle ${s.room}` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLoading && sdays.length === 0 && (
        <div className='rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200'>
          Aucun cours cette semaine. Consultez une autre semaine ou contactez l&apos;administration.
        </div>
      )}
    </div>
  );
}
