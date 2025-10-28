import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MarketStatsProps } from '@/types/market';

export function MarketStats({
  totalMarketCap,
  totalVolume,
  btcDominance,
  ethDominance,
  marketCapChange24h,
}: MarketStatsProps) {
  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const isMarketCapPositive = marketCapChange24h > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Market Cap</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatLargeNumber(totalMarketCap)}</div>
          <div className={cn(
            'flex items-center text-xs',
            isMarketCapPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {isMarketCapPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {formatPercentage(Math.abs(marketCapChange24h))} from yesterday
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatLargeNumber(totalVolume)}</div>
          <p className="text-xs text-muted-foreground">
            Total trading volume
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">BTC Dominance</CardTitle>
          <div className="h-4 w-4 rounded-full bg-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(btcDominance)}</div>
          <p className="text-xs text-muted-foreground">
            Bitcoin market share
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ETH Dominance</CardTitle>
          <div className="h-4 w-4 rounded-full bg-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(ethDominance)}</div>
          <p className="text-xs text-muted-foreground">
            Ethereum market share
          </p>
        </CardContent>
      </Card>
    </div>
  );
}