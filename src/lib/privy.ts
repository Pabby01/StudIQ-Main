/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrivyProvider } from '@privy-io/react-auth';
import type { PrivyClientConfig } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

// Validate required environment variables
const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
if (!appId) {
  throw new Error('NEXT_PUBLIC_PRIVY_APP_ID is required for Privy authentication. Please set this environment variable.');
}

// Configure Solana wallet connectors
const solanaConnectors = toSolanaWalletConnectors({
  // Enable auto-connect for better UX
  shouldAutoConnect: true,
});

const config: PrivyClientConfig = {
  // Login methods optimized for students
  loginMethods: ['email', 'google', 'wallet'],

  appearance: {
    theme: 'light',
    accentColor: '#0066FF',
    logo: 'https://i.postimg.cc/jjrt2Kdw/logo-2.jpg',
    showWalletLoginFirst: false, // Email/social first for students
  },

  // SOLANA ONLY - No EVM/Ethereum wallets
  embeddedWallets: {
    solana: {
      createOnLogin: 'all-users', // Auto-create Solana wallet for everyone
    },
  },

  // Only Solana external wallets
  externalWallets: {
    solana: {
      connectors: solanaConnectors,
    },
  },

  // Privy requires at least one chain - using mainnet minimally
  // NOTE: This will be removed during migration to wallet-only auth
  supportedChains: [
    {
      id: 1, // Ethereum mainnet (minimal, won't use)
      name: 'Ethereum',
      network: 'homestead',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: ['https://eth.llamarpc.com'] } },
    },
  ],

  legal: {
    termsAndConditionsUrl: 'https://studiq.app/terms',
    privacyPolicyUrl: 'https://studiq.app/privacy',
  },

  mfa: {
    noPromptOnMfaRequired: false,
  },
};

export const privyConfig = {
  appId,
  config
};

export { PrivyProvider };