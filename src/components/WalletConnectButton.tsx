'use client';

import React, { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
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
  Plus,
  User,
  Mail,
  Phone
} from 'lucide-react';

export default function WalletConnectButton() {
  const { 
    ready, 
    authenticated, 
    user, 
    login, 
    logout, 
    createWallet
  } = usePrivy();
  
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    setIsLoading(true);
    try {
      await createWallet();
    } catch (error) {
      console.error('Wallet creation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Loading state
  if (!ready) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Wallet className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  // Not authenticated - show connect button
  if (!authenticated) {
    return (
      <Button 
        onClick={handleConnect} 
        variant="outline" 
        size="sm"
        disabled={isLoading}
      >
        <Wallet className="h-4 w-4 mr-2" />
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  // Authenticated but no wallets - show create wallet option
  if (authenticated && wallets.length === 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <User className="h-4 w-4 mr-2" />
            {user?.email?.address || user?.phone?.number || 'Account'}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {user?.email && (
            <DropdownMenuItem disabled>
              <Mail className="h-4 w-4 mr-2" />
              {user.email.address}
            </DropdownMenuItem>
          )}
          
          {user?.phone && (
            <DropdownMenuItem disabled>
              <Phone className="h-4 w-4 mr-2" />
              {user.phone.number}
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleCreateWallet} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            {isLoading ? 'Creating...' : 'Create Wallet'}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Authenticated with wallets - show wallet info
  const primaryWallet = wallets[0];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Wallet className="h-4 w-4 mr-2" />
          {formatAddress(primaryWallet.address)}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Wallet Connected</span>
          <Badge variant="secondary" className="text-xs">
            {primaryWallet.walletClientType}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Wallet Address */}
        <DropdownMenuItem 
          onClick={() => copyToClipboard(primaryWallet.address)}
          className="font-mono text-xs"
        >
          <Copy className="h-4 w-4 mr-2" />
          {primaryWallet.address}
        </DropdownMenuItem>
        
        {/* Account Info */}
        {user?.email && (
          <DropdownMenuItem disabled>
            <Mail className="h-4 w-4 mr-2" />
            {user.email.address}
          </DropdownMenuItem>
        )}
        
        {user?.phone && (
          <DropdownMenuItem disabled>
            <Phone className="h-4 w-4 mr-2" />
            {user.phone.number}
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Additional Wallets */}
        {wallets.length > 1 && (
          <>
            <DropdownMenuLabel>Other Wallets ({wallets.length - 1})</DropdownMenuLabel>
            {wallets.slice(1, 3).map((wallet) => (
              <DropdownMenuItem 
                key={wallet.address}
                onClick={() => copyToClipboard(wallet.address)}
                className="font-mono text-xs"
              >
                <Wallet className="h-4 w-4 mr-2" />
                {formatAddress(wallet.address)}
              </DropdownMenuItem>
            ))}
            {wallets.length > 3 && (
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground">
                  +{wallets.length - 3} more wallets
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Actions */}
        <DropdownMenuItem onClick={handleCreateWallet} disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          {isLoading ? 'Creating...' : 'Add Wallet'}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => window.open(`https://etherscan.io/address/${primaryWallet.address}`, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View on Explorer
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}