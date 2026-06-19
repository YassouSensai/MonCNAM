'use client';

import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { IconSun, IconMoon, IconMenu2 } from '@tabler/icons-react';
import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/auth-context';
import { useRouter } from 'next/navigation';

const titles: Record<string, string> = {
  '/dashboard/overview': 'Tableau de bord',
  '/dashboard/schedule': 'Emploi du temps',
  '/dashboard/scan': 'Scanner QR',
  '/dashboard/records': 'Relevés de présence',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/profile': 'Mon profil',
};

export default function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const title = titles[pathname] ?? 'MonCNAM';

  return (
    <>
      <header className='sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='flex h-14 items-center gap-4 px-4 lg:px-6'>
          {/* Mobile menu toggle */}
          <button
            className='lg:hidden p-1 rounded-md hover:bg-accent'
            onClick={() => setMobileOpen(true)}
            aria-label='Ouvrir le menu'
          >
            <IconMenu2 className='h-5 w-5' />
          </button>

          <h1 className='text-base font-semibold flex-1'>{title}</h1>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className='p-2 rounded-md hover:bg-accent transition-colors'
              aria-label='Changer le thème'
            >
              {theme === 'dark' ? <IconSun className='h-4 w-4' /> : <IconMoon className='h-4 w-4' />}
            </button>

            {user && (
              <div className='flex items-center gap-2 ml-2'>
                <div className='h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold'>
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className='fixed inset-0 z-50 lg:hidden'>
          <div className='absolute inset-0 bg-black/40' onClick={() => setMobileOpen(false)} />
          <aside className='absolute left-0 top-0 h-full w-64 bg-sidebar border-r flex flex-col'>
            <div className='flex items-center gap-3 px-6 py-5 border-b'>
              <span className='bg-[#D60028] text-white font-black text-sm px-2 py-0.5 rounded tracking-widest'>
                CNAM
              </span>
              <span className='font-bold text-base'>MonCNAM</span>
            </div>
            <nav className='flex-1 px-3 py-4 space-y-1'>
              {[
                { title: 'Tableau de bord', href: '/dashboard/overview' },
                { title: 'Emploi du temps', href: '/dashboard/schedule' },
                { title: 'Scanner QR', href: '/dashboard/scan' },
                { title: 'Relevés de présence', href: '/dashboard/records' },
                { title: 'Notifications', href: '/dashboard/notifications' },
                { title: 'Mon profil', href: '/dashboard/profile' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className='flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent transition-colors'
                >
                  {item.title}
                </Link>
              ))}
            </nav>
            <div className='border-t px-3 py-4'>
              <button
                onClick={() => { logout(); router.push('/auth/login'); }}
                className='flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent transition-colors'
              >
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
