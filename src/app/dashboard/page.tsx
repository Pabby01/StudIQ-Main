'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { DEFAULT_USER_REWARDS } from '@/lib/data';
import { 
  Wallet, 
  TrendingUp, 
  Brain, 
  Store, 
  Award, 
  DollarSign,
  ArrowUpRight,
  Star
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  // Try to use Privy, but handle gracefully if not available
  let authenticated = true; // Default to true for demo mode
  
  try {
    const privyData = usePrivy();
    authenticated = privyData.authenticated;
  } catch {
    // Privy not available, use demo mode
    authenticated = true;
  }
  // Try to use wallets hook, but handle gracefully if not available
  let wallets: { address: string; type: string }[] = [];
  
  try {
    const walletsData = useWallets();
    wallets = walletsData.wallets;
  } catch {
    // Wallets hook not available, use demo data
    wallets = [];
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to access your dashboard
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const wallet = wallets[0];
  const address = wallet?.address;
  const displayAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'No wallet connected';

  // Mock wallet balance - in a real app, this would come from blockchain
  const mockBalance = {
    sol: 2.45,
    usdc: 156.78,
    totalUsd: 245.32
  };

  const rewards = DEFAULT_USER_REWARDS;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Here&apos;s your financial overview and learning progress
          </p>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Wallet Balance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${mockBalance.totalUsd}</div>
              <p className="text-xs text-muted-foreground">
                {displayAddress}
              </p>
            </CardContent>
          </Card>

          {/* Reward Points */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rewards.totalPoints}</div>
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
              <div className="text-2xl font-bold">₦{rewards.totalCashback}</div>
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
              <div className="text-2xl font-bold">{rewards.level}</div>
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

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asset Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Breakdown</CardTitle>
              <CardDescription>Your current asset allocation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium">SOL</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{mockBalance.sol} SOL</div>
                  <div className="text-xs text-gray-500">~$89.54</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">USDC</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{mockBalance.usdc} USDC</div>
                  <div className="text-xs text-gray-500">~$156.78</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest transactions and rewards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Cashback Earned</div>
                    <div className="text-xs text-gray-500">Campus Cafeteria</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-green-600">+₦5.50</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Pool Deposit</div>
                    <div className="text-xs text-gray-500">USDC Stable Pool</div>
                  </div>
                </div>
                <div className="text-sm font-medium">$50.00</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Brain className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">AI Lesson Completed</div>
                    <div className="text-xs text-gray-500">Compound Interest</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-purple-600">+25 pts</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}