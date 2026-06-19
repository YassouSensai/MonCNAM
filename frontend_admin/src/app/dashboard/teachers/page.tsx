'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { generatePassword } from '@/lib/password';

import { fetchTeachers, createTeacher, updateTeacher, deleteTeacher, type ApiTeacher } from '@/lib/admin-api';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type TeacherDraft = {
  fullName: string;
  email: string;
  department: string;
  password: string;
};

export default function TeachersPage() {
  const [teachers, setTeachers] = React.useState<ApiTeacher[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<TeacherDraft>({ fullName: '', email: '', department: '', password: '' });
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      setTeachers(await fetchTeachers());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors du chargement des intervenants.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void reload(); }, [reload]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({ fullName: '', email: '', department: 'Informatique', password: '' });
    setPasswordVisible(false);
    setErrors({});
    setEditorOpen(true);
  };

  const openEdit = (t: ApiTeacher) => {
    setEditingId(t.id);
    setDraft({ fullName: t.full_name ?? '', email: t.email ?? '', department: t.department ?? '', password: '' });
    setPasswordVisible(false);
    setErrors({});
    setEditorOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!draft.fullName.trim()) e.fullName = 'Le nom complet est requis.';
    if (!draft.email.trim()) e.email = 'L\'email est requis.';
    else if (!isValidEmail(draft.email.trim())) e.email = 'Email invalide.';
    if (!draft.department.trim()) e.department = 'Le département est requis.';
    if (!editingId && !draft.password.trim()) e.password = 'Le mot de passe est requis pour un nouveau compte.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveTeacher = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateTeacher(editingId, {
          full_name: draft.fullName.trim(),
          email: draft.email.trim(),
          department: draft.department.trim(),
        });
        toast.success('Intervenant mis à jour avec succès.');
      } else {
        await createTeacher({
          full_name: draft.fullName.trim(),
          email: draft.email.trim(),
          password: draft.password.trim(),
          department: draft.department.trim(),
        });
        toast.success('Compte intervenant créé avec succès.');
      }
      setEditorOpen(false);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const removeTeacher = async (id: number) => {
    try {
      await deleteTeacher(id);
      toast.success('Compte intervenant supprimé.');
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la suppression.');
    }
  };

  const columns: Array<DataTableColumn<ApiTeacher>> = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      accessor: (t) => t.id,
      cell: (t) => <span className='font-medium text-muted-foreground'>#{t.id}</span>,
    },
    { key: 'fullName', header: 'Nom complet', sortable: true, accessor: (t) => t.full_name ?? '', cell: (t) => <span>{t.full_name ?? '—'}</span> },
    { key: 'email', header: 'Email', sortable: true, accessor: (t) => t.email ?? '' },
    { key: 'department', header: 'Département', sortable: true, accessor: (t) => t.department ?? '' },
    {
      key: 'modules',
      header: 'Modules affectés',
      sortable: true,
      accessor: (t) => t.assigned_modules_count,
      cell: (t) => (
        <span title={t.assigned_modules?.join(', ') ?? ''}>
          {t.assigned_modules_count > 0
            ? `${t.assigned_modules_count} (${t.assigned_modules?.join(', ') ?? ''})`
            : '0'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      accessor: (t) => (t.is_active ? 'actif' : 'inactif'),
      cell: (t) => (
        <Badge variant={t.is_active ? 'secondary' : 'outline'}>
          {t.is_active ? 'actif' : 'inactif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (t) => (
        <div className='flex justify-end gap-2'>
          <Button size='sm' variant='outline' onClick={(e) => { e.stopPropagation(); openEdit(t); }}>
            Voir/Modifier
          </Button>
          <ConfirmDialog
            title='Supprimer l&apos;intervenant ?'
            description='Cela supprimera définitivement le compte intervenant.'
            confirmLabel='Supprimer'
            destructive
            trigger={
              <Button size='sm' variant='destructive' onClick={(e) => e.stopPropagation()}>
                Supprimer
              </Button>
            }
            onConfirm={() => void removeTeacher(t.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      pageTitle='Intervenants'
      pageDescription='Gérez les comptes intervenants : ajouter, modifier, supprimer et rechercher.'
      pageHeaderAction={<Button onClick={openCreate}>Ajouter un intervenant</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Liste des intervenants</CardTitle>
          <CardDescription>Rechercher par nom ou email. Données issues de la base de données.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className='text-sm text-muted-foreground py-8 text-center'>Chargement…</p>
          ) : (
            <DataTable
              rows={teachers}
              columns={columns}
              searchPlaceholder='Rechercher par nom ou email…'
              searchFn={(row, q) => [String(row.id), row.full_name ?? '', row.email ?? ''].some((v) => v.toLowerCase().includes(q))}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier l\'intervenant' : 'Ajouter un intervenant'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modifiez les informations et enregistrez les modifications.' : 'Créer un nouveau compte intervenant.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='fullName'>Nom complet</Label>
              <Input id='fullName' value={draft.fullName} onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))} />
              {errors.fullName ? <p className='text-xs text-destructive'>{errors.fullName}</p> : null}
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input id='email' type='email' value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
              {errors.email ? <p className='text-xs text-destructive'>{errors.email}</p> : null}
            </div>
            <div className='grid gap-2 md:col-span-2'>
              <Label htmlFor='department'>Département</Label>
              <Input id='department' value={draft.department} onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))} />
              {errors.department ? <p className='text-xs text-destructive'>{errors.department}</p> : null}
            </div>
            {!editingId && (
              <div className='grid gap-2 md:col-span-2'>
                <div className='flex items-center justify-between gap-2'>
                  <Label htmlFor='teacherPassword'>Mot de passe</Label>
                  <Button type='button' size='sm' variant='outline' onClick={() => { setDraft((d) => ({ ...d, password: generatePassword() })); setPasswordVisible(true); }}>
                    Générer
                  </Button>
                </div>
                <Input
                  id='teacherPassword'
                  value={draft.password}
                  type={passwordVisible ? 'text' : 'password'}
                  placeholder='Définir le mot de passe initial'
                  onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                />
                <div className='flex items-center justify-end text-xs'>
                  <button type='button' className='underline underline-offset-2 text-muted-foreground' onClick={() => setPasswordVisible((v) => !v)}>
                    {passwordVisible ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                {errors.password ? <p className='text-xs text-destructive'>{errors.password}</p> : null}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setEditorOpen(false)}>Annuler</Button>
            <Button onClick={() => void saveTeacher()} disabled={saving}>
              {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Créer le compte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
