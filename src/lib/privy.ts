import { PrivyProvider } from '@privy-io/react-auth';
import type { PrivyClientConfig } from '@privy-io/react-auth';

export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'demo-app-id',
  config: {
    loginMethods: ['wallet', 'email'],
    appearance: {
      theme: 'light' as const,
      accentColor: '#3B82F6',
      logo: '/logo.svg',
    },
    embeddedWallets: {
      solana: {
        createOnLogin: 'users-without-wallets' as const,
      },
    },
    // Remove defaultChain as it's causing type issues
  } satisfies PrivyClientConfig,
};

export { PrivyProvider };