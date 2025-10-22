'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface LoadingStateOptions {
  timeout?: number;
  onTimeout?: () => void;
  minLoadingTime?: number; // Minimum time to show loading (prevents flash)
}

export function useLoadingState(options: LoadingStateOptions = {}) {
  const {
    timeout = 30000, // 30 seconds default
    onTimeout,
    minLoadingTime = 500 // 500ms minimum
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const minTimeRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setHasTimedOut(false);
    setError(null);
    startTimeRef.current = Date.now();

    // Set timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setHasTimedOut(true);
      setIsLoading(false);
      onTimeout?.();
    }, timeout);
  }, [timeout, onTimeout]);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    const remainingMinTime = Math.max(0, minLoadingTime - elapsed);

    if (remainingMinTime > 0) {
      // Wait for minimum loading time
      minTimeRef.current = setTimeout(() => {
        setIsLoading(false);
      }, remainingMinTime);
    } else {
      setIsLoading(false);
    }
  }, [minLoadingTime]);

  const setLoadingError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    stopLoading();
  }, [stopLoading]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (minTimeRef.current) {
      clearTimeout(minTimeRef.current);
    }
    setIsLoading(false);
    setHasTimedOut(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (minTimeRef.current) {
        clearTimeout(minTimeRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    hasTimedOut,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    reset
  };
}

// Hook for async operations with automatic loading state management
export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options: LoadingStateOptions = {}
) {
  const loadingState = useLoadingState(options);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (): Promise<T | null> => {
    try {
      loadingState.startLoading();
      const result = await operation();
      setData(result);
      loadingState.stopLoading();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      loadingState.setLoadingError(errorMessage);
      return null;
    }
  }, [operation, loadingState]);

  const reset = useCallback(() => {
    setData(null);
    loadingState.reset();
  }, [loadingState]);

  return {
    ...loadingState,
    data,
    execute,
    reset
  };
}