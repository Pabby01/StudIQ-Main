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
      logo: '/logo.jpg',
      showWalletLoginFirst: false,
      walletChainType: 'solana-only' as const, // Solana only
    },
    
    // Embedded wallet configuration for automatic wallet creation
    embeddedWallets: {
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
    
    // Wallet connection settings - Solana only (configured via walletChainType)
  } satisfies PrivyClientConfig,
};

export { PrivyProvider };