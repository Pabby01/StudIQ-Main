import { useState, useEffect, useCallback, useRef } from 'react';
import { MarketCoin, MarketFilters, MarketResponse } from '@/types/market';

interface MarketState {
  coins: MarketCoin[];
  loading: boolean;
  error: string | null;
  filters: MarketFilters;
  favorites: string[];
  lastUpdated: Date | null;
  hasMore: boolean;
  totalCount: number;
}

const defaultFilters: MarketFilters = {
  search: '',
  category: '',
  order: 'market_cap_desc',
  page: 1,
  per_page: 25,
};

const CACHE_DURATION = 30000; // 30 seconds
const AUTO_REFRESH_INTERVAL = 60000; // 1 minute
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data considered stale after this
const MAX_CACHE_SIZE = 50; // Maximum number of cache entries

interface CacheEntry {
  data: MarketResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export function useMarketData(autoRefresh = true) {
  const [state, setState] = useState<MarketState>({
    coins: [],
    loading: true,
    error: null,
    filters: defaultFilters,
    favorites: [],
    lastUpdated: null,
    hasMore: true,
    totalCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('crypto-favorites');
    if (savedFavorites) {
      try {
        const favorites = JSON.parse(savedFavorites);
        setState(prev => ({ ...prev, favorites }));
      } catch (error) {
        console.error('Failed to parse favorites from localStorage:', error);
      }
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((favorites: string[]) => {
    try {
      localStorage.setItem('crypto-favorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to save favorites to localStorage:', error);
    }
  }, []);

  // Generate cache key
  const getCacheKey = useCallback((filters: MarketFilters) => {
    return `market-${filters.order}-${filters.category}-${filters.page}-${filters.per_page}`;
  }, []);

  // Check if cache is valid
  const isCacheValid = useCallback((cacheKey: string) => {
    const cached = cache.get(cacheKey);
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_DURATION;
  }, []);

  // Clean up old cache entries
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    cache.forEach((entry, key) => {
      if (now - entry.timestamp > STALE_TIME) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => cache.delete(key));
    
    // If cache is still too large, remove oldest entries
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => cache.delete(key));
    }
  }, []);

  // Fetch market data
  const fetchMarketData = useCallback(async (filters: MarketFilters, useCache = true) => {
    // Don't fetch if offline
    if (!isOnline) {
      setState(prev => ({
        ...prev,
        error: 'No internet connection',
        loading: false,
      }));
      return;
    }

    const cacheKey = getCacheKey(filters);
    
    // Clean up cache periodically
    cleanupCache();
    
    // Check cache first
    if (useCache && isCacheValid(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      setState(prev => ({
        ...prev,
        coins: filters.page === 1 ? cached.data.data : [...prev.coins, ...cached.data.data],
        loading: false,
        error: null,
        hasMore: cached.data.has_more,
        totalCount: cached.data.total_count,
        lastUpdated: new Date(),
      }));
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams({
        page: filters.page.toString(),
        per_page: filters.per_page.toString(),
        order: filters.order,
      });

      if (filters.category) {
        params.append('category', filters.category);
      }

      const response = await fetch(`/api/crypto/markets?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: MarketResponse = await response.json();

      // Cache the response
      cache.set(cacheKey, { data, timestamp: Date.now() });

      setState(prev => ({
        ...prev,
        coins: filters.page === 1 ? data.data : [...prev.coins, ...data.data],
        loading: false,
        error: null,
        hasMore: data.has_more,
        totalCount: data.total_count,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }

      console.error('Failed to fetch market data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market data',
      }));
    }
  }, [getCacheKey, isCacheValid, cleanupCache, isOnline]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<MarketFilters>) => {
    setState(prev => {
      const updatedFilters = { ...prev.filters, ...newFilters };
      
      // Reset page if changing order or category
      if (newFilters.order || newFilters.category) {
        updatedFilters.page = 1;
      }

      return {
        ...prev,
        filters: updatedFilters,
        coins: updatedFilters.page === 1 ? [] : prev.coins,
      };
    });
  }, []);

  // Load more data (pagination)
  const loadMore = useCallback(() => {
    setState(prev => {
      const nextPage = prev.filters.page + 1;
      return {
        ...prev,
        filters: { ...prev.filters, page: nextPage },
      };
    });
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, coins: [], filters: { ...prev.filters, page: 1 } }));
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((coinId: string) => {
    setState(prev => {
      const newFavorites = prev.favorites.includes(coinId)
        ? prev.favorites.filter(id => id !== coinId)
        : [...prev.favorites, coinId];
      
      saveFavorites(newFavorites);
      return { ...prev, favorites: newFavorites };
    });
  }, [saveFavorites]);

  // Search coins
  const searchCoins = useCallback((searchTerm: string) => {
    updateFilters({ search: searchTerm });
  }, [updateFilters]);

  // Filter coins based on search term
  const filteredCoins = state.filters.search
    ? state.coins.filter(coin =>
        coin.name.toLowerCase().includes(state.filters.search.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(state.filters.search.toLowerCase())
      )
    : state.coins;

  // Effect to fetch data when filters change
  useEffect(() => {
    fetchMarketData(state.filters);
  }, [state.filters, fetchMarketData]);

  // Auto-refresh effect (only when visible and online)
  useEffect(() => {
    if (!autoRefresh || !isVisible || !isOnline) return;

    refreshIntervalRef.current = setInterval(() => {
      fetchMarketData(state.filters, false); // Force refresh without cache
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, isVisible, isOnline, state.filters, fetchMarketData]);

  // Page visibility effect
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
      
      // Refresh data when page becomes visible again
      if (!document.hidden && isOnline) {
        fetchMarketData(state.filters, false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchMarketData, state.filters, isOnline]);

  // Online status effect
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Refresh data when coming back online
      fetchMarketData(state.filters, false);
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchMarketData, state.filters]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    coins: filteredCoins,
    allCoins: state.coins,
    loading: state.loading,
    error: state.error,
    filters: state.filters,
    favorites: state.favorites,
    lastUpdated: state.lastUpdated,
    hasMore: state.hasMore,
    totalCount: state.totalCount,
    isOnline,
    updateFilters,
    loadMore,
    refresh,
    toggleFavorite,
    searchCoins,
    retryFetch: () => fetchMarketData(state.filters, false),
  };
}