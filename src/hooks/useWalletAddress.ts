/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo } from 'react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { validateWalletAddress } from '@/lib/auth-middleware';

interface UseWalletAddressReturn {
  address: string | null;
  isValid: boolean;
  isConnected: boolean;
  shortAddress: string | null;
}

/**
 * Hook for accessing and validating wallet address
 * Provides consistent wallet address access across components
 */
export function useWalletAddress(): UseWalletAddressReturn {
  const { address, connected } = useWalletAuth();

  const walletData = useMemo(() => {
    if (!connected || !address) {
      return {
        address: null,
        isValid: false,
        isConnected: false,
        shortAddress: null,
      };
    }

    const isValid = validateWalletAddress(address);
    const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

    return {
      address,
      isValid,
      isConnected: true,
      shortAddress,
    };
  }, [connected, address]);

  return walletData;
}