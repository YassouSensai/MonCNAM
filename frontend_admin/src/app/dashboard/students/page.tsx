'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { downloadCsv } from '@/lib/download';
import { generatePassword } from '@/lib/password';
import { parseCsv } from '@/features/admin/import/csv';

import {
  fetchStudents, createStudent, updateStudent, deleteStudent, fetchLevels,
  type ApiStudent, type ApiLevel,
} from '@/lib/admin-api';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type StudentDraft = {
  fullName: string;
  email: string;
  department: string;
  levelId: number | null;
  password: string;
};

type ImportRow = {
  row: number;
  draft?: { fullName: string; email: string; department: string; levelName: string; password: string };
  errors: string[];
};

export default function StudentsPage() {
  const [students, setStudents] = React.useState<ApiStudent[]>([]);
  const [levels, setLevels] = React.useState<ApiLevel[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [levelFilter, setLevelFilter] = React.useState<string>('all');

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<StudentDraft>({ fullName: '', email: '', department: '', levelId: null, password: '' });
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const [importOpen, setImportOpen] = React.useState(false);
  const [importFileName, setImportFileName] = React.useState<string | null>(null);
  const [importPreview, setImportPreview] = React.useState<ImportRow[]>([]);
  const [importing, setImporting] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [studs, lvls] = await Promise.all([fetchStudents(), fetchLevels()]);
      setStudents(studs);
      setLevels(lvls);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void reload(); }, [reload]);

  const filteredStudents = React.useMemo(() => {
    if (levelFilter === 'all') return students;
    return students.filter((s) => String(s.level?.id) === levelFilter);
  }, [students, levelFilter]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({ fullName: '', email: '', department: 'Informatique', levelId: levels[0]?.id ?? null, password: '' });
    setPasswordVisible(false);
    setErrors({});
    setEditorOpen(true);
  };

  const openEdit = (s: ApiStudent) => {
    setEditingId(s.id);
    setDraft({ fullName: s.full_name ?? '', email: s.email ?? '', department: s.department ?? '', levelId: s.level?.id ?? null, password: '' });
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
    if (!draft.levelId) e.levelId = 'Le niveau est requis.';
    if (!editingId && !draft.password.trim()) e.password = 'Le mot de passe est requis pour un nouveau compte.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveStudent = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateStudent(editingId, {
          full_name: draft.fullName.trim(),
          email: draft.email.trim(),
          department: draft.department.trim(),
          level_id: draft.levelId ?? undefined,
        });
        toast.success('Étudiant mis à jour avec succès.');
      } else {
        await createStudent({
          full_name: draft.fullName.trim(),
          email: draft.email.trim(),
          password: draft.password.trim(),
          department: draft.department.trim(),
          level_id: draft.levelId!,
        });
        toast.success('Compte étudiant créé avec succès.');
      }
      setEditorOpen(false);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const removeStudent = async (id: number) => {
    try {
      await deleteStudent(id);
      toast.success('Compte étudiant supprimé.');
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la suppression.');
    }
  };

  // CSV import
  const downloadTemplate = () => {
    downloadCsv('students-template.csv', [
      ['fullName', 'email', 'department', 'levelName', 'password'],
      ['Amine Hadj', 'amine.hadj@lecnam.net', 'Informatique', levels[0]?.name ?? 'LMD 1', 'password123'],
    ]);
  };

  const loadImportFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    const header = parsed.headers.map((h) => h.toLowerCase());
    const expected = ['fullname', 'email', 'department', 'levelname', 'password'];
    if (!expected.every((h) => header.includes(h))) {
      toast.error('Format CSV invalide. Veuillez utiliser le modèle.');
      setImportPreview([]);
      return;
    }
    const levelNames = new Set(levels.map((l) => l.name.toLowerCase()));
    const emailsInCsv = new Set<string>();
    const preview: ImportRow[] = parsed.rows.slice(0, 200).map((row, idx) => {
      const [fullName, email, department, levelName, password] = row;
      const errs: string[] = [];
      if (!fullName?.trim()) errs.push('Nom manquant.');
      if (!email?.trim()) errs.push('Email manquant.');
      else if (!isValidEmail(email.trim())) errs.push('Email invalide.');
      else if (emailsInCsv.has(email.trim().toLowerCase())) errs.push('Email dupliqué dans le fichier.');
      else emailsInCsv.add(email.trim().toLowerCase());
      if (!department?.trim()) errs.push('Département manquant.');
      if (!levelName?.trim()) errs.push('Niveau manquant.');
      else if (!levelNames.has(levelName.trim().toLowerCase())) errs.push(`Niveau inconnu : "${levelName}".`);
      if (!password?.trim()) errs.push('Mot de passe manquant.');
      return {
        row: idx + 1,
        draft: { fullName: fullName ?? '', email: email ?? '', department: department ?? '', levelName: levelName ?? '', password: password ?? '' },
        errors: errs,
      };
    });
    setImportPreview(preview);
  };

  const confirmImport = async () => {
    const creatable = importPreview.filter((r) => r.errors.length === 0 && r.draft);
    if (!creatable.length) { toast.error('Aucune ligne valide à importer.'); return; }
    setImporting(true);
    let ok = 0;
    let fail = 0;
    for (const row of creatable) {
      const r = row.draft!;
      const level = levels.find((l) => l.name.toLowerCase() === r.levelName.toLowerCase());
      if (!level) { fail++; continue; }
      try {
        await createStudent({
          full_name: r.fullName.trim(),
          email: r.email.trim(),
          password: r.password.trim(),
          department: r.department.trim(),
          level_id: level.id,
        });
        ok++;
      } catch {
        fail++;
      }
    }
    toast.success(`Import terminé : ${ok} créé(s), ${fail} échoué(s).`);
    setImportOpen(false);
    setImporting(false);
    await reload();
  };

  const columns: Array<DataTableColumn<ApiStudent>> = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      accessor: (s) => s.id,
      cell: (s) => <span className='font-medium text-muted-foreground'>#{s.id}</span>,
    },
    { key: 'fullName', header: 'Nom complet', sortable: true, accessor: (s) => s.full_name ?? '', cell: (s) => <span>{s.full_name ?? '—'}</span> },
    { key: 'email', header: 'Email', sortable: true, accessor: (s) => s.email ?? '' },
    {
      key: 'level',
      header: 'Niveau',
      sortable: true,
      accessor: (s) => s.level?.name ?? '—',
      cell: (s) => <span>{s.level?.name ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      accessor: (s) => (s.is_active ? 'actif' : 'inactif'),
      cell: (s) => (
        <Badge variant={s.is_active ? 'secondary' : 'outline'}>
          {s.is_active ? 'actif' : 'inactif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (s) => (
        <div className='flex justify-end gap-2'>
          <Button size='sm' variant='outline' onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
            Voir/Modifier
          </Button>
          <ConfirmDialog
            title='Supprimer l&apos;étudiant ?'
            description='Cela supprimera définitivement le compte étudiant et toutes ses données.'
            confirmLabel='Supprimer'
            destructive
            trigger={
              <Button size='sm' variant='destructive' onClick={(e) => e.stopPropagation()}>
                Supprimer
              </Button>
            }
            onConfirm={() => void removeStudent(s.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      pageTitle='Étudiants'
      pageDescription='Gérez les comptes étudiants : ajouter, modifier, supprimer, rechercher et importer en masse.'
      pageHeaderAction={
        <div className='flex flex-wrap gap-2'>
          <Button onClick={openCreate}>Ajouter un étudiant</Button>
          <Button variant='outline' onClick={() => setImportOpen(true)}>Importer des étudiants</Button>
        </div>
      }
    >
      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-2'>
          <div>
            <CardTitle>Liste des étudiants</CardTitle>
            <CardDescription>Rechercher par nom ou email. Données issues de la base de données.</CardDescription>
          </div>
          <Button
            variant='outline'
            onClick={() => {
              const rows = filteredStudents.map((s) => [String(s.id), s.full_name ?? '', s.email ?? '', s.level?.name ?? '', s.is_active ? 'actif' : 'inactif']);
              downloadCsv('students.csv', [['ID', 'Nom complet', 'Email', 'Niveau', 'Statut'], ...rows]);
              toast.success('Export généré.');
            }}
          >
            Exporter CSV
          </Button>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-0'>
          <div className='grid gap-2'>
            <Label>Niveau</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tous</SelectItem>
                {levels.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent>
          {loading ? (
            <p className='text-sm text-muted-foreground py-8 text-center'>Chargement…</p>
          ) : (
            <DataTable
              rows={filteredStudents}
              columns={columns}
              searchPlaceholder='Rechercher par nom ou email…'
              searchFn={(row, q) => [String(row.id), row.full_name ?? '', row.email ?? ''].some((v) => v.toLowerCase().includes(q))}
            />
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier l\'étudiant' : 'Ajouter un étudiant'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modifiez les informations et enregistrez les modifications.' : 'Créer un nouveau compte étudiant. Il sera automatiquement inscrit dans tous les modules du niveau.'}
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
            <div className='grid gap-2'>
              <Label htmlFor='department'>Département</Label>
              <Input id='department' value={draft.department} onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))} />
              {errors.department ? <p className='text-xs text-destructive'>{errors.department}</p> : null}
            </div>
            <div className='grid gap-2'>
              <Label>Niveau</Label>
              <Select
                value={draft.levelId ? String(draft.levelId) : ''}
                onValueChange={(v) => setDraft((d) => ({ ...d, levelId: Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder='Sélectionner un niveau' /></SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.levelId ? <p className='text-xs text-destructive'>{errors.levelId}</p> : null}
            </div>
            {!editingId && (
              <div className='grid gap-2 md:col-span-2'>
                <div className='flex items-center justify-between gap-2'>
                  <Label htmlFor='studentPassword'>Mot de passe</Label>
                  <Button type='button' size='sm' variant='outline' onClick={() => { setDraft((d) => ({ ...d, password: generatePassword() })); setPasswordVisible(true); }}>
                    Générer
                  </Button>
                </div>
                <Input
                  id='studentPassword'
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
            <Button onClick={() => void saveStudent()} disabled={saving}>
              {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Créer le compte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className='max-w-[900px]'>
          <DialogHeader>
            <DialogTitle>Import en masse des étudiants</DialogTitle>
            <DialogDescription>
              Téléversez un fichier CSV. Colonnes : fullName, email, department, levelName, password. Le mot de passe par défaut est utilisé si la colonne password est absente.
            </DialogDescription>
          </DialogHeader>

          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline' onClick={downloadTemplate}>Télécharger le modèle CSV</Button>
            <Input
              type='file'
              accept='.csv,text/csv'
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportFileName(file.name);
                void loadImportFile(file);
              }}
            />
          </div>

          <div className='rounded-lg border border-border/60 p-3'>
            <div className='text-sm font-medium'>Aperçu</div>
            <div className='text-xs text-muted-foreground'>{importFileName ? `Fichier : ${importFileName}` : 'Aucun fichier chargé.'}</div>
            <div className='mt-3 max-h-[340px] overflow-auto'>
              <table className='w-full text-sm'>
                <thead className='text-left text-xs text-muted-foreground'>
                  <tr>
                    <th className='p-2'>Ligne</th>
                    <th className='p-2'>Nom</th>
                    <th className='p-2'>Email</th>
                    <th className='p-2'>Niveau</th>
                    <th className='p-2'>Mot de passe</th>
                    <th className='p-2'>Problèmes</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row) => (
                    <tr key={row.row} className='border-t'>
                      <td className='p-2'>{row.row}</td>
                      <td className='p-2'>{row.draft?.fullName ?? '—'}</td>
                      <td className='p-2'>{row.draft?.email ?? '—'}</td>
                      <td className='p-2'>{row.draft?.levelName ?? '—'}</td>
                      <td className='p-2 font-mono text-xs text-muted-foreground'>{row.draft?.password ? '••••••' : '—'}</td>
                      <td className='p-2'>
                        {row.errors.length ? <span className='text-destructive'>{row.errors.join(' ')}</span> : <span className='text-emerald-600'>OK</span>}
                      </td>
                    </tr>
                  ))}
                  {!importPreview.length && (
                    <tr><td className='p-2 text-muted-foreground' colSpan={6}>Téléversez un fichier CSV pour voir l&apos;aperçu des lignes.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setImportOpen(false)}>Annuler</Button>
            <Button onClick={() => void confirmImport()} disabled={importing}>
              {importing ? 'Importation…' : 'Confirmer l\'import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
