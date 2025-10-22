'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock, RefreshCw } from 'lucide-react';

interface LoadingTimeoutProps {
  children: React.ReactNode;
  timeout?: number; // in milliseconds
  message?: string;
  onTimeout?: () => void;
}

export default function LoadingTimeout({ 
  children, 
  timeout = 30000, // 30 seconds default
  message = "This is taking longer than expected...",
  onTimeout 
}: LoadingTimeoutProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    
    // Update elapsed time every second
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeElapsed(elapsed);
      
      if (elapsed >= timeout) {
        setHasTimedOut(true);
        onTimeout?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeout, onTimeout]);

  const handleRetry = () => {
    setHasTimedOut(false);
    setTimeElapsed(0);
    window.location.reload();
  };

  if (hasTimedOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-900">Loading Timeout</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Possible causes:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
                <li>Slow internet connection</li>
                <li>Database configuration issues</li>
                <li>Authentication service problems</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleRetry} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      {children}
      {timeElapsed > 10000 && ( // Show warning after 10 seconds
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Still loading... ({Math.round(timeElapsed / 1000)}s)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}