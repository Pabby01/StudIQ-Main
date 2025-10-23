'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LandingNavbar } from '@/components/LandingNavbar';
import { Footer } from '@/components/Footer';
import { Brain, Wallet, TrendingUp, Store, Shield, Users, Loader2, ArrowRight, Sparkles, DollarSign, BookOpen, Target, Zap, GraduationCap, Calculator, Lightbulb, Trophy, PieChart, Atom } from 'lucide-react';

export default function Home() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (ready && authenticated && !isRedirecting) {
      setIsRedirecting(true);
      // Add a small delay to prevent flash
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    }
  }, [ready, authenticated, router, isRedirecting]);

  // Show loading while checking authentication (with timeout)
  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Initializing app...</p>
          <p className="text-xs text-gray-500 mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  // Show brief redirect message if authenticated
  if (authenticated && isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Welcome back! Redirecting...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen animated-gradient">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10 hero-gradient" aria-hidden="true" />
        
        {/* Floating particles background */}
        <div className="absolute inset-0 -z-5" aria-hidden="true">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
        
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center px-4 md:px-8">
          <motion.div 
            className="glass-panel rounded-3xl p-10 md:p-12 text-center md:text-left relative overflow-hidden"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Web 3 badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/30 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gradient-primary">Web3 Powered</span>
            </motion.div>
            
            <motion.h1 
              className="text-web3-hero text-gradient-primary text-shadow-glow mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Simplifying Financial Literacy
              <motion.span 
                className="block text-gradient-secondary mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >for Every Student</motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-web3-subtitle text-gray-700 mb-8 max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Connect your wallet, learn from AI, and earn rewards while building financial literacy. 
              StudIQ makes DeFi accessible through cutting-edge Web3 technology.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 items-center justify-center md:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link href="/onboarding">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button size="lg" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 border-0">
                    <span className="inline-flex items-center gap-2">
                      Get Started
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <ArrowRight className="h-5 w-5" />
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
                  <Button variant="outline" size="lg" className="px-8 py-4 border-2 border-blue-200 hover:border-purple-300 bg-white/80 hover:bg-white text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                    <span className="inline-flex items-center gap-2">
                      Try AI Tutor
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Sparkles className="h-5 w-5 text-blue-600" />
                      </motion.div>
                    </span>
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
            
            {/* Feature highlights */}
            <motion.div
              className="flex flex-wrap gap-6 mt-8 justify-center md:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              {[
                { icon: Shield, text: "Secure & Decentralized" },
                { icon: Brain, text: "AI-Powered Learning" },
                { icon: Users, text: "Student Community" }
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <feature.icon className="h-4 w-4 text-blue-600" />
                  <span>{feature.text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="relative flex justify-center p-16 md:p-20 min-h-[600px] items-center"
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
            
            {/* Single Orbit with All Icons - Perfect Circular Motion */}
            <motion.div
              className="absolute inset-0 z-20"
              animate={{ rotate: 360 }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              {[
                { icon: Brain, color: 'text-blue-600', bg: 'bg-blue-100/90', angle: 0, name: 'AI Learning' },
                { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100/90', angle: 30, name: 'Finance' },
                { icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-100/90', angle: 60, name: 'Education' },
                { icon: Calculator, color: 'text-purple-600', bg: 'bg-purple-100/90', angle: 90, name: 'Mathematics' },
                { icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100/90', angle: 120, name: 'Wallet' },
                { icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100/90', angle: 150, name: 'Knowledge' },
                { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100/90', angle: 180, name: 'Innovation' },
                { icon: Target, color: 'text-red-600', bg: 'bg-red-100/90', angle: 210, name: 'Goals' },
                { icon: Trophy, color: 'text-orange-600', bg: 'bg-orange-100/90', angle: 240, name: 'Achievement' },
                { icon: PieChart, color: 'text-pink-600', bg: 'bg-pink-100/90', angle: 270, name: 'Analytics' },
                { icon: Zap, color: 'text-violet-600', bg: 'bg-violet-100/90', angle: 300, name: 'Energy' },
                { icon: Atom, color: 'text-cyan-600', bg: 'bg-cyan-100/90', angle: 330, name: 'Science' }
              ].map((item, index) => {
                const IconComponent = item.icon;
                const radius = 200; // Single orbit radius with clear space from image
                const x = Math.cos((item.angle * Math.PI) / 180) * radius;
                const y = Math.sin((item.angle * Math.PI) / 180) * radius;
                
                return (
                  <motion.div
                    key={index}
                    className={`absolute p-3 ${item.bg} backdrop-blur-sm rounded-full shadow-lg cursor-pointer transition-all duration-300`}
                    style={{
                      left: '50%',
                      top: '50%',
                      x: x - 24, // Center the icon
                      y: y - 24, // Center the icon
                    }}
                    animate={{
                      rotate: -360 // Counter-rotate to keep icons upright
                    }}
                    transition={{
                      duration: 30,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    whileHover={{
                      scale: 1.2,
                      transition: { duration: 0.2, ease: "easeOut" }
                    }}
                    title={item.name}
                  >
                    <IconComponent className={`h-6 w-6 ${item.color} transition-colors duration-300`} />
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </section>
{/* merged hero block above */}

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 web3-gradient-primary relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
        </div>
        
        <div className="mx-auto max-w-7xl relative z-10">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-web3-hero text-gradient-primary text-shadow-glow mb-6">
              Everything you need to succeed financially
            </h2>
            <p className="text-web3-subtitle text-black/90 max-w-3xl mx-auto">
              From wallet management to AI-powered learning, we&apos;ve got you covered with cutting-edge Web3 technology.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "AI Financial Tutor",
                description: "Learn financial concepts through personalized AI conversations",
                gradient: "from-blue-500 to-cyan-500",
                iconBg: "bg-blue-500/20"
              },
              {
                icon: Wallet,
                title: "Solana Wallet Integration",
                description: "Connect your existing wallet or create a new one seamlessly",
                gradient: "from-green-500 to-emerald-500",
                iconBg: "bg-green-500/20"
              },
              {
                icon: TrendingUp,
                title: "Curated Savings Pools",
                description: "Discover safe, student-friendly DeFi opportunities with AI explanations",
                gradient: "from-purple-500 to-pink-500",
                iconBg: "bg-purple-500/20"
              },
              {
                icon: Store,
                title: "Campus Store Rewards",
                description: "Earn cashback and rebates from your favorite campus merchants",
                gradient: "from-orange-500 to-red-500",
                iconBg: "bg-orange-500/20"
              },
              {
                icon: Shield,
                title: "Security First",
                description: "Your funds and data are protected with industry-leading security",
                gradient: "from-red-500 to-pink-500",
                iconBg: "bg-red-500/20"
              },
              {
                icon: Users,
                title: "Student Community",
                description: "Join thousands of students building their financial future together",
                gradient: "from-indigo-500 to-purple-500",
                iconBg: "bg-indigo-500/20"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <Card className="glass-panel border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 h-full group relative overflow-hidden">
                  {/* Gradient border effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl`}></div>
                  
                  <CardHeader className="relative z-10 p-8">
                    <div className={`w-16 h-16 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-8 w-8 text-black" />
                    </div>
                    <CardTitle className="text-xl font-bold text-black mb-4 group-hover:text-gradient-primary transition-all duration-300">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-black/80 text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 web3-gradient-secondary relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-20 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-10 left-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>
        
        <div className="mx-auto max-w-7xl relative z-10">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-web3-hero text-gradient-secondary text-shadow-glow mb-6">
              How StudIQ Works
            </h2>
            <p className="text-web3-subtitle text-black/90 max-w-2xl mx-auto">
              Get started in three simple steps and begin your Web3 financial journey
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Connect Your Wallet",
                description: "Link your existing Solana wallet or create a new one securely with our Web3 integration",
                gradient: "from-blue-500 to-cyan-500",
                bgGradient: "bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
              },
              {
                step: "2", 
                title: "Learn with AI",
                description: "Chat with our AI tutor to understand DeFi concepts and discover opportunities",
                gradient: "from-green-500 to-emerald-500",
                bgGradient: "bg-gradient-to-br from-green-500/20 to-emerald-500/20"
              },
              {
                step: "3",
                title: "Earn & Save",
                description: "Participate in curated savings pools and earn rewards for learning and engagement",
                gradient: "from-purple-500 to-pink-500",
                bgGradient: "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <div className="glass-panel rounded-3xl p-10 h-full group relative overflow-hidden">
                  {/* Gradient border effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-3xl`}></div>
                  
                  <div className="relative z-10">
                    <div className={`mx-auto w-20 h-20 ${item.bgGradient} rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 shadow-xl`}>
                      <span className="text-3xl font-bold text-black text-shadow-glow">{item.step}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-4 group-hover:text-gradient-primary transition-all duration-300">
                      {item.title}
                    </h3>
                    <p className="text-black/80 text-lg leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  
                  {/* Connection line for desktop */}
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-white/50 to-transparent transform -translate-y-1/2 z-20"></div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 web3-gradient-accent relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full filter blur-3xl"></div>
        </div>
        
        <motion.div 
          className="mx-auto max-w-5xl text-center relative z-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-web3-hero text-gradient-accent text-shadow-glow mb-12">
            About StudIQ
          </h2>
          <div className="space-y-8">
            <p className="text-xl text-black leading-relaxed">
              StudIQ is the first AI-powered financial education platform built specifically for students on Web3. 
              We believe that financial literacy should be accessible, engaging, and rewarding in the decentralized future.
            </p>
            <p className="text-xl text-black leading-relaxed">
              Our platform combines cutting-edge AI technology with the power of decentralized finance to create a safe 
              learning environment where students can build real financial skills for the Web3 economy.
            </p>
            <motion.p 
              className="text-xl text-black leading-relaxed font-semibold"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
            >
              Join thousands of students who are already building their financial future with StudIQ.
            </motion.p>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 hero-gradient relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
        </div>
        
        <motion.div 
          className="mx-auto max-w-4xl text-center relative z-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-web3-hero text-gradient-primary text-shadow-glow mb-8">
            Ready to start your Web3 financial journey?
          </h2>
          <p className="text-xl text-black/90 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join StudIQ today and take control of your financial future with AI-powered learning and cutting-edge Web3 technology.
          </p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <Link href="/dashboard">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button size="lg" className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 border-0">
                  <span className="inline-flex items-center gap-3">
                    Get Started Now
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ArrowRight className="h-6 w-6" />
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
                <Button variant="outline" size="lg" className="px-12 py-4 border-2 border-black/30 hover:border-black/50 bg-white/10 hover:bg-black/20 text-black font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm">
                  <span className="inline-flex items-center gap-3">
                    Try AI Tutor
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="h-6 w-6" />
                    </motion.div>
                  </span>
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
