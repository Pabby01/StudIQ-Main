/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
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
  const { authenticated, user } = usePrivy();

  const walletData = useMemo(() => {
    if (!authenticated || !user) {
      return {
        address: null,
        isValid: false,
        isConnected: false,
        shortAddress: null,
      };
    }

    // Get wallet address from user object
    let address: string | null = null;

    // Check direct wallet property
    if (user.wallet?.address) {
      address = user.wallet.address;
    } else {
      // Check linked accounts for wallet
      const linkedWallet = user.linkedAccounts?.find(
        (account: any) => account.type === 'wallet'
      ) as any;
      if (linkedWallet?.address) {
        address = linkedWallet.address;
      }
    }

    const isValid = address ? validateWalletAddress(address) : false;
    const shortAddress = address 
      ? `${address.slice(0, 4)}...${address.slice(-4)}`
      : null;

    return {
      address,
      isValid,
      isConnected: !!address,
      shortAddress,
    };
  }, [authenticated, user]);

  return walletData;
}