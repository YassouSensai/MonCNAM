'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';
import {
  getMyModules,
  getTeacherSessions,
  getTeacherSchedule,
  type TeacherModuleSummary,
  type TeacherSession,
  type TeacherScheduleSDay,
} from '@/lib/teacher-api';

// ── Helpers date ─────────────────────────────────────────────
function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 4);
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDayLabel(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(date);
}

function toTimeLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(date);
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DAY_LABELS: Record<string, string> = {
  Monday: 'Lundi', Tuesday: 'Mardi', Wednesday: 'Mercredi',
  Thursday: 'Jeudi', Friday: 'Vendredi', Saturday: 'Samedi', Sunday: 'Dimanche',
};

// ─────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const { token } = useAuth();
  const [modules, setModules] = React.useState<TeacherModuleSummary[]>([]);
  const [sessions, setSessions] = React.useState<TeacherSession[]>([]);
  const [sdays, setSdays] = React.useState<TeacherScheduleSDay[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [weekOffset, setWeekOffset] = React.useState(0);

  const weekStart = React.useMemo(() => {
    return addDays(startOfWeekMonday(new Date()), weekOffset * 7);
  }, [weekOffset]);
  const weekStartIso = toIso(weekStart);
  const isCurrentWeek = weekOffset === 0;

  // Load sessions + modules once
  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getMyModules(token), getTeacherSessions(token)])
      .then(([m, s]) => {
        if (cancelled) return;
        setModules(m.modules ?? []);
        setSessions(s.sessions ?? []);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  // Load schedule sdays whenever week changes
  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getTeacherSchedule(token, weekStartIso).then((res) => {
      if (cancelled) return;
      setSdays(res.sdays ?? []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [token, weekStartIso]);

  const moduleIdByCode = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const m of modules) map.set(m.module_code, m.module_id);
    return map;
  }, [modules]);

  // Sessions view — basée sur les sessions datées
  const weekSessionStart = React.useMemo(() => startOfWeekMonday(weekStart), [weekStart]);
  const weekDays = React.useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekSessionStart, i)),
    [weekSessionStart]
  );

  const sessionsThisWeek = React.useMemo(() => {
    const start = weekSessionStart.getTime();
    const end = addDays(weekSessionStart, 7).getTime();
    return sessions.filter((s) => {
      const t = new Date(s.date_time).getTime();
      return t >= start && t < end;
    });
  }, [sessions, weekSessionStart]);

  const weekSchedule = React.useMemo(() => {
    return weekDays.map((day) => {
      const slots = sessionsThisWeek
        .filter((s) => isSameDay(new Date(s.date_time), day))
        .map((s) => ({
          time: toTimeLabel(new Date(s.date_time)),
          moduleCode: s.module.code,
          room: s.room ?? s.module.room ?? '—',
          duration: `${s.duration_minutes} min`,
          moduleId: moduleIdByCode.get(s.module.code) ?? null,
          sessionId: s.session_id,
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
      return { day: toDayLabel(day), slots };
    });
  }, [weekDays, sessionsThisWeek, moduleIdByCode]);

  const todaysClasses = React.useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => isSameDay(new Date(s.date_time), now))
      .map((s) => ({
        time: toTimeLabel(new Date(s.date_time)),
        moduleCode: s.module.code,
        room: s.room ?? s.module.room ?? '—',
        duration: `${s.duration_minutes} min`,
        moduleId: moduleIdByCode.get(s.module.code) ?? null,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [sessions, moduleIdByCode]);

  // Sdays view — emploi du temps de l'admin
  const sdaysByDay = React.useMemo(() => {
    const map: Record<string, TeacherScheduleSDay[]> = {};
    for (const day of DAYS_OF_WEEK) map[day] = [];
    for (const s of sdays) {
      if (s.day && map[s.day]) map[s.day].push(s);
    }
    for (const day of DAYS_OF_WEEK) {
      map[day].sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [sdays]);

  const activeDays = DAYS_OF_WEEK.filter((d) => (sdaysByDay[d]?.length ?? 0) > 0);

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      {/* Week navigation */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between flex-wrap gap-3'>
            <div>
              <CardTitle>Emploi du temps</CardTitle>
              <CardDescription className='mt-1'>
                Semaine du {formatWeekRange(weekStart)}
                {isCurrentWeek && <span className='ml-2 text-primary font-medium'>• Cette semaine</span>}
              </CardDescription>
            </div>
            <div className='flex items-center gap-1'>
              <Button size='icon' variant='outline' onClick={() => setWeekOffset((w) => w - 1)}>
                <ChevronLeft className='h-4 w-4' />
              </Button>
              {weekOffset !== 0 && (
                <Button size='sm' variant='ghost' onClick={() => setWeekOffset(0)}>
                  Aujourd&apos;hui
                </Button>
              )}
              <Button size='icon' variant='outline' onClick={() => setWeekOffset((w) => w + 1)}>
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue='planning'>
        <TabsList>
          <TabsTrigger value='planning'>Planning</TabsTrigger>
          <TabsTrigger value='sessions'>Séances créées</TabsTrigger>
        </TabsList>

        {/* ── Onglet Planning (sdays admin) ──────────────────────── */}
        <TabsContent value='planning' className='mt-4'>
          {sdays.length === 0 && !isLoading ? (
            <Card>
              <CardContent className='p-8 text-center text-muted-foreground text-sm'>
                Aucun cours planifié pour cette semaine.
              </CardContent>
            </Card>
          ) : (
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {(activeDays.length > 0 ? activeDays : DAYS_OF_WEEK.slice(0, 5)).map((dayKey) => {
                const slots = sdaysByDay[dayKey] ?? [];
                return (
                  <div key={dayKey} className='rounded-xl border border-border/60 bg-muted/30 p-4'>
                    <div className='flex items-center justify-between mb-3'>
                      <p className='text-sm font-medium'>{DAY_LABELS[dayKey] ?? dayKey}</p>
                      <Badge variant='secondary'>{slots.length}</Badge>
                    </div>
                    <div className='grid gap-2 text-sm'>
                      {slots.length === 0 ? (
                        <p className='text-muted-foreground text-xs'>Aucune séance</p>
                      ) : (
                        slots.map((slot) => {
                          const modId = slot.module_id
                            ? (moduleIdByCode.get(slot.module_code ?? '') ?? null)
                            : null;
                          return (
                            <div
                              key={slot.id}
                              className='rounded-lg border border-border/60 bg-background p-3'
                            >
                              <p className='font-medium text-xs'>
                                {slot.module_code} — {slot.room ?? '—'}
                                {slot.week_start && (
                                  <span className='ml-1 text-primary text-[10px]'>✦ Cette semaine</span>
                                )}
                              </p>
                              <p className='text-muted-foreground text-xs mt-0.5'>{slot.time}</p>
                              <Button asChild variant='outline' size='sm' className='mt-2 w-full'>
                                <Link
                                  href={
                                    modId
                                      ? `/dashboard/session?moduleId=${modId}&room=${encodeURIComponent(slot.room ?? '')}`
                                      : '/dashboard/session'
                                  }
                                >
                                  Démarrer la séance
                                </Link>
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Onglet Séances créées (existant) ───────────────────── */}
        <TabsContent value='sessions' className='mt-4'>
          <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
            <Card>
              <CardHeader>
                <CardTitle>Vue semaine</CardTitle>
                <CardDescription>Séances enregistrées regroupées par jour.</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                {weekSchedule.map((day) => (
                  <div
                    key={day.day}
                    className='rounded-xl border border-border/60 bg-muted/30 p-4'
                  >
                    <div className='flex items-center justify-between'>
                      <p className='text-sm font-medium'>{day.day}</p>
                      <Badge variant='secondary'>{day.slots.length}</Badge>
                    </div>
                    <div className='mt-3 grid gap-3 text-sm'>
                      {day.slots.length === 0 ? (
                        <p className='text-muted-foreground'>
                          {isLoading ? 'Chargement…' : 'Aucune séance'}
                        </p>
                      ) : (
                        day.slots.map((slot) => (
                          <div
                            key={`${slot.moduleCode}-${slot.time}`}
                            className='rounded-lg border border-border/60 bg-background p-3'
                          >
                            <p className='font-medium'>
                              {slot.moduleCode} - {slot.room}
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              {slot.time} - {slot.duration}
                            </p>
                            <Button asChild variant='outline' size='sm' className='mt-2'>
                              <Link
                                href={
                                  slot.moduleId
                                    ? `/dashboard/session?moduleId=${slot.moduleId}&room=${encodeURIComponent(slot.room)}`
                                    : '/dashboard/session'
                                }
                              >
                                Démarrer la séance
                              </Link>
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aujourd&apos;hui</CardTitle>
                <CardDescription>Vue liste rapide.</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3'>
                {isLoading ? (
                  <p className='text-muted-foreground text-sm'>Chargement…</p>
                ) : todaysClasses.length === 0 ? (
                  <p className='text-muted-foreground text-sm'>Aucune séance aujourd'hui.</p>
                ) : (
                  todaysClasses.map((slot) => (
                    <div
                      key={`${slot.moduleCode}-${slot.time}`}
                      className='rounded-xl border border-border/60 p-4'
                    >
                      <p className='text-sm font-medium'>
                        {slot.moduleCode} - {slot.room}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        {slot.time} - {slot.duration}
                      </p>
                      <Button asChild variant='outline' size='sm' className='mt-2'>
                        <Link
                          href={
                            slot.moduleId
                              ? `/dashboard/session?moduleId=${slot.moduleId}&room=${encodeURIComponent(slot.room)}`
                              : '/dashboard/session'
                          }
                        >
                          Démarrer la séance
                        </Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
