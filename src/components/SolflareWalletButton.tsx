/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { useWalletConnection } from '@/contexts/SolflareWalletContext';

export function SolflareWalletButton() {
  const { isConnected, connect, disconnect, isConnecting } = useWalletConnection();
  return (
    <Button onClick={isConnected ? disconnect : connect} disabled={isConnecting}>
      {isConnected ? 'Disconnect Solflare' : isConnecting ? 'Connecting…' : 'Connect Solflare'}
    </Button>
  );
}

export default SolflareWalletButton;
