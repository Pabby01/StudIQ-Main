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
  loginMethods: ['email', 'wallet'],
  
  appearance: {
    theme: 'light',
    accentColor: '#676FFF',
    logo: 'https://your-logo-url.com/logo.png',
  },
  
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'off'
    },
    solana: {
      createOnLogin: 'users-without-wallets'
    }
  },
  
  externalWallets: {
    solana: {}
  },
  
  legal: {
    termsAndConditionsUrl: 'https://your-terms-url.com',
    privacyPolicyUrl: 'https://your-privacy-url.com',
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