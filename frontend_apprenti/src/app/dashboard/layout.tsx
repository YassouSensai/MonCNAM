import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import AuthGuard from '@/components/layout/auth-guard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className='flex min-h-screen'>
        <AppSidebar />
        <div className='flex flex-col flex-1 min-w-0'>
          <Header />
          <main className='flex-1 p-4 lg:p-6'>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
