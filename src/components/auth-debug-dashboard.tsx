/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { authDebugLogger } from '@/lib/auth-debug-logger';
import { useAuth } from '@/hooks/useAuth';

export interface AuthDebugDashboardProps {
  className?: string;
}

export function AuthDebugDashboard({ className = '' }: AuthDebugDashboardProps) {
  const { user, isAuthenticated, isLoading, error } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      // Get recent logs
      const recentLogs = authDebugLogger.getRecentLogs(20);
      setLogs(recentLogs);
    }
  }, [isClient]);

  if (!isClient) {
    return (
      <div className={`p-4 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold mb-2">Authentication Debug Dashboard</h3>
        <p className="text-gray-600 dark:text-gray-300">Loading debug information...</p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Authentication Debug Dashboard</h3>
      
      {/* Current Auth State */}
      <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium mb-2">Current Authentication State</h4>
        <div className="space-y-1 text-sm">
          <div>Authenticated: <span className={isAuthenticated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {isAuthenticated ? 'Yes' : 'No'}
          </span></div>
          <div>Loading: <span className={isLoading ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-300'}>
            {isLoading ? 'Yes' : 'No'}
          </span></div>
          <div>User ID: <span className="text-gray-600 dark:text-gray-300">{user?.id || 'None'}</span></div>
          <div>Error: <span className="text-red-600 dark:text-red-400">{error || 'None'}</span></div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Recent Authentication Logs</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No recent authentication logs</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 text-xs">
                <div className="flex justify-between items-start">
                  <span className="font-medium">{log.action}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    log.severity === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                    log.severity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                    log.severity === 'debug' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                    'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  }`}>
                    {log.severity}
                  </span>
                </div>
                {log.userId && <div className="text-gray-600 dark:text-gray-300 mt-1">User: {log.userId}</div>}
                {Object.keys(log.details).length > 0 && (
                  <div className="text-gray-500 dark:text-gray-400 mt-1">
                    Details: {JSON.stringify(log.details, null, 2)}
                  </div>
                )}
                <div className="text-gray-400 dark:text-gray-500 mt-1">{log.timestamp}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Debug Actions */}
      <div className="flex space-x-2">
        <button
          onClick={() => {
            const recentLogs = authDebugLogger.getRecentLogs(20);
            setLogs(recentLogs);
          }}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Refresh Logs
        </button>
        <button
          onClick={() => {
            authDebugLogger.clearLogs();
            setLogs([]);
          }}
          className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
        >
          Clear Logs
        </button>
      </div>
    </div>
  );
}