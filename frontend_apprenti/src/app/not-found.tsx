'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  return (
    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center space-y-4'>
      <span className='from-foreground bg-linear-to-b to-transparent bg-clip-text text-[10rem] leading-none font-extrabold text-transparent block'>
        404
      </span>
      <h2 className='text-2xl font-bold'>Page introuvable</h2>
      <p className='text-muted-foreground text-sm'>
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className='flex gap-2 justify-center mt-4'>
        <button
          onClick={() => router.back()}
          className='rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity'
        >
          Retour
        </button>
        <button
          onClick={() => router.push('/dashboard/overview')}
          className='rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors'
        >
          Accueil
        </button>
      </div>
    </div>
  );
}
