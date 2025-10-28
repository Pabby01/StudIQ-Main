/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWalletConnection } from '@/contexts/SolflareWalletContext';
import { 
  Wallet, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Eye, 
  EyeOff,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp
} from 'lucide-react';
import { formatAddress } from '@/lib/wallet-data';
import { toast } from 'react-hot-toast';

interface SolflareWalletStatusProps {
  showNetworkInfo?: boolean;
  className?: string;
}

/**
 * Solflare Wallet Status Component
 * Displays comprehensive wallet information including connection status, balance, and network details
 */
export function SolflareWalletStatus({
  showNetworkInfo = true,
  className = ''
}: SolflareWalletStatusProps) {
  const { 
    isConnected, 
    publicKey, 
    balance, 
    network, 
    updateBalance,
    isConnecting 
  } = useWalletConnection();
  
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (isConnected) {
      setLastUpdated(new Date());
    }
  }, [isConnected, balance]);

  const handleRefreshBalance = async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      await updateBalance();
      setLastUpdated(new Date());
      toast.success('Balance updated');
    } catch (_error) {
      toast.error('Failed to refresh balance');
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyAddress = async () => {
    if (publicKey) {
      try {
        await navigator.clipboard.writeText(publicKey.toString());
        toast.success('Address copied to clipboard');
      } catch (_err) {
        toast.error('Failed to copy address');
      }
    }
  };

  const openInExplorer = () => {
    if (publicKey) {
      const explorerUrl = `https://explorer.solana.com/address/${publicKey.toString()}${
        network === 'devnet' ? '?cluster=devnet' : ''
      }`;
      window.open(explorerUrl, '_blank');
    }
  };

  const getNetworkBadgeColor = () => {
    switch (network) {
      case 'mainnet-beta':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'devnet':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'testnet':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 text-gray-500">
            <WifiOff className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">Wallet Not Connected</div>
              <div className="text-sm">Connect your Solflare wallet to view status</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Solflare Wallet Status
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-green-600" />
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Connected
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Wallet Address</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullAddress(!showFullAddress)}
                className="h-6 w-6 p-0"
              >
                {showFullAddress ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={openInExplorer}
                className="h-6 w-6 p-0"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="font-mono text-sm bg-gray-50 p-2 rounded border">
            {publicKey && (showFullAddress ? publicKey.toString() : formatAddress(publicKey.toString()))}
          </div>
        </div>

        {/* Balance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">SOL Balance</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshBalance}
              disabled={isRefreshing}
              className="h-6 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-gray-900">
              {balance.toFixed(6)} SOL
            </div>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
        </div>

        {/* Network Info */}
        {showNetworkInfo && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Network</span>
            <div className="flex items-center gap-2">
              <Badge className={getNetworkBadgeColor()}>
                {network === 'mainnet-beta' ? 'Mainnet' : network.charAt(0).toUpperCase() + network.slice(1)}
              </Badge>
              {network !== 'mainnet-beta' && (
                <span className="text-xs text-amber-600">
                  ⚠️ Test Network
                </span>
              )}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last updated: {formatLastUpdated()}
          </div>
          {isConnecting && (
            <div className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Syncing...
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openInExplorer}
            className="flex-1"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Explorer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyAddress}
            className="flex-1"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshBalance}
            disabled={isRefreshing}
            className="flex-1"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SolflareWalletStatus;