'use client';

import * as React from 'react';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { downloadCsv, downloadExcelHtmlTable } from '@/lib/download';
import { useMonitor } from '@/features/admin/monitor/use-monitor';

type Row = {
  studentName: string;
  level: string;
  module: string;
  absentCount: number;
  isExcluded: boolean;
};

export default function ExcludedStudentsPage() {
  const { data, loading } = useMonitor();
  const [moduleFilter, setModuleFilter] = React.useState('all');
  const [levelFilter, setLevelFilter] = React.useState('all');

  const allModules = React.useMemo(() => {
    if (!data) return [];
    const names = new Set<string>();
    data.students.forEach((s) => s.enrollments.forEach((e) => names.add(e.moduleName)));
    return Array.from(names).sort();
  }, [data]);

  const allLevels = React.useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.students.map((s) => s.levelName))).sort();
  }, [data]);

  const rows: Row[] = React.useMemo(() => {
    if (!data) return [];
    const result: Row[] = [];
    for (const student of data.students) {
      for (const enrollment of student.enrollments) {
        if (!enrollment.isExcluded) continue;
        if (moduleFilter !== 'all' && enrollment.moduleName !== moduleFilter) continue;
        if (levelFilter !== 'all' && student.levelName !== levelFilter) continue;
        result.push({
          studentName: student.name,
          level: student.levelName,
          module: enrollment.moduleName,
          absentCount: enrollment.absentCount,
          isExcluded: true,
        });
      }
    }
    return result;
  }, [data, moduleFilter, levelFilter]);

  const columns: Array<DataTableColumn<Row>> = [
    { key: 'studentName', header: 'Nom de l\'étudiant', sortable: true, accessor: (r) => r.studentName, cell: (r) => <span className='font-medium'>{r.studentName}</span> },
    { key: 'level', header: 'Niveau', sortable: true, accessor: (r) => r.level },
    { key: 'module', header: 'Module', sortable: true, accessor: (r) => r.module },
    { key: 'absentCount', header: 'Absences', sortable: true, accessor: (r) => r.absentCount },
  ];

  const exportRows = (format: 'csv' | 'excel' | 'pdf') => {
    try {
      if (format === 'pdf') { window.print(); return; }
      const headers = ['Nom de l\'étudiant', 'Niveau', 'Module', 'Absences'];
      const data = rows.map((r) => [r.studentName, r.level, r.module, r.absentCount]);
      if (format === 'csv') downloadCsv('excluded-students.csv', [headers, ...data]);
      else downloadExcelHtmlTable('excluded-students.xls', headers, data);
      toast.success('Export généré.');
    } catch {
      toast.error('Impossible de générer l\'export.');
    }
  };

  return (
    <PageContainer
      pageTitle='Étudiants exclus'
      pageDescription='Étudiants marqués comme exclus dans le système.'
      pageHeaderAction={
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' onClick={() => exportRows('csv')}>Exporter CSV</Button>
          <Button variant='outline' onClick={() => exportRows('excel')}>Exporter Excel</Button>
          <Button variant='outline' onClick={() => exportRows('pdf')}>Exporter PDF</Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Liste</CardTitle>
          <CardDescription>Étudiants avec le flag is_excluded activé dans la base de données.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-0'>
          <div className='grid gap-2'>
            <Label>Module</Label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tous</SelectItem>
                {allModules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-2'>
            <Label>Niveau</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tous</SelectItem>
                {allLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent>
          {loading ? (
            <Skeleton className='h-[360px] w-full' />
          ) : (
            <DataTable
              rows={rows}
              columns={columns}
              searchPlaceholder='Rechercher par nom d\'étudiant ou module…'
              searchFn={(r, q) => [r.studentName, r.module].some((v) => v.toLowerCase().includes(q))}
            />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
