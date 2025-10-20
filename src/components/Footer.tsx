import Link from 'next/link';
import Image from 'next/image';
import { Twitter, Github, Linkedin, MessageCircle, Send, Globe } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-t border-purple-500/20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent"></div>
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Mission */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-6 group">
              <div className="relative">
                <Image
                  src="/logo.svg"
                  alt="StudIQ"
                  width={120}
                  height={40}
                  className="h-8 w-auto transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
            <p className="text-slate-300 text-sm max-w-md leading-relaxed">
              Empowering students through AI and DeFi financial literacy. 
              <span className="text-gradient-accent font-medium"> Learn, save, and earn</span> while building your financial future.
            </p>
            
            {/* Web3 Badge */}
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-purple-500/20 backdrop-blur-sm">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-xs text-slate-300 font-medium">Web3 Powered</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="glass-panel p-6 rounded-xl border border-purple-500/20">
            <h3 className="font-semibold text-white mb-4 text-gradient-primary">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/dashboard" className="text-slate-900 hover:text-gradient-accent text-sm transition-all duration-300 hover:translate-x-1 inline-block group">
                  <span className="relative">
                    Dashboard
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/ai-tutor" className="text-slate-900 hover:text-gradient-accent text-sm transition-all duration-300 hover:translate-x-1 inline-block group">
                  <span className="relative">
                    AI Tutor
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/pools" className="text-slate-900 hover:text-gradient-accent text-sm transition-all duration-300 hover:translate-x-1 inline-block group">
                  <span className="relative">
                    Savings Pools
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/stores" className="text-slate-900 hover:text-gradient-accent text-sm transition-all duration-300 hover:translate-x-1 inline-block group">
                  <span className="relative">
                    Campus Store
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="glass-panel p-6 rounded-xl border border-purple-500/20">
            <h3 className="font-semibold text-white mb-4 text-gradient-primary">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-slate-900 hover:text-gradient-accent text-sm transition-all duration-300 hover:translate-x-1 inline-block group">
                  <span className="relative">
                    Help Center
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                  </span>
                </Link>
              </li>
              <li>
                <Link href="#" className="text-slate-900 hover:text-gradient-accent text-sm transition-all duration-300 hover:translate-x-1 inline-block group">
                  <span className="relative">
                    Security
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                  </span>
                </Link>
              </li>
              <li>
                <Link href="#" className="text-slate-900 hover:text-gradient-accent text-sm transition-all duration-300 hover:translate-x-1 inline-block group">
                  <span className="relative">
                    Privacy Policy
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                  </span>
                </Link>
              </li>
              <li>
                <Link href="#" className="text-slate-900 hover:text-gradient-accent text-sm transition-all duration-300 hover:translate-x-1 inline-block group">
                  <span className="relative">
                    Terms of Service
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-purple-500/20">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-slate-400 text-sm">
              © 2025 StudIQ. All rights reserved. 
              <span className="text-gradient-accent font-medium ml-1">Built for students, by students.</span>
            </p>
            
            {/* Social Media Links */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Status Indicator */}
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Secure & Decentralized</span>
              </div>
              
              {/* Social Icons */}
              <div className="flex items-center space-x-4">
                <Link 
                  href="https://twitter.com/studiq" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-2 rounded-lg bg-gradient-to-r from-slate-800/50 to-purple-800/50 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-110"
                >
                  <Twitter className="h-4 w-4 text-slate-400 group-hover:text-blue-400 transition-colors duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                
                <Link 
                  href="https://github.com/studiq" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-2 rounded-lg bg-gradient-to-r from-slate-800/50 to-purple-800/50 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-110"
                >
                  <Github className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                
                <Link 
                  href="https://linkedin.com/company/studiq" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-2 rounded-lg bg-gradient-to-r from-slate-800/50 to-purple-800/50 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-110"
                >
                  <Linkedin className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                
                <Link 
                  href="https://discord.gg/studiq" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-2 rounded-lg bg-gradient-to-r from-slate-800/50 to-purple-800/50 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-110"
                >
                  <MessageCircle className="h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition-colors duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                
                <Link 
                  href="https://t.me/studiq" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-2 rounded-lg bg-gradient-to-r from-slate-800/50 to-purple-800/50 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-110"
                >
                  <Send className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 transition-colors duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                
                <Link 
                  href="https://studiq.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-2 rounded-lg bg-gradient-to-r from-slate-800/50 to-purple-800/50 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-110"
                >
                  <Globe className="h-4 w-4 text-slate-400 group-hover:text-green-400 transition-colors duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}