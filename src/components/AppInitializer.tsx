/**
 * Application initialization component
 * This component runs on the client side and renders children directly
 * without environment validation for immediate testing.
 */

'use client';

import { useEffect, useState } from 'react';

interface AppInitializerProps {
  children: React.ReactNode;
}

export default function AppInitializer({ children }: AppInitializerProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simple initialization without validation
    setIsReady(true);
  }, []);

  if (!isReady) {
    // Simple loading state
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  // Render children directly without validation
  return <>{children}</>;
}