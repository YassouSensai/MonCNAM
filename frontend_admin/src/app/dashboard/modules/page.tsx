'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { Skeleton } from '@/components/ui/skeleton';

import {
  fetchModules,
  fetchLevels,
  fetchTeacherModules,
  deleteTeacherModuleAssignment,
  adminFetch,
  type ApiModule,
  type ApiLevel,
} from '@/lib/admin-api';

type Row = ApiModule & { assignedTeacherNames: string };

type Draft = { name: string; code: string; level_id: string };

export default function ModulesPage() {
  const [modules, setModules] = React.useState<ApiModule[]>([]);
  const [levels, setLevels] = React.useState<ApiLevel[]>([]);
  const [teacherNamesByModuleId, setTeacherNamesByModuleId] = React.useState<Map<number, string>>(new Map());
  const [loading, setLoading] = React.useState(true);

  const [levelFilter, setLevelFilter] = React.useState('all');
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<Draft>({ name: '', level_id: '' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [mods, lvls, tms] = await Promise.all([fetchModules(), fetchLevels(), fetchTeacherModules()]);
      setModules(mods);
      setLevels(lvls);

      const map = new Map<number, string>();
      for (const tm of tms) {
        if (!tm.module?.id || !tm.teacher?.full_name) continue;
        const prev = map.get(tm.module.id);
        map.set(tm.module.id, prev ? `${prev}, ${tm.teacher.full_name}` : tm.teacher.full_name);
      }
      setTeacherNamesByModuleId(map);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors du chargement des modules.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({ name: '', code: '', level_id: levels[0]?.id.toString() ?? '' });
    setErrors({});
    setEditorOpen(true);
  };

  const openEdit = (m: ApiModule) => {
    setEditingId(m.id);
    setDraft({ name: m.name, code: m.code ?? '', level_id: m.level?.id.toString() ?? '' });
    setErrors({});
    setEditorOpen(true);
  };

  const saveModule = async () => {
    const nextErrors: Record<string, string> = {};
    if (!draft.name.trim()) nextErrors.name = 'Le nom du module est requis.';
    if (!draft.code.trim()) nextErrors.code = 'Le code du module est requis.';
    if (!draft.level_id) nextErrors.level_id = 'Le niveau est requis.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      if (editingId !== null) {
        await adminFetch(`/admin/modules/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: draft.name.trim() }),
        });
        toast.success('Module mis à jour.');
      } else {
        await adminFetch('/admin/modules', {
          method: 'POST',
          body: JSON.stringify({ name: draft.name.trim(), code: draft.code.trim(), level_id: Number(draft.level_id) }),
        });
        toast.success('Module créé.');
      }
      setEditorOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Enregistrement échoué.');
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (id: number) => {
    try {
      await adminFetch(`/admin/modules/${id}`, { method: 'DELETE' });
      toast.success('Module supprimé.');
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Suppression échouée.');
    }
  };

  const filteredRows: Row[] = modules
    .filter((m) => levelFilter === 'all' || m.level?.id.toString() === levelFilter)
    .map((m) => ({ ...m, assignedTeacherNames: teacherNamesByModuleId.get(m.id) ?? '' }));

  const columns: Array<DataTableColumn<Row>> = [
    { key: 'name', header: 'Nom du module', sortable: true, accessor: (m) => m.name, cell: (m) => <span className='font-medium'>{m.name}</span> },
    { key: 'level', header: 'Niveau', sortable: true, accessor: (m) => m.level?.name ?? '—', cell: (m) => m.level?.name ?? '—' },
    { key: 'code', header: 'Code', accessor: (m) => m.code },
    { key: 'assignedTeacherNames', header: 'Intervenants affectés', accessor: (m) => m.assignedTeacherNames, cell: (m) => <span className='line-clamp-2'>{m.assignedTeacherNames || '—'}</span> },
    {
      key: 'actions', header: '',
      cell: (m) => (
        <div className='flex justify-end gap-2'>
          <Button size='sm' variant='outline' onClick={(e) => { e.stopPropagation(); openEdit(m); }}>Modifier</Button>
          <ConfirmDialog
            title='Supprimer le module ?'
            description='Cela supprimera le module. Impossible de supprimer un module avec des inscriptions existantes.'
            confirmLabel='Supprimer'
            destructive
            trigger={<Button size='sm' variant='destructive' onClick={(e) => e.stopPropagation()}>Supprimer</Button>}
            onConfirm={() => deleteModule(m.id)}
          />
        </div>
      )
    }
  ];

  return (
    <PageContainer
      pageTitle='Modules'
      pageDescription='Gérez les modules : ajouter, modifier et supprimer.'
      pageHeaderAction={<Button onClick={openCreate}>Ajouter un module</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Liste des modules</CardTitle>
          <CardDescription>La suppression est bloquée si le module a des inscriptions existantes.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-0'>
          <div className='grid gap-2'>
            <Label>Niveau</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tous</SelectItem>
                {levels.map((l) => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent>
          {loading ? (
            <Skeleton className='h-[360px] w-full' />
          ) : (
            <DataTable
              rows={filteredRows}
              columns={columns}
              searchPlaceholder='Rechercher par nom ou code…'
              searchFn={(row, q) => [row.code, row.name, row.level?.name ?? ''].some((v) => v.toLowerCase().includes(q))}
              emptyState='Aucun module trouvé.'
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le module' : 'Ajouter un module'}</DialogTitle>
            <DialogDescription>{editingId ? 'Modifiez le nom du module.' : 'Créer un nouveau module pour un niveau.'}</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='name'>Nom du module</Label>
              <Input id='name' value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              {errors.name ? <p className='text-xs text-destructive'>{errors.name}</p> : null}
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='code'>Code du module</Label>
              <Input id='code' value={draft.code} onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))} placeholder='ex: INFO101' />
              {errors.code ? <p className='text-xs text-destructive'>{errors.code}</p> : null}
            </div>
            {!editingId && (
              <div className='grid gap-2'>
                <Label>Niveau</Label>
                <Select value={draft.level_id} onValueChange={(v) => setDraft((d) => ({ ...d, level_id: v }))}>
                  <SelectTrigger><SelectValue placeholder='Sélectionner un niveau' /></SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.level_id ? <p className='text-xs text-destructive'>{errors.level_id}</p> : null}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditorOpen(false)}>Annuler</Button>
            <Button onClick={() => void saveModule()} disabled={saving}>
              {editingId ? 'Enregistrer les modifications' : 'Créer le module'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
