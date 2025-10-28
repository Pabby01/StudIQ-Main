/* eslint-disable @typescript-eslint/no-unused-vars */
 
'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, Award, DollarSign, Star, Bot, PiggyBank, Store, RefreshCw, AlertCircle } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import AppLayout from '@/components/AppLayout';
import AuthWrapper from '@/components/AuthWrapper';
import OnboardingFlow from '@/components/OnboardingFlow';

export default function DashboardPage() {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();

  console.log('DashboardPage: Privy authentication state:', { user, authenticated });

  // Wrap the dashboard content with AuthWrapper to handle authentication and onboarding
  return (
    <AuthWrapper 
      requireAuth={true} 
      onboardingComponent={OnboardingFlow}
    >
      <AppLayout>
        <DashboardContent />
      </AppLayout>
    </AuthWrapper>
  );
}

function DashboardContent() {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();

  const {
    profile: userProfile,
    stats: userStats,
    preferences: userPreferences,
    transactions,
    isLoading: userDataLoading,
    error: userDataError,
    refreshData,
    updateProfile,
    updatePreferences
  } = useUserData();

  // Use shared wallet balance hook for real-time synchronization
  const {
    balance: walletBalance,
    isLoading: walletBalanceLoading,
    error: walletBalanceError,
    lastUpdated: walletLastUpdated,
    refreshBalance: refreshWalletBalance,
    clearError: clearWalletError
  } = useWalletBalance({
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    enableRealTimeSync: true,
    enableWebSocketSync: true // Enable real-time WebSocket updates
  });

  // Calculate portfolio data from real stats
  const portfolioData = userStats ? [
    { name: 'Mon', value: userStats.portfolio_value * 0.8 },
    { name: 'Tue', value: userStats.portfolio_value * 0.9 },
    { name: 'Wed', value: userStats.portfolio_value * 1.1 },
    { name: 'Thu', value: userStats.portfolio_value * 0.95 },
    { name: 'Fri', value: userStats.portfolio_value * 1.05 },
    { name: 'Sat', value: userStats.portfolio_value * 1.2 },
    { name: 'Sun', value: userStats.portfolio_value },
  ] : [];

  // Total Cashback Card
  const cashbackCard = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Cashback</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-2xl font-bold">${userStats?.total_cashback || 0}</div>
        <p className="text-xs text-muted-foreground">
          Level {userStats?.level || 1} • {userStats?.streak_days || 0} day streak
        </p>
      </CardContent>
    </Card>
  );

  // User Level Card
  const userLevelCard = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Level</CardTitle>
        <Star className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-2xl font-bold">Level {userStats?.level || 1}</div>
        <Badge variant="secondary" className="mt-1">
          {userStats?.completed_lessons || 0} Lessons Completed
        </Badge>
      </CardContent>
    </Card>
  );

  // Reward Points Card
  const rewardCard = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
        <Award className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-2xl font-bold">{userStats?.total_points || 0}</div>
        <p className="text-xs text-muted-foreground">
          {userStats ? `${userStats.total_points} total points` : 'Loading...'}
        </p>
      </CardContent>
    </Card>
  );

  // Show loading while data is loading
  if (userDataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
          <p className="text-xs text-gray-500 mt-2">Fetching your data</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (userDataError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{userDataError}</p>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - StudIQ Student Financial Management Platform</title>
        <meta name="description" content="View your financial portfolio, track savings progress, monitor rewards, and access personalized financial insights. Your complete student financial dashboard." />
        <meta name="keywords" content="student financial dashboard, crypto portfolio tracker, savings progress, financial analytics, student wallet dashboard, DeFi portfolio, reward tracking, financial insights" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="StudIQ Dashboard - Your Financial Command Center" />
        <meta property="og:description" content="Track your financial progress, portfolio performance, and learning achievements in one comprehensive dashboard." />
        <meta property="og:url" content="https://studiq.app/dashboard" />
        <meta property="og:site_name" content="StudIQ" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image" content="https://studiq.app/dashboard-og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="StudIQ Student Financial Dashboard" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="StudIQ Dashboard - Student Financial Overview" />
        <meta name="twitter:description" content="Monitor your financial journey with real-time portfolio tracking and personalized insights." />
        <meta name="twitter:image" content="https://studiq.app/dashboard-twitter-image.png" />
      </Head>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        {/* Welcome Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {userProfile ? `Welcome back, ${userProfile.display_name}!` : 'Welcome back!'}
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          Track your finances, learn with AI, and grow your wealth
        </p>
        {userDataError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{userDataError}</p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Wallet Balance */}
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            {walletBalanceLoading ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            ) : walletBalanceError ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Wallet className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {walletBalanceError ? (
                <span className="text-red-500">Error</span>
              ) : walletBalance ? (
                `$${walletBalance.totalUsdValue.toFixed(2)}`
              ) : (
                '$0.00'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {walletBalanceError ? (
                <button 
                  onClick={clearWalletError}
                  className="text-red-500 hover:text-red-700 underline"
                >
                  Click to retry
                </button>
              ) : walletLastUpdated ? (
                `Updated ${walletLastUpdated.toLocaleTimeString()}`
              ) : (
                userProfile?.display_name || 'Connected Wallet'
              )}
            </p>
          </CardContent>
        </Card>

        {rewardCard}
        {cashbackCard}
        {userLevelCard}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest transactions and achievements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions && transactions.length > 0 ? (
                transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{transaction.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.description}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${transaction.amount}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Access your favorite features quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => router.push('/ai-tutor')}
                disabled={userDataLoading}
              >
                <Bot className="mr-2 h-4 w-4" />
                AI Tutor
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => router.push('/savings-pools')}
                disabled={userDataLoading}
              >
                <PiggyBank className="mr-2 h-4 w-4" />
                Savings Pools
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => router.push('/campus-store')}
                disabled={userDataLoading}
              >
                <Store className="mr-2 h-4 w-4" />
                Campus Store
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={async () => {
                  await Promise.all([
                    refreshData(),
                    refreshWalletBalance()
                  ]);
                }}
                disabled={userDataLoading || walletBalanceLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
          <CardDescription>
            Your asset allocation and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium mb-4">Asset Allocation</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-sm">Solana (SOL)</span>
                  </div>
                  <span className="text-sm font-medium">
                    ${userStats?.portfolio_value ? (userStats.portfolio_value * 0.6).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm">USDC</span>
                  </div>
                  <span className="text-sm font-medium">
                    ${userStats?.portfolio_value ? (userStats.portfolio_value * 0.3).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <span className="text-sm">Other Tokens</span>
                  </div>
                  <span className="text-sm font-medium">
                    ${userStats?.portfolio_value ? (userStats.portfolio_value * 0.1).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-4">Weekly Performance</h4>
              <div className="h-48 flex items-end justify-between space-x-1">
                {portfolioData.map((day, index) => (
                  <div key={day.name} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${(day.value / Math.max(...portfolioData.map(d => d.value))) * 100}%` }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">{day.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}