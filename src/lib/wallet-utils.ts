/**
 * Wallet Address Utility
 * Ensures consistent wallet address handling across the application
 * Handles different wallet sources (Privy user object vs useWallets hook)
 */

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useMemo } from 'react';
import { secureLogger } from './secure-logger';

export interface WalletAddressInfo {
  address: string | null;
  source: 'user-wallet' | 'wallets-array' | 'none';
  isValid: boolean;
  displayAddress: string;
}

/**
 * Gets the primary wallet address from Privy in a consistent manner
 * Handles both user.wallet.address and wallets[0].address patterns
 */
export function useWalletAddress(): WalletAddressInfo {
  const { user } = usePrivy();
  const { wallets } = useWallets();

  return useMemo(() => {
    // Priority 1: user.wallet.address (most reliable)
    if (user?.wallet?.address) {
      const address = user.wallet.address;
      return {
        address,
        source: 'user-wallet',
        isValid: true,
        displayAddress: formatWalletAddress(address),
      };
    }

    // Priority 2: wallets[0].address (fallback)
    if (wallets.length > 0 && wallets[0]?.address) {
      const address = wallets[0].address;
      secureLogger.warn('Using wallets[0] instead of user.wallet - may indicate sync issue', {
        userHasWallet: !!user?.wallet,
        walletsCount: wallets.length,
      });
      return {
        address,
        source: 'wallets-array',
        isValid: true,
        displayAddress: formatWalletAddress(address),
      };
    }

    // No wallet available
    return {
      address: null,
      source: 'none',
      isValid: false,
      displayAddress: 'No wallet',
    };
  }, [user, wallets]);
}

/**
 * Formats a wallet address for display
 */
export function formatWalletAddress(address: string | null | undefined): string {
  if (!address) return 'No wallet';
  
  // Validate Solana address format (base58, 32-44 characters)
  if (!isValidSolanaAddress(address)) {
    secureLogger.warn('Invalid Solana address format', { address });
    return 'Invalid wallet';
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Validates a Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address) return false;
  
  // Solana addresses are base58 encoded and 32-44 characters long
  if (address.length < 32 || address.length > 44) return false;
  
  // Basic base58 validation (alphanumeric except 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

/**
 * Normalizes wallet address for consistent storage
 */
export function normalizeWalletAddress(address: string): string {
  if (!address) throw new Error('Wallet address is required');
  
  const trimmed = address.trim();
  
  if (!isValidSolanaAddress(trimmed)) {
    throw new Error('Invalid Solana wallet address format');
  }
  
  return trimmed;
}

/**
 * Compares two wallet addresses for equality
 */
export function areWalletAddressesEqual(addr1: string | null, addr2: string | null): boolean {
  if (!addr1 || !addr2) return false;
  return normalizeWalletAddress(addr1) === normalizeWalletAddress(addr2);
}

/**
 * Gets the primary wallet address for server-side operations
 * This should be called from components that have access to the user object
 */
export function getPrimaryWalletAddress(user: { wallet?: { address?: string } }): string | null {
  if (user?.wallet?.address) {
    return normalizeWalletAddress(user.wallet.address);
  }
  
  secureLogger.warn('No primary wallet address found', {
    hasUser: !!user,
    hasWallet: !!user?.wallet,
    hasAddress: !!user?.wallet?.address,
  });
  
  return null;
}