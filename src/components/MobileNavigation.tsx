'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
  Home, 
  TrendingUp, 
  Wallet, 
  GraduationCap, 
  User 
} from 'lucide-react';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Markets',
    href: '/markets',
    icon: TrendingUp,
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: Wallet,
  },
  {
    name: 'Learn',
    href: '/ai-tutor',
    icon: GraduationCap,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
];

export default function MobileNavigation() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <nav className="flex items-center justify-around py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center px-3 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 mb-1',
                isActive ? 'text-blue-600' : 'text-gray-500'
              )} />
              <span className={cn(
                'text-xs',
                isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}