import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceToggleProps {
  isVisible: boolean;
  onToggle: (visible: boolean) => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showText?: boolean;
}

export function BalanceToggle({
  isVisible,
  onToggle,
  className,
  size = 'sm',
  variant = 'ghost',
  showText = false,
}: BalanceToggleProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    onToggle(!isVisible);
    
    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Button
      onClick={handleToggle}
      variant={variant}
      size={size}
      className={cn(
        'flex items-center gap-2 transition-all duration-200',
        isAnimating && 'scale-95',
        className
      )}
      aria-label={isVisible ? 'Hide balance' : 'Show balance'}
      aria-pressed={isVisible}
    >
      {isVisible ? (
        <EyeOff className={cn(
          'transition-all duration-200',
          size === 'sm' && 'h-4 w-4',
          size === 'default' && 'h-5 w-5',
          size === 'lg' && 'h-6 w-6'
        )} />
      ) : (
        <Eye className={cn(
          'transition-all duration-200',
          size === 'sm' && 'h-4 w-4',
          size === 'default' && 'h-5 w-5',
          size === 'lg' && 'h-6 w-6'
        )} />
      )}
      {showText && (
        <span className="hidden sm:inline">
          {isVisible ? 'Hide' : 'Show'}
        </span>
      )}
    </Button>
  );
}

// Utility component for displaying balance with toggle functionality
interface BalanceDisplayProps {
  amount: number;
  currency?: string;
  isVisible: boolean;
  className?: string;
  showToggle?: boolean;
  onToggle?: (visible: boolean) => void;
  precision?: number;
}

export function BalanceDisplay({
  amount,
  currency = 'USD',
  isVisible,
  className,
  showToggle = true,
  onToggle,
  precision = 2,
}: BalanceDisplayProps) {
  const formatAmount = (value: number) => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(value);
    } else {
      return `${value.toFixed(precision)} ${currency}`;
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn(
        'font-mono font-semibold transition-all duration-300',
        isVisible ? 'opacity-100' : 'opacity-50'
      )}>
        {isVisible ? formatAmount(amount) : '••••••'}
      </span>
      {showToggle && onToggle && (
        <BalanceToggle
          isVisible={isVisible}
          onToggle={onToggle}
          size="sm"
          variant="ghost"
        />
      )}
    </div>
  );
}

// Hook for managing balance visibility state
export function useBalanceVisibility(defaultVisible = true) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(() => {
    if (typeof window === 'undefined') return defaultVisible;
    
    try {
      const stored = localStorage.getItem('balance_visibility');
      return stored ? JSON.parse(stored) : defaultVisible;
    } catch {
      return defaultVisible;
    }
  });

  const toggleBalanceVisibility = (visible?: boolean) => {
    const newVisibility = visible !== undefined ? visible : !isBalanceVisible;
    setIsBalanceVisible(newVisibility);
    
    try {
      localStorage.setItem('balance_visibility', JSON.stringify(newVisibility));
    } catch (error) {
      console.warn('Failed to save balance visibility preference:', error);
    }
  };

  return {
    isBalanceVisible,
    toggleBalanceVisibility,
  };
}