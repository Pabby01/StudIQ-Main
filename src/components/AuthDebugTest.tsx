'use client';

import React, { useEffect, useState } from 'react';
// import { useAuth } from '@/hooks/useAuth';
// import { authDebugLogger } from '@/lib/auth-debug-logger';
// import { quickAuthDebugSetup } from '@/lib/quick-auth-debug-setup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface AuthDebugTestProps {
  className?: string;
}

interface MockUser {
  id: string;
}

export function AuthDebugTest({ className = '' }: AuthDebugTestProps) {
  // const { user, isAuthenticated, isLoading, error, login, logout } = useAuth();
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});
  const [verboseLogging, setVerboseLogging] = useState(false);
  
  // Mock auth state for now since useAuth doesn't exist
  const user: MockUser | null = null as MockUser | null;
  const isAuthenticated = false;
  const isLoading = false;
  const error: string | null = null;
  const login = async () => console.log('Login not implemented');
  const logout = async () => console.log('Logout not implemented');

  useEffect(() => {
    // Log current auth state
    // authDebugLogger.logAuthStep(user?.id, 'auth_debug_test_mounted', {
    //   isAuthenticated,
    //   isLoading,
    //   hasError: !!error,
    //   timestamp: new Date().toISOString()
    // });
    console.log('Auth debug test mounted', {
      isAuthenticated,
      isLoading,
      hasError: !!error,
      timestamp: new Date().toISOString()
    });

    // Get debug info
    // const info = quickAuthDebugSetup.getAuthDebugInfo();
    const info = { mock: 'debug info' };
    setDebugInfo(info);
  }, [user?.id, isAuthenticated, isLoading, error]);

  const handleVerboseToggle = () => {
    const newVerboseState = !verboseLogging;
    setVerboseLogging(newVerboseState);
    
    // if (newVerboseState) {
    //   quickAuthDebugSetup.enableVerboseLogging();
    // } else {
    //   quickAuthDebugSetup.disableVerboseLogging();
    // }
    console.log('Verbose logging toggled:', newVerboseState);
  };

  const handleHealthCheck = () => {
    // const health = quickAuthDebugSetup.quickAuthHealthCheck();
    // authDebugLogger.logAuthStep(user?.id, 'manual_health_check', health);
    console.log('Health check performed for user:', user?.id);
    
    // Update debug info
    // const info = quickAuthDebugSetup.getAuthDebugInfo();
    const info = { mock: 'health check info', timestamp: new Date().toISOString() };
    setDebugInfo(info);
  };

  const handleTestLogin = async () => {
    const startTime = Date.now();
    
    try {
      // authDebugLogger.logAuthStep(user?.id, 'test_login_started', {
      //   timestamp: new Date().toISOString()
      // });
      console.log('Test login started for user:', user?.id);
      
      await login();
      
      const duration = Date.now() - startTime;
      // quickAuthDebugSetup.logAuthTiming('test_login', duration, user?.id);
      // authDebugLogger.logAuthStep(user?.id, 'test_login_completed', {
      //   duration,
      //   timestamp: new Date().toISOString()
      // });
      console.log('Test login completed for user:', user?.id, 'duration:', duration);
    } catch (loginError) {
      const duration = Date.now() - startTime;
      // authDebugLogger.logAuthError(user?.id, 'Test login failed', {
      //   error: loginError instanceof Error ? loginError.message : String(loginError),
      //   duration,
      //   timestamp: new Date().toISOString()
      // });
      console.log('Test login failed for user:', user?.id, 'error:', loginError, 'duration:', duration);
    }
  };

  const handleTestLogout = async () => {
    const startTime = Date.now();
    
    try {
      // authDebugLogger.logAuthStep(user?.id, 'test_logout_started', {
      //   timestamp: new Date().toISOString()
      // });
      console.log('Test logout started for user:', user?.id);
      
      await logout();
      
      const duration = Date.now() - startTime;
      // quickAuthDebugSetup.logAuthTiming('test_logout', duration, user?.id);
      // authDebugLogger.logAuthStep(user?.id, 'test_logout_completed', {
      //   duration,
      //   timestamp: new Date().toISOString()
      // });
      console.log('Test logout completed for user:', user?.id, 'duration:', duration);
    } catch (logoutError) {
      const duration = Date.now() - startTime;
      // authDebugLogger.logAuthError(user?.id, 'Test logout failed', {
      //   error: logoutError instanceof Error ? logoutError.message : String(logoutError),
      //   duration,
      //   timestamp: new Date().toISOString()
      // });
      console.log('Test logout failed for user:', user?.id, 'error:', logoutError, 'duration:', duration);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Authentication Debug Test</CardTitle>
        <CardDescription>
          Test and debug authentication functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Current Auth State */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">Current Authentication State</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Authenticated:</span>
              <Badge className={isAuthenticated ? 'bg-green-500' : 'bg-red-500'}>
                {isAuthenticated ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Loading:</span>
              <Badge className={isLoading ? 'bg-yellow-500' : 'bg-gray-500'}>
                {isLoading ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>User ID:</span>
              <span className="text-sm font-mono">{user?.id || 'None'}</span>
            </div>
            {error && (
              <div className="flex justify-between">
                <span>Error:</span>
                <Badge className="bg-red-500">{error}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Debug Actions */}
        <div className="mb-6">
          <h4 className="font-medium mb-3">Debug Actions</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              onClick={handleVerboseToggle}
              className={verboseLogging ? 'bg-red-500' : 'bg-gray-200'}
              size="sm"
            >
              {verboseLogging ? 'Disable' : 'Enable'} Verbose Logging
            </Button>
            <Button
              onClick={handleHealthCheck}
              className="bg-gray-200"
              size="sm"
            >
              Health Check
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleTestLogin}
              disabled={isLoading || isAuthenticated}
              size="sm"
            >
              Test Login
            </Button>
            <Button
              onClick={handleTestLogout}
              disabled={isLoading || !isAuthenticated}
              className="bg-gray-200"
              size="sm"
            >
              Test Logout
            </Button>
          </div>
        </div>

        {/* Debug Information */}
        <div className="mb-4">
          <h4 className="font-medium mb-3">Debug Information</h4>
          <div className="p-3 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
            <pre className="text-xs">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>

        {/* Logging Status */}
        <div className="text-sm text-gray-600">
          <p>Verbose logging: {verboseLogging ? 'Enabled' : 'Disabled'}</p>
          <p>Debug module loaded: Yes</p>
        </div>
      </CardContent>
    </Card>
  );
}