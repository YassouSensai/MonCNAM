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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IconAlertTriangle, IconDownload, IconEye } from '@tabler/icons-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import {
  getTeacherJustifications,
  validateJustification,
  type TeacherJustificationsResponse
} from '@/lib/teacher-api';
import { toast } from 'sonner';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export default function JustificationReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = React.useState<TeacherJustificationsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [teacherNotes, setTeacherNotes] = React.useState('');

  const justificationId = Number(searchParams.get('id') ?? '');

  React.useEffect(() => {
    if (!token || !Number.isFinite(justificationId)) return;
    let mounted = true;
    setIsLoading(true);
    getTeacherJustifications(token)
      .then((result) => {
        if (!mounted) return;
        setData(result);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load justification');
      })
      .finally(() => setIsLoading(false));
    return () => {
      mounted = false;
    };
  }, [token, justificationId]);

  const entry = React.useMemo(() => {
    if (!data) return null;
    return data.justifications.find((j) => j.justification_id === justificationId) ?? null;
  }, [data, justificationId]);

  const studentName = entry?.student?.full_name ?? '—';
  const studentId = entry?.student?.student_id ? String(entry.student.student_id) : '—';
  const moduleLabel = entry?.module ? `${entry.module.code} - ${entry.module.name}` : '—';
  const sessionLabel = entry?.session?.date_time ? formatDateTime(entry.session.date_time) : '—';
  const statusLabel = entry?.status ?? '—';
  const notes = entry?.comment ?? '—';
  const rawFileUrl = entry?.file_url ?? null;

  // file_url is stored as "uploads/justifications/uuid.ext" — extract just the filename.
  const fileUrl = React.useMemo(() => {
    if (!rawFileUrl) return null;
    const filename = rawFileUrl.split(/[/\\]/).pop();
    if (!filename) return null;
    return `/api/backend/files/justifications/${encodeURIComponent(filename)}`;
  }, [rawFileUrl]);

  const fileExtension = rawFileUrl?.split('.').pop()?.toLowerCase() ?? '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
  const isPdf = fileExtension === 'pdf';

  const submitDecision = async (decision: 'approve' | 'reject') => {
    if (!token) return;
    if (!entry) return;
    if (decision === 'reject' && !teacherNotes.trim()) {
      toast.error('Veuillez fournir une raison de rejet.');
      return;
    }
    setIsSubmitting(true);
    try {
      await validateJustification(token, entry.justification_id, {
        decision,
        teacher_notes: teacherNotes.trim() ? teacherNotes.trim() : null
      });
      toast.success(decision === 'approve' ? 'Justificatif approuvé.' : 'Justificatif rejeté.');
      router.push('/dashboard/justifications');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Examen du justificatif</CardTitle>
          <CardDescription>
            Examinez les preuves et approuvez ou rejetez la demande d'absence.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Étudiant &amp; information d'absence</CardTitle>
            <CardDescription>Contexte de cette demande.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2'>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>
                Étudiant
              </p>
              <p className='text-sm font-medium'>
                {studentName} - {studentId}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Groupe</p>
              <p className='text-sm font-medium'>—</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Module</p>
              <p className='text-sm font-medium'>{moduleLabel}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Séance</p>
              <p className='text-sm font-medium'>{sessionLabel}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Statut</p>
              <Badge variant='secondary'>{statusLabel}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impact</CardTitle>
            <CardDescription>Totaux de présence pour cet étudiant.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3'>
            <div className='flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm'>
              <span className='text-muted-foreground'>Statut actuel</span>
              <Badge variant='secondary'>{entry?.status ?? '—'}</Badge>
            </div>
            <div className='flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm'>
              <span className='text-muted-foreground'>Enregistrement d'absence</span>
              <span className='font-medium'>{entry?.attendance_record.status ?? '—'}</span>
            </div>
            <p className='text-muted-foreground text-xs'>
              Approuver marquera cette absence comme justifiée.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preuves du justificatif</CardTitle>
          <CardDescription>Notes et pièces jointes.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          <div className='rounded-lg border border-border/60 p-4'>
            <p className='text-xs uppercase text-muted-foreground'>Notes de l'étudiant</p>
            <p className='mt-1 text-sm text-muted-foreground whitespace-pre-wrap'>{notes}</p>
          </div>

          {fileUrl ? (
            <div className='grid gap-3'>
              <div className='flex items-center justify-between'>
                <p className='text-sm font-medium'>Pièce jointe</p>
                <Button asChild size='sm' variant='outline'>
                  <a href={fileUrl} download target='_blank' rel='noreferrer'>
                    <IconDownload className='mr-1 h-4 w-4' />
                    Télécharger
                  </a>
                </Button>
              </div>

              {isImage ? (
                <div className='overflow-hidden rounded-xl border border-border/60 bg-muted/30'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl}
                    alt='Justificatif'
                    className='max-h-[480px] w-full object-contain'
                  />
                </div>
              ) : isPdf ? (
                <div className='overflow-hidden rounded-xl border border-border/60'>
                  <iframe
                    src={fileUrl}
                    title='Aperçu PDF'
                    className='h-[480px] w-full'
                  />
                </div>
              ) : (
                <Alert>
                  <IconEye className='h-4 w-4' />
                  <AlertTitle>Aperçu non disponible</AlertTitle>
                  <AlertDescription>
                    Ce type de fichier ne peut pas être prévisualisé. Utilisez le bouton Télécharger.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Alert>
              <IconAlertTriangle className='h-4 w-4' />
              <AlertTitle>Aucune pièce jointe</AlertTitle>
              <AlertDescription>
                Ce justificatif ne contient pas de fichier joint.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Décision</CardTitle>
          <CardDescription>Prenez une décision ou demandez plus d'informations.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          <div className='grid gap-2'>
            <Label htmlFor='reject'>Motif de rejet</Label>
            <Textarea
              id='reject'
              placeholder='Obligatoire si vous rejetez cette demande.'
              value={teacherNotes}
              onChange={(event) => setTeacherNotes(event.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='request'>Demander plus d'informations</Label>
            <Textarea
              id='request'
              placeholder="Message à l'étudiant concernant les informations manquantes."
            />
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              className='bg-emerald-600 text-white hover:bg-emerald-700'
              disabled={!entry || isLoading || isSubmitting}
              onClick={() => submitDecision('approve')}
            >
              {isSubmitting ? 'Traitement…' : 'Approuver'}
            </Button>
            <Button
              variant='destructive'
              disabled={!entry || isLoading || isSubmitting}
              onClick={() => submitDecision('reject')}
            >
              Rejeter
            </Button>
            <Button variant='outline' disabled>
              Demander plus d'informations
            </Button>
          </div>
          {!Number.isFinite(justificationId) ? (
            <p className='text-sm text-muted-foreground'>
              Identifiant de justificatif manquant ou invalide.
            </p>
          ) : isLoading ? (
            <p className='text-sm text-muted-foreground'>Chargement…</p>
          ) : !entry ? (
            <p className='text-sm text-muted-foreground'>Justificatif introuvable.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
