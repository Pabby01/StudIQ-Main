'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { walletDataService, WalletBalance, Transaction, formatCurrency, formatTokenAmount } from '@/lib/wallet-data';
import { userProfileManager, UserProfile } from '@/lib/user-data';
import AppLayout from '@/components/AppLayout';
import { 
  Wallet, 
  RefreshCw,
  Copy,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

export default function PortfolioPage() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (authenticated && wallets.length > 0) {
        const walletAddress = wallets[0].address;
        const profile = await userProfileManager.getProfile(walletAddress);
        setUserProfile(profile);
      }
    };
    
    loadProfile();
  }, [authenticated, wallets]);

  // Load wallet data
  const loadWalletData = useCallback(async () => {
    if (!authenticated || wallets.length === 0) return;
    
    setIsLoading(true);
    try {
      const solanaWallet = wallets.find(w => !w.address.startsWith('0x'));
      if (!solanaWallet) {
        setWalletBalance(null);
        setTransactions([]);
      } else {
        const walletAddress = solanaWallet.address;
        const [balance, txHistory] = await Promise.all([
          walletDataService.getWalletBalance(walletAddress),
          walletDataService.getWalletTransactions(walletAddress, 20)
        ]);
        
        setWalletBalance(balance);
        setTransactions(txHistory);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, wallets]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!authenticated) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Portfolio</h1>
            <p className="text-muted-foreground">Please connect your wallet to view your portfolio.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const solanaWallet = wallets.find(w => !w.address.startsWith('0x'));
  const wallet = solanaWallet || wallets[0];
  const displayAddress = wallet?.address 
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : 'No wallet';

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portfolio</h1>
            <p className="text-muted-foreground">
              {userProfile ? userProfile.displayName : displayAddress}
            </p>
          </div>
          <Button onClick={loadWalletData} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

      {/* Portfolio Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {walletBalance ? formatCurrency(walletBalance.totalUsdValue) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {walletBalance && `Updated ${walletBalance.lastUpdated.toLocaleTimeString()}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SOL Balance</CardTitle>
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">SOL</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {walletBalance ? walletBalance.solBalance.toFixed(4) : '0.0000'}
            </div>
            <p className="text-xs text-muted-foreground">
              {walletBalance && formatCurrency(walletBalance.solBalance * 89)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens</CardTitle>
            <Badge variant="secondary">
              {walletBalance ? walletBalance.tokens.length : 0}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {walletBalance ? walletBalance.tokens.length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Different tokens</p>
          </CardContent>
        </Card>
      </div>

      {/* Token Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Token Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading tokens...</span>
            </div>
          ) : walletBalance && walletBalance.tokens.length > 0 ? (
            <div className="space-y-4">
              {walletBalance.tokens.map((token) => (
                <div key={token.mint} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {token.symbol.slice(0, 3)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{token.name}</p>
                      <p className="text-sm text-muted-foreground">{token.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatTokenAmount(token.uiAmount || 0)} {token.symbol}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(token.usdValue || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No tokens found in this wallet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading transactions...</span>
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.signature} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'receive' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {transaction.type === 'receive' ? (
                        <ArrowDownLeft className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {transaction.type === 'receive' ? 'Received' : 'Sent'} {transaction.tokenSymbol || 'SOL'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.timestamp.toLocaleDateString()} at {transaction.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'receive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'receive' ? '+' : '-'}{formatTokenAmount(transaction.amount)} {transaction.tokenSymbol || 'SOL'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.counterparty?.slice(0, 8)}...
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(transaction.signature)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}