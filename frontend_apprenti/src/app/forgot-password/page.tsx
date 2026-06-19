import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'MonCNAM – Réinitialisation du mot de passe' };

export default function ForgotPasswordPage() {
  return (
    <div className='min-h-screen flex items-center justify-center p-8'>
      <div className='max-w-sm w-full text-center space-y-6'>
        <div className='bg-[#D60028] text-white font-black text-xl px-3 py-1 rounded-md tracking-widest inline-block'>
          CNAM
        </div>
        <div>
          <h1 className='text-2xl font-bold'>Réinitialisation du mot de passe</h1>
          <p className='text-muted-foreground text-sm mt-3'>
            La réinitialisation du mot de passe en autonomie n&apos;est pas disponible.
          </p>
          <p className='text-muted-foreground text-sm mt-2'>
            Veuillez contacter la scolarité de votre établissement pour réinitialiser votre mot de passe.
          </p>
        </div>
        <Link
          href='/auth/login'
          className='inline-block rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors'
        >
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
