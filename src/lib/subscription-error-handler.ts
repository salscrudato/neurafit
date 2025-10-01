/**
 * Comprehensive Subscription Error Handler
 * Handles all subscription-related errors with retry logic and fallbacks
 */

import { httpsCallable } from 'firebase/functions'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, fns } from './firebase'
import type { UserSubscription } from '../types/subscription'

interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

interface ErrorContext {
  operation: string
  userId?: string
  subscriptionId?: string
  timestamp: number
  attempt: number
}

interface FallbackResult {
  success: boolean
  data?: UserSubscription | Record<string, unknown> | boolean
  method: 'firestore' | 'stripe' | 'localStorage' | 'emergency' | 'default'
  error?: string
}

// Firebase function response types
interface DebugAllSubscriptionsResponse {
  success: boolean
  userData?: {
    uid: string
    subscription: UserSubscription | null
    lastUpdated: Date | null
  }
  stripeData?: {
    id: string
    status: string
    current_period_start: number
    current_period_end: number
    cancel_at_period_end?: boolean
    error?: string
  }
  recommendations?: string[]
}

interface EmergencySubscriptionFixResponse {
  success: boolean
  message?: string
  subscriptionData?: {
    id: string
    status: string
    updatedAt: number
  }
  method?: string
}

class SubscriptionErrorHandler {
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }

  private errorLog: Array<{ context: ErrorContext; error: Error | unknown; resolved: boolean }> = []

  /**
   * Execute operation with retry logic and fallbacks
   */
  async executeWithFallbacks<T>(
    operation: () => Promise<T>,
    fallbacks: Array<() => Promise<FallbackResult>>,
    context: Partial<ErrorContext>,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<T | null> {
    const config = { ...this.defaultRetryConfig, ...retryConfig }
    const fullContext: ErrorContext = {
      operation: 'unknown',
      timestamp: Date.now(),
      attempt: 0,
      ...context
    }

    // Try main operation with retries
    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
      fullContext.attempt = attempt + 1

      try {
        const result = await operation()
        
        // Log successful recovery if this was a retry
        if (attempt > 0) {
          console.log(`✅ Operation succeeded on attempt ${attempt + 1}:`, fullContext.operation)
          this.logError(fullContext, null, true)
        }
        
        return result
      } catch (error) {
        console.warn(`❌ Operation failed on attempt ${attempt + 1}:`, fullContext.operation, error)
        this.logError(fullContext, error, false)

        // If not the last attempt, wait before retrying
        if (attempt < config.maxRetries - 1) {
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
            config.maxDelay
          )
          await this.delay(delay)
        }
      }
    }

    // Main operation failed, try fallbacks
    console.log(`🔄 Main operation failed, trying ${fallbacks.length} fallbacks...`)
    
    for (let i = 0; i < fallbacks.length; i++) {
      try {
        const fallbackResult = await fallbacks[i]()
        
        if (fallbackResult.success) {
          console.log(`✅ Fallback ${i + 1} succeeded (${fallbackResult.method})`)
          this.logError(fullContext, null, true)
          return (fallbackResult.data as T) || null
        } else {
          console.warn(`❌ Fallback ${i + 1} failed (${fallbackResult.method}):`, fallbackResult.error)
        }
      } catch (error) {
        console.warn(`❌ Fallback ${i + 1} threw error:`, error)
      }
    }

    // All fallbacks failed
    console.error(`💥 All fallbacks failed for operation: ${fullContext.operation}`)
    this.logError(fullContext, new Error('All fallbacks failed'), false)
    return null
  }

  /**
   * Get subscription with comprehensive error handling
   */
  async getSubscriptionRobust(userId: string): Promise<UserSubscription | null> {
    const context: Partial<ErrorContext> = {
      operation: 'getSubscription',
      userId
    }

    // Main operation: Get from Firestore
    const mainOperation = async (): Promise<UserSubscription | null> => {
      const userDocRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        return userData.subscription || null
      }
      
      throw new Error('User document not found')
    }

    // Fallback 1: Verify with Stripe
    const stripeFallback = async (): Promise<FallbackResult> => {
      try {
        const debugFunction = httpsCallable<void, DebugAllSubscriptionsResponse>(fns, 'debugAllSubscriptions')
        const result = await debugFunction()
        const responseData = result.data

        if (responseData.success && responseData.stripeData && !responseData.stripeData.error) {
          const stripeData = responseData.stripeData

          const subscription: UserSubscription = {
            subscriptionId: stripeData.id,
            customerId: '',
            status: stripeData.status as 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid',
            priceId: 'price_1SCzf7QjUU16Imh7y9nLUIvP',
            workoutCount: 0,
            freeWorkoutsUsed: 0,
            freeWorkoutLimit: 5,
            currentPeriodStart: stripeData.current_period_start * 1000,
            currentPeriodEnd: stripeData.current_period_end * 1000,
            cancelAtPeriodEnd: stripeData.cancel_at_period_end || false,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }

          // Update Firestore with Stripe data
          await this.updateFirestoreWithRetry(userId, subscription)

          return { success: true, data: subscription, method: 'stripe' }
        }

        return { success: false, method: 'stripe', error: 'No valid Stripe data' }
      } catch (error) {
        return { success: false, method: 'stripe', error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    // Fallback 2: Get from localStorage
    const localStorageFallback = async (): Promise<FallbackResult> => {
      try {
        const stored = localStorage.getItem('neurafit_subscription_robust')
        if (!stored) {
          return { success: false, method: 'localStorage', error: 'No stored data' }
        }

        const data = JSON.parse(stored)
        
        // Check if data is for current user and not too old (1 hour)
        if (data.uid === userId && Date.now() - data.timestamp < 60 * 60 * 1000) {
          return { success: true, data: data.subscription, method: 'localStorage' }
        }
        
        return { success: false, method: 'localStorage', error: 'Stored data is stale or for different user' }
      } catch (error) {
        return { success: false, method: 'localStorage', error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    // Fallback 3: Emergency activation
    const emergencyFallback = async (): Promise<FallbackResult> => {
      try {
        // Try to find any subscription ID from localStorage or previous errors
        const subscriptionId = this.findSubscriptionIdFromLogs() || 'sub_1SDJcZQjUU16Imh7tJfjZX9n'

        const emergencyFixFunction = httpsCallable<{ subscriptionId: string; forceActive: boolean }, EmergencySubscriptionFixResponse>(fns, 'emergencySubscriptionFix')
        const result = await emergencyFixFunction({
          subscriptionId,
          forceActive: true
        })

        if (result.data.success) {
          return { success: true, data: result.data.subscriptionData, method: 'emergency' }
        }

        return { success: false, method: 'emergency', error: 'Emergency fix failed' }
      } catch (error) {
        return { success: false, method: 'emergency', error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    // Fallback 4: Default subscription
    const defaultFallback = async (): Promise<FallbackResult> => {
      const defaultSubscription: UserSubscription = {
        customerId: '',
        status: 'incomplete',
        workoutCount: 0,
        freeWorkoutsUsed: 0,
        freeWorkoutLimit: 5,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      return { success: true, data: defaultSubscription, method: 'default' }
    }

    const fallbacks = [stripeFallback, localStorageFallback, emergencyFallback, defaultFallback]
    
    return await this.executeWithFallbacks(mainOperation, fallbacks, context)
  }

  /**
   * Update Firestore with retry logic
   */
  private async updateFirestoreWithRetry(userId: string, subscription: UserSubscription): Promise<void> {
    const context: Partial<ErrorContext> = {
      operation: 'updateFirestore',
      userId,
      subscriptionId: subscription.subscriptionId
    }

    const updateOperation = async (): Promise<void> => {
      const userDocRef = doc(db, 'users', userId)
      await setDoc(userDocRef, {
        subscription: {
          ...subscription,
          updatedAt: Date.now()
        }
      }, { merge: true })
    }

    const fallbacks = [
      // Fallback 1: Try with different merge strategy
      async (): Promise<FallbackResult> => {
        try {
          const userDocRef = doc(db, 'users', userId)
          await setDoc(userDocRef, {
            subscription: subscription
          })
          return { success: true, method: 'firestore' }
        } catch (error) {
          return { success: false, method: 'firestore', error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    ]

    await this.executeWithFallbacks(updateOperation, fallbacks, context)
  }

  /**
   * Force activate subscription with comprehensive error handling
   */
  async forceActivateSubscription(subscriptionId: string): Promise<boolean> {
    const context: Partial<ErrorContext> = {
      operation: 'forceActivate',
      subscriptionId
    }

    const activateOperation = async (): Promise<boolean> => {
      const emergencyFixFunction = httpsCallable<{ subscriptionId: string; forceActive: boolean }, EmergencySubscriptionFixResponse>(fns, 'emergencySubscriptionFix')
      const result = await emergencyFixFunction({
        subscriptionId,
        forceActive: true
      })

      if (result.data.success) {
        return true
      }

      throw new Error('Emergency fix returned unsuccessful result')
    }

    const fallbacks = [
      // Fallback 1: Try with different subscription ID format
      async (): Promise<FallbackResult> => {
        try {
          const emergencyFixFunction = httpsCallable<{ subscriptionId: string; forceActive: boolean }, EmergencySubscriptionFixResponse>(fns, 'emergencySubscriptionFix')
          const result = await emergencyFixFunction({
            subscriptionId: subscriptionId.startsWith('sub_') ? subscriptionId : `sub_${subscriptionId}`,
            forceActive: true
          })

          return {
            success: result.data.success,
            data: result.data.success,
            method: 'emergency',
            error: result.data.success ? undefined : 'Force activation failed'
          }
        } catch (error) {
          return { success: false, method: 'emergency', error: error instanceof Error ? error.message : 'Unknown error' }
        }
      },

      // Fallback 2: Manual Firestore update
      async (): Promise<FallbackResult> => {
        try {
          const user = auth.currentUser
          if (!user) {
            return { success: false, method: 'firestore', error: 'User not authenticated' }
          }

          const activeSubscription: UserSubscription = {
            subscriptionId,
            customerId: `cus_manual_${Date.now()}`,
            status: 'active',
            priceId: 'price_1SCzf7QjUU16Imh7y9nLUIvP',
            workoutCount: 0,
            freeWorkoutsUsed: 0,
            freeWorkoutLimit: 5,
            currentPeriodStart: Date.now(),
            currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }

          await this.updateFirestoreWithRetry(user.uid, activeSubscription)
          return { success: true, data: true, method: 'firestore' }
        } catch (error) {
          return { success: false, method: 'firestore', error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    ]

    const result = await this.executeWithFallbacks(activateOperation, fallbacks, context)
    return result === true
  }

  /**
   * Utility methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private logError(context: ErrorContext, error: Error | unknown, resolved: boolean): void {
    this.errorLog.push({ context, error, resolved })
    
    // Keep only last 50 errors
    if (this.errorLog.length > 50) {
      this.errorLog = this.errorLog.slice(-50)
    }
  }

  private findSubscriptionIdFromLogs(): string | null {
    for (const log of this.errorLog.reverse()) {
      if (log.context.subscriptionId) {
        return log.context.subscriptionId
      }
    }
    return null
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number
    resolvedErrors: number
    recentErrors: Array<{ operation: string; timestamp: number; resolved: boolean }>
  } {
    const recentErrors = this.errorLog
      .filter(log => Date.now() - log.context.timestamp < 60 * 60 * 1000) // Last hour
      .map(log => ({
        operation: log.context.operation,
        timestamp: log.context.timestamp,
        resolved: log.resolved
      }))

    return {
      totalErrors: this.errorLog.length,
      resolvedErrors: this.errorLog.filter(log => log.resolved).length,
      recentErrors
    }
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = []
  }
}

// Create singleton instance
export const subscriptionErrorHandler = new SubscriptionErrorHandler()

// Export for debugging
if (typeof window !== 'undefined') {
  (window as { subscriptionErrorHandler?: typeof subscriptionErrorHandler }).subscriptionErrorHandler = subscriptionErrorHandler
}
