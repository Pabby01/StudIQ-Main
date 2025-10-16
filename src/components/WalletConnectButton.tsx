'use client';

import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';
import { useState } from 'react';

// Demo wallet component that doesn't use Privy hooks
export function WalletConnectButton() {
  const [demoConnected, setDemoConnected] = useState(false);

  if (!demoConnected) {
    return (
      <Button onClick={() => setDemoConnected(true)} variant="outline">
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>
    );
  }

  const displayAddress = 'Demo...Wallet';

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600">{displayAddress}</span>
      <Button onClick={() => setDemoConnected(false)} variant="outline" size="sm">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}