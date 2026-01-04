'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useWalletAddress } from './useWalletAddress';
import { walletDataService } from '@/lib/wallet-data';
import { secureLogger } from '@/lib/secure-logger';
import { websocketService, type PortfolioUpdate } from '@/lib/websocket-service';
import type { WalletBalance, WalletPortfolio } from '@/lib/wallet-data';

interface UseWalletBalanceOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTimeSync?: boolean;
  enableWebSocketSync?: boolean;
}

interface WalletBalanceState {
  balance: WalletBalance | null;
  portfolio: WalletPortfolio | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isRefreshing: boolean;
}

interface UseWalletBalanceReturn extends WalletBalanceState {
  refreshBalance: () => Promise<void>;
  clearError: () => void;
  forceRefresh: () => Promise<void>;
}

// Global state for balance synchronization across components
let globalBalanceState: WalletBalanceState = {
  balance: null,
  portfolio: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  isRefreshing: false,
};

// Subscribers for real-time updates
const subscribers = new Set<(state: WalletBalanceState) => void>();

// Notify all subscribers of state changes
const notifySubscribers = (newState: WalletBalanceState) => {
  globalBalanceState = newState;
  subscribers.forEach(callback => callback(newState));
};

let rateLimitCooldownUntil = 0;

/**
 * Shared wallet balance hook with real-time synchronization
 * Provides consistent balance data across dashboard and portfolio components
 */
export function useWalletBalance(options: UseWalletBalanceOptions = {}): UseWalletBalanceReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableRealTimeSync = true,
    enableWebSocketSync = true,
  } = options;

  const { connected } = useWalletAuth();
  const walletAddress = useWalletAddress();
  const [localState, setLocalState] = useState<WalletBalanceState>(globalBalanceState);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Subscribe to global state changes for real-time sync
  useEffect(() => {
    if (!enableRealTimeSync) return;

    const handleStateChange = (newState: WalletBalanceState) => {
      setLocalState(newState);
    };

    subscribers.add(handleStateChange);
    return () => {
      subscribers.delete(handleStateChange);
    };
  }, [enableRealTimeSync]);

  // Clear error function
  const clearError = useCallback(() => {
    const newState = { ...globalBalanceState, error: null };
    notifySubscribers(newState);
  }, []);

  // Refresh balance data
  const refreshBalance = useCallback(async () => {
    if (!connected || !walletAddress.isValid || isLoadingRef.current) {
      return;
    }

    if (Date.now() < rateLimitCooldownUntil) {
      return;
    }

    isLoadingRef.current = true;
    const newState = { ...globalBalanceState, isLoading: true, isRefreshing: true, error: null };
    notifySubscribers(newState);

    try {
      const address = walletAddress.address!;

      secureLogger.info('Refreshing wallet balance', {
        walletAddress: address.slice(0, 8) + '...',
        timestamp: new Date().toISOString(),
      });

      // Fetch both balance and portfolio data
      const [balance, portfolio] = await Promise.all([
        walletDataService.getWalletBalance(address),
        walletDataService.getWalletPortfolio(address).catch(error => {
          secureLogger.warn('Portfolio fetch failed, using balance only', { error });
          return null;
        }),
      ]);

      const updatedState: WalletBalanceState = {
        balance,
        portfolio,
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastUpdated: new Date(),
      };

      notifySubscribers(updatedState);

      secureLogger.info('Wallet balance refreshed successfully', {
        totalUsdValue: balance.totalUsdValue,
        solBalance: balance.solBalance,
        tokenCount: balance.tokens.length,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch wallet balance';

      secureLogger.error('Wallet balance refresh failed', {
        error: errorMessage,
        walletAddress: walletAddress.address?.slice(0, 8) + '...',
      });

      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('max usage')) {
        rateLimitCooldownUntil = Date.now() + 5 * 60 * 1000;
      }

      const errorState: WalletBalanceState = {
        ...globalBalanceState,
        isLoading: false,
        isRefreshing: false,
        error: errorMessage,
      };

      notifySubscribers(errorState);
    } finally {
      isLoadingRef.current = false;
    }
  }, [connected, walletAddress.isValid, walletAddress.address]);

  // Force refresh (ignores loading state)
  const forceRefresh = useCallback(async () => {
    isLoadingRef.current = false;
    await refreshBalance();
  }, [refreshBalance]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !connected || !walletAddress.isValid) {
      return;
    }

    // Initial load if no data exists
    if (!globalBalanceState.balance && !globalBalanceState.isLoading) {
      refreshBalance();
    }

    // Set up periodic refresh
    const setupRefreshInterval = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        refreshBalance().finally(() => {
          setupRefreshInterval(); // Schedule next refresh
        });
      }, refreshInterval);
    };

    setupRefreshInterval();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [autoRefresh, connected, walletAddress.isValid, refreshBalance, refreshInterval]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!enableWebSocketSync || !connected || !walletAddress.isValid || !walletAddress.address) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const setupWebSocketConnection = async () => {
      try {
        // Connect to WebSocket service
        await websocketService.connect();

        secureLogger.info('Setting up WebSocket subscription for wallet balance', {
          walletAddress: walletAddress.address!.slice(0, 8) + '...',
        });

        // Subscribe to portfolio updates
        unsubscribe = websocketService.subscribeToPortfolioUpdates(
          walletAddress.address!,
          (portfolioUpdate: PortfolioUpdate) => {
            secureLogger.info('Received WebSocket portfolio update', {
              walletAddress: portfolioUpdate.walletAddress.slice(0, 8) + '...',
              totalUsdValue: portfolioUpdate.totalUsdValue,
              tokenCount: portfolioUpdate.tokenUpdates.length,
            });

            // Update global state with WebSocket data
            const updatedBalance: WalletBalance = {
              totalUsdValue: portfolioUpdate.totalUsdValue,
              solBalance: portfolioUpdate.balance,
              tokens: portfolioUpdate.tokenUpdates.map(token => ({
                mint: token.mint,
                symbol: token.symbol,
                name: token.symbol, // Use symbol as name fallback
                balance: token.balance, // Raw balance amount
                decimals: 9, // Default for most tokens
                uiAmount: token.balance,
                usdValue: token.usdValue,
              })),
              lastUpdated: new Date(),
            };

            const newState: WalletBalanceState = {
              ...globalBalanceState,
              balance: updatedBalance,
              lastUpdated: new Date(),
              error: null,
            };

            notifySubscribers(newState);
          }
        );

      } catch (error) {
        secureLogger.error('Failed to setup WebSocket connection', {
          error: error instanceof Error ? error.message : 'Unknown error',
          walletAddress: walletAddress.address!.slice(0, 8) + '...',
        });
      }
    };

    setupWebSocketConnection();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [enableWebSocketSync, connected, walletAddress.isValid, walletAddress.address]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...localState,
    refreshBalance,
    clearError,
    forceRefresh,
  };
}

/**
 * Hook for getting just the balance value (simplified interface)
 */
export function useWalletBalanceValue(): {
  totalUsdValue: number;
  solBalance: number;
  isLoading: boolean;
  lastUpdated: Date | null;
} {
  const { balance, isLoading, lastUpdated } = useWalletBalance();

  return {
    totalUsdValue: balance?.totalUsdValue || 0,
    solBalance: balance?.solBalance || 0,
    isLoading,
    lastUpdated,
  };
}

/**
 * Hook for manual balance refresh (for refresh buttons)
 */
export function useWalletBalanceRefresh() {
  const { refreshBalance, forceRefresh, isRefreshing, error, clearError } = useWalletBalance({
    autoRefresh: false,
  });

  return {
    refreshBalance,
    forceRefresh,
    isRefreshing,
    error,
    clearError,
  };
}

export default useWalletBalance;