import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MarketStatsProps = {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
};

export function MarketStats({
  totalMarketCap,
  totalVolume,
  btcDominance,
  ethDominance,
  marketCapChange24h,
}: MarketStatsProps) {
  const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString() : '—');
  const pct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}%` : '—');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>Total Market Cap: ${fmt(totalMarketCap)}</div>
          <div>Total Volume: ${fmt(totalVolume)}</div>
          <div>BTC Dominance: {pct(btcDominance)}</div>
          <div>ETH Dominance: {pct(ethDominance)}</div>
          <div>24h Market Cap Change: {pct(marketCapChange24h)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketStats;
