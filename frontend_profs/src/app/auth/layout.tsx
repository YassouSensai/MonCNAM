import type { ReactNode } from 'react';

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className='min-h-screen grid lg:grid-cols-2'>
      <div className='bg-[#D60028] hidden lg:flex flex-col justify-between p-12 text-white'>
        <div className='flex items-center gap-3'>
          <span className='bg-white text-[#D60028] font-black text-xl px-3 py-1 rounded-md tracking-widest'>
            CNAM
          </span>
          <span className='text-2xl font-bold'>MonCNAM</span>
        </div>
        <div>
          <blockquote className='text-3xl font-semibold leading-snug mb-4'>
            Démarrez vos séances, suivez les présences et traitez les justificatifs en toute simplicité.
          </blockquote>
          <p className='text-white/70 text-sm'>
            Conservatoire national des arts et métiers — Espace intervenant
          </p>
        </div>
        <p className='text-white/50 text-xs'>
          © 2025 CNAM – Tous droits réservés.
        </p>
      </div>
      <div className='flex items-center justify-center p-8'>
        {children}
      </div>
    </div>
  );
}
