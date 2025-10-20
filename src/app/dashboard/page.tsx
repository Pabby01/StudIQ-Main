'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/AppLayout';
import OnboardingFlow from '@/components/OnboardingFlow';
import AuthWrapper from '@/components/AuthWrapper';
import AuthErrorHandler, { AuthError } from '@/components/AuthErrorHandler';
import { DEFAULT_USER_REWARDS } from '@/lib/data';
import { userProfileManager, getGreeting, UserProfile } from '@/lib/user-data';
import { walletDataService, WalletBalance, Transaction, formatCurrency } from '@/lib/wallet-data';
import { 
  Wallet, 
  TrendingUp, 
  Brain, 
  Store, 
  Award, 
  DollarSign,
  ArrowUpRight,
  Star,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';


export default function Dashboard() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();

  const [authError] = useState<AuthError | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoadingWalletData, setIsLoadingWalletData] = useState(false);


  // Load user profile when wallet is connected
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

  // Load wallet data when wallet is connected
  useEffect(() => {
    const loadWalletData = async () => {
      if (authenticated && wallets.length > 0) {
        setIsLoadingWalletData(true);
        try {
          const solanaWallet = wallets.find(w => !w.address.startsWith('0x'));
          if (!solanaWallet) {
            // No Solana wallet; skip fetching Solana data
            return;
          }
          const walletAddress = solanaWallet.address;
          const [balance, transactions] = await Promise.all([
            walletDataService.getWalletBalance(walletAddress),
            walletDataService.getWalletTransactions(walletAddress, 5)
          ]);
          
          setWalletBalance(balance);
          setRecentTransactions(transactions);
        } catch (error) {
          console.error('Failed to load wallet data:', error);
        } finally {
          setIsLoadingWalletData(false);
        }
      }
    };

    loadWalletData();
  }, [authenticated, wallets]);

  // Show loading while Privy is initializing
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    // The component will automatically re-render and show the authenticated dashboard
    // once the user is authenticated through the onboarding flow
  };

  // Show onboarding if not authenticated
  if (!authenticated) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 md:py-8">
          <AuthWrapper>
            <AuthErrorHandler error={authError} className="mb-4" />
            <OnboardingFlow onComplete={handleOnboardingComplete} />
          </AuthWrapper>
        </div>
      </AppLayout>
    );
  }

  const solanaWallet = wallets.find(w => !w.address.startsWith('0x'));
  const wallet = solanaWallet || wallets[0];
  const address = wallet?.address;
  const displayAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'No wallet connected';

  // Use real wallet balance or fallback to mock data
  const balance = walletBalance || {
    solBalance: 2.45,
    totalUsdValue: 245.32,
    tokens: [
      {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        name: 'USD Coin',
        balance: 156780000,
        decimals: 6,
        uiAmount: 156.78,
        usdValue: 156.78,
      }
    ],
    lastUpdated: new Date(),
  };

  const rewards = DEFAULT_USER_REWARDS;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Welcome Header */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {userProfile ? getGreeting(userProfile.displayName) : 'Good day, Welcome back!'}
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Track your finances, learn with AI, and grow your wealth
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
          {/* Wallet Balance */}
          <Card className="col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              {isLoadingWalletData ? (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Wallet className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">
                {formatCurrency(balance.totalUsdValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {userProfile ? userProfile.displayName : displayAddress}
              </p>
              {walletBalance && (
                <p className="text-xs text-gray-400 mt-1">
                  Updated {walletBalance.lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Reward Points */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{rewards.totalPoints}</div>
              <p className="text-xs text-muted-foreground">
                {rewards.nextLevelPoints - rewards.totalPoints} to {rewards.level === 'Bronze' ? 'Silver' : 'Gold'}
              </p>
            </CardContent>
          </Card>

          {/* Total Cashback */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cashback</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">₦{rewards.totalCashback}</div>
              <p className="text-xs text-muted-foreground">
                This month: ₦12.50
              </p>
            </CardContent>
          </Card>

          {/* User Level */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Level</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{rewards.level}</div>
              <Badge variant="secondary" className="mt-1">
                Student Tier
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* AI Tutor Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/ai-tutor">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Brain className="h-8 w-8 text-blue-600" />
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </div>
                <CardTitle>AI Financial Tutor</CardTitle>
                <CardDescription>
                  Get personalized financial advice and learn new concepts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  Start Learning
                </Button>
              </CardContent>
            </Link>
          </Card>

          {/* Savings Pools Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/pools">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </div>
                <CardTitle>Savings Pools</CardTitle>
                <CardDescription>
                  Explore DeFi opportunities with up to 12.3% APY
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  View Pools
                </Button>
              </CardContent>
            </Link>
          </Card>

          {/* Campus Store Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/stores">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Store className="h-8 w-8 text-orange-600" />
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </div>
                <CardTitle>Campus Store</CardTitle>
                <CardDescription>
                  Earn cashback from your favorite campus merchants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Browse Stores
                </Button>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
          {/* Portfolio Overview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Portfolio Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingWalletData ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2 text-sm md:text-base">Loading portfolio...</span>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {/* SOL Balance */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">SOL</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm md:text-base">Solana</p>
                        <p className="text-xs md:text-sm text-gray-500">SOL</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm md:text-base">{balance.solBalance.toFixed(4)} SOL</p>
                      <p className="text-xs md:text-sm text-gray-500">{formatCurrency(balance.solBalance * 100)}</p>
                    </div>
                  </div>
                  
                  {/* Other Tokens */}
                  {walletBalance?.tokens.filter(token => token.symbol !== 'SOL').map((token, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{token.symbol.slice(0, 2)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm md:text-base">{token.name}</p>
                          <p className="text-xs md:text-sm text-gray-500">{token.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm md:text-base">{token.balance.toFixed(4)} {token.symbol}</p>
                        <p className="text-xs md:text-sm text-gray-500">{formatCurrency(token.usdValue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Recent Activity</CardTitle>
              <CardDescription>Your latest transactions and rewards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              {isLoadingWalletData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm md:text-base">Loading transactions...</span>
                </div>
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div key={transaction.signature} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'receive' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <TrendingUp className={`h-4 w-4 ${
                          transaction.type === 'receive' ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <div className="text-sm md:text-base font-medium">
                          {transaction.type === 'receive' ? 'Received' : 'Sent'} {transaction.tokenSymbol || 'SOL'}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500">
                          {transaction.type === 'receive' ? 'From' : 'To'}: {transaction.counterparty?.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm md:text-base font-medium ${
                        transaction.type === 'receive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'receive' ? '+' : '-'}{transaction.amount.toFixed(4)} {transaction.tokenSymbol || 'SOL'}
                      </div>
                      <div className="text-xs md:text-sm text-gray-500">
                        {transaction.timestamp.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm md:text-base font-medium">Cashback Earned</div>
                        <div className="text-xs md:text-sm text-gray-500">Campus Cafeteria</div>
                      </div>
                    </div>
                    <div className="text-sm md:text-base font-medium text-green-600">+₦5.50</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm md:text-base font-medium">Pool Deposit</div>
                        <div className="text-xs md:text-sm text-gray-500">USDC Stable Pool</div>
                      </div>
                    </div>
                    <div className="text-sm md:text-base font-medium">$50.00</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Brain className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm md:text-base font-medium">AI Lesson Completed</div>
                        <div className="text-xs md:text-sm text-gray-500">Compound Interest</div>
                      </div>
                    </div>
                    <div className="text-sm md:text-base font-medium text-purple-600">+25 pts</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}