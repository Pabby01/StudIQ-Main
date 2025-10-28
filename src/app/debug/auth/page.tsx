'use client';

import React from 'react';
import { AuthDebugDashboard } from '@/components/auth-debug-dashboard';
import { AuthDebugTest } from '@/components/AuthDebugTest';

export default function AuthDebugPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Authentication Debug Dashboard
          </h1>
          <p className="text-gray-600">
            Debug and test authentication functionality
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Debug Dashboard */}
          <div>
            <AuthDebugDashboard className="h-full" />
          </div>

          {/* Debug Test */}
          <div>
            <AuthDebugTest className="h-full" />
          </div>
        </div>

        {/* Additional Debug Information */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Debug Information
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Use the dashboard to monitor authentication state</p>
            <p>• Use the test panel to simulate login/logout operations</p>
            <p>• Enable verbose logging for detailed authentication flow</p>
            <p>• Check the browser console for additional debug output</p>
          </div>
        </div>
      </div>
    </div>
  );
}