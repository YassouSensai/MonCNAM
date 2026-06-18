'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import PageContainer from '@/components/layout/page-container';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { cn } from '@/lib/utils';
import {
  fetchLevelsWithSchedule,
  createScheduleForLevel,
  addSday,
  updateSday,
  deleteSday,
  type ApiLevelWithSchedule,
  type ApiSDay,
} from '@/lib/admin-api';

const SCHEDULE_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const DAY_LABELS: Record<string, string> = {
  Sunday: 'Dimanche',
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
};
type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

const SCHEDULE_SLOTS = [
  '08:00-09:30',
  '09:30-11:00',
  '11:00-12:30',
  '12:30-14:00',
  '14:00-15:30',
  '15:30-17:00',
] as const;
type ScheduleSlot = (typeof SCHEDULE_SLOTS)[number];

type CellKey = { day: ScheduleDay; time: ScheduleSlot };

// ── Helpers date ────────────────────────────────────────────
function startOfWeekMonday(d: Date): Date {
  const day = new Date(d);
  const dow = day.getDay(); // 0 = dim
  const diff = (dow + 6) % 7;
  day.setDate(day.getDate() - diff);
  day.setHours(0, 0, 0, 0);
  return day;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 4);
  const fmt = (x: Date) => x.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

// ─────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const [levels, setLevels] = React.useState<ApiLevelWithSchedule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedLevelId, setSelectedLevelId] = React.useState<number | null>(null);

  // Mode semaine : weekOffset=null → template, sinon semaine relative à aujourd'hui
  const [weekOffset, setWeekOffset] = React.useState<number | null>(null);

  const weekStart = React.useMemo(() => {
    if (weekOffset === null) return null;
    return addDays(startOfWeekMonday(new Date()), weekOffset * 7);
  }, [weekOffset]);

  const weekStartIso = weekStart ? toIso(weekStart) : undefined;

  const [cellOpen, setCellOpen] = React.useState(false);
  const [cellKey, setCellKey] = React.useState<CellKey | null>(null);
  const [moduleDraft, setModuleDraft] = React.useState<string>('__empty__');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async (iso?: string) => {
    try {
      const lvls = await fetchLevelsWithSchedule(iso);
      setLevels(lvls);
      setSelectedLevelId((prev) => prev ?? (lvls.length ? lvls[0]!.id : null));
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(weekStartIso); }, [weekStartIso]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedLevel = levels.find((l) => l.id === selectedLevelId) ?? null;
  const schedule = selectedLevel?.schedule ?? null;
  const modulesForLevel = selectedLevel?.modules ?? [];

  const sdayAt = (day: ScheduleDay, time: ScheduleSlot): ApiSDay | null => {
    if (!schedule) return null;
    return schedule.sdays.find((s) => s.day === day && s.time === time) ?? null;
  };

  // Indique si un sday affiché est un override de semaine (non template)
  const isOverride = (sday: ApiSDay | null) => sday?.week_start != null;

  const openCell = (day: ScheduleDay, time: ScheduleSlot) => {
    setCellKey({ day, time });
    const existing = sdayAt(day, time);
    setModuleDraft(existing ? existing.module_id.toString() : '__empty__');
    setCellOpen(true);
  };

  const handleCreateSchedule = async () => {
    if (!selectedLevelId || schedule) { toast.info('Un emploi du temps existe déjà pour ce niveau.'); return; }
    try {
      await createScheduleForLevel(selectedLevelId);
      toast.success('Emploi du temps créé.');
      await load(weekStartIso);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors de la création.');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!schedule) return;
    try {
      for (const sday of schedule.sdays) {
        await deleteSday(sday.id);
      }
      toast.success('Emploi du temps effacé.');
      await load(weekStartIso);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors de la suppression.');
    }
  };

  const saveCell = async () => {
    if (!cellKey || !selectedLevelId) return;
    const existing = sdayAt(cellKey.day, cellKey.time);
    const selectedModuleId = moduleDraft === '__empty__' ? null : Number(moduleDraft);

    setSaving(true);
    try {
      if (existing && !selectedModuleId) {
        // Si c'est un override de semaine, on supprime l'override seulement
        // Si c'est un template qu'on veut vider pour cette semaine, on crée un sday vide n'est pas possible
        // → on supprime le sday (qui peut être template ou override)
        await deleteSday(existing.id);
      } else if (existing && selectedModuleId) {
        // Si le sday affiché est un template (week_start=null) et qu'on est en mode semaine :
        // on crée un nouveau sday daté au lieu de modifier le template
        if (weekStartIso && existing.week_start === null) {
          // Créer un override pour cette semaine
          if (!schedule) {
            await createScheduleForLevel(selectedLevelId);
            await load(weekStartIso);
          }
          await addSday({
            level_id: selectedLevelId,
            day: cellKey.day,
            time: cellKey.time,
            module_id: selectedModuleId,
            week_start: weekStartIso,
          });
        } else {
          await updateSday(existing.id, {
            day: cellKey.day,
            time: cellKey.time,
            module_id: selectedModuleId,
            week_start: existing.week_start,
          });
        }
      } else if (!existing && selectedModuleId) {
        if (!schedule) {
          await createScheduleForLevel(selectedLevelId);
          await load(weekStartIso);
        }
        await addSday({
          level_id: selectedLevelId,
          day: cellKey.day,
          time: cellKey.time,
          module_id: selectedModuleId,
          week_start: weekStartIso ?? null,
        });
      }
      toast.success(selectedModuleId ? 'Séance enregistrée.' : 'Séance supprimée.');
      setCellOpen(false);
      await load(weekStartIso);
    } catch (e: any) {
      toast.error(e?.message ?? 'Enregistrement échoué.');
    } finally {
      setSaving(false);
    }
  };

  const modeLabel = weekOffset === null
    ? 'Template récurrent'
    : `Semaine du ${formatWeekRange(weekStart!)}`;

  const isCurrentWeek = weekOffset === 0;

  return (
    <PageContainer
      pageTitle='Emplois du temps'
      pageDescription='Créez et gérez les emplois du temps par niveau.'
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          <Button variant='secondary' onClick={handleCreateSchedule} disabled={!!schedule}>
            Créer l&apos;emploi du temps
          </Button>
          <ConfirmDialog
            title='Effacer l&apos;emploi du temps ?'
            description='Cela supprimera toutes les séances pour ce niveau.'
            confirmLabel='Effacer'
            destructive
            disabled={!schedule}
            trigger={<Button variant='destructive' disabled={!schedule}>Effacer l&apos;emploi du temps</Button>}
            onConfirm={handleDeleteSchedule}
          />
        </div>
      }
    >
      {loading ? (
        <Skeleton className='h-[500px] w-full' />
      ) : (
        <div className='grid gap-6 lg:grid-cols-[360px_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle>Niveau</CardTitle>
              <CardDescription>Sélectionnez un niveau pour modifier son emploi du temps.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4'>
              <div className='grid gap-2'>
                <Label>Niveau</Label>
                <Select
                  value={selectedLevelId?.toString() ?? ''}
                  onValueChange={(v) => setSelectedLevelId(Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder='Sélectionner un niveau' /></SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Navigation semaine */}
              <div className='grid gap-2'>
                <Label>Mode d&apos;édition</Label>
                <div className='flex items-center gap-1 flex-wrap'>
                  <Button
                    size='sm'
                    variant={weekOffset === null ? 'default' : 'outline'}
                    onClick={() => setWeekOffset(null)}
                  >
                    Template
                  </Button>
                  <Button
                    size='sm'
                    variant={weekOffset !== null ? 'default' : 'outline'}
                    onClick={() => setWeekOffset(0)}
                  >
                    Par semaine
                  </Button>
                </div>

                {weekOffset !== null && (
                  <div className='flex items-center gap-1 mt-1'>
                    <Button size='icon' variant='outline' onClick={() => setWeekOffset((w) => (w ?? 0) - 1)}>
                      <ChevronLeft className='h-4 w-4' />
                    </Button>
                    <div className='flex-1 text-center text-xs font-medium'>
                      {formatWeekRange(weekStart!)}
                      {isCurrentWeek && <span className='ml-1 text-primary'>• Cette semaine</span>}
                    </div>
                    <Button size='icon' variant='outline' onClick={() => setWeekOffset((w) => (w ?? 0) + 1)}>
                      <ChevronRight className='h-4 w-4' />
                    </Button>
                    {weekOffset !== 0 && (
                      <Button size='sm' variant='ghost' className='text-xs' onClick={() => setWeekOffset(0)}>
                        Aujourd&apos;hui
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className='grid gap-2'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-medium'>Modules</p>
                  <Badge variant='secondary'>{modulesForLevel.length}</Badge>
                </div>
                {modulesForLevel.length === 0 ? (
                  <p className='text-muted-foreground text-sm'>Aucun module disponible pour ce niveau.</p>
                ) : (
                  <div className='grid max-h-[260px] gap-2 overflow-auto rounded-lg border p-3 text-sm'>
                    {modulesForLevel.map((m) => (
                      <div key={m.id} className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <p className='truncate font-medium'>{m.name}</p>
                          <p className='text-muted-foreground truncate text-xs'>{m.code}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {weekOffset === null ? 'Emploi du temps — Template récurrent' : `Emploi du temps — ${formatWeekRange(weekStart!)}`}
              </CardTitle>
              <CardDescription>
                {weekOffset === null
                  ? 'Le template s\'applique à toutes les semaines sans modification spécifique.'
                  : 'Les cellules marquées ✦ sont des overrides pour cette semaine uniquement. Les autres héritent du template.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!schedule ? (
                <div className='rounded-lg border border-dashed p-8 text-center'>
                  <p className='text-sm font-medium'>Aucun emploi du temps</p>
                  <p className='text-muted-foreground mt-1 text-sm'>Créez un emploi du temps pour commencer à affecter des séances.</p>
                  <Button className='mt-4' onClick={handleCreateSchedule}>Créer l&apos;emploi du temps</Button>
                </div>
              ) : (
                <Table className='table-fixed'>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-[140px]'>Horaire</TableHead>
                      {SCHEDULE_DAYS.map((day) => <TableHead key={day}>{DAY_LABELS[day]}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SCHEDULE_SLOTS.map((time) => (
                      <TableRow key={time}>
                        <TableCell className='font-medium'>{time}</TableCell>
                        {SCHEDULE_DAYS.map((day) => {
                          const sday = sdayAt(day, time);
                          const override = isOverride(sday);
                          return (
                            <TableCell key={`${day}|${time}`} className='p-0'>
                              <button
                                type='button'
                                onClick={() => openCell(day, time)}
                                className={cn(
                                  'flex h-full min-h-[52px] w-full flex-col items-start justify-center gap-0.5 px-2 py-2 text-left transition-colors',
                                  sday
                                    ? override
                                      ? 'bg-primary/5 hover:bg-primary/10'
                                      : 'hover:bg-muted/60'
                                    : 'text-muted-foreground hover:bg-muted/40'
                                )}
                              >
                                {sday ? (
                                  <>
                                    <span className='truncate text-xs font-medium'>
                                      {override && <span className='text-primary mr-1'>✦</span>}
                                      {sday.module_name ?? 'Unknown'}
                                    </span>
                                    <span className='text-muted-foreground truncate text-[11px]'>{sday.module_code ?? ''}</span>
                                  </>
                                ) : (
                                  <span className='text-xs'>—</span>
                                )}
                              </button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={cellOpen} onOpenChange={(open) => { setCellOpen(open); if (!open) setCellKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la séance</DialogTitle>
            <DialogDescription>
              {cellKey ? `${DAY_LABELS[cellKey.day] ?? cellKey.day} • ${cellKey.time}` : ''}
              {weekOffset !== null && weekStart && (
                <span className='ml-2 text-primary text-xs'>— Semaine du {formatWeekRange(weekStart)}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label>Module</Label>
            <Select value={moduleDraft} onValueChange={setModuleDraft} disabled={!modulesForLevel.length}>
              <SelectTrigger><SelectValue placeholder='Sélectionner un module' /></SelectTrigger>
              <SelectContent>
                <SelectItem value='__empty__'>Vide</SelectItem>
                {modulesForLevel.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>{m.code} — {m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {weekOffset !== null && (
              <p className='text-xs text-muted-foreground'>
                Cette modification s&apos;applique uniquement à la semaine sélectionnée.
                Les autres semaines garderont le template.
              </p>
            )}
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button variant='outline' onClick={() => setCellOpen(false)}>Annuler</Button>
            <Button onClick={() => void saveCell()} disabled={saving}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
