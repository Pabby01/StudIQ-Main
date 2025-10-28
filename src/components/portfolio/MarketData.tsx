'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cryptoApiService, MarketData as MarketDataType } from '@/lib/crypto-api-service';
import type { MarketData as WebSocketMarketData } from '@/lib/websocket-service';
import { websocketService } from '@/lib/websocket-service';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MarketDataProps {
  symbol: string;
  className?: string;
  showChart?: boolean;
  compact?: boolean;
}

interface ChartData {
  time: string;
  price: number;
}

export function MarketData({ symbol, className, showChart = true, compact = false }: MarketDataProps) {
  const [marketData, setMarketData] = useState<MarketDataType | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '7D' | '30D'>('24H');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadMarketData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await cryptoApiService.getMarketData(symbol);
      setMarketData(data);
      setLastUpdate(new Date());
      
      // Convert sparkline data to chart format
      if (data.sparkline && data.sparkline.length > 0) {
        const chartPoints = data.sparkline.map((price, index) => ({
          time: format(new Date(Date.now() - (data.sparkline.length - index) * 3600000), 'HH:mm'),
          price: price,
        }));
        setChartData(chartPoints);
      }
    } catch (err) {
      setError('Failed to load market data. Using cached data if available.');
      console.error('Error loading market data:', err);
      
      // Try to use cached data as fallback
      try {
        // Check if we have any cached data to display
        const fallbackData = await cryptoApiService.getMarketData(symbol);
        if (fallbackData) {
          setMarketData(fallbackData);
          setError('Using cached data. Real-time updates may be delayed.');
        }
      } catch (fallbackError) {
        console.error('No cached data available:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    loadMarketData();
    
    // Subscribe to real-time updates
    const unsubscribe = websocketService.subscribeToMarketData([symbol], (data: WebSocketMarketData[]) => {
      if (data.length > 0) {
        const wsData = data[0];
        setMarketData(prev => prev ? { 
          ...prev, 
          price: wsData.price,
          change24h: wsData.change24h,
          changePercent24h: wsData.changePercent24h,
          volume24h: wsData.volume24h,
          marketCap: wsData.marketCap,
          lastUpdated: wsData.timestamp || new Date()
        } : null);
        setLastUpdate(new Date());
      }
    });

    return () => {
      unsubscribe();
    };
  }, [symbol, loadMarketData]);

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (isLive) {
        loadMarketData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLive, loadMarketData]);

  const handleRefresh = () => {
    loadMarketData();
  };

  const toggleLiveUpdates = () => {
    setIsLive(!isLive);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatLargeNumber = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-spin" />
            {symbol} Market Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading market data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !marketData) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>{symbol} Market Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mb-4">
              <p className={`text-sm ${error?.includes('cached') ? 'text-yellow-600' : 'text-red-500'}`}>
                {error || 'Failed to load market data'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {error?.includes('cached') 
                  ? 'Data may be outdated. Real-time updates will resume automatically.'
                  : 'Please check your connection and try again.'
                }
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button onClick={toggleLiveUpdates} variant="outline" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                {isLive ? 'Pause Updates' : 'Enable Updates'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = marketData.changePercent24h >= 0;
  const ArrowIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <span>{marketData.name} ({marketData.symbol})</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isLive ? 'default' : 'secondary'} className="gap-1">
              <div className={cn(
                'h-2 w-2 rounded-full',
                isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              )} />
              {isLive ? 'Live' : 'Static'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLiveUpdates}
              className="gap-2"
            >
              <Activity className="h-4 w-4" />
              {isLive ? 'Pause' : 'Live'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Price Section */}
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              {formatCurrency(marketData.price)}
            </div>
            <div className={cn(
              'flex items-center justify-center gap-2 text-lg',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              <ArrowIcon className="h-5 w-5" />
              <span>{Math.abs(marketData.changePercent24h).toFixed(2)}%</span>
              <span className="text-sm text-gray-500">(24h)</span>
            </div>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Market Cap</div>
              <div className="font-semibold">{formatLargeNumber(marketData.marketCap)}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">24h Volume</div>
              <div className="font-semibold">{formatLargeNumber(marketData.volume24h)}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">24h High</div>
              <div className="font-semibold">{formatCurrency(marketData.high24h)}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">24h Low</div>
              <div className="font-semibold">{formatCurrency(marketData.low24h)}</div>
            </div>
          </div>

          {/* Price Chart */}
          {showChart && chartData.length > 0 && !compact && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Price Chart</h4>
                <div className="flex gap-1">
                  {(['1H', '24H', '7D', '30D'] as const).map((tf) => (
                    <Button
                      key={tf}
                      variant={timeframe === tf ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeframe(tf)}
                    >
                      {tf}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#888"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#888"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value: number): [string, string] => [formatCurrency(value), 'Price']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke={isPositive ? '#10b981' : '#ef4444'}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Last Update */}
          {lastUpdate && (
            <div className="text-center text-sm text-gray-500">
              Last updated: {format(lastUpdate, 'HH:mm:ss')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for portfolio overview
export function MarketDataCompact({ symbol, className }: MarketDataProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPrice = async () => {
      try {
        const prices = await cryptoApiService.getCryptoPrices([symbol]);
        if (prices.length > 0) {
          setPrice(prices[0].price);
          setChange(prices[0].changePercent24h);
        }
      } catch (error) {
        console.error('Error loading price:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrice();
    
    // Subscribe to real-time updates
    const unsubscribe = websocketService.subscribeToMarketData([symbol], (data: WebSocketMarketData[]) => {
      if (data.length > 0) {
        setPrice(data[0].price);
        setChange(data[0].changePercent24h);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [symbol]);

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-24"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!price || change === null) {
    return null;
  }

  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className={cn(className)}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">{symbol}</span>
            <TrendIcon className={cn(
              'h-4 w-4',
              isPositive ? 'text-green-500' : 'text-red-500'
            )} />
          </div>
          <div className="text-xl font-bold">
            ${price.toFixed(2)}
          </div>
          <div className={cn(
            'text-sm',
            isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}