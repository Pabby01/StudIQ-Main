import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Brain, Wallet, TrendingUp, Store, Shield, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
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
                Connect Your Wallet
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
