'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Filter, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useMarketData } from '@/hooks/useMarketData';
import { MarketTable } from '@/components/market/MarketTable';
import { MarketStats } from '@/components/market/MarketStats';

import { ClientSEO } from '@/lib/seo-utils';
import AppLayout from '@/components/AppLayout';

// SEO Metadata
const seoMetadata = {
  title: 'Markets - Cryptocurrency Prices & Market Data | StudIQ',
  description: 'Real-time cryptocurrency prices, market data, and price charts. Track Bitcoin, Ethereum, Solana and other crypto assets with live market updates.',
  keywords: 'cryptocurrency prices, crypto market data, Bitcoin price, Ethereum price, Solana price, live crypto prices, market cap, trading volume',
  openGraph: {
    title: 'Markets - Cryptocurrency Prices & Market Data',
    description: 'Real-time cryptocurrency prices and market data for Bitcoin, Ethereum, Solana and more.',
    url: 'https://studiq.app/markets',
    siteName: 'StudIQ',
    images: [
      {
        url: 'https://studiq.app/og-markets.png',
        width: 1200,
        height: 630,
        alt: 'StudIQ Crypto Markets'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Markets - Cryptocurrency Prices & Market Data',
    description: 'Real-time cryptocurrency prices and market data for Bitcoin, Ethereum, Solana and more.',
    images: ['https://studiq.app/twitter-markets.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};

export default function MarketsPage() {
  const {
    coins,
    loading,
    error,
    filters,
    favorites,
    lastUpdated,
    hasMore,
    totalCount,
    isOnline,
    updateFilters,
    loadMore,
    refresh,
    toggleFavorite,
    searchCoins,
    retryFetch,
  } = useMarketData(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCoins(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchCoins]);

  // Calculate market stats from current data
  const marketStats = React.useMemo(() => {
    if (!coins.length) {
      return {
        totalMarketCap: 0,
        totalVolume: 0,
        btcDominance: 0,
        ethDominance: 0,
        marketCapChange24h: 0,
      };
    }

    const totalMarketCap = coins.reduce((sum, coin) => sum + coin.market_cap, 0);
    const totalVolume = coins.reduce((sum, coin) => sum + coin.total_volume, 0);
    
    const btcCoin = coins.find(coin => coin.symbol === 'BTC');
    const ethCoin = coins.find(coin => coin.symbol === 'ETH');
    
    const btcDominance = btcCoin ? (btcCoin.market_cap / totalMarketCap) * 100 : 0;
    const ethDominance = ethCoin ? (ethCoin.market_cap / totalMarketCap) * 100 : 0;
    
    const marketCapChange24h = coins.reduce((sum, coin) => 
      sum + coin.market_cap_change_percentage_24h, 0) / coins.length;

    return {
      totalMarketCap,
      totalVolume,
      btcDominance,
      ethDominance,
      marketCapChange24h,
    };
  }, [coins]);

  // Filter coins based on favorites
  const displayCoins = showFavoritesOnly 
    ? coins.filter(coin => favorites.includes(coin.id))
    : coins;

  const handleSortChange = (value: string) => {
     updateFilters({ order: value as 'market_cap_desc' | 'market_cap_asc' | 'volume_desc' | 'volume_asc' | 'id_asc' | 'id_desc' });
   };

  const handleRefresh = () => {
    refresh();
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <>
      <ClientSEO metadata={seoMetadata} />
      <AppLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Cryptocurrency Markets
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Track real-time prices and market data for top cryptocurrencies
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      isOnline ? "bg-green-500" : "bg-red-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      isOnline ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Stats */}
            {!loading && coins.length > 0 && (
              <MarketStats {...marketStats} />
            )}

            {/* Controls */}
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search cryptocurrencies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={filters.order} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market_cap_desc">Market Cap ↓</SelectItem>
                      <SelectItem value="market_cap_asc">Market Cap ↑</SelectItem>
                      <SelectItem value="volume_desc">Volume ↓</SelectItem>
                      <SelectItem value="volume_asc">Volume ↑</SelectItem>
                      <SelectItem value="id_asc">Name A-Z</SelectItem>
                      <SelectItem value="id_desc">Name Z-A</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant={showFavoritesOnly ? "default" : "outline"}
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Favorites {favorites.length > 0 && `(${favorites.length})`}
                  </Button>

                  <Button
                    onClick={handleRefresh}
                    disabled={loading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Offline Alert */}
            {!isOnline && (
              <Alert className="mb-6" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You&apos;re currently offline. Data may not be up to date. Check your internet connection.
                </AlertDescription>
              </Alert>
            )}

            {/* Error State */}
            {error && (
              <Alert className="mb-6" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button variant="outline" size="sm" onClick={retryFetch}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Market Data */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Market Data</CardTitle>
                    <CardDescription>
                      Real-time cryptocurrency prices and market information
                      {totalCount > 0 && ` • ${totalCount} cryptocurrencies`}
                    </CardDescription>
                  </div>
                  {showFavoritesOnly && favorites.length === 0 && (
                    <Badge variant="secondary">No favorites selected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {showFavoritesOnly && favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500 dark:text-gray-400 mb-4">
                      You haven&apos;t added any cryptocurrencies to your favorites yet.
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowFavoritesOnly(false)}
                    >
                      View All Markets
                    </Button>
                  </div>
                ) : (
                  <MarketTable
                    coins={displayCoins}
                    loading={loading}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    onSort={(field) => {
                      // Handle sorting logic here if needed
                      console.log('Sort by:', field);
                    }}
                  />
                )}

                {/* Load More Button */}
                {!loading && hasMore && !showFavoritesOnly && (
                  <div className="mt-6 text-center">
                    <Button onClick={loadMore} variant="outline">
                      Load More Cryptocurrencies
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Footer Info */}
            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                Market data provided by CoinGecko API. Prices are updated every minute.
              </p>
              <p className="mt-1">
                This information is for educational purposes only and should not be considered financial advice.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  );
}