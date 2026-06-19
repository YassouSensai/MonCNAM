import LoginForm from '../_components/login-form';

export const metadata = { title: 'MonCNAM – Connexion' };

export default function LoginPage() {
  return (
    <>
      <div className='mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]'>
        <div className='space-y-2 text-center'>
          <h1 className='text-3xl font-medium'>Connexion à votre compte</h1>
          <p className='text-muted-foreground text-sm'>
            Veuillez saisir vos identifiants pour continuer.
          </p>
        </div>
        <LoginForm />
      </div>

      <div className='absolute bottom-5 flex w-full justify-between px-10'>
        <div className='text-sm text-muted-foreground'>© 2025 CNAM – Tous droits réservés.</div>
      </div>
    </>
  );
}
