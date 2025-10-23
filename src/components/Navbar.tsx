'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import WalletConnectButton from './WalletConnectButton';
import { Menu, Home, Brain, Coins, Store } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'AI Tutor', href: '/ai-tutor', icon: Brain },
  { name: 'Savings Pools', href: '/pools', icon: Coins },
  { name: 'Campus Store', href: '/stores', icon: Store },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
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
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gray-50 min-h-[48px]"
                  aria-label={item.name}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm whitespace-nowrap">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop Wallet Button */}
          <div className="hidden lg:block">
            <WalletConnectButton />
          </div>

          {/* Tablet Navigation (md screens) */}
          <div className="hidden md:flex lg:hidden items-center space-x-4">
            {navigation.slice(0, 3).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors duration-200 px-2 py-2 rounded-lg hover:bg-gray-50 min-h-[48px]"
                  aria-label={item.name}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
                </Link>
              );
            })}
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
                        className="flex items-center space-x-3 text-gray-600 hover:text-blue-600 transition-colors p-3 rounded-lg hover:bg-gray-50 min-h-[48px]"
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