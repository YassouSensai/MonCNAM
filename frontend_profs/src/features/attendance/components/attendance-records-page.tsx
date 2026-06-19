'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { toast } from 'sonner';

import { useAuth } from '@/features/auth/auth-context';
import {
  getMyModules,
  getSessionAttendance,
  getTeacherSessions,
  type MyModulesResponse,
  type SessionAttendanceResponse,
  type TeacherSession
} from '@/lib/teacher-api';

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return (
    Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
  );
}

export default function AttendanceRecordsPage() {
  const { token } = useAuth();
  const [moduleSearch, setModuleSearch] = React.useState('');
  const [modulesResponse, setModulesResponse] =
    React.useState<MyModulesResponse | null>(null);
  const [sessions, setSessions] = React.useState<TeacherSession[]>([]);
  const [selectedModuleCode, setSelectedModuleCode] = React.useState<
    string | null
  >(null);
  const [selectedSessionId, setSelectedSessionId] = React.useState<
    number | null
  >(null);
  const [attendance, setAttendance] =
    React.useState<SessionAttendanceResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);

    Promise.all([getMyModules(token), getTeacherSessions(token)])
      .then(([m, s]) => {
        if (cancelled) return;
        setModulesResponse(m);
        setSessions(s.sessions ?? []);
        const firstCode = m.modules?.[0]?.module_code ?? null;
        setSelectedModuleCode((prev) => prev ?? firstCode);
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to load data.'
        );
      })
      .finally(() => setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [token]);

  const moduleRows = React.useMemo(() => {
    const modules = modulesResponse?.modules ?? [];
    return modules.map((m) => {
      const byModule = sessions.filter((s) => s.module?.code === m.module_code);
      const avgRate = average(
        byModule.map((s) => s.statistics?.attendance_rate ?? 0)
      );
      const excluded = byModule.reduce(
        (sum, s) => sum + (s.statistics?.excluded ?? 0),
        0
      );
      return {
        code: m.module_code,
        name: m.module_name,
        sessions: byModule.length,
        avgRate,
        excluded
      };
    });
  }, [modulesResponse, sessions]);

  const filteredModules = React.useMemo(() => {
    const query = moduleSearch.toLowerCase().trim();
    if (!query) return moduleRows;
    return moduleRows.filter(
      (module) =>
        module.code.toLowerCase().includes(query) ||
        module.name.toLowerCase().includes(query)
    );
  }, [moduleSearch, moduleRows]);

  const sessionsForSelectedModule = React.useMemo(() => {
    if (!selectedModuleCode) return [];
    return sessions
      .filter((s) => s.module?.code === selectedModuleCode)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
      );
  }, [sessions, selectedModuleCode]);

  React.useEffect(() => {
    if (!sessionsForSelectedModule.length) {
      setSelectedSessionId(null);
      setAttendance(null);
      return;
    }
    setSelectedSessionId((prev) => prev ?? sessionsForSelectedModule[0]!.session_id);
  }, [sessionsForSelectedModule]);

  React.useEffect(() => {
    if (!token || !selectedSessionId) return;
    let cancelled = false;
    setAttendance(null);

    getSessionAttendance(token, selectedSessionId)
      .then((result) => {
        if (cancelled) return;
        setAttendance(result);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          error instanceof Error ? error.message : 'Failed to load session.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token, selectedSessionId]);

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportModuleCsv = () => {
    const rows = [
      ['Date/heure', 'Durée (min)', 'Taux (%)', 'Présents/total'],
      ...sessionsForSelectedModule.map((s) => [
        formatDateTime(s.date_time),
        String(s.duration_minutes),
        String(s.statistics?.attendance_rate ?? 0),
        `${s.statistics?.present ?? 0}/${s.statistics?.total ?? 0}`
      ])
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    downloadFile('module-records.csv', csv, 'text/csv');
  };

  const exportModulePdf = () => {
    window.print();
  };

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Relevés de présence</CardTitle>
          <CardDescription>
            Historique des présences par module et détails des séances.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des modules</CardTitle>
          <CardDescription>Métriques de vos modules affectés.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          <div className='grid gap-4 md:grid-cols-[1fr_220px_220px]'>
            <div className='grid gap-2'>
              <Label htmlFor='search'>Rechercher des modules</Label>
              <Input
                id='search'
                placeholder='Rechercher par nom ou code de module'
                value={moduleSearch}
                onChange={(event) => setModuleSearch(event.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Total séances</TableHead>
                <TableHead>Taux moyen</TableHead>
                <TableHead>Exclusions (enregistrements)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-muted-foreground'>
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : filteredModules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-muted-foreground'>
                    Aucun module.
                  </TableCell>
                </TableRow>
              ) : (
                filteredModules.map((module) => (
                  <TableRow
                    key={module.code}
                    className='cursor-pointer'
                    onClick={() => {
                      setSelectedModuleCode(module.code);
                      setSelectedSessionId(null);
                      setAttendance(null);
                    }}
                  >
                    <TableCell className='font-medium'>
                      {module.code} - {module.name}
                      {module.code === selectedModuleCode ? (
                        <Badge className='ml-2' variant='secondary'>
                          Sélectionné
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{module.sessions}</TableCell>
                    <TableCell>{module.avgRate}%</TableCell>
                    <TableCell>{module.excluded}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Détail du module{selectedModuleCode ? ` - ${selectedModuleCode}` : ''}
          </CardTitle>
          <CardDescription>Tendance et métriques par séance.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-6'>
          <Card>
            <CardHeader>
              <CardTitle>Séances</CardTitle>
              <CardDescription>Sélectionnez une séance pour voir les présences.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <Button
                  variant='outline'
                  onClick={exportModuleCsv}
                  disabled={!selectedModuleCode}
                >
                  Exporter les relevés (CSV)
                </Button>
                <Button
                  variant='outline'
                  onClick={exportModulePdf}
                  disabled={!selectedModuleCode}
                >
                  Exporter les relevés (PDF)
                </Button>
              </div>
              <Table className='mt-4'>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/heure</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Taux %</TableHead>
                    <TableHead>Présents/total</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsForSelectedModule.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className='text-muted-foreground'>
                        Aucune séance pour ce module.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessionsForSelectedModule.map((s) => (
                      <TableRow key={s.session_id}>
                        <TableCell className='font-medium'>
                          {formatDateTime(s.date_time)}
                        </TableCell>
                        <TableCell>{s.duration_minutes} min</TableCell>
                        <TableCell>{s.statistics?.attendance_rate ?? 0}%</TableCell>
                        <TableCell>
                          {s.statistics?.present ?? 0}/{s.statistics?.total ?? 0}
                        </TableCell>
                        <TableCell>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => setSelectedSessionId(s.session_id)}
                          >
                            Voir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détail de la séance</CardTitle>
              <CardDescription>Liste d'appel de la séance sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4'>
              {!selectedSessionId ? (
                <p className='text-muted-foreground text-sm'>Sélectionnez une séance.</p>
              ) : !attendance ? (
                <p className='text-muted-foreground text-sm'>Chargement…</p>
              ) : (
                <>
                  <div className='flex flex-wrap gap-2 text-sm'>
                    <Badge variant='secondary'>Code : {attendance.share_code}</Badge>
                    <Badge variant='secondary'>
                      Présents : {attendance.statistics.present}
                    </Badge>
                    <Badge variant='secondary'>
                      Absents : {attendance.statistics.absent}
                    </Badge>
                    <Badge variant='secondary'>
                      Taux : {attendance.statistics.attendance_rate}%
                    </Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Étudiant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Absences</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.students.map((row) => (
                        <TableRow key={row.attendance_id}>
                          <TableCell className='font-medium'>
                            {row.student?.full_name ??
                              row.enrollment?.student_name ??
                              'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge variant='secondary'>{row.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {row.enrollment
                              ? `${row.enrollment.number_of_absences} (${row.enrollment.number_of_absences_justified} justifiées)`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

