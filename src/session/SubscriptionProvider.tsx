import { createContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { auth } from '../lib/firebase'
import type { UserSubscription } from '../types/subscription'
import { ensureUserDocument } from '../lib/user-utils'
import {
  canGenerateWorkout,
  getRemainingFreeWorkouts,
  hasUnlimitedWorkouts,
  isInGracePeriod,
  getDaysRemaining
} from '../lib/subscription'
import { listenForSubscriptionUpdates } from '../lib/subscription-sync'
import { webhookHealthMonitor } from '../lib/webhook-health-monitor'
import { subscriptionRecoveryService } from '../lib/subscription-recovery-service'
// import { paymentVerificationService } from '../lib/payment-verification-service'
// Removed unused imports
import { robustSubscriptionManager } from '../lib/robust-subscription-manager'
import { subscriptionFixManager } from '../lib/subscription-fix-final'

interface SubscriptionContextValue {
  subscription: UserSubscription | null
  loading: boolean
  canGenerateWorkout: boolean
  remainingFreeWorkouts: number
  hasUnlimitedWorkouts: boolean
  isInGracePeriod: boolean
  daysRemaining: number
  refreshSubscription: () => void
  // Enhanced features
  isHealthy: boolean
  lastHealthCheck: number | null
  recoveryInProgress: boolean
  forceRecovery: (_subscriptionId: string) => Promise<boolean>
  verifyPayment: (_subscriptionId: string) => Promise<{ isHealthy: boolean; needsAttention: boolean; recommendation?: string }>
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  loading: true,
  canGenerateWorkout: true,
  remainingFreeWorkouts: 5,
  hasUnlimitedWorkouts: false,
  isInGracePeriod: false,
  daysRemaining: 0,
  refreshSubscription: () => {},
  // Enhanced features defaults
  isHealthy: true,
  lastHealthCheck: null,
  recoveryInProgress: false,
  forceRecovery: async () => false,
  verifyPayment: async () => ({ isHealthy: false, needsAttention: false })
})

interface SubscriptionProviderProps {
  children: ReactNode
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [isHealthy, setIsHealthy] = useState(true)
  const [lastHealthCheck, setLastHealthCheck] = useState<number | null>(null)
  const [recoveryInProgress, setRecoveryInProgress] = useState(false)

  // Robust subscription management with automatic recovery
  useEffect(() => {
    console.log('🚀 Setting up robust subscription management...')

    // Set up robust subscription listener
    const listenerId = robustSubscriptionManager.addListener((subscription) => {
      console.log('📡 Robust subscription update:', subscription?.status || 'null')
      setSubscription(subscription)
      setLoading(false)

      // Update health status
      setIsHealthy(true)
      setLastHealthCheck(Date.now())
    })

    // Ensure user document exists when user is authenticated
    const authUnsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          await ensureUserDocument(user)
          console.log('✅ User document ensured for:', user.uid)
        } catch (error) {
          console.error('Error ensuring user document:', error)
          setIsHealthy(false)
        }
      } else {
        setSubscription(null)
        setLoading(false)
      }
    })

    // Cleanup function
    return () => {
      robustSubscriptionManager.removeListener(listenerId)
      authUnsubscribe()
    }
  }, [])

  // Listen for subscription updates from other tabs/windows
  useEffect(() => {
    const cleanup = listenForSubscriptionUpdates((updatedSubscription) => {
      console.log('📡 Received subscription update from another tab:', updatedSubscription.status)
      setSubscription(updatedSubscription)
      setLoading(false)
    })

    return cleanup
  }, [])

  // Enhanced health monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Start health monitoring services
      webhookHealthMonitor.startMonitoring()
      subscriptionRecoveryService.startRecoveryMonitoring()

      return () => {
        webhookHealthMonitor.stopMonitoring()
        subscriptionRecoveryService.stopRecoveryMonitoring()
      }
    }
  }, [])

  // Periodic health checks
  useEffect(() => {
    const performHealthCheck = async () => {
      if (subscription?.subscriptionId) {
        try {
          const healthStatus = await webhookHealthMonitor.getCurrentHealthStatus()
          setIsHealthy(healthStatus?.isHealthy ?? true)
          setLastHealthCheck(Date.now())
        } catch (error) {
          console.error('Health check failed:', error)
          setIsHealthy(false)
        }
      }
    }

    // Initial health check
    performHealthCheck()

    // Periodic health checks every 5 minutes
    const interval = setInterval(performHealthCheck, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [subscription?.subscriptionId])

  const refreshSubscription = async () => {
    // Use robust subscription manager for refresh
    setLoading(true)
    try {
      console.log('🔄 Robust subscription refresh...')

      const freshSubscription = await robustSubscriptionManager.refreshSubscription()

      if (freshSubscription) {
        setSubscription(freshSubscription)
        console.log('✅ Subscription refreshed via robust manager:', freshSubscription.status)
      } else {
        console.warn('⚠️ No subscription data returned from refresh')
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error)
      setIsHealthy(false)
    } finally {
      setLoading(false)
    }
  }

  // Enhanced recovery function using robust manager
  const forceRecovery = async (subscriptionId: string): Promise<boolean> => {
    if (recoveryInProgress) {
      console.log('Recovery already in progress')
      return false
    }

    setRecoveryInProgress(true)
    try {
      console.log(`🔧 Forcing recovery for subscription: ${subscriptionId}`)

      // Use robust subscription manager for force activation
      const success = await robustSubscriptionManager.forceActivateSubscription(subscriptionId)

      if (success) {
        console.log('✅ Force recovery successful')
        setIsHealthy(true)
        setLastHealthCheck(Date.now())
      } else {
        console.log('❌ Force recovery failed')
        setIsHealthy(false)
      }

      return success
    } catch (error) {
      console.error('Force recovery failed:', error)
      setIsHealthy(false)
      return false
    } finally {
      setRecoveryInProgress(false)
    }
  }

  // Payment verification function
  const verifyPayment = async (subscriptionId: string) => {
    try {
      console.log(`🔍 Verifying payment for subscription: ${subscriptionId}`)
      // Use subscription fix manager instead
      const result = await subscriptionFixManager.fixSubscription(subscriptionId)
      return result.success
        ? { isHealthy: true, needsAttention: false, recommendation: 'Payment verified successfully' }
        : { isHealthy: false, needsAttention: true, recommendation: 'Payment verification failed' }
    } catch (error) {
      console.error('Payment verification failed:', error)
      return { isHealthy: false, needsAttention: true, recommendation: 'Payment verification error' }
    }
  }

  // Compute derived values
  const canGenerate = canGenerateWorkout(subscription || undefined)
  const remainingFree = getRemainingFreeWorkouts(subscription || undefined)
  const hasUnlimited = hasUnlimitedWorkouts(subscription || undefined)
  const inGracePeriod = isInGracePeriod(subscription || undefined)
  const daysLeft = getDaysRemaining(subscription || undefined)

  const value: SubscriptionContextValue = {
    subscription,
    loading,
    canGenerateWorkout: canGenerate,
    remainingFreeWorkouts: remainingFree,
    hasUnlimitedWorkouts: hasUnlimited,
    isInGracePeriod: inGracePeriod,
    daysRemaining: daysLeft,
    refreshSubscription,
    // Enhanced features
    isHealthy,
    lastHealthCheck,
    recoveryInProgress,
    forceRecovery,
    verifyPayment
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export { SubscriptionContext }

// Note: useSubscription hook has been moved to subscription-provider-utils.ts
// to fix Fast Refresh warnings. Import it from there instead.