import { PrivyProvider } from '@privy-io/react-auth';
import type { PrivyClientConfig } from '@privy-io/react-auth';

export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'demo-app-id',
  config: {
    // Enable all authentication methods
    loginMethods: ['wallet', 'email', 'sms', 'google', 'apple'],
    
    // Appearance configuration
    appearance: {
      theme: 'light' as const,
      accentColor: '#3B82F6',
      logo: '/logo.svg',
      showWalletLoginFirst: false,
      walletChainType: 'ethereum-and-solana',
    },
    
    // Embedded wallet configuration for automatic wallet creation
    embeddedWallets: {
      ethereum: {
        createOnLogin: 'users-without-wallets' as const,
      },
      solana: {
        createOnLogin: 'users-without-wallets' as const,
      },
    },
    
    // Legal and privacy configuration
    legal: {
      termsAndConditionsUrl: '/terms',
      privacyPolicyUrl: '/privacy',
    },
    
    // Additional security and UX settings
    mfa: {
      noPromptOnMfaRequired: false,
    },
    
    // Wallet connection settings
    supportedChains: [
      {
        id: 1, // Ethereum mainnet
        name: 'Ethereum',
        network: 'mainnet',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: ['https://eth-mainnet.g.alchemy.com/v2/demo'],
          },
          public: {
            http: ['https://eth-mainnet.g.alchemy.com/v2/demo'],
          },
        },
      },
    ],
  } satisfies PrivyClientConfig,
};

export { PrivyProvider };