/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Wallet, 
  Shield, 
  Database, 
  Sparkles, 
  Trophy, 
  Clock, 
  CheckCircle, 
  Zap,
  Brain,
  Lock,
  Coins,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GamifiedAccountCreationProps {
  isWalletCreation?: boolean;
  loadingMessage?: string;
  timeout?: number; // in milliseconds
  onTimeout?: () => void;
}

interface CreationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: number; // seconds
  funFact: string;
}

const CREATION_STEPS: CreationStep[] = [
  {
    id: 'wallet',
    title: 'Creating Your Digital Wallet',
    description: 'Setting up your secure Solana wallet with military-grade encryption',
    icon: <Wallet className="w-6 h-6" />,
    duration: 30,
    funFact: 'Your wallet uses the same encryption technology that protects government secrets! 🔐'
  },
  {
    id: 'security',
    title: 'Initializing Security Protocols',
    description: 'Implementing multi-layer security and fraud protection',
    icon: <Shield className="w-6 h-6" />,
    duration: 25,
    funFact: 'We&apos;re creating 256-bit security keys - that&apos;s 2^256 possible combinations! 🛡️'
  },
  {
    id: 'database',
    title: 'Setting Up Your Profile',
    description: 'Creating your personalized financial dashboard and preferences',
    icon: <Database className="w-6 h-6" />,
    duration: 20,
    funFact: 'Your profile is stored across multiple secure servers for maximum reliability! 🌐'
  },
  {
    id: 'ai',
    title: 'Calibrating AI Tutor',
    description: 'Training your personal financial AI assistant',
    icon: <Brain className="w-6 h-6" />,
    duration: 15,
    funFact: 'Your AI tutor can process financial data 1000x faster than humans! 🧠'
  },
  {
    id: 'finalization',
    title: 'Final Touches',
    description: 'Connecting to blockchain networks and finalizing setup',
    icon: <Sparkles className="w-6 h-6" />,
    duration: 10,
    funFact: 'You&apos;re now connected to a network processing $50B+ in daily transactions! ✨'
  }
];

export default function GamifiedAccountCreation({ 
  isWalletCreation = false,
  loadingMessage = "Setting up your account...",
  timeout = 120000, // 2 minutes default
  onTimeout 
}: GamifiedAccountCreationProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showFunFact, setShowFunFact] = useState(false);
  const [experiencePoints, setExperiencePoints] = useState(0);

  const currentStep = CREATION_STEPS[currentStepIndex];
  const totalSteps = CREATION_STEPS.length;
  const overallProgress = ((currentStepIndex + 1) / totalSteps) * 100;

  useEffect(() => {
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeElapsed(elapsed);
      
      // Calculate which step we should be on based on elapsed time
      let cumulativeTime = 0;
      let newStepIndex = 0;
      
      for (let i = 0; i < CREATION_STEPS.length; i++) {
        cumulativeTime += CREATION_STEPS[i].duration * 1000;
        if (elapsed < cumulativeTime) {
          newStepIndex = i;
          break;
        }
        newStepIndex = i + 1;
      }
      
      // Update current step
      if (newStepIndex !== currentStepIndex && newStepIndex < CREATION_STEPS.length) {
        setCurrentStepIndex(newStepIndex);
        
        // Mark previous steps as completed
        const newCompletedSteps = CREATION_STEPS.slice(0, newStepIndex).map(step => step.id);
        setCompletedSteps(newCompletedSteps);
        
        // Add experience points
        setExperiencePoints(prev => prev + 100);
        
        // Show fun fact for new step
        setShowFunFact(true);
        setTimeout(() => setShowFunFact(false), 4000);
      }
      
      // Check for timeout
      if (elapsed >= timeout) {
        setHasTimedOut(true);
        onTimeout?.();
        clearInterval(interval);
      }
    }, 1000);

    // Show initial fun fact
    setTimeout(() => {
      setShowFunFact(true);
      setTimeout(() => setShowFunFact(false), 4000);
    }, 2000);

    return () => clearInterval(interval);
  }, [timeout, onTimeout, currentStepIndex]);

  const handleRetry = () => {
    setHasTimedOut(false);
    setTimeElapsed(0);
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setExperiencePoints(0);
    window.location.reload();
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (hasTimedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-t-lg">
            <div className="mx-auto mb-4 w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Setup Taking Longer Than Expected</CardTitle>
            <CardDescription className="text-white/90">
              Don&apos;t worry! Sometimes great things take a little extra time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-700 mb-2">{formatTime(timeElapsed)}</div>
              <p className="text-gray-600">Time elapsed</p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                🔧 What might be happening:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• High network traffic (we&apos;re popular! 🎉)</li>
                <li>• Extra security checks for your protection</li>
                <li>• Blockchain network congestion</li>
                <li>• Your connection might be slower today</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800 mb-2">
                💡 Pro tip:
              </p>
              <p className="text-sm text-green-700">
                Account creation can take 2-5 minutes during peak hours. Your patience will be rewarded with a super secure wallet! 🏆
              </p>
            </div>

            <Button onClick={handleRetry} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Gamified Loading Overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/95 via-purple-900/95 to-pink-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-t-lg">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Creating Your StudIQ Account</CardTitle>
                <CardDescription className="text-white/90">
                  Setting up your financial future... This takes 2-3 minutes ⏱️
                </CardDescription>
              </div>
            </div>
            
            {/* Experience Points */}
            <div className="flex items-center justify-center gap-2 bg-white/10 rounded-full px-4 py-2 w-fit mx-auto">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-semibold">{experiencePoints} XP</span>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm text-gray-500">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>

            {/* Current Step */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white">
                  {currentStep?.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{currentStep?.title}</h3>
                  <p className="text-gray-600 text-sm">{currentStep?.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-700">{formatTime(timeElapsed)}</div>
                  <div className="text-xs text-gray-500">elapsed</div>
                </div>
              </div>
            </div>

            {/* Fun Fact Animation */}
            {showFunFact && currentStep && (
              <div className={cn(
                "bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 transition-all duration-500",
                "animate-pulse"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-semibold text-yellow-800">Did you know?</span>
                </div>
                <p className="text-sm text-yellow-700">{currentStep.funFact}</p>
              </div>
            )}

            {/* Steps Progress */}
            <div className="grid grid-cols-5 gap-2">
              {CREATION_STEPS.map((step, index) => (
                <div key={step.id} className="text-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300",
                    completedSteps.includes(step.id) 
                      ? "bg-green-500 text-white" 
                      : index === currentStepIndex
                      ? "bg-blue-500 text-white animate-pulse"
                      : "bg-gray-200 text-gray-400"
                  )}>
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className={cn(
                    "text-xs transition-colors duration-300",
                    completedSteps.includes(step.id) 
                      ? "text-green-600 font-semibold" 
                      : index === currentStepIndex
                      ? "text-blue-600 font-semibold"
                      : "text-gray-400"
                  )}>
                    {step.title.split(' ')[0]}
                  </div>
                </div>
              ))}
            </div>

            {/* Motivational Messages */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Lock className="w-4 h-4" />
                <span className="text-sm">Your data is being encrypted with bank-level security</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Coins className="w-4 h-4" />
                <span className="text-sm">Connecting you to the future of finance</span>
              </div>
            </div>

            {/* Estimated Time */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                <strong>Estimated time remaining:</strong> {Math.max(0, Math.ceil((120 - timeElapsed/1000) / 60))} minute(s)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Great things take time! Your secure wallet will be worth the wait 🚀
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}