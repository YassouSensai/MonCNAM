import { IconBell } from '@tabler/icons-react';

export default function NotificationsPage() {
  return (
    <div className='space-y-4 max-w-2xl'>
      <div className='rounded-xl border bg-card p-6'>
        <h2 className='font-semibold text-lg mb-1'>Notifications</h2>
        <p className='text-sm text-muted-foreground'>
          Alertes et informations concernant vos présences.
        </p>
      </div>

      <div className='rounded-xl border bg-card p-12 flex flex-col items-center gap-3 text-center'>
        <IconBell className='h-10 w-10 text-muted-foreground/40' />
        <p className='text-sm text-muted-foreground'>Aucune notification pour le moment.</p>
      </div>
    </div>
  );
}
