'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/wallet-data';
import AppLayout from '@/components/AppLayout';
import { 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Search,
  Star,
  Loader2
} from 'lucide-react';

interface MarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  volume_24h: number;
  image: string;
}

export default function MarketsPage() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Mock market data - in a real app, this would come from an API like CoinGecko
  const mockMarketData: MarketData[] = useMemo(() => ([
    {
      id: 'solana',
      symbol: 'SOL',
      name: 'Solana',
      current_price: 89.54,
      price_change_percentage_24h: 2.4,
      market_cap: 38500000000,
      volume_24h: 1200000000,
      image: '/solana-logo.png'
    },
    {
      id: 'usd-coin',
      symbol: 'USDC',
      name: 'USD Coin',
      current_price: 1.00,
      price_change_percentage_24h: 0.01,
      market_cap: 25000000000,
      volume_24h: 3500000000,
      image: '/usdc-logo.png'
    },
    {
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      current_price: 43250.00,
      price_change_percentage_24h: -1.2,
      market_cap: 850000000000,
      volume_24h: 15000000000,
      image: '/bitcoin-logo.png'
    },
    {
      id: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      current_price: 2650.00,
      price_change_percentage_24h: 3.1,
      market_cap: 320000000000,
      volume_24h: 8500000000,
      image: '/ethereum-logo.png'
    },
    {
      id: 'cardano',
      symbol: 'ADA',
      name: 'Cardano',
      current_price: 0.52,
      price_change_percentage_24h: -0.8,
      market_cap: 18500000000,
      volume_24h: 450000000,
      image: '/cardano-logo.png'
    },
    {
      id: 'chainlink',
      symbol: 'LINK',
      name: 'Chainlink',
      current_price: 14.85,
      price_change_percentage_24h: 4.2,
      market_cap: 8200000000,
      volume_24h: 380000000,
      image: '/chainlink-logo.png'
    }
  ]), []);

  const loadMarketData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMarketData(mockMarketData);
    } catch (error) {
      console.error('Failed to load market data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [mockMarketData]);

  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  const toggleFavorite = (coinId: string) => {
    setFavorites(prev => 
      prev.includes(coinId) 
        ? prev.filter(id => id !== coinId)
        : [...prev, coinId]
    );
  };

  const filteredData = marketData.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMarketCap = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return formatCurrency(value);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Markets</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Real-time cryptocurrency prices and market data
            </p>
          </div>
          <Button onClick={loadMarketData} disabled={isLoading} variant="outline" size="sm" className="md:size-default">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search cryptocurrencies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Market Overview Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Market Cap</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1.2T</div>
            <p className="text-xs text-green-600">+2.1% (24h)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45.2B</div>
            <p className="text-xs text-red-600">-1.5% (24h)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BTC Dominance</CardTitle>
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">₿</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">52.3%</div>
            <p className="text-xs text-muted-foreground">Market share</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Coins</CardTitle>
            <Badge variant="secondary">Live</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">Cryptocurrencies</p>
          </CardContent>
        </Card>
      </div>

      {/* Market Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cryptocurrency Prices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading market data...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredData.map((coin, index) => (
                <div key={coin.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-muted-foreground w-8">#{index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(coin.id)}
                      className="p-1"
                    >
                      <Star className={`h-4 w-4 ${favorites.includes(coin.id) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </Button>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold">{coin.symbol}</span>
                      </div>
                      <div>
                        <p className="font-medium">{coin.name}</p>
                        <p className="text-sm text-muted-foreground">{coin.symbol.toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-8">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(coin.current_price)}</p>
                    </div>
                    
                    <div className="text-right w-20">
                      <div className={`flex items-center justify-end space-x-1 ${
                        coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {coin.price_change_percentage_24h >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span className="text-sm font-medium">
                          {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right w-24">
                      <p className="text-sm text-muted-foreground">
                        {formatMarketCap(coin.market_cap)}
                      </p>
                    </div>
                    
                    <div className="text-right w-24">
                      <p className="text-sm text-muted-foreground">
                        {formatMarketCap(coin.volume_24h)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}