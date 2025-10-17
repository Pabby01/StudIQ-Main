'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LandingNavbar } from '@/components/LandingNavbar';
import { Footer } from '@/components/Footer';
import { Brain, Wallet, TrendingUp, Store, Shield, Users, Loader2 } from 'lucide-react';

export default function Home() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (ready && authenticated) {
      router.push('/dashboard');
    }
  }, [ready, authenticated, router]);

  // Show loading while checking authentication
  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render landing page if user is authenticated (will redirect)
  if (authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Your AI-Powered
            <span className="text-blue-600"> Financial Future</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Connect your wallet, learn from AI, and earn rewards while building financial literacy. 
            StudIQ makes DeFi accessible for every student.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/dashboard">
              <Button size="lg" className="px-8 py-3">
                Get Started
              </Button>
            </Link>
            <Link href="/ai-tutor">
              <Button variant="outline" size="lg" className="px-8 py-3">
                Try AI Tutor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need to succeed financially
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From wallet management to AI-powered learning, we&apos;ve got you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Brain className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>AI Financial Tutor</CardTitle>
                <CardDescription>
                  Learn financial concepts through personalized AI conversations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Wallet className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle>Solana Wallet Integration</CardTitle>
                <CardDescription>
                  Connect your existing wallet or create a new one seamlessly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle>Curated Savings Pools</CardTitle>
                <CardDescription>
                  Discover safe, student-friendly DeFi opportunities with AI explanations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Store className="h-10 w-10 text-orange-600 mb-2" />
                <CardTitle>Campus Store Rewards</CardTitle>
                <CardDescription>
                  Earn cashback and rebates from your favorite campus merchants
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Shield className="h-10 w-10 text-red-600 mb-2" />
                <CardTitle>Security First</CardTitle>
                <CardDescription>
                  Your funds and data are protected with industry-leading security
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Users className="h-10 w-10 text-indigo-600 mb-2" />
                <CardTitle>Student Community</CardTitle>
                <CardDescription>
                  Join thousands of students building their financial future together
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              How StudIQ Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get started in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600">Link your existing Solana wallet or create a new one securely</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Learn with AI</h3>
              <p className="text-gray-600">Chat with our AI tutor to understand DeFi concepts and opportunities</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Earn & Save</h3>
              <p className="text-gray-600">Participate in curated savings pools and earn rewards for learning</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-8">
            About StudIQ
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            StudIQ is the first AI-powered financial education platform built specifically for students. 
            We believe that financial literacy should be accessible, engaging, and rewarding. Our platform 
            combines cutting-edge AI technology with the power of decentralized finance to create a safe 
            learning environment where students can build real financial skills.
          </p>
          <p className="text-lg text-gray-600">
            Join thousands of students who are already building their financial future with StudIQ.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to start your financial journey?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Join StudIQ today and take control of your financial future with AI-powered learning.
          </p>
          <div className="mt-8">
            <Link href="/dashboard">
              <Button size="lg" variant="secondary" className="px-8 py-3">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
