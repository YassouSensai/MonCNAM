'use client';

import * as React from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { useMonitor } from '@/features/admin/monitor/use-monitor';

type Row = {
  module: string;
  teacher: string;
  startTime: string;
  present: number;
  expected: number;
  rate: number;
};

export default function ActiveSessionsPage() {
  const { data, loading } = useMonitor();
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<Date>(() => new Date());

  React.useEffect(() => {
    const interval = window.setInterval(() => setLastUpdatedAt(new Date()), 10000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!loading) setLastUpdatedAt(new Date());
  }, [loading]);

  const today = new Date().toISOString().slice(0, 10);
  const rows: Row[] = (data?.sessions ?? [])
    .filter((s) => s.status === 'active' && s.startAt.startsWith(today))
    .map((s) => ({
      module: s.moduleCode,
      teacher: s.teacherName,
      startTime: new Date(s.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      present: s.presentCount,
      expected: s.expectedCount,
      rate: s.expectedCount ? (s.presentCount / s.expectedCount) * 100 : 0,
    }));

  const columns: Array<DataTableColumn<Row>> = [
    { key: 'module', header: 'Module', sortable: true, accessor: (r) => r.module, cell: (r) => <span className='font-medium'>{r.module}</span> },
    { key: 'teacher', header: 'Intervenant', sortable: true, accessor: (r) => r.teacher },
    { key: 'startTime', header: 'Heure de début', sortable: true, accessor: (r) => r.startTime },
    { key: 'status', header: 'Statut', cell: () => <Badge className='bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400'>Actif</Badge> },
    { key: 'present', header: 'Présents enregistrés', sortable: true, accessor: (r) => r.present },
    { key: 'expected', header: 'Total attendu', sortable: true, accessor: (r) => r.expected },
    { key: 'rate', header: 'Présence %', sortable: true, accessor: (r) => r.rate, cell: (r) => `${r.rate.toFixed(0)}%` },
  ];

  return (
    <PageContainer pageTitle='Séances actives aujourd&apos;hui' pageDescription='Liste en temps réel des séances actives (actualisation automatique toutes les 30 s).'>
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle>Temps réel</CardTitle>
          <CardDescription>
            Dernière mise à jour{' '}
            <span className='font-medium text-foreground'>
              {lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Séances</CardTitle>
          <CardDescription>Actualisation automatique toutes les 30 secondes.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className='h-[360px] w-full' />
          ) : (
            <DataTable
              rows={rows}
              columns={columns}
              searchPlaceholder='Rechercher par module ou intervenant…'
              searchFn={(r, q) => [r.module, r.teacher].some((v) => v.toLowerCase().includes(q))}
              emptyState='Aucune séance active en ce moment.'
            />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
