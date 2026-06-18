'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api';
import type { User } from '@/types';

export default function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const email = String((form.elements.namedItem('email') as HTMLInputElement).value).trim();
    const password = String((form.elements.namedItem('password') as HTMLInputElement).value);

    try {
      const res = await apiFetch<{ access_token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (!res.ok) {
        setError('Adresse e-mail ou mot de passe incorrect.');
        return;
      }

      if (res.data.user.role !== 'student') {
        setError("Ce portail est réservé aux apprentis.");
        return;
      }

      login(res.data.user, res.data.access_token);
      router.push('/dashboard/overview');
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='space-y-2'>
        <label htmlFor='email' className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          E-mail
        </label>
        <input
          id='email'
          name='email'
          type='email'
          required
          autoComplete='email'
          placeholder='apprenti@lecnam.net'
          className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
        />
      </div>

      <div className='space-y-2'>
        <label htmlFor='password' className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Mot de passe
        </label>
        <input
          id='password'
          name='password'
          type='password'
          required
          autoComplete='current-password'
          placeholder='Mot de passe'
          className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
        />
      </div>

      {error && (
        <p className='text-destructive text-sm'>{error}</p>
      )}

      <button
        type='submit'
        disabled={loading}
        className='inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
      >
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>

  );
}
