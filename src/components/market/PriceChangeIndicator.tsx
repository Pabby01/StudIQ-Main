import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriceChangeIndicatorProps } from '@/types/market';

export function PriceChangeIndicator({ 
  value, 
  showIcon = true, 
  className 
}: PriceChangeIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const formatValue = (val: number) => {
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-sm font-medium',
        {
          'text-green-600 dark:text-green-400': isPositive,
          'text-red-600 dark:text-red-400': !isPositive && !isNeutral,
          'text-gray-500 dark:text-gray-400': isNeutral,
        },
        className
      )}
    >
      {showIcon && !isNeutral && (
        isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )
      )}
      <span>{formatValue(value)}</span>
    </div>
  );
}