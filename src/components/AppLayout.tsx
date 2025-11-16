'use client';

import { Navbar } from '@/components/Navbar';
import MobileNavigation from '@/components/MobileNavigation';

interface AppLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export default function AppLayout({ children }: AppLayoutProps) {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="pt-16 pb-16 md:pb-0">
        {children}
      </main>
      
      <MobileNavigation />
    </div>
  );
}