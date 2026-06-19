'use client';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceProvider } from '@/features/overview/components/attendance-context';
import { useSessionState } from '@/features/session/session-context';
import { useAuth } from '@/features/auth/auth-context';
import { usePendingJustificationsCount } from '@/features/justifications/use-pending-justifications-count';
import { getMyModules, getTeacherSessions, type TeacherSession } from '@/lib/teacher-api';
import Link from 'next/link';
import type { ReactNode } from 'react';
import * as React from 'react';

export default function OverViewLayout({
  bar_stats: _bar_stats,
  area_stats: _area_stats,
}: {
  bar_stats: ReactNode;
  area_stats: ReactNode;
}) {
  const { isActive, code, module, room, remainingSeconds } = useSessionState();
  const { token } = useAuth();
  const pendingJustifications = usePendingJustificationsCount();
  const remainingMinutes = Math.max(Math.ceil(remainingSeconds / 60), 0);
  const [todaySessionsCount, setTodaySessionsCount] = React.useState<number | null>(null);
  const [nextSessionLabel, setNextSessionLabel] = React.useState<string>('—');
  const [defaultModule, setDefaultModule] = React.useState('COMPIL');
  const [excludedRecordsCount, setExcludedRecordsCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [modules, sessionsResponse] = await Promise.all([
          getMyModules(token),
          getTeacherSessions(token)
        ]);
        if (cancelled) return;

        const firstModuleCode = modules.modules?.[0]?.module_code;
        if (firstModuleCode) setDefaultModule(firstModuleCode);

        const now = new Date();
        const sameDay = (a: Date, b: Date) =>
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate();

        const sessions: TeacherSession[] = sessionsResponse.sessions ?? [];
        const todays = sessions.filter((s) => sameDay(new Date(s.date_time), now));
        setTodaySessionsCount(todays.length);

        const upcoming = sessions
          .filter((s) => new Date(s.date_time).getTime() > now.getTime())
          .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())[0];

        if (upcoming) {
          const time = new Intl.DateTimeFormat('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(upcoming.date_time));
          setNextSessionLabel(`${upcoming.module.code} - ${time}`);
        } else {
          setNextSessionLabel('Aucune séance à venir');
        }

        // This is a count of excluded attendance records across sessions (not unique students).
        const excluded = sessions.reduce((sum, s) => sum + (s.statistics?.excluded ?? 0), 0);
        setExcludedRecordsCount(excluded);
      } catch {
        if (cancelled) return;
        setTodaySessionsCount(null);
        setNextSessionLabel('—');
        setExcludedRecordsCount(null);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const summaryCards = [
    {
      title: "Séances aujourd'hui",
      value: todaySessionsCount === null ? '—' : String(todaySessionsCount),
      meta: `Prochaine : ${nextSessionLabel}`
    },
    {
      title: 'Séance active',
      value: isActive ? `${module} - Salle ${room}` : 'Aucune séance active',
      meta: isActive ? `${remainingMinutes} min restantes` : 'Arrêtée'
    },
    {
      title: 'Justificatifs en attente',
      value:
        pendingJustifications === null ? '—' : String(pendingJustifications),
      meta: 'Demandes à traiter'
    },
    {
      title: 'Exclusions (relevés)',
      value: excludedRecordsCount === null ? '—' : String(excludedRecordsCount),
      meta: 'Sur l\'ensemble des séances'
    }
  ];

  return (
    <AttendanceProvider defaultModule={defaultModule}>
      <PageContainer
        pageTitle='Tableau de bord'
        pageDescription='Suivi des présences, sessions en direct et actions rapides.'
        pageHeaderAction={
          <div className='flex flex-wrap gap-2'>
            <Button asChild>
              <Link href='/dashboard/session'>Démarrer une séance</Link>
            </Button>
            <Button asChild variant='outline'>
              <Link href='/dashboard/attendance'>Voir les présences</Link>
            </Button>
          </div>
        }
      >
        <div className='relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-amber-50 via-white to-emerald-50 p-6 shadow-sm'>
          <div className='absolute -left-16 -top-16 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl' />
          <div className='absolute -bottom-16 right-10 h-44 w-44 rounded-full bg-amber-200/30 blur-3xl' />
          <div className='relative z-10 grid gap-4 md:grid-cols-[1.3fr_0.7fr]'>
            <div>
              <h2 className='text-2xl font-semibold text-slate-900 dark:text-slate-900'>
                Espace de gestion pédagogique
              </h2>
	              <p className='text-muted-foreground mt-2 text-sm'>
	                Suivez les présences, lancez des séances et traitez les justificatifs depuis un seul endroit.
	              </p>
	            </div>
            <div className='flex flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>Séance active</span>
                {isActive ? (
                  <Badge className='bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'>
                    En cours
                  </Badge>
                ) : (
                  <Badge variant='secondary'>Arrêtée</Badge>
                )}
              </div>
              <div className='text-sm text-muted-foreground'>
                {isActive ? `${module} - Salle ${room}` : 'Aucune séance active'}
              </div>
              {isActive ? (
                <div className='text-xs font-medium tracking-widest text-foreground'>
                  {code}
                </div>
              ) : null}
              <div className='text-lg font-semibold'>
                {isActive ? `${remainingMinutes} minutes restantes` : 'Aucune séance active'}
              </div>
              {isActive ? (
                <Button asChild size='sm' variant='outline'>
                  <Link href='/dashboard/active-session'>Voir la séance en direct</Link>
                </Button>
              ) : (
                <Button asChild size='sm' variant='outline'>
                  <Link href='/dashboard/session'>Créer une séance</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {summaryCards.map((card) => (
            <Card key={card.title}>
              <CardHeader>
                <CardTitle className='text-sm text-muted-foreground'>
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-xl font-semibold'>{card.value}</div>
                <p className='text-muted-foreground mt-1 text-xs'>
                  {card.meta}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

      </PageContainer>
    </AttendanceProvider>
  );
}
