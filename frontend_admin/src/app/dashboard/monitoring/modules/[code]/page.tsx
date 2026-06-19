'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { downloadCsv, downloadExcelHtmlTable } from '@/lib/download';
import { useMonitor } from '@/features/admin/monitor/use-monitor';


type SessionRow = {
  dateTime: string;
  teacher: string;
  present: string;
  absent: number;
  rate: number;
};

type StudentRow = {
  name: string;
  level: string;
  absentCount: number;
  isExcluded: boolean;
};

export default function ModuleAttendanceDetailPage() {
  const params = useParams<{ code: string }>();
  const moduleCode = decodeURIComponent(params.code);
  const { data, loading } = useMonitor();

  const moduleData = React.useMemo(() => {
    if (!data) return null;
    for (const level of data.raw.levels) {
      const m = level.modules.find((m) => m.code === moduleCode);
      if (m) return { module: m, levelName: level.name };
    }
    return null;
  }, [data, moduleCode]);

  const sessions = React.useMemo(
    () => (data?.sessions ?? []).filter((s) => s.moduleCode === moduleCode),
    [data, moduleCode]
  );

  const kpis = React.useMemo(() => {
    const total = sessions.length;
    const present = sessions.reduce((a, s) => a + s.presentCount, 0);
    const expected = sessions.reduce((a, s) => a + s.expectedCount, 0);
    const avgRate = expected ? (present / expected) * 100 : 0;
    return { total, present, expected, avgRate };
  }, [sessions]);

  const studentRows: StudentRow[] = React.useMemo(() => {
    if (!data) return [];
    const result: StudentRow[] = [];
    for (const student of data.students) {
      const enrollment = student.enrollments.find((e) => e.moduleName === moduleCode || e.moduleId.toString() === moduleCode);
      if (!enrollment) continue;
      result.push({
        name: student.name,
        level: student.levelName,
        absentCount: enrollment.absentCount,
        isExcluded: enrollment.isExcluded,
      });
    }
    return result;
  }, [data, moduleCode]);

  const sessionTable: SessionRow[] = sessions.slice().reverse().map((s) => ({
    dateTime: new Date(s.startAt).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    teacher: s.teacherName,
    present: `${s.presentCount}/${s.expectedCount}`,
    absent: s.absentCount,
    rate: s.expectedCount ? (s.presentCount / s.expectedCount) * 100 : 0,
  }));

  const sessionsColumns: Array<DataTableColumn<SessionRow>> = [
    { key: 'dateTime', header: 'Date/heure', sortable: true, accessor: (r) => r.dateTime },
    { key: 'teacher', header: 'Intervenant', sortable: true, accessor: (r) => r.teacher },
    { key: 'rate', header: 'Présence %', sortable: true, accessor: (r) => r.rate, cell: (r) => `${r.rate.toFixed(0)}%` },
    { key: 'present', header: 'Présents', sortable: true, accessor: (r) => r.present },
    { key: 'absent', header: 'Absents', sortable: true, accessor: (r) => r.absent },
  ];

  const studentColumns: Array<DataTableColumn<StudentRow>> = [
    { key: 'name', header: 'Nom', sortable: true, accessor: (r) => r.name, cell: (r) => <span className='font-medium'>{r.name}</span> },
    { key: 'level', header: 'Niveau', sortable: true, accessor: (r) => r.level },
    { key: 'absentCount', header: 'Absences', sortable: true, accessor: (r) => r.absentCount },
    { key: 'isExcluded', header: 'Statut', cell: (r) => r.isExcluded ? <Badge variant='destructive'>Exclu</Badge> : <Badge variant='secondary'>Actif</Badge> },
  ];

  const exportModule = (format: 'csv' | 'excel' | 'pdf') => {
    try {
      if (format === 'pdf') { window.print(); return; }
      const headers = ['Module', 'Séances', 'Taux moyen %', 'Étudiants avec données'];
      const exportData = [[moduleCode, kpis.total, kpis.avgRate.toFixed(2), studentRows.length]];
      if (format === 'csv') downloadCsv(`module-${moduleCode}-report.csv`, [headers, ...exportData]);
      else downloadExcelHtmlTable(`module-${moduleCode}-report.xls`, headers, exportData);
      toast.success('Export généré.');
    } catch {
      toast.error('Impossible de générer l\'export.');
    }
  };

  if (!loading && !moduleData) {
    return (
      <PageContainer pageTitle='Détail de présence du module' pageDescription='Module introuvable.'>
        <Card><CardHeader><CardTitle>Module inconnu : {moduleCode}</CardTitle></CardHeader></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      pageTitle='Détail de présence du module'
      pageDescription='Analyse détaillée pour un module spécifique.'
      pageHeaderAction={
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' onClick={() => exportModule('csv')}>Exporter CSV</Button>
          <Button variant='outline' onClick={() => exportModule('excel')}>Exporter Excel</Button>
          <Button variant='outline' onClick={() => exportModule('pdf')}>Exporter PDF</Button>
        </div>
      }
    >
      {loading ? (
        <Skeleton className='h-[600px] w-full' />
      ) : (
        <>
          <Card className='mb-6'>
            <CardHeader>
              <CardTitle>{moduleCode} — {moduleData?.module.name}</CardTitle>
              <CardDescription>Niveau : {moduleData?.levelName} — Intervenants : {moduleData?.module.teachers.map((t) => t.name).join(', ') || '—'}</CardDescription>
            </CardHeader>
          </Card>

          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader className='space-y-1'><CardTitle className='text-sm text-muted-foreground'>Séances réalisées</CardTitle></CardHeader>
              <CardContent><div className='text-2xl font-semibold'>{kpis.total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className='space-y-1'><CardTitle className='text-sm text-muted-foreground'>Taux de présence moyen</CardTitle></CardHeader>
              <CardContent><div className='text-2xl font-semibold'>{kpis.avgRate.toFixed(0)}%</div></CardContent>
            </Card>
            <Card>
              <CardHeader className='space-y-1'><CardTitle className='text-sm text-muted-foreground'>Étudiants exclus</CardTitle></CardHeader>
              <CardContent><div className='text-2xl font-semibold'>{studentRows.filter((r) => r.isExcluded).length}</div></CardContent>
            </Card>
          </div>

          <div className='mt-6 grid gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Liste des séances</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  rows={sessionTable}
                  columns={sessionsColumns}
                  searchPlaceholder='Rechercher des séances…'
                  searchFn={(r, q) => [r.dateTime, r.teacher].some((v) => v.toLowerCase().includes(q))}
                  emptyState='Aucune séance pour ce module.'
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Étudiants</CardTitle>
                <CardDescription>Données d&apos;inscription pour ce module.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  rows={studentRows}
                  columns={studentColumns}
                  searchPlaceholder='Rechercher par nom…'
                  searchFn={(r, q) => r.name.toLowerCase().includes(q)}
                  emptyState='Aucune donnée étudiant pour ce module.'
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  );
}
