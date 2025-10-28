import React, { useState } from 'react';
import Image from 'next/image';
import { Star, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MarketTableProps, SortField, SortDirection } from '@/types/market';
import { PriceChangeIndicator } from './PriceChangeIndicator';
import { Sparkline } from './Sparkline';
import { MarketTableSkeleton } from './MarketTableSkeleton';

export function MarketTable({
  coins,
  loading,
  favorites,
  onToggleFavorite,
  onSort,
  sortField,
  sortDirection,
}: MarketTableProps) {
  const [localSortField, setLocalSortField] = useState<SortField>('market_cap_rank');
  const [localSortDirection, setLocalSortDirection] = useState<SortDirection>('asc');

  const currentSortField = sortField || localSortField;
  const currentSortDirection = sortDirection || localSortDirection;

  const handleSort = (field: SortField) => {
    const newDirection = 
      currentSortField === field && currentSortDirection === 'asc' ? 'desc' : 'asc';
    
    setLocalSortField(field);
    setLocalSortDirection(newDirection);
    onSort?.(field);
  };

  const formatPrice = (price: number) => {
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    if (price < 100) return `$${price.toFixed(2)}`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    if (marketCap >= 1e3) return `$${(marketCap / 1e3).toFixed(2)}K`;
    return `$${marketCap.toFixed(2)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      {children}
      {currentSortField === field && (
        currentSortDirection === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      )}
    </button>
  );

  if (loading) {
    return <MarketTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <SortButton field="market_cap_rank">#</SortButton>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <SortButton field="name">Name</SortButton>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <SortButton field="current_price">Price</SortButton>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <SortButton field="price_change_percentage_24h">24h %</SortButton>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <SortButton field="price_change_percentage_7d_in_currency">7d %</SortButton>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <SortButton field="market_cap">Market Cap</SortButton>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <SortButton field="total_volume">Volume(24h)</SortButton>
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Last 7 Days
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  
                </th>
              </tr>
            </thead>
            <tbody>
              {coins.map((coin) => (
                <tr
                  key={coin.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {coin.market_cap_rank}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src={coin.image}
                        alt={coin.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-coin.png';
                        }}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {coin.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 uppercase">
                          {coin.symbol}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-gray-900 dark:text-white">
                    {formatPrice(coin.current_price)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <PriceChangeIndicator value={coin.price_change_percentage_24h} />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <PriceChangeIndicator value={coin.price_change_percentage_7d_in_currency} />
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-gray-900 dark:text-white">
                    {formatMarketCap(coin.market_cap)}
                  </td>
                  <td className="py-4 px-4 text-right text-gray-600 dark:text-gray-300">
                    {formatVolume(coin.total_volume)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Sparkline data={coin.sparkline_in_7d} width={100} height={40} />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleFavorite(coin.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Star
                        className={cn(
                          'h-4 w-4',
                          favorites.includes(coin.id)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-400 hover:text-yellow-400'
                        )}
                      />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {coins.map((coin) => (
          <div
            key={coin.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Image
                  src={coin.image}
                  alt={coin.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-coin.png';
                  }}
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {coin.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 uppercase">
                    {coin.symbol} • #{coin.market_cap_rank}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleFavorite(coin.id)}
                className="h-8 w-8 p-0"
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    favorites.includes(coin.id)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-400 hover:text-yellow-400'
                  )}
                />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Price</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatPrice(coin.current_price)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">24h Change</div>
                <PriceChangeIndicator value={coin.price_change_percentage_24h} />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Market Cap</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatMarketCap(coin.market_cap)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Volume</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {formatVolume(coin.total_volume)}
                </div>
              </div>
            </div>
            
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Last 7 Days</div>
              <Sparkline data={coin.sparkline_in_7d} width={100} height={40} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}