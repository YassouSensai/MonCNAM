'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch, apiUpload } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttendanceRecord, AttendanceHistory } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  IconCircleCheck,
  IconAlertCircle,
  IconClock,
  IconPaperclip,
  IconX,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';

const MONTH_NAMES = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const DAY_LABELS = ['L','M','M','J','V','S','D'];

function toIso(date: Date) {
  return date.toISOString().split('T')[0];
}

type JustifType = 'medical' | 'administrative' | 'other';
const justifLabels: Record<JustifType, string> = {
  medical: 'Médical',
  administrative: 'Administratif',
  other: 'Autre',
};

interface JustifModalProps {
  attendanceId: number;
  onClose: () => void;
}

function JustifModal({ attendanceId, onClose }: JustifModalProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState(1);
  const [type, setType] = React.useState<JustifType>('medical');
  const [file, setFile] = React.useState<File | null>(null);
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    if (!token || !file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('attendance_record_id', String(attendanceId));
    fd.append('file', file);
    fd.append('comment', notes.trim() || `Justificatif ${type}`);

    const res = await apiUpload('/student/justifications', fd, token);
    setLoading(false);
    if (res.ok) {
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    } else {
      toast.error("Erreur lors de l'envoi du justificatif.");
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div className='absolute inset-0 bg-black/40' onClick={onClose} />
      <div className='relative bg-card rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-5'>
        <div className='flex items-center justify-between'>
          <h3 className='font-semibold text-lg'>Déposer un justificatif</h3>
          <button onClick={onClose} className='p-1 rounded-md hover:bg-accent'>
            <IconX className='h-4 w-4' />
          </button>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className='flex gap-1'>
            {[1,2,3].map(s => (
              <div key={s} className={cn('h-1.5 flex-1 rounded-full', step >= s ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>
        )}

        {step === 1 && (
          <div className='space-y-3'>
            <p className='text-sm font-medium'>Type de justificatif</p>
            {(Object.keys(justifLabels) as JustifType[]).map(k => (
              <label key={k} className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                type === k ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              )}>
                <input
                  type='radio'
                  className='accent-primary'
                  checked={type === k}
                  onChange={() => setType(k)}
                />
                <span className='text-sm font-medium'>{justifLabels[k]}</span>
              </label>
            ))}
            <button
              onClick={() => setStep(2)}
              className='w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity'
            >
              Suivant
            </button>
          </div>
        )}

        {step === 2 && (
          <div className='space-y-3'>
            <p className='text-sm font-medium'>Fichier justificatif</p>
            <label className={cn(
              'flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
              file ? 'border-primary bg-primary/5' : 'hover:bg-accent'
            )}>
              <IconPaperclip className='h-6 w-6 text-muted-foreground' />
              {file ? (
                <span className='text-sm font-medium text-primary truncate max-w-full'>{file.name}</span>
              ) : (
                <>
                  <span className='text-sm font-medium'>Cliquer pour sélectionner un fichier</span>
                  <span className='text-xs text-muted-foreground'>PDF ou image — 5 Mo maximum</span>
                </>
              )}
              <input
                type='file'
                accept='.pdf,image/*'
                className='hidden'
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className='flex gap-2'>
              <button onClick={() => setStep(1)} className='flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-accent'>
                Retour
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!file}
                className='flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity'
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className='space-y-3'>
            <p className='text-sm font-medium'>Notes complémentaires <span className='text-muted-foreground font-normal'>(optionnel)</span></p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Ajoutez des précisions si nécessaire…'
              rows={4}
              className='w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            />
            <div className='flex gap-2'>
              <button onClick={() => setStep(2)} className='flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-accent'>
                Retour
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className='flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity'
              >
                {loading ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className='text-center space-y-3 py-4'>
            <IconCircleCheck className='h-12 w-12 text-emerald-500 mx-auto' />
            <h4 className='font-semibold'>Justificatif envoyé !</h4>
            <p className='text-sm text-muted-foreground'>
              Vous recevrez une notification une fois que l&apos;intervenant aura traité votre demande.
            </p>
            <button
              onClick={onClose}
              className='w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors'
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ record }: { record: AttendanceRecord }) {
  if (record.status === 'present') return (
    <span className='inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-2 py-0.5'>
      <IconCircleCheck className='h-3 w-3' /> Présent
    </span>
  );
  if (record.justification_status === 'approved') return (
    <span className='inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-medium px-2 py-0.5'>
      <IconCircleCheck className='h-3 w-3' /> Justifié
    </span>
  );
  if (record.justification_status === 'pending') return (
    <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-medium px-2 py-0.5'>
      <IconClock className='h-3 w-3' /> En attente
    </span>
  );
  return (
    <span className='inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs font-medium px-2 py-0.5'>
      <IconAlertCircle className='h-3 w-3' /> Non justifié
    </span>
  );
}

function MiniCalendar({
  year, month, history, selectedDate, onSelect, onPrev, onNext,
}: {
  year: number; month: number;
  history: AttendanceHistory;
  selectedDate: string | null;
  onSelect: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function dayColor(day: number) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = history[iso];
    if (status === 0) return 'bg-emerald-500 text-white';
    if (status === 1) return 'bg-red-500 text-white';
    if (status === 2) return 'bg-amber-400 text-white';
    return '';
  }

  return (
    <div className='rounded-xl border bg-card p-4'>
      <div className='flex items-center justify-between mb-3'>
        <button onClick={onPrev} className='p-1 rounded-md hover:bg-accent'>
          <IconChevronLeft className='h-4 w-4' />
        </button>
        <span className='text-sm font-semibold'>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={onNext} className='p-1 rounded-md hover:bg-accent'>
          <IconChevronRight className='h-4 w-4' />
        </button>
      </div>
      <div className='grid grid-cols-7 gap-0.5 mb-1'>
        {DAY_LABELS.map((l, i) => (
          <div key={i} className='text-center text-xs text-muted-foreground font-medium py-1'>{l}</div>
        ))}
      </div>
      <div className='grid grid-cols-7 gap-0.5'>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const color = dayColor(day);
          const isSelected = iso === selectedDate;
          return (
            <button
              key={i}
              onClick={() => onSelect(iso)}
              className={cn(
                'aspect-square text-xs rounded-md transition-all font-medium',
                color || 'hover:bg-accent',
                isSelected && !color && 'ring-2 ring-primary',
                isSelected && color && 'ring-2 ring-offset-1 ring-primary'
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className='flex gap-3 mt-3 pt-3 border-t'>
        {[
          { color: 'bg-emerald-500', label: 'Présent' },
          { color: 'bg-red-500', label: 'Absent' },
          { color: 'bg-amber-400', label: 'En attente' },
        ].map(l => (
          <div key={l.label} className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span className={cn('h-2.5 w-2.5 rounded-full', l.color)} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecordsPage() {
  const { user, token } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState<string | null>(toIso(new Date()));
  const [justifyId, setJustifyId] = React.useState<number | null>(null);

  const today = new Date();
  const [calYear, setCalYear] = React.useState(today.getFullYear());
  const [calMonth, setCalMonth] = React.useState(today.getMonth());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['attendance', user?.id],
    queryFn: () => apiFetch<{ records: AttendanceRecord[]; history: AttendanceHistory }>(
      '/student/attendance', { token: token! }
    ).then(r => r.data),
    enabled: !!token,
  });

  const records = data?.records ?? [];
  const history = data?.history ?? {};

  const dayRecords = selectedDate
    ? records.filter(r => r.session_date?.startsWith(selectedDate))
    : [];

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border bg-card p-6'>
        <h2 className='font-semibold text-lg mb-1'>Relevés de présence</h2>
        <p className='text-sm text-muted-foreground'>
          Consultez votre historique et justifiez vos absences.
        </p>
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center py-20'>
          <div className='h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin' />
        </div>
      ) : isError ? (
        <div className='rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm'>
          Impossible de charger les données.
        </div>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6'>
          {/* Calendar */}
          <div className='space-y-4'>
            <MiniCalendar
              year={calYear}
              month={calMonth}
              history={history}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              onPrev={prevMonth}
              onNext={nextMonth}
            />
          </div>

          {/* Detail panel */}
          <div className='rounded-xl border bg-card'>
            {selectedDate ? (
              <>
                <div className='px-4 py-3 border-b'>
                  <p className='text-sm font-semibold'>
                    {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(selectedDate + 'T00:00:00'))}
                  </p>
                </div>
                {dayRecords.length === 0 ? (
                  <div className='p-8 text-center text-muted-foreground text-sm'>
                    Aucune séance enregistrée ce jour.
                  </div>
                ) : (
                  <div className='divide-y'>
                    {dayRecords.map((r) => (
                      <div key={r.attendance_id} className='p-4 flex items-start justify-between gap-4'>
                        <div className='space-y-1'>
                          <p className='text-sm font-medium'>{r.module_name}</p>
                          <p className='text-xs text-muted-foreground'>
                            {r.module_code && <span>{r.module_code} · </span>}
                            {r.room && <span>Salle {r.room}</span>}
                          </p>
                          <StatusBadge record={r} />
                        </div>
                        {r.status === 'absent' && !r.has_justification && (
                          <button
                            onClick={() => setJustifyId(r.attendance_id)}
                            className='shrink-0 text-xs rounded-lg border border-primary text-primary px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors font-medium'
                          >
                            Justifier
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className='p-8 text-center text-muted-foreground text-sm'>
                Sélectionnez un jour dans le calendrier.
              </div>
            )}
          </div>
        </div>
      )}

      {justifyId !== null && (
        <JustifModal
          attendanceId={justifyId}
          onClose={() => setJustifyId(null)}
        />
      )}
    </div>
  );
}
