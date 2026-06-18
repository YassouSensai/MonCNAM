'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';

import {
  fetchModules,
  fetchTeachers,
  fetchTeacherModules,
  deleteTeacherModuleAssignment,
  adminFetch,
  type ApiModule,
  type ApiTeacher,
  type ApiTeacherModule,
} from '@/lib/admin-api';

export default function ModuleAssignmentsPage() {
  const [modules, setModules] = React.useState<ApiModule[]>([]);
  const [teachers, setTeachers] = React.useState<ApiTeacher[]>([]);
  const [assignments, setAssignments] = React.useState<ApiTeacherModule[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [moduleQuery, setModuleQuery] = React.useState('');
  const [teacherQuery, setTeacherQuery] = React.useState('');
  const [selectedModuleId, setSelectedModuleId] = React.useState<number | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<number | null>(null);

  const [assigningTeacherId, setAssigningTeacherId] = React.useState<number | null>(null);
  const [assigningModuleIds, setAssigningModuleIds] = React.useState<number[]>([]);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [mods, tchs, tms] = await Promise.all([fetchModules(), fetchTeachers(), fetchTeacherModules()]);
      setModules(mods);
      setTeachers(tchs);
      setAssignments(tms);
      if (!selectedModuleId && mods.length) setSelectedModuleId(mods[0]!.id);
      if (!selectedTeacherId && tchs.length) setSelectedTeacherId(tchs[0]!.id);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const moduleAssignments = React.useMemo(
    () => assignments.filter((a) => a.module?.id === selectedModuleId),
    [assignments, selectedModuleId]
  );

  const teacherAssignments = React.useMemo(
    () => assignments.filter((a) => a.teacher?.id === selectedTeacherId),
    [assignments, selectedTeacherId]
  );

  const assignedTeacherIdsForModule = React.useMemo(
    () => new Set(moduleAssignments.map((a) => a.teacher?.id).filter(Boolean) as number[]),
    [moduleAssignments]
  );

  const assignedModuleIdsForTeacher = React.useMemo(
    () => new Set(teacherAssignments.map((a) => a.module?.id).filter(Boolean) as number[]),
    [teacherAssignments]
  );

  const availableTeachers = teachers.filter((t) => !assignedTeacherIdsForModule.has(t.id) && t.is_active);
  const availableModules = modules.filter((m) => !assignedModuleIdsForTeacher.has(m.id));

  const assignTeacherToModule = async () => {
    if (!selectedModuleId || !assigningTeacherId) { toast.error('Sélectionnez un intervenant.'); return; }
    setSaving(true);
    try {
      await adminFetch('/admin/teacher-modules', {
        method: 'POST',
        body: JSON.stringify({ teacher_id: assigningTeacherId, module_id: selectedModuleId }),
      });
      toast.success('Intervenant affecté.');
      setAssigningTeacherId(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Affectation échouée.');
    } finally {
      setSaving(false);
    }
  };

  const assignModulesToTeacher = async () => {
    if (!selectedTeacherId || !assigningModuleIds.length) { toast.error('Sélectionnez au moins un module.'); return; }
    setSaving(true);
    try {
      await adminFetch('/admin/teacher-modules/bulk', {
        method: 'POST',
        body: JSON.stringify({
          assignments: assigningModuleIds.map((module_id) => ({
            teacher_id: selectedTeacherId,
            module_id,
          })),
        }),
      });
      toast.success('Affectations créées.');
      setAssigningModuleIds([]);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Affectation échouée.');
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (id: number) => {
    try {
      await deleteTeacherModuleAssignment(id);
      toast.success('Affectation supprimée.');
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Suppression échouée.');
    }
  };

  const filteredModules = modules.filter((m) => {
    const q = moduleQuery.trim().toLowerCase();
    return !q || m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
  });

  const filteredTeachers = teachers.filter((t) => {
    const q = teacherQuery.trim().toLowerCase();
    return !q || (t.full_name ?? '').toLowerCase().includes(q) || (t.email ?? '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <PageContainer pageTitle='Affectation modules' pageDescription='Affectez des intervenants aux modules.'>
        <Skeleton className='h-[500px] w-full' />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      pageTitle='Affectation modules'
      pageDescription='Affectez des intervenants aux modules.'
    >
      <Tabs defaultValue='by-module'>
        <TabsList>
          <TabsTrigger value='by-module'>Par module</TabsTrigger>
          <TabsTrigger value='by-teacher'>Par intervenant</TabsTrigger>
        </TabsList>

        <TabsContent value='by-module' className='mt-4'>
          <div className='grid gap-4 lg:grid-cols-[320px_1fr]'>
            <Card>
              <CardHeader><CardTitle>Modules</CardTitle><CardDescription>Sélectionnez un module.</CardDescription></CardHeader>
              <CardContent className='grid gap-3'>
                <Input placeholder='Rechercher des modules…' value={moduleQuery} onChange={(e) => setModuleQuery(e.target.value)} />
                <div className='max-h-[440px] overflow-auto rounded-md border border-border/60'>
                  {filteredModules.map((m) => (
                    <button
                      key={m.id}
                      className={`w-full border-b px-3 py-2 text-left text-sm hover:bg-accent/40 ${selectedModuleId === m.id ? 'bg-accent/40' : ''}`}
                      onClick={() => setSelectedModuleId(m.id)}
                    >
                      <div className='font-medium'>{m.code}</div>
                      <div className='text-xs text-muted-foreground'>{m.name}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Détails du module</CardTitle><CardDescription>Affecter ou retirer des intervenants.</CardDescription></CardHeader>
              <CardContent className='grid gap-6'>
                {selectedModuleId ? (
                  <>
                    <div className='grid gap-2'>
                      <div className='text-sm font-medium'>Intervenants actuellement affectés</div>
                      <div className='grid gap-2 rounded-md border border-border/60 p-3'>
                        {moduleAssignments.length ? moduleAssignments.map((a) => (
                          <div key={a.id} className='flex items-center justify-between gap-2'>
                            <span className='text-sm'><span className='font-medium'>{a.teacher?.full_name ?? '—'}</span> — {a.teacher?.email ?? '—'}</span>
                            <ConfirmDialog
                              title='Retirer l&apos;intervenant ?'
                              description='Retirer cet intervenant du module.'
                              confirmLabel='Retirer'
                              destructive
                              trigger={<Button size='sm' variant='destructive'>Retirer</Button>}
                              onConfirm={() => removeAssignment(a.id)}
                            />
                          </div>
                        )) : <div className='text-sm text-muted-foreground'>Aucun intervenant affecté.</div>}
                      </div>
                    </div>

                    <div className='grid gap-3 rounded-lg border border-border/60 p-4'>
                      <div className='text-sm font-medium'>Affecter un intervenant</div>
                      <div className='max-h-[240px] overflow-auto grid gap-1'>
                        {availableTeachers.map((t) => (
                          <label key={t.id} className='flex items-center gap-2 text-sm'>
                            <input
                              type='radio'
                              name='assign-teacher'
                              checked={assigningTeacherId === t.id}
                              onChange={() => setAssigningTeacherId(t.id)}
                            />
                            <span><span className='font-medium'>{t.full_name}</span> — {t.email}</span>
                          </label>
                        ))}
                        {!availableTeachers.length && <div className='text-sm text-muted-foreground'>Tous les intervenants actifs sont déjà affectés.</div>}
                      </div>
                      <Button className='w-fit' onClick={() => void assignTeacherToModule()} disabled={saving || !assigningTeacherId}>
                        Affecter l&apos;intervenant
                      </Button>
                    </div>
                  </>
                ) : <div className='text-sm text-muted-foreground'>Sélectionnez un module.</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='by-teacher' className='mt-4'>
          <div className='grid gap-4 lg:grid-cols-[320px_1fr]'>
            <Card>
              <CardHeader><CardTitle>Intervenants</CardTitle><CardDescription>Sélectionnez un intervenant.</CardDescription></CardHeader>
              <CardContent className='grid gap-3'>
                <Input placeholder='Rechercher des intervenants…' value={teacherQuery} onChange={(e) => setTeacherQuery(e.target.value)} />
                <div className='max-h-[440px] overflow-auto rounded-md border border-border/60'>
                  {filteredTeachers.map((t) => (
                    <button
                      key={t.id}
                      className={`w-full border-b px-3 py-2 text-left text-sm hover:bg-accent/40 ${selectedTeacherId === t.id ? 'bg-accent/40' : ''}`}
                      onClick={() => setSelectedTeacherId(t.id)}
                    >
                      <div className='font-medium'>{t.full_name}</div>
                      <div className='text-xs text-muted-foreground'>{t.email}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Affectations de l&apos;intervenant</CardTitle><CardDescription>Affecter ou consulter les modules actuels.</CardDescription></CardHeader>
              <CardContent className='grid gap-6'>
                {selectedTeacherId ? (
                  <>
                    <div className='grid gap-2'>
                      <div className='text-sm font-medium'>Affectations de modules actuelles</div>
                      <div className='rounded-md border border-border/60 p-3 text-sm'>
                        {teacherAssignments.length ? (
                          <ul className='list-disc pl-5'>
                            {teacherAssignments.map((a) => (
                              <li key={a.id}><span className='font-medium'>{a.module?.code ?? '—'}</span> — {a.module?.name ?? '—'}</li>
                            ))}
                          </ul>
                        ) : <span className='text-muted-foreground'>Aucune affectation.</span>}
                      </div>
                    </div>

                    <div className='grid gap-3 rounded-lg border border-border/60 p-4'>
                      <div className='text-sm font-medium'>Affecter des modules</div>
                      <div className='grid gap-2 rounded-md border border-border/60 p-3 md:grid-cols-2 max-h-[280px] overflow-auto'>
                        {availableModules.map((m) => (
                          <label key={m.id} className='flex items-center gap-2 text-sm'>
                            <input
                              type='checkbox'
                              checked={assigningModuleIds.includes(m.id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setAssigningModuleIds((prev) => checked ? [...prev, m.id] : prev.filter((id) => id !== m.id));
                              }}
                            />
                            <span><span className='font-medium'>{m.code}</span> — {m.name}</span>
                          </label>
                        ))}
                        {!availableModules.length && <div className='text-sm text-muted-foreground'>Aucun module disponible.</div>}
                      </div>
                      <Button className='w-fit' onClick={() => void assignModulesToTeacher()} disabled={saving || !assigningModuleIds.length}>
                        Affecter
                      </Button>
                    </div>
                  </>
                ) : <div className='text-sm text-muted-foreground'>Sélectionnez un intervenant.</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
