'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { StudentProfile } from '@/types';
import { useRouter } from 'next/navigation';
import { IconLogout, IconUser, IconId, IconBook, IconCalendar } from '@tabler/icons-react';

export default function ProfilePage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => apiFetch<StudentProfile>('/student/profile', { token: token! }).then(r => r.data),
    enabled: !!token,
  });

  function handleLogout() {
    logout();
    router.push('/auth/login');
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin' />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className='rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm'>
        Impossible de charger le profil.
      </div>
    );
  }

  const fields = [
    { icon: IconUser, label: 'Nom complet', value: profile.user.full_name },
    { icon: IconId, label: 'Identifiant apprenti', value: profile.student_id },
    { icon: IconBook, label: 'Promotion', value: profile.level?.name },
    { icon: IconCalendar, label: 'Année académique', value: profile.academic_year },
  ];

  return (
    <div className='space-y-6 max-w-xl'>
      {/* Avatar + name */}
      <div className='rounded-xl border bg-card p-6 flex items-center gap-4'>
        <div className='h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shrink-0'>
          {profile.user.full_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className='text-xl font-bold'>{profile.user.full_name}</h2>
          <p className='text-sm text-muted-foreground'>{profile.user.email}</p>
        </div>
      </div>

      {/* Personal info */}
      <div className='rounded-xl border bg-card p-6 space-y-4'>
        <h3 className='font-semibold'>Informations personnelles</h3>
        <div className='space-y-3'>
          {fields.map((f) => (
            <div key={f.label} className='flex items-center gap-3 py-2 border-b last:border-0'>
              <div className='h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0'>
                <f.icon className='h-4 w-4 text-muted-foreground' />
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>{f.label}</p>
                <p className='text-sm font-medium'>{f.value ?? '—'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className='flex items-center gap-2 w-full rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors'
      >
        <IconLogout className='h-4 w-4' />
        Déconnexion
      </button>
    </div>
  );
}
