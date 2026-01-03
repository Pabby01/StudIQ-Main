
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import WalletConnectButton from './WalletConnectButton';
import { Menu, Home, Brain, Coins, Store, ShoppingBagIcon, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Sun, Moon } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'AI Tutor', href: '/ai-tutor', icon: Brain },
  { name: 'Markets', href: '/markets', icon: TrendingUp },
  { name: 'Savings Pools', href: '/pools', icon: Coins },
  { name: 'Campus Store', href: 'https://store.studiq.fun', icon: Store, external: true },
  { name: 'Portfolio', href: '/portfolio', icon: ShoppingBagIcon },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  const applyTheme = (nextTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    const isDark = nextTheme === 'dark' || (nextTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', !!isDark);
    try {
      localStorage.setItem('studiq_theme', nextTheme);
    } catch { }
    setTheme(nextTheme);
  };

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('studiq_theme') as 'light' | 'dark' | 'system' | null) || null;
      const initial = saved ?? 'system';
      setTheme(initial);
      applyTheme(initial);
    } catch {
      setTheme('system');
      applyTheme('system');
    }
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
            <Image
              src="/logo.jpg"
              alt="StudIQ"
              width={120}
              height={40}
              className="h-8 w-auto rounded-xl"
            />
          </Link>

          {/* Desktop Navigation - Enhanced for laptop screens */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;

              if (item.external) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[48px]"
                    aria-label={item.name}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium text-sm whitespace-nowrap">{item.name}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[48px]"
                  aria-label={item.name}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm whitespace-nowrap">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop Wallet Button with Display Name */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated && user?.displayName && (
              <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-[220px]">{user.displayName}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-label="Toggle theme"
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                applyTheme(next);
              }}
            >
              <Sun className="h-4 w-4 hidden dark:block" />
              <Moon className="h-4 w-4 dark:hidden" />
            </Button>
            <WalletConnectButton />
          </div>

          {/* Tablet Navigation (md screens) */}
          <div className="hidden md:flex lg:hidden items-center space-x-4">
            {navigation.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[48px]"
                  aria-label={item.name}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
                </Link>
              );
            })}
            {isAuthenticated && user?.displayName && (
              <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-[160px]">{user.displayName}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-label="Toggle theme"
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                applyTheme(next);
              }}
            >
              <Sun className="h-4 w-4 hidden dark:block" />
              <Moon className="h-4 w-4 dark:hidden" />
            </Button>
            <WalletConnectButton />
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center space-x-2">
            <WalletConnectButton />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[48px] min-w-[48px] touch-manipulation"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col space-y-4 mt-8">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center space-x-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[48px]"
                        aria-label={item.name}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}