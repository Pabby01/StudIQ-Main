'use client';

import React from 'react';
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
  Loader2
} from 'lucide-react';
import Link from 'next/link';

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

  const handleConnect = async () => {
    try {
      await login();
    } catch (error) {
      secureLogger.error('Login failed', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      secureLogger.error('Logout failed', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Loading state
  if (!isReady) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Wallet className="h-4 w-4 mr-2" />
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
            <Copy className="h-4 w-4 mr-2" />
            {walletAddress}
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
            onClick={() => window.open(`https://solscan.io/account/${walletAddress}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Explorer
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
