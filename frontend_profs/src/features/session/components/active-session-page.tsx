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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
	} from '@/components/ui/table';
	import { QrCodePreview } from './qr-code-preview';
	import { useSessionState } from '@/features/session/session-context';
	import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { getSessionAttendance, type SessionAttendanceResponse } from '@/lib/teacher-api';
import { encodeQrPayload, type HodoryQrPayloadV1 } from '@/lib/qr-payload';

function formatClock(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export default function ActiveSessionPage() {
  const [isEndOpen, setIsEndOpen] = React.useState(false);
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const { token } = useAuth();
  const {
    isActive,
    isHydrated,
    module,
    room,
    code,
    remainingSeconds,
    stopSession,
    sessionId,
    startedAt,
    durationMinutes,
  } = useSessionState();
  const router = useRouter();
  const [attendance, setAttendance] = React.useState<SessionAttendanceResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isHydrated) return;
    if (!isActive) {
      router.push('/dashboard/session');
    }
  }, [isActive, isHydrated, router]);

  React.useEffect(() => {
    if (!token || !sessionId || !isActive) return;
    let cancelled = false;

    const load = async () => {
      try {
        const next = await getSessionAttendance(token, sessionId);
        if (cancelled) return;
        setAttendance(next);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load attendance');
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, sessionId, isActive]);

  const presentStudents = React.useMemo(() => {
    const rows = attendance?.students ?? [];
    return rows
      .filter((row) => String(row.status).toUpperCase() === 'PRESENT')
      .map((row) => ({
        name: row.student?.full_name ?? `Student #${row.attendance_id}`,
        time: formatClock(row.marked_at)
      }));
  }, [attendance]);

  const liveStats = React.useMemo(() => {
    const stats = attendance?.statistics;
    return {
      present: stats?.present ?? 0,
      absent: stats?.absent ?? 0,
      total: stats?.total ?? 0
    };
  }, [attendance]);

  const liveEvents = React.useMemo(() => {
    if (loadError) return [{ message: `Dernière actualisation échouée : ${loadError}` }];
    return [{ message: 'Mise à jour toutes les 5 secondes.' }];
  }, [loadError]);

  const qrValue = React.useMemo(() => {
    const payload: HodoryQrPayloadV1 = {
      v: 1,
      type: 'hodory.attendance.session',
      session: {
        id: sessionId ?? -1,
        code,
        moduleCode: module,
        room,
        startedAt,
        durationMinutes
      },
    };

    return encodeQrPayload(payload);
  }, [sessionId, code, module, room, startedAt, durationMinutes]);

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCurrentList = () => {
    const rows = [
      ['Étudiant', 'Heure'],
      ...presentStudents.map((student) => [student.name, student.time])
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    downloadFile(`session-${code}-present.csv`, csv, 'text/csv');
  };

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Séance active</CardTitle>
          <CardDescription>
            Vue de projection et suivi des présences en direct.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
        <Card className='overflow-hidden'>
          <CardHeader>
            <CardTitle>Panneau de projection</CardTitle>
            <CardDescription>Affichez ceci aux étudiants.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-6'>
            <div className='grid gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 text-center'>
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span>{module}</span>
                {isActive ? (
                  <Badge className='bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'>
                    En cours
                  </Badge>
                ) : (
                  <Badge variant='secondary'>Arrêtée</Badge>
                )}
              </div>
              <div className='text-3xl font-semibold tracking-widest'>
                {code}
              </div>
              <div className='text-sm text-muted-foreground'>Salle {room}</div>
              <div className='text-2xl font-semibold'>
                {formatCountdown(remainingSeconds)} restant(es)
              </div>
            </div>
            <div className='flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white p-4'>
              <QrCodePreview className='h-72 w-72' value={qrValue} />
            </div>
            <div className='flex flex-wrap justify-center gap-2'>
              <Button
                variant='outline'
                onClick={() => setIsProjectOpen(true)}
                disabled={!isActive}
              >
                Mode projection
              </Button>
              <Button
                variant='secondary'
                disabled={!isActive}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                  } catch {
                    // Ignore.
                  }
                }}
              >
                Copier le code
              </Button>
            </div>
            {!isActive ? (
              <div className='rounded-lg border border-border/60 bg-muted/30 p-3 text-center text-sm text-muted-foreground'>
                Séance terminée. La projection et les contrôles en direct sont désactivés.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className='grid gap-6'>
          <Card>
            <CardHeader>
              <CardTitle>État en direct</CardTitle>
              <CardDescription>Compteurs de présence en temps réel.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4 md:grid-cols-3'>
              <div className='rounded-lg border border-border/60 p-3'>
                <p className='text-xs text-muted-foreground'>Présents</p>
                <p className='text-lg font-semibold'>
                  {isActive ? liveStats.present : 0}
                </p>
              </div>
              <div className='rounded-lg border border-border/60 p-3'>
                <p className='text-xs text-muted-foreground'>
                  Absents (non marqués)
                </p>
                <p className='text-lg font-semibold'>
                  {isActive ? liveStats.absent : 0}
                </p>
              </div>
              <div className='rounded-lg border border-border/60 p-3'>
                <p className='text-xs text-muted-foreground'>Total</p>
                <p className='text-lg font-semibold'>
                  {isActive ? liveStats.total : 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Présences confirmées</CardTitle>
              <CardDescription>Étudiants ayant pointé leur présence.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Étudiant</TableHead>
                    <TableHead>Heure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isActive ? (
                    presentStudents.map((student) => (
                      <TableRow key={student.name}>
                        <TableCell className='font-medium'>
                          {student.name}
                        </TableCell>
                        <TableCell>{student.time}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        className='text-muted-foreground'
                        colSpan={2}
                      >
                        Séance terminée.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Événements en direct</CardTitle>
              <CardDescription>Activité récente de la séance.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-2 text-sm'>
              {isActive ? (
                liveEvents.map((event) => (
                  <div
                    key={event.message}
                    className='rounded-lg border border-border/60 bg-muted/30 p-3'
                  >
                    <span className='text-muted-foreground'>
                      {event.message}
                    </span>
                  </div>
                ))
              ) : (
                <div className='rounded-lg border border-border/60 bg-muted/30 p-3 text-muted-foreground'>
                  Aucun événement. Séance terminée.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contrôles</CardTitle>
              <CardDescription>Actions de gestion de la séance.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-wrap gap-2'>
            <Button
              variant='destructive'
              onClick={() => setIsEndOpen(true)}
              disabled={!isActive}
            >
              Terminer la séance
            </Button>
              <Button
                variant='outline'
                disabled={!isActive}
                onClick={exportCurrentList}
              >
                Exporter la liste actuelle
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEndOpen} onOpenChange={setIsEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer cette séance ?</DialogTitle>
            <DialogDescription>
              Les présences seront finalisées et la séance passera en résumé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setIsEndOpen(false)}>
              Annuler
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                stopSession()
                  .catch(() => null)
                  .finally(() => {
                    setIsEndOpen(false);
                    router.push('/dashboard/session');
                  });
              }}
            >
              Arrêter la séance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isProjectOpen} onOpenChange={setIsProjectOpen}>
        <DialogContent className='h-[90vh] w-[90vw] max-w-none'>
          <DialogHeader>
            <DialogTitle>Mode projection</DialogTitle>
            <DialogDescription>
              Grand affichage pour la projection en salle.
            </DialogDescription>
          </DialogHeader>
          <div className='grid h-full gap-6 md:grid-cols-[1.5fr_0.5fr]'>
            <div className='flex items-center justify-center rounded-2xl border border-dashed border-border/60 p-6'>
              <QrCodePreview
                className='h-[70vh] w-[70vh] max-h-[760px] max-w-[760px]'
                value={qrValue}
              />
            </div>
            <div className='grid gap-4'>
              <div className='rounded-xl border border-border/60 bg-muted/30 p-4 text-center'>
                <p className='text-sm text-muted-foreground'>Code de séance</p>
                <p className='text-3xl font-semibold tracking-widest'>
                  {code}
                </p>
              </div>
              <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>
                <p className='text-sm font-medium'>{module}</p>
                <p className='text-muted-foreground text-sm'>
                  Salle {room}
                </p>
                <p className='mt-3 text-lg font-semibold'>
                  {formatCountdown(remainingSeconds)} restant(es)
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsProjectOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
