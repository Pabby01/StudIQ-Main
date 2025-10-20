'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowRight, Sparkles } from 'lucide-react';

const navigation = [
  { name: 'Features', href: '#features' },
  { name: 'How it Works', href: '#how-it-works' },
  { name: 'About', href: '#about' },
];

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'glass-panel-strong backdrop-blur-xl border-b border-purple-500/20 shadow-glow-purple' 
        : 'glass-nav backdrop-blur-sm'
    }`}>
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-purple-900/60 to-slate-900/80"></div>
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Image
                src="/logo.svg"
                alt="StudIQ"
                width={120}
                height={40}
                className="h-8 w-auto transition-all duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            
            {/* Web3 Indicator */}
            <div className="hidden sm:flex items-center ml-2 px-2 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-purple-500/20">
              <Sparkles className="h-3 w-3 text-purple-400 mr-1" />
              <span className="text-xs text-slate-300 font-medium">Web3</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="relative text-slate-300 hover:text-white transition-all duration-300 font-medium group"
              >
                <span className="relative z-10">{item.name}</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -m-2"></div>
              </Link>
            ))}
            
            {/* CTA Button */}
            <Link href="/dashboard">
              <Button className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-glow-blue transition-all duration-300 hover:scale-105 hover:shadow-glow-purple group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 flex items-center space-x-2">
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20 backdrop-blur-sm"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-[300px] sm:w-[400px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-l border-purple-500/20 backdrop-blur-xl"
              >
                {/* Mobile menu background effects */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent"></div>
                
                <div className="relative flex flex-col space-y-6 mt-8">
                  {/* Mobile Logo */}
                  <div className="flex items-center space-x-2 pb-4 border-b border-purple-500/20">
                    <Image
                      src="/logo.svg"
                      alt="StudIQ"
                      width={100}
                      height={32}
                      className="h-6 w-auto"
                    />
                    <div className="flex items-center px-2 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-purple-500/20">
                      <Sparkles className="h-3 w-3 text-purple-400 mr-1" />
                      <span className="text-xs text-slate-300 font-medium">Web3</span>
                    </div>
                  </div>

                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-lg font-medium text-slate-300 hover:text-white transition-all duration-300 hover:translate-x-2 group"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="relative">
                        {item.name}
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                      </span>
                    </Link>
                  ))}
                  
                  <div className="pt-6 border-t border-purple-500/20">
                    <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-glow-blue transition-all duration-300 hover:shadow-glow-purple group">
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative z-10 flex items-center justify-center space-x-2">
                          <span>Get Started</span>
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}