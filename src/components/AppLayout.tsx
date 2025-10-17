'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import MobileNavigation from '@/components/MobileNavigation';

interface AppLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export default function AppLayout({ children, showFooter = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pb-16 md:pb-0">
        {children}
      </main>
      {showFooter && <Footer />}
      <MobileNavigation />
    </div>
  );
}