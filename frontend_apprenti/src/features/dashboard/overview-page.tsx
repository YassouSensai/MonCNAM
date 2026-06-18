'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { StudentProfile, AttendanceRecord, SDay } from '@/types';
import {
  IconScan,
  IconCalendar,
  IconFolder,
  IconBell,
  IconCircleCheck,
  IconAlertCircle,
  IconClock,
} from '@tabler/icons-react';

const quickActions = [
  { label: 'Pointer ma présence', desc: 'Scanner le QR code de la séance', href: '/dashboard/scan', icon: IconScan, color: 'bg-primary text-primary-foreground' },
  { label: 'Emploi du temps', desc: 'Voir mes cours de la semaine', href: '/dashboard/schedule', icon: IconCalendar, color: 'bg-blue-600 text-white' },
  { label: 'Mes présences', desc: "Historique et statuts d'absence", href: '/dashboard/records', icon: IconFolder, color: 'bg-emerald-600 text-white' },
  { label: 'Notifications', desc: 'Alertes et informations récentes', href: '/dashboard/notifications', icon: IconBell, color: 'bg-amber-500 text-white' },
];

function StatusBadge({ status, justificationStatus }: { status: string; justificationStatus?: string | null }) {
  if (status === 'present') return (
    <span className='flex items-center gap-1 text-xs text-emerald-600 font-medium'>
      <IconCircleCheck className='h-3.5 w-3.5' /> Présent
    </span>
  );
  if (justificationStatus === 'pending') return (
    <span className='flex items-center gap-1 text-xs text-amber-600 font-medium'>
      <IconClock className='h-3.5 w-3.5' /> Justif. en attente
    </span>
  );
  if (justificationStatus === 'approved') return (
    <span className='flex items-center gap-1 text-xs text-blue-600 font-medium'>
      <IconCircleCheck className='h-3.5 w-3.5' /> Justifié
    </span>
  );
  return (
    <span className='flex items-center gap-1 text-xs text-red-600 font-medium'>
      <IconAlertCircle className='h-3.5 w-3.5' /> Absence non justifiée
    </span>
  );
}

export default function OverviewPage() {
  const { user, token } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => apiFetch<StudentProfile>('/student/profile', { token: token! }).then(r => r.data),
    enabled: !!token,
  });

  const { data: attendanceData } = useQuery({
    queryKey: ['attendance', user?.id],
    queryFn: () => apiFetch<{ records: AttendanceRecord[] }>('/student/attendance', { token: token! }).then(r => r.data),
    enabled: !!token,
  });

  const records = attendanceData?.records ?? [];
  const recentRecords = records.slice(-5).reverse();
  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const rate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : null;

  // Today's sessions from sdays — day strings come from Python's .strftime('%A') which gives English names
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaySessions = Array.isArray(profile?.sdays) ? profile.sdays.filter((s) => s.day === today) : [];

  return (
    <div className='space-y-6'>
      {/* Welcome */}
      <div className='rounded-xl bg-primary text-primary-foreground p-6'>
        <p className='text-primary-foreground/70 text-sm'>Bienvenue,</p>
        <h2 className='text-2xl font-bold mt-1'>{user?.full_name ?? '—'}</h2>
        {profile?.level && (
          <p className='text-primary-foreground/80 text-sm mt-1'>
            {profile.level.name} — {profile.academic_year}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='rounded-xl border bg-card p-5'>
          <p className='text-muted-foreground text-xs uppercase tracking-wide'>Séances présent</p>
          <p className='text-3xl font-bold mt-1'>{presentCount}</p>
        </div>
        <div className='rounded-xl border bg-card p-5'>
          <p className='text-muted-foreground text-xs uppercase tracking-wide'>Absences</p>
          <p className='text-3xl font-bold mt-1 text-destructive'>{absentCount}</p>
        </div>
        <div className='rounded-xl border bg-card p-5'>
          <p className='text-muted-foreground text-xs uppercase tracking-wide'>Taux de présence</p>
          <p className='text-3xl font-bold mt-1'>{rate !== null ? `${rate}%` : '—'}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3'>
          Actions rapides
        </h3>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className='rounded-xl border bg-card p-4 hover:shadow-md transition-shadow group'
            >
              <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                <action.icon className='h-5 w-5' />
              </div>
              <p className='text-sm font-semibold'>{action.label}</p>
              <p className='text-xs text-muted-foreground mt-0.5'>{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Today's sessions */}
        <div className='rounded-xl border bg-card p-5'>
          <h3 className='font-semibold mb-3'>Cours du jour</h3>
          {todaySessions.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Aucun cours aujourd&apos;hui.</p>
          ) : (
            <div className='space-y-3'>
              {(todaySessions as SDay[]).map((s) => (
                <div key={s.id} className='flex items-start justify-between gap-4 py-2 border-b last:border-0'>
                  <div>
                    <p className='text-sm font-medium'>{s.module_name ?? '—'}</p>
                    <p className='text-xs text-muted-foreground'>
                      {s.module_code && <span>{s.module_code} · </span>}
                      {s.room && <span>Salle {s.room}</span>}
                    </p>
                  </div>
                  <span className='text-xs text-muted-foreground whitespace-nowrap'>{s.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent attendance */}
        <div className='rounded-xl border bg-card p-5'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='font-semibold'>Présences récentes</h3>
            <Link href='/dashboard/records' className='text-xs text-primary hover:underline'>
              Voir tout
            </Link>
          </div>
          {recentRecords.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Aucune donnée disponible.</p>
          ) : (
            <div className='space-y-3'>
              {recentRecords.map((r) => (
                <div key={r.attendance_id} className='flex items-center justify-between py-2 border-b last:border-0'>
                  <div>
                    <p className='text-sm font-medium'>{r.module_name}</p>
                    {r.session_date && (
                      <p className='text-xs text-muted-foreground'>
                        {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(r.session_date))}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={r.status} justificationStatus={r.justification_status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
