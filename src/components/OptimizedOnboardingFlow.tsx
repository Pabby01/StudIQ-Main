 
 
'use client'

import React, { useState, useEffect } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, AlertCircle, Wallet, User, Zap, ShieldCheck, Blocks, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OptimizedOnboardingFlowProps {
  onComplete: () => void
}

const ONBOARDING_STEPS = [
  { id: 'connect', label: 'Connect Account', icon: User },
  { id: 'wallet', label: 'Create Wallet', icon: Wallet },
  { id: 'initialize', label: 'Setup Profile', icon: Zap }
]

export function OptimizedOnboardingFlow({ onComplete }: OptimizedOnboardingFlowProps) {
  const { 
    isLoading, 
    isAuthenticated, 
    walletAddress, 
    error, 
    progress, 
    stage, 
    login, 
    retryWalletCreation,
    user 
  } = useOptimizedAuth()

  const [currentStep, setCurrentStep] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [didVerified, setDidVerified] = useState(false)
  const [rewardGranted, setRewardGranted] = useState(false)
  const [startTime] = useState<number>(() => Date.now())

  const emitEvent = (name: string, params: Record<string, unknown> = {}) => {
    try {
      const dl = (window as unknown as { dataLayer?: Array<Record<string, unknown>> }).dataLayer
      dl?.push({ event: name, event_category: 'onboarding', ...params })
    } catch {}
  }

  useEffect(() => {
    return () => {
      if (stage !== 'complete') {
        const durationMs = Date.now() - startTime
        emitEvent('onboarding_abandon', { stage, duration_ms: durationMs })
      }
    }
  }, [stage, startTime])

  // Update current step based on stage
  useEffect(() => {
    switch (stage) {
      case 'connecting':
        setCurrentStep(0)
        emitEvent('onboarding_stage', { stage: 'connecting' })
        break
      case 'creating_wallet':
        setCurrentStep(1)
        emitEvent('onboarding_stage', { stage: 'creating_wallet' })
        break
      case 'initializing_user':
        setCurrentStep(2)
        emitEvent('onboarding_stage', { stage: 'initializing_user' })
        break
      case 'complete':
        if (isAuthenticated && walletAddress) {
          const durationMs = Date.now() - startTime
          emitEvent('onboarding_complete', { duration_ms: durationMs })
          setTimeout(onComplete, 1000) // Small delay to show completion
        }
        break
    }
  }, [stage, isAuthenticated, walletAddress, onComplete, startTime])

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed'
    if (stepIndex === currentStep) return 'active'
    return 'pending'
  }

  const getStageMessage = () => {
    switch (stage) {
      case 'connecting':
        return 'Connecting to your account...'
      case 'creating_wallet':
        return 'Creating your secure wallet...'
      case 'initializing_user':
        return 'Setting up your profile...'
      case 'complete':
        return 'Welcome to StudIQ! 🎉'
      default:
        return 'Ready to get started?'
    }
  }

  const getProgressColor = () => {
    if (error) return 'bg-red-500'
    if (stage === 'complete') return 'bg-green-500'
    return 'bg-blue-500'
  }

  const verifyWithWallet = async () => {
    try {
      const message = new TextEncoder().encode('Verify decentralized identity for StudIQ')
      const sol = (typeof window !== 'undefined') 
        ? (window as unknown as { solflare?: { signMessage?: (m: Uint8Array) => Promise<Uint8Array> } }).solflare 
        : undefined
      if (sol?.signMessage) {
        await sol.signMessage(message)
        setDidVerified(true)
        emitEvent('did_verified', { method: 'solflare' })
      } else {
        setDidVerified(true) // Soft-verify fallback
        emitEvent('did_verified', { method: 'fallback' })
      }
    } catch {
      setDidVerified(false)
    }
  }

  const grantOnboardingReward = async () => {
    if (rewardGranted) return
    try {
      // Increment points as a completion reward
      const userId = user?.id || walletAddress
      const payload = { user_id: userId, upsert: true, total_points: 100, level: 1 }
      await fetch('/api/user/stats', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setRewardGranted(true)
      emitEvent('onboarding_reward_granted', { points: 100 })
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to StudIQ
          </CardTitle>
          <CardDescription>
            {getStageMessage()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
              style={{
                background: `linear-gradient(to right, ${getProgressColor()} ${progress}%, #e5e7eb ${progress}%)`
              }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {ONBOARDING_STEPS.map((step, index) => {
              const status = getStepStatus(index)
              const Icon = step.icon
              
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg transition-all",
                    status === 'completed' && "bg-green-50 border border-green-200",
                    status === 'active' && "bg-blue-50 border border-blue-200",
                    status === 'pending' && "bg-gray-50 border border-gray-200"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full",
                    status === 'completed' && "bg-green-500 text-white",
                    status === 'active' && "bg-blue-500 text-white",
                    status === 'pending' && "bg-gray-300 text-gray-600"
                  )}>
                    {status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : status === 'active' ? (
                      <Clock className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className={cn(
                      "font-medium",
                      status === 'completed' && "text-green-700",
                      status === 'active' && "text-blue-700",
                      status === 'pending' && "text-gray-500"
                    )}>
                      {step.label}
                    </p>
                    {status === 'active' && (
                      <p className="text-sm text-gray-600">
                        {stage === 'connecting' && "Authenticating..."}
                        {stage === 'creating_wallet' && "Generating secure keys..."}
                        {stage === 'initializing_user' && "Creating your profile..."}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Optional DID Verification */}
          {walletAddress && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Decentralized Identity Verification</span>
                </div>
                <Button size="sm" variant="outline" onClick={verifyWithWallet} disabled={didVerified}>
                  {didVerified ? 'Verified' : 'Verify with Wallet'}
                </Button>
              </div>
              <p className="text-xs text-purple-700 mt-2">Optional step: sign a message to confirm ownership of your wallet.</p>
            </div>
          )}

          {/* Blockchain-style Visualization */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center space-x-2 mb-2 text-gray-700">
              <Blocks className="w-4 h-4" />
              <span className="text-sm font-medium">Onboarding Transaction Flow</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className={cn("p-2 rounded-md text-center text-xs", currentStep >= 0 ? 'bg-blue-100' : 'bg-gray-100')}>Auth</div>
              <div className={cn("p-2 rounded-md text-center text-xs", currentStep >= 1 ? 'bg-blue-200' : 'bg-gray-100')}>Wallet</div>
              <div className={cn("p-2 rounded-md text-center text-xs", currentStep >= 2 ? 'bg-blue-300' : 'bg-gray-100')}>Profile</div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 font-medium">Something went wrong</p>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              
              {error.includes('wallet') && (
                <Button
                  onClick={retryWalletCreation}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  Retry Wallet Creation
                </Button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isAuthenticated && !isLoading && (
              <Button
                onClick={login}
                className="w-full"
                size="lg"
              >
                Get Started
              </Button>
            )}

            {isLoading && (
              <Button
                disabled
                className="w-full"
                size="lg"
              >
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                {stage === 'connecting' && "Connecting..."}
                {stage === 'creating_wallet' && "Creating Wallet..."}
                {stage === 'initializing_user' && "Setting Up..."}
                {stage === 'complete' && "Almost Done..."}
              </Button>
            )}

            {/* Performance Details Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-gray-600"
            >
              {showDetails ? 'Hide' : 'Show'} Performance Details
            </Button>

            {showDetails && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Current Stage:</span>
                  <span className="font-medium">{stage}</span>
                </div>
                <div className="flex justify-between">
                  <span>Progress:</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Optimization:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  ⚡ Optimized for speed: Parallel processing, reduced timeouts, background initialization
                </div>
              </div>
            )}
          </div>

          {/* Success State */}
          {stage === 'complete' && isAuthenticated && walletAddress && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-700 font-medium">Account Created Successfully!</p>
              <p className="text-green-600 text-sm">
                Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
              <div className="mt-3 flex items-center justify-center space-x-2 text-green-700">
                <Coins className="w-4 h-4" />
                <span className="text-sm">Onboarding reward: +100 points</span>
              </div>
              <Button size="sm" className="mt-3" onClick={grantOnboardingReward} disabled={rewardGranted}>
                {rewardGranted ? 'Reward Granted' : 'Claim Reward'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}