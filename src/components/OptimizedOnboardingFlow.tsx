'use client'

import React, { useState, useEffect } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, AlertCircle, Wallet, User, Zap } from 'lucide-react'
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
    retryWalletCreation 
  } = useOptimizedAuth()

  const [currentStep, setCurrentStep] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  // Update current step based on stage
  useEffect(() => {
    switch (stage) {
      case 'connecting':
        setCurrentStep(0)
        break
      case 'creating_wallet':
        setCurrentStep(1)
        break
      case 'initializing_user':
        setCurrentStep(2)
        break
      case 'complete':
        if (isAuthenticated && walletAddress) {
          setTimeout(onComplete, 1000) // Small delay to show completion
        }
        break
    }
  }, [stage, isAuthenticated, walletAddress, onComplete])

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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}