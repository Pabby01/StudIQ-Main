'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import AppLayout from '@/components/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Wallet, Loader2, Send, Download, DollarSign, TrendingUp } from 'lucide-react';
import { walletDataService } from '@/lib/wallet-data';
import { userProfileManager } from '@/lib/user-data';
import { websocketService } from '@/lib/websocket-service';
import { cryptoApiService } from '@/lib/crypto-api-service';
import { securityService } from '@/lib/security-service';
import { secureLogger } from '@/lib/secure-logger';
import { BalanceDisplay, useBalanceVisibility } from '@/components/portfolio/BalanceToggle';
import { TransactionModal } from '@/components/portfolio/TransactionModal';
import { TransactionHistory } from '@/components/portfolio/TransactionHistory';
import { MarketData } from '@/components/portfolio/MarketData';
import { MobilePortfolioNavigation } from '@/components/portfolio/MobilePortfolioNavigation';
import type { WalletPortfolio, Transaction } from '@/lib/wallet-data';
import type { UserProfile } from '@/lib/user-data';

export default function PortfolioPage() {
  const { authenticated, user } = usePrivy();
  const [walletBalance, setWalletBalance] = useState<WalletPortfolio | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'send' | 'receive' | 'deposit' | 'withdraw'>('send');
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [isSessionValid, setIsSessionValid] = useState(false);
  
  const { isBalanceVisible, toggleBalanceVisibility } = useBalanceVisibility();

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };



  // Load wallet data
  const loadWalletData = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Validate session
      const sessionValid = securityService.validateSession();
      setIsSessionValid(sessionValid);
      
      if (!sessionValid) {
        secureLogger.warn('Invalid session detected');
        setError('Session expired. Please refresh the page.');
        return;
      }

      const walletAddress = user.wallet.address;

      // Load wallet balance
      const balance = await walletDataService.getWalletBalance(walletAddress);
      setWalletBalance({
        balance,
        transactions: [],
        performance: {
          dayChange: 0,
          dayChangePercent: 0,
          weekChange: 0,
          weekChangePercent: 0
        }
      });
      
      // Load user profile
      const profile = await userProfileManager.getProfile(walletAddress);
      setUserProfile(profile);
      
      // Load transactions (handled by TransactionHistory component)
      
      secureLogger.info('Portfolio data loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wallet data';
      setError(errorMessage);
      secureLogger.error('Failed to load portfolio data', { error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, user?.wallet?.address]);



  // Handle transaction modal
  const openTransactionModal = (type: 'send' | 'receive' | 'deposit' | 'withdraw') => {
    setTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  // Handle real-time updates
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address) return;

    const walletAddress = user.wallet.address;

    // Subscribe to portfolio updates
    const portfolioSubscription = websocketService.subscribeToPortfolioUpdates(
      walletAddress,
      (update) => {
        setWalletBalance(prev => prev ? { 
          ...prev, 
          balance: { 
            ...prev.balance, 
            ...update 
          } 
        } : prev);
        secureLogger.info('Portfolio updated via WebSocket');
      }
    );

    // Subscribe to transaction updates (handled by TransactionHistory component)

    // Subscribe to market data updates
    const marketSubscription = websocketService.subscribeToMarketData(
      ['SOL', 'USDC', 'USDT'],
      (marketUpdate) => {
        setMarketPrices(prev => {
          const newPrices = { ...prev };
          marketUpdate.forEach(data => {
            newPrices[data.symbol] = data.price;
          });
          return newPrices;
        });
      }
    );

    return () => {
      portfolioSubscription();
      marketSubscription();
    };
  }, [authenticated, user?.wallet?.address]);

  // Initial data load
  useEffect(() => {
    loadWalletData();
  }, [authenticated, user?.wallet?.address, loadWalletData]);

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

  const walletAddress = user?.wallet?.address;
  const displayAddress = walletAddress 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'No wallet';

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Security Warning */}
        {!isSessionValid && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <p className="text-red-800 font-medium">Security Alert</p>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portfolio</h1>
            <p className="text-muted-foreground">
              {userProfile ? userProfile.displayName : displayAddress}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => toggleBalanceVisibility()} variant="outline" size="sm">
              {isBalanceVisible ? 'Hide' : 'Show'} Balance
            </Button>
            <Button onClick={loadWalletData} disabled={isLoading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button onClick={() => openTransactionModal('send')} variant="default" className="w-full">
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
          <Button onClick={() => openTransactionModal('receive')} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Receive
          </Button>
          <Button onClick={() => openTransactionModal('deposit')} variant="outline" className="w-full">
            <DollarSign className="h-4 w-4 mr-2" />
            Deposit
          </Button>
          <Button onClick={() => openTransactionModal('withdraw')} variant="outline" className="w-full">
            <TrendingUp className="h-4 w-4 mr-2" />
            Withdraw
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
              <BalanceDisplay 
                amount={walletBalance?.balance?.totalUsdValue || 0} 
                isVisible={isBalanceVisible}
                className="text-2xl font-bold"
              />
              <p className="text-xs text-muted-foreground">
                {walletBalance?.balance && `Updated ${walletBalance.balance.lastUpdated.toLocaleTimeString()}`}
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
              <BalanceDisplay 
                amount={walletBalance?.balance?.solBalance || 0} 
                currency="SOL"
                isVisible={isBalanceVisible}
                className="text-2xl font-bold"
              />
              <p className="text-xs text-muted-foreground">
                {walletBalance?.balance && formatCurrency(walletBalance.balance.solBalance * (marketPrices['SOL'] || 89))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens</CardTitle>
              <Badge variant="secondary">
                {walletBalance?.balance ? walletBalance.balance.tokens.length : 0}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {walletBalance?.balance ? walletBalance.balance.tokens.length : 0}
              </div>
              <p className="text-xs text-muted-foreground">Different tokens</p>
            </CardContent>
          </Card>
        </div>

        {/* Market Data */}
        <MarketData symbol="SOL" />

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
            ) : walletBalance?.balance && walletBalance.balance.tokens.length > 0 ? (
              <div className="space-y-4">
                {walletBalance.balance.tokens.map((token) => (
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
                      <BalanceDisplay 
                        amount={token.uiAmount || 0} 
                        currency={token.symbol}
                        isVisible={isBalanceVisible}
                        className="font-medium"
                      />
                      <BalanceDisplay 
                        amount={token.usdValue || 0} 
                        isVisible={isBalanceVisible}
                        className="text-sm text-muted-foreground"
                      />
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

        {/* Enhanced Transaction History */}
        <TransactionHistory 
          walletAddress={walletAddress || ''}
        />

        {/* Transaction Modal */}
        <TransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          type={transactionType}
          walletAddress={walletAddress || ''}
          onTransactionComplete={loadWalletData}
          availableTokens={walletBalance?.balance?.tokens.map(token => token.symbol) || ['SOL', 'USDC', 'USDT']}
        />

        {/* Mobile Navigation */}
        <MobilePortfolioNavigation
          onQuickAction={(action) => openTransactionModal(action)}
          onRefresh={loadWalletData}
          isLoading={isLoading}
        />
      </div>
    </AppLayout>
  );
}