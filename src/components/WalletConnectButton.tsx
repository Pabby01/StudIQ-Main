/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { secureLogger } from '@/lib/secure-logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Wallet, 
  ChevronDown, 
  Copy, 
  ExternalLink, 
  LogOut,
  User,
  Mail,
  Phone,
  Settings,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function WalletConnectButton() {
  const {
    isReady,
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    walletAddress,
    hasWallet
  } = useAuth();

  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');

  const handleConnect = async () => {
    try {
      await login();
      toast.success('Wallet connected successfully!');
    } catch (error) {
      secureLogger.error('Login failed', error);
      toast.error('Failed to connect wallet. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Wallet disconnected successfully!');
    } catch (error) {
      secureLogger.error('Logout failed', error);
      toast.error('Failed to disconnect wallet. Please try again.');
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!text) {
      toast.error('No wallet address available to copy');
      return;
    }

    setCopyState('copying');
    
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      toast.success('Wallet address copied to clipboard!');
      
      // Reset copy state after 2 seconds
      setTimeout(() => {
        setCopyState('idle');
      }, 2000);
    } catch (error) {
      setCopyState('idle');
      secureLogger.error('Failed to copy to clipboard', error);
      toast.error('Failed to copy address. Please try again.');
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const openSolscanExplorer = (address: string) => {
    if (!address) {
      toast.error('No wallet address available');
      return;
    }

    try {
      const url = `https://solscan.io/account/${address}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Opening Solscan explorer...');
    } catch (error) {
      secureLogger.error('Failed to open Solscan explorer', error);
      toast.error('Failed to open explorer. Please try again.');
    }
  };

  // Loading state
  if (!isReady) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Not authenticated - show connect button
  if (!isAuthenticated) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleConnect}
        disabled={isLoading}
        className="min-w-[120px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </>
        )}
      </Button>
    );
  }

  // Handle case where user is authenticated but no wallet address
  if (!walletAddress) {
    return (
      <Button variant="outline" size="sm" disabled>
        <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
        No Wallet
      </Button>
    );
  }

  // Authenticated - show user info
  const displayText = user?.displayName || formatAddress(walletAddress || '');
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <User className="h-4 w-4 mr-2" />
          {displayText}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Account</span>
          {user?.isNewUser && (
            <Badge variant="secondary" className="text-xs">
              New
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* User Profile Info */}
        {user && (
          <>
            <DropdownMenuItem disabled className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                {user.avatar || user.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{user.displayName}</div>
                {walletAddress && (
                  <div className="text-xs text-gray-500">{formatAddress(walletAddress)}</div>
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Wallet Address */}
        {walletAddress && (
          <DropdownMenuItem 
            onClick={() => copyToClipboard(walletAddress)}
            className="font-mono text-xs"
          >
            {copyState === 'copying' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : copyState === 'copied' ? (
              <Check className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            <span className="truncate">{walletAddress}</span>
          </DropdownMenuItem>
        )}
        
        {/* Account Info */}
        {user?.email && (
          <DropdownMenuItem disabled>
            <Mail className="h-4 w-4 mr-2" />
            {user.email}
          </DropdownMenuItem>
        )}
        
        {user?.phone && (
          <DropdownMenuItem disabled>
            <Phone className="h-4 w-4 mr-2" />
            {user.phone}
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Navigation Links */}
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <Settings className="h-4 w-4 mr-2" />
            Profile Settings
          </Link>
        </DropdownMenuItem>
        
        {walletAddress && (
          <DropdownMenuItem 
            onClick={() => openSolscanExplorer(walletAddress)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Solscan
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
          <LogOut className="h-4 w-4 mr-2" />
          {isLoading ? 'Signing out...' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
