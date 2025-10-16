'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { privyConfig } from '@/lib/privy';

interface PrivyClientProviderProps {
  children: React.ReactNode;
}

export function PrivyClientProvider({ children }: PrivyClientProviderProps) {
  // Check if we have a valid Privy app ID
  const hasValidAppId = privyConfig.appId && 
    privyConfig.appId !== 'demo-app-id' && 
    !privyConfig.appId.includes('xxxx');

  if (!hasValidAppId) {
    // Return children without Privy provider for demo mode
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={privyConfig.appId}
      config={privyConfig.config}
    >
      {children}
    </PrivyProvider>
  );
}