'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconHome,
  IconCalendar,
  IconScan,
  IconFolder,
  IconBell,
  IconUser,
  IconLogout,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-context';
import { useRouter } from 'next/navigation';

const navItems = [
  { title: 'Tableau de bord', href: '/dashboard/overview', icon: IconHome },
  { title: 'Emploi du temps', href: '/dashboard/schedule', icon: IconCalendar },
  { title: 'Scanner QR', href: '/dashboard/scan', icon: IconScan },
  { title: "Relevés de présence", href: '/dashboard/records', icon: IconFolder },
  { title: 'Notifications', href: '/dashboard/notifications', icon: IconBell },
  { title: 'Mon profil', href: '/dashboard/profile', icon: IconUser },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/auth/login');
  }

  return (
    <aside className='hidden lg:flex flex-col w-64 shrink-0 border-r bg-sidebar h-screen sticky top-0'>
      {/* Logo */}
      <div className='flex items-center gap-3 px-6 py-5 border-b'>
        <span className='bg-[#D60028] text-white font-black text-sm px-2 py-0.5 rounded tracking-widest'>
          CNAM
        </span>
        <span className='font-bold text-base'>MonCNAM</span>
      </div>

      {/* Navigation */}
      <nav className='flex-1 px-3 py-4 space-y-1 overflow-y-auto'>
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard/overview' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className='h-4 w-4 shrink-0' />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className='border-t px-3 py-4 space-y-1'>
        {user && (
          <div className='px-3 py-2'>
            <p className='text-sm font-medium truncate'>{user.full_name}</p>
            <p className='text-xs text-muted-foreground truncate'>{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className='flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors'
        >
          <IconLogout className='h-4 w-4 shrink-0' />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
