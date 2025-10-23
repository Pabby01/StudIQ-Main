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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
            Welcome to StudIQ
          </h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Let&apos;s get you set up in just a few steps
          </p>
        </div>
        
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </div>
    </div>
  );
}