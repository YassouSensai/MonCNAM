'use client';

import { useAuth } from '@/features/auth/auth-context';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const router = useRouter();

  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      router.replace('/auth/login');
    } else {
      setReady(true);
    }
  }, [token, router]);

  if (!ready) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin' />
      </div>
    );
  }

  return <>{children}</>;
}
