'use client';

import React from 'react';
import OnboardingFlow from '@/components/OnboardingFlow';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();

  const handleOnboardingComplete = () => {
    // Redirect to dashboard after successful onboarding
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to StudIQ</h1>
          <p className="text-gray-600">Let&apos;s get you set up in just a few steps</p>
        </div>
        
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </div>
    </div>
  );
}