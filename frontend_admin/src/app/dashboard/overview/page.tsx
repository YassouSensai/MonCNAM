'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { useMonitor } from '@/features/admin/monitor/use-monitor';
import { resolveDateRange, type DateRangePreset } from '@/features/admin/filters/date-range';

type ModuleSummaryRow = {
  moduleCode: string;
  moduleName: string;
  teachers: string;
  sessionsCount: number;
  avgAttendance: number;
};

function clampPercent(v: number) {
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
}

export default function AttendanceMonitoringDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading } = useMonitor();

  const preset = (searchParams.get('range') as DateRangePreset | null) ?? 'month';
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const { start, end, label: rangeLabel } = React.useMemo(
    () => resolveDateRange({ preset, from, to }),
    [preset, from, to]
  );

  const sessionsInRange = React.useMemo(() => {
    if (!data) return [];
    const startMs = start.getTime();
    const endMs = end.getTime();
    return data.sessions.filter((s) => {
      const ms = new Date(s.startAt).getTime();
      return ms >= startMs && ms <= endMs;
    });
  }, [data, start, end]);

  const today = new Date().toISOString().slice(0, 10);
  const activeSessions = React.useMemo(
    () => (data?.sessions ?? []).filter((s) => s.status === 'active' && s.startAt.startsWith(today)),
    [data, today]
  );
  const sessionsToday = React.useMemo(
    () => (data?.sessions ?? []).filter((s) => s.startAt.startsWith(today)),
    [data, today]
  );

  const todayAttendanceRate = React.useMemo(() => {
    const totals = sessionsToday.reduce((a, s) => { a.expected += s.expectedCount; a.present += s.presentCount; return a; }, { expected: 0, present: 0 });
    return totals.expected ? (totals.present / totals.expected) * 100 : 0;
  }, [sessionsToday]);

  const overallRate = React.useMemo(() => {
    const totals = sessionsInRange.reduce((a, s) => { a.expected += s.expectedCount; a.present += s.presentCount; return a; }, { expected: 0, present: 0 });
    return totals.expected ? (totals.present / totals.expected) * 100 : 0;
  }, [sessionsInRange]);

  const attendanceTrend = React.useMemo(() => {
    const byDate = new Map<string, { expected: number; present: number; sessions: number }>();
    for (const s of sessionsInRange) {
      const key = s.startAt.slice(0, 10);
      const current = byDate.get(key) ?? { expected: 0, present: 0, sessions: 0 };
      current.expected += s.expectedCount;
      current.present += s.presentCount;
      current.sessions += 1;
      byDate.set(key, current);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, t]) => ({ date, rate: t.expected ? (t.present / t.expected) * 100 : 0, present: t.present, expected: t.expected, sessions: t.sessions }));
  }, [sessionsInRange]);

  const modulesSummary = React.useMemo<ModuleSummaryRow[]>(() => {
    const byCode = new Map<string, { name: string; teachers: Set<string>; expected: number; present: number; sessions: number }>();
    for (const s of sessionsInRange) {
      const current = byCode.get(s.moduleCode) ?? { name: s.moduleName, teachers: new Set(), expected: 0, present: 0, sessions: 0 };
      current.teachers.add(s.teacherName);
      current.expected += s.expectedCount;
      current.present += s.presentCount;
      current.sessions += 1;
      byCode.set(s.moduleCode, current);
    }
    return Array.from(byCode.entries()).map(([code, v]) => ({
      moduleCode: code,
      moduleName: v.name,
      teachers: Array.from(v.teachers).join(', ') || '—',
      sessionsCount: v.sessions,
      avgAttendance: clampPercent(v.expected ? (v.present / v.expected) * 100 : 0),
    }));
  }, [sessionsInRange]);

  const lowestAttendance = React.useMemo(
    () => modulesSummary.slice().sort((a, b) => a.avgAttendance - b.avgAttendance).slice(0, 6),
    [modulesSummary]
  );

  const moduleSummaryColumns: Array<DataTableColumn<ModuleSummaryRow>> = [
    { key: 'moduleName', header: 'Module', sortable: true, accessor: (r) => r.moduleName, cell: (r) => <span className='font-medium'>{r.moduleName}</span> },
    { key: 'teachers', header: 'Intervenant' },
    { key: 'sessionsCount', header: 'Séances', sortable: true, accessor: (r) => r.sessionsCount },
    {
      key: 'avgAttendance', header: 'Taux moyen %', sortable: true, accessor: (r) => r.avgAttendance,
      cell: (r) => {
        const critical = r.avgAttendance < 70;
        return (
          <div className='flex items-center gap-2'>
            <span className={critical ? 'text-destructive font-semibold' : 'font-medium'}>{r.avgAttendance.toFixed(0)}%</span>
            {critical ? <Badge variant='destructive'>Critique</Badge> : null}
          </div>
        );
      }
    },
  ];

  const summary = data?.summary;

  return (
    <PageContainer
      pageTitle='Tableau de bord'
      pageDescription='Surveillez l&apos;activité de présence avec des tendances et des analyses détaillées.'
    >
      <div className='relative mb-4 overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-amber-50 via-white to-emerald-50 p-6 shadow-sm dark:from-amber-950/30 dark:via-background dark:to-emerald-950/20'>
        <div className='absolute -left-16 -top-16 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/10' />
        <div className='absolute -bottom-16 right-10 h-44 w-44 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-500/10' />
        <div className='relative z-10 grid gap-4 md:grid-cols-[1.3fr_0.7fr]'>
          <div>
            <h2 className='text-2xl font-semibold text-slate-900 dark:text-slate-100'>Centre de contrôle administration</h2>
            <p className='text-muted-foreground mt-2 text-sm'>Surveillez les présences, gérez les comptes et affectez les modules/emplois du temps.</p>
          </div>
          <div className='flex flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>Activité aujourd&apos;hui</span>
              <Badge variant={activeSessions.length ? 'default' : 'secondary'}>En direct : {activeSessions.length}</Badge>
            </div>
            <div className='grid gap-2 text-sm'>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>Séances aujourd&apos;hui</span>
                <span className='font-medium'>{sessionsToday.length}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>Taux de présence aujourd&apos;hui</span>
                <span className='font-medium'>{clampPercent(todayAttendanceRate).toFixed(0)}%</span>
              </div>
            </div>
            <Button asChild size='sm' variant='outline'>
              <Link href='/dashboard/monitoring/active-sessions'>Voir les séances actives</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {[
          { title: 'Total étudiants', value: summary?.total_students ?? 0, href: '/dashboard/students' },
          { title: 'Total intervenants', value: summary?.total_teachers ?? 0, href: '/dashboard/teachers' },
          { title: 'Séances actives aujourd\'hui', value: activeSessions.length, href: '/dashboard/monitoring/active-sessions' },
          { title: 'Taux de présence global', value: `${clampPercent(overallRate).toFixed(0)}%`, href: undefined },
        ].map((kpi) => (
          <Card key={kpi.title} className={kpi.href ? 'transition-colors hover:bg-accent/40' : undefined}>
            <CardHeader className='space-y-1'><CardTitle className='text-sm text-muted-foreground'>{kpi.title}</CardTitle></CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{loading ? <Skeleton className='h-7 w-24' /> : kpi.value}</div>
              {kpi.href ? <Link href={kpi.href} className='mt-2 inline-block text-xs font-medium text-primary'>Ouvrir</Link> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='mt-6'>
        <Card>
          <CardHeader className='flex flex-row items-start justify-between gap-3'>
            <div>
              <CardTitle>Résumé des modules</CardTitle>
              <CardDescription>Cliquez sur une ligne pour voir le détail de présence.</CardDescription>
            </div>
            <div className='flex flex-col gap-1'>
              <span className='text-xs text-muted-foreground'>Plage de dates</span>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <Select value={preset} onValueChange={(value) => {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('range', value);
                  if (value !== 'custom') { next.delete('from'); next.delete('to'); }
                  router.push(`/dashboard/overview?${next.toString()}`);
                }}>
                  <SelectTrigger className='h-9 w-full sm:w-[160px]'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='today'>Aujourd&apos;hui</SelectItem>
                    <SelectItem value='week'>Cette semaine</SelectItem>
                    <SelectItem value='month'>Ce mois-ci</SelectItem>
                  </SelectContent>
                </Select>
                <div className='flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground sm:w-[280px]'>
                  {rangeLabel}: {start.toISOString().slice(0, 10)} → {end.toISOString().slice(0, 10)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-[360px] w-full' />
            ) : (
              <DataTable
                rows={modulesSummary}
                columns={moduleSummaryColumns}
                searchPlaceholder='Rechercher par nom ou intervenant…'
                onRowClick={(row) => router.push(`/dashboard/monitoring/modules/${encodeURIComponent(row.moduleCode)}`)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
