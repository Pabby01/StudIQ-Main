/* eslint-disable react-hooks/exhaustive-deps */
 
'use client';

import React from 'react';
import OnboardingFlow from '@/components/OnboardingFlow';
import { OptimizedOnboardingFlow } from '@/components/OptimizedOnboardingFlow';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variant = (searchParams?.get('variant') || 'optimized').toLowerCase();

  const handleEvent = (name: string, params: Record<string, unknown> = {}) => {
    try {
      const dl = (window as unknown as { dataLayer?: Array<Record<string, unknown>> }).dataLayer
      dl?.push({ event: name, event_category: 'onboarding', event_label: variant, ...params })
    } catch {}
  };

  React.useEffect(() => {
    handleEvent('onboarding_variant', { variant })
  }, [variant]);

  const handleOnboardingComplete = () => {
    // Redirect to dashboard after successful onboarding
    handleEvent('onboarding_complete');
    router.push('/dashboard');
  };

  return (
    <>
      <Head>
        <title>Welcome to StudIQ - Student Financial Platform Setup</title>
        <meta name="description" content="Get started with StudIQ - the AI-powered student wallet and financial literacy platform. Complete your setup and start your financial journey." />
        <meta name="keywords" content="student onboarding, financial platform setup, student wallet setup, StudIQ setup, student financial literacy" />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="Welcome to StudIQ - Student Financial Platform Setup" />
        <meta property="og:description" content="Complete your StudIQ setup and start your student financial journey with AI-powered tools." />
        <meta property="og:url" content="https://studiq.app/onboarding" />
        <meta property="og:site_name" content="StudIQ" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image" content="https://studiq.app/og-onboarding.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="StudIQ Student Onboarding" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Welcome to StudIQ - Student Financial Platform Setup" />
        <meta name="twitter:description" content="Complete your StudIQ setup and start your student financial journey with AI-powered tools." />
        <meta name="twitter:image" content="https://studiq.app/twitter-onboarding.png" />
      </Head>
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
          
          {variant === 'classic' ? (
            <OnboardingFlow onComplete={handleOnboardingComplete} />
          ) : (
            <OptimizedOnboardingFlow onComplete={handleOnboardingComplete} />
          )}
        </div>
      </div>
    </>
  );
}