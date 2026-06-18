'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import * as React from 'react';
import { useAuth } from '@/stores/auth';
import type { User } from '@/types/auth';

export function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const loginState = useAuth((state) => state.login);

	return (
		<form
			className='space-y-4'
			onSubmit={async (event) => {
				event.preventDefault();
				setIsSubmitting(true);
				try {
					const form = new FormData(event.currentTarget);
					const email = String(form.get('email') ?? '');
					const password = String(form.get('password') ?? '');
					const response = await fetch('/api/auth/login', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ email, password })
					});
					const data = await response.json() as { ok: boolean; error?: string; access_token?: string; user?: User };
					if (!response.ok || !data.ok) throw new Error(data.error ?? 'Échec de la connexion');

					loginState(data.user as User);

					const next = searchParams.get('next');
					const destination =
						next && next.startsWith('/') ? next : '/dashboard/overview';
					router.replace(destination);
				} catch (error) {
					toast.error(
						error instanceof Error ? error.message : 'Impossible de se connecter.'
					);
				} finally {
					setIsSubmitting(false);
				}
			}}
		>
			<div className='space-y-2'>
				<Label htmlFor='email'>Adresse email</Label>
				<Input
					id='email'
					name='email'
					type='email'
					placeholder='admin@lecnam.net'
				/>
			</div>
			<div className='space-y-2'>
				<Label htmlFor='password'>Mot de passe</Label>
				<Input
					id='password'
					name='password'
					type='password'
					placeholder='Mot de passe'
				/>
			</div>
			<Button className='w-full cursor-pointer' type='submit' disabled={isSubmitting}>
				{isSubmitting ? 'Connexion en cours…' : 'Se connecter'}
			</Button>
		</form>
	);
}
