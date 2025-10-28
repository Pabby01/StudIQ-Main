/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWalletConnection, useWalletErrors } from '@/contexts/SolflareWalletContext';
import { Wallet, WalletIcon, Loader2, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { formatAddress } from '@/lib/wallet-data';
import { toast } from 'react-hot-toast';

interface SolflareWalletButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showBalance?: boolean;
  showAddress?: boolean;
  className?: string;
}

/**
 * Solflare Wallet Connection Button Component
 * Handles wallet connection, disconnection, and displays connection status
 */
export function SolflareWalletButton({
  variant = 'default',
  size = 'md',
  showBalance = true,
  showAddress = true,
  className = ''
}: SolflareWalletButtonProps) {
  const { isConnected, publicKey, balance, isConnecting, connect, disconnect } = useWalletConnection();
  const { error, clearError } = useWalletErrors();
  const [showFullAddress, setShowFullAddress] = useState(false);

  const handleConnect = async () => {
    try {
      clearError();
      await connect();
      toast.success('Solflare wallet connected successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      toast.error(errorMessage);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success('Wallet disconnected');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect wallet';
      toast.error(errorMessage);
    }
  };

  const copyAddress = async () => {
    if (publicKey) {
      try {
        await navigator.clipboard.writeText(publicKey.toString());
        toast.success('Address copied to clipboard');
      } catch (err) {
        toast.error('Failed to copy address');
      }
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 px-3 text-sm';
      case 'lg':
        return 'h-12 px-6 text-lg';
      default:
        return 'h-10 px-4';
    }
  };

  // If not connected, show connect button
  if (!isConnected) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          variant={variant}
          className={`${getSizeClasses()} flex items-center gap-2`}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <WalletIcon className="h-4 w-4" />
              Connect Solflare
            </>
          )}
        </Button>
        
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-auto h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        )}
      </div>
    );
  }

  // If connected, show wallet info and disconnect option
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Solflare Connected</span>
          </div>
          
          {showAddress && publicKey && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-green-700 font-mono">
                {showFullAddress ? publicKey.toString() : formatAddress(publicKey.toString())}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullAddress(!showFullAddress)}
                className="h-5 w-5 p-0 text-green-600 hover:text-green-800"
              >
                {showFullAddress ? '−' : '+'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-5 w-5 p-0 text-green-600 hover:text-green-800"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {showBalance && (
            <div className="text-xs text-green-700 mt-1">
              Balance: {balance.toFixed(4)} SOL
            </div>
          )}
        </div>
        
        <Button
          onClick={handleDisconnect}
          variant="outline"
          size="sm"
          className="text-green-700 border-green-300 hover:bg-green-100"
        >
          Disconnect
        </Button>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
            className="ml-auto h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  );
}

export default SolflareWalletButton;