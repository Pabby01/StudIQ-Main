/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import React from 'react';
import { OptimizedOnboardingFlow } from '@/components/OptimizedOnboardingFlow';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function OnboardingPage() {
  const router = useRouter();

  const handleOnboardingComplete = () => {
    // Redirect to dashboard after successful onboarding
    try {
      const dl = (window as unknown as { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
      dl?.push({ event: 'onboarding_complete', event_category: 'onboarding' });
    } catch { }
    router.push('/dashboard');
  };

  return (
    <>
      <Head>
        <title>Welcome to StudIQ - Get Started</title>
        <meta name="description" content="Join StudIQ and master your money in minutes. Free for students." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
              Welcome to StudIQ
            </h1>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Let&apos;s get you set up in under a minute
            </p>
          </div>

          <OptimizedOnboardingFlow onComplete={handleOnboardingComplete} />
        </div>
      </div>
    </>
  );
}