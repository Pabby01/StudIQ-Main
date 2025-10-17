'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LandingNavbar } from '@/components/LandingNavbar';
import { Footer } from '@/components/Footer';
import { Brain, Wallet, TrendingUp, Store, Shield, Users, Loader2, ArrowRight, Sparkles, DollarSign, BookOpen, Target, Zap } from 'lucide-react';

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
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10 hero-gradient" aria-hidden="true" />
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <motion.div 
            className="glass-panel rounded-2xl p-8 md:p-10 text-center md:text-left"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.h1 
              className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Your AI-Powered
              <motion.span 
                className="text-blue-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              > Financial Future</motion.span>
            </motion.h1>
            <motion.p 
              className="mt-6 text-lg leading-8 text-gray-600"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Connect your wallet, learn from AI, and earn rewards while building financial literacy. 
              StudIQ makes DeFi accessible for every student.
            </motion.p>
            <motion.div 
              className="mt-10 flex flex-wrap items-center gap-4 md:gap-x-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link href="/dashboard">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button size="lg" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
                    <span className="inline-flex items-center gap-2">
                      Get Started
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.div>
                    </span>
                  </Button>
                </motion.div>
              </Link>
              <Link href="/ai-tutor">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button variant="outline" size="lg" className="px-8 py-3 border-blue-200 hover:border-blue-300 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <span className="inline-flex items-center gap-2">
                      Try AI Tutor
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Sparkles className="h-4 w-4 text-blue-600" />
                      </motion.div>
                    </span>
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="relative flex justify-center"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Animated Background Blurs */}
            <motion.div 
              className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-blue-200/30 blur-xl z-0" 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true" 
            />
            <motion.div 
              className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-indigo-200/30 blur-xl z-0" 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              aria-hidden="true" 
            />
            
            {/* Main Image Container - Smaller and Circular */}
            <motion.div 
              className="relative w-80 h-80 overflow-hidden rounded-full shadow-2xl ring-1 ring-black/5 z-5"
              whileHover={{ scale: 1.05, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.div
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="w-full h-full"
              >
                <Image
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop"
                  alt="Students learning and building their financial future"
                  width={320}
                  height={320}
                  priority
                  quality={85}
                  sizes="(max-width: 768px) 280px, 320px"
                  className="h-full w-full object-cover"
                />
              </motion.div>
            </motion.div>
            
            {/* Floating Icons Around Image - Higher z-index */}
            <motion.div
              className="absolute -top-8 left-1/4 p-3 bg-blue-100/90 backdrop-blur-sm rounded-full shadow-lg z-20"
              animate={{ 
                y: [0, -12, 0],
                rotate: [0, 360]
              }}
              transition={{ 
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 20, repeat: Infinity, ease: "linear" }
              }}
            >
              <Brain className="h-6 w-6 text-blue-600" />
            </motion.div>
            
            <motion.div
              className="absolute top-1/4 -right-8 p-3 bg-indigo-100/90 backdrop-blur-sm rounded-full shadow-lg z-20"
              animate={{ 
                x: [0, 12, 0],
                rotate: [0, 360]
              }}
              transition={{ 
                x: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 25, repeat: Infinity, ease: "linear" }
              }}
            >
              <DollarSign className="h-6 w-6 text-indigo-600" />
            </motion.div>
            
            <motion.div
              className="absolute bottom-1/4 -left-8 p-3 bg-blue-100/90 backdrop-blur-sm rounded-full shadow-lg z-20"
              animate={{ 
                x: [0, -12, 0],
                rotate: [0, 360]
              }}
              transition={{ 
                x: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 18, repeat: Infinity, ease: "linear" }
              }}
            >
              <BookOpen className="h-6 w-6 text-blue-600" />
            </motion.div>
            
            <motion.div
              className="absolute -bottom-8 right-1/4 p-3 bg-indigo-100/90 backdrop-blur-sm rounded-full shadow-lg z-20"
              animate={{ 
                y: [0, 12, 0],
                rotate: [0, 360]
              }}
              transition={{ 
                y: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 22, repeat: Infinity, ease: "linear" }
              }}
            >
              <Target className="h-6 w-6 text-indigo-600" />
            </motion.div>
            
            <motion.div
              className="absolute top-1/3 -left-6 p-3 bg-blue-100/90 backdrop-blur-sm rounded-full shadow-lg z-20"
              animate={{ 
                y: [0, -10, 0],
                x: [0, -10, 0],
                rotate: [0, 360]
              }}
              transition={{ 
                y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
                x: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 15, repeat: Infinity, ease: "linear" }
              }}
            >
              <Zap className="h-6 w-6 text-blue-600" />
            </motion.div>
            
            <motion.div
              className="absolute bottom-1/3 -right-6 p-3 bg-indigo-100/90 backdrop-blur-sm rounded-full shadow-lg z-20"
              animate={{ 
                y: [0, 10, 0],
                x: [0, 10, 0],
                rotate: [0, 360]
              }}
              transition={{ 
                y: { duration: 2.7, repeat: Infinity, ease: "easeInOut" },
                x: { duration: 3.1, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 28, repeat: Infinity, ease: "linear" }
              }}
            >
              <Wallet className="h-6 w-6 text-indigo-600" />
            </motion.div>
          </motion.div>
        </div>
      </section>
{/* merged hero block above */}

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
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <Brain className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>AI Financial Tutor</CardTitle>
                <CardDescription>
                  Learn financial concepts through personalized AI conversations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <Wallet className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle>Solana Wallet Integration</CardTitle>
                <CardDescription>
                  Connect your existing wallet or create a new one seamlessly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle>Curated Savings Pools</CardTitle>
                <CardDescription>
                  Discover safe, student-friendly DeFi opportunities with AI explanations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <Store className="h-10 w-10 text-orange-600 mb-2" />
                <CardTitle>Campus Store Rewards</CardTitle>
                <CardDescription>
                  Earn cashback and rebates from your favorite campus merchants
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <Shield className="h-10 w-10 text-red-600 mb-2" />
                <CardTitle>Security First</CardTitle>
                <CardDescription>
                  Your funds and data are protected with industry-leading security
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
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
            <div className="text-center glass-card rounded-2xl p-8">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600">Link your existing Solana wallet or create a new one securely</p>
            </div>
            
            <div className="text-center glass-card rounded-2xl p-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Learn with AI</h3>
              <p className="text-gray-600">Chat with our AI tutor to understand DeFi concepts and opportunities</p>
            </div>
            
            <div className="text-center glass-card rounded-2xl p-8">
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
