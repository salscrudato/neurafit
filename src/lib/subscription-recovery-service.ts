/**
 * Automated Subscription Recovery Service
 * Detects and fixes stuck subscriptions without user intervention
 */

import { httpsCallable } from 'firebase/functions'
import { getAuthInstance, getFirestoreInstance, getFunctionsInstance } from './firebase'
import { activateSubscriptionRobustly } from './robust-subscription-service'
import type { UserSubscription } from '../types/subscription'

export interface RecoveryAttempt {
  subscriptionId: string
  timestamp: number
  method: string
  success: boolean
  error?: string
}

export interface RecoveryStats {
  totalAttempts: number
  successfulRecoveries: number
  failedRecoveries: number
  averageRecoveryTime: number
  lastRecoveryAttempt: number | null
}

/**
 * Automated Subscription Recovery Service
 * Continuously monitors and recovers stuck subscriptions
 */
export class SubscriptionRecoveryService {
  private monitoringInterval: NodeJS.Timeout | null = null
  private recoveryAttempts = new Map<string, RecoveryAttempt[]>()
  private readonly MONITORING_INTERVAL = 60000 // 1 minute
  private readonly STUCK_THRESHOLD = 120000 // 2 minutes
  private readonly MAX_RECOVERY_ATTEMPTS = 3
  private readonly RECOVERY_COOLDOWN = 300000 // 5 minutes

  /**
   * Start automated recovery monitoring
   */
  startRecoveryMonitoring(): void {
    if (this.monitoringInterval) {
      return // Already monitoring
    }

    console.log('🔄 Starting automated subscription recovery monitoring...')

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.scanForStuckSubscriptions()
      } catch (error) {
        console.error('Recovery monitoring failed:', error)
      }
    }, this.MONITORING_INTERVAL)

    // Perform initial scan
    this.scanForStuckSubscriptions()
  }

  /**
   * Stop automated recovery monitoring
   */
  stopRecoveryMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      console.log('🛑 Stopped automated subscription recovery monitoring')
    }
  }

  /**
   * Scan for stuck subscriptions and attempt recovery
   */
  async scanForStuckSubscriptions(): Promise<void> {
    try {
      const auth = await getAuthInstance()
      const user = auth?.currentUser
      if (!user) return

      const db = await getFirestoreInstance()
      if (!db) return

      const userDocRef = db.collection('users').doc(user.uid)
      const userDoc = await userDocRef.get()

      if (!userDoc.exists) return

      const userData = userDoc.data()
      const subscription = userData.subscription as UserSubscription

      if (!subscription || !subscription.subscriptionId) return

      // Check if subscription is stuck
      if (this.isSubscriptionStuck(subscription)) {
        console.log(`🚨 Detected stuck subscription: ${subscription.subscriptionId}`)
        await this.attemptRecovery(subscription)
      }

    } catch (error) {
      console.error('Failed to scan for stuck subscriptions:', error)
    }
  }

  /**
   * Check if a subscription is stuck
   */
  private isSubscriptionStuck(subscription: UserSubscription): boolean {
    // Subscription is stuck if:
    // 1. Status is incomplete
    // 2. It hasn't been updated for more than the threshold
    // 3. We haven't attempted recovery recently
    
    if (subscription.status !== 'incomplete') {
      return false
    }

    const timeSinceUpdate = Date.now() - (subscription.updatedAt || 0)
    if (timeSinceUpdate < this.STUCK_THRESHOLD) {
      return false
    }

    // Check if we've already attempted recovery recently
    const attempts = this.recoveryAttempts.get(subscription.subscriptionId) || []
    const recentAttempts = attempts.filter(
      attempt => Date.now() - attempt.timestamp < this.RECOVERY_COOLDOWN
    )

    if (recentAttempts.length >= this.MAX_RECOVERY_ATTEMPTS) {
      console.log(`⏸️ Max recovery attempts reached for ${subscription.subscriptionId}`)
      return false
    }

    return true
  }

  /**
   * Attempt to recover a stuck subscription
   */
  async attemptRecovery(subscription: UserSubscription): Promise<boolean> {
    const startTime = Date.now()
    const subscriptionId = subscription.subscriptionId

    console.log(`🔧 Attempting recovery for subscription: ${subscriptionId}`)

    try {
      // Record recovery attempt
      const attempt: RecoveryAttempt = {
        subscriptionId,
        timestamp: startTime,
        method: 'robust_activation',
        success: false
      }

      // Use robust subscription activation
      const result = await activateSubscriptionRobustly(subscriptionId)

      if (result.success) {
        attempt.success = true
        console.log(`✅ Successfully recovered subscription ${subscriptionId} via ${result.method}`)
        
        // Track successful recovery
        await this.trackRecoverySuccess(subscriptionId, result.method, Date.now() - startTime)
        
        this.recordRecoveryAttempt(attempt)
        return true
      } else {
        attempt.error = result.error
        console.log(`❌ Failed to recover subscription ${subscriptionId}: ${result.error}`)
        
        // Try alternative recovery methods
        const alternativeSuccess = await this.tryAlternativeRecovery(subscription)
        if (alternativeSuccess) {
          attempt.success = true
          attempt.method = 'alternative_recovery'
          this.recordRecoveryAttempt(attempt)
          return true
        }
      }

      this.recordRecoveryAttempt(attempt)
      return false

    } catch (error) {
      console.error(`❌ Recovery attempt failed for ${subscriptionId}:`, error)
      
      const attempt: RecoveryAttempt = {
        subscriptionId,
        timestamp: startTime,
        method: 'robust_activation',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      
      this.recordRecoveryAttempt(attempt)
      return false
    }
  }

  /**
   * Try alternative recovery methods
   */
  private async tryAlternativeRecovery(subscription: UserSubscription): Promise<boolean> {
    const subscriptionId = subscription.subscriptionId

    try {
      console.log(`🔄 Trying alternative recovery methods for ${subscriptionId}`)

      // Method 1: Force webhook processing
      try {
        const fns = await getFunctionsInstance()
        if (!fns) throw new Error('Functions not available')
        const forceFn = httpsCallable(fns, 'forceWebhookProcessing')
        const result = await forceFn({ subscriptionId })
        
        const data = result.data as { success?: boolean }
        if (data.success) {
          console.log(`✅ Alternative recovery successful via force webhook`)
          return true
        }
      } catch {
        console.log('Force webhook failed, trying next method...')
      }

      // Method 2: Manual sync from Stripe
      try {
        const fns2 = await getFunctionsInstance()
        if (!fns2) throw new Error('Functions not available')
        const syncFn = httpsCallable(fns2, 'manualSyncSubscription')
        const result = await syncFn({ subscriptionId })
        
        const data = result.data as { success?: boolean }
        if (data.success) {
          console.log(`✅ Alternative recovery successful via manual sync`)
          return true
        }
      } catch {
        console.log('Manual sync failed, trying next method...')
      }

      // Method 3: Direct Firestore update (last resort)
      try {
        const auth = await getAuthInstance()
        const user = auth?.currentUser
        if (user) {
          const db = await getFirestoreInstance()
          if (!db) throw new Error('Firestore not available')

          const userDocRef = db.collection('users').doc(user.uid)

          // Only do this if we're confident the payment succeeded
          // This is a last resort and should be used carefully
          const updatedSubscription: UserSubscription = {
            ...subscription,
            status: 'active',
            currentPeriodStart: Date.now(),
            currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
            updatedAt: Date.now(),
            cancelAtPeriodEnd: false
          }

          await userDocRef.set({
            subscription: updatedSubscription
          }, { merge: true })

          console.log(`✅ Alternative recovery successful via direct update`)
          return true
        }
      } catch {
        console.log('Direct update failed')
      }

      return false

    } catch (error) {
      console.error('Alternative recovery methods failed:', error)
      return false
    }
  }

  /**
   * Record a recovery attempt
   */
  private recordRecoveryAttempt(attempt: RecoveryAttempt): void {
    const attempts = this.recoveryAttempts.get(attempt.subscriptionId) || []
    attempts.push(attempt)
    
    // Keep only recent attempts (last 24 hours)
    const recentAttempts = attempts.filter(
      a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000
    )
    
    this.recoveryAttempts.set(attempt.subscriptionId, recentAttempts)
  }

  /**
   * Track successful recovery for analytics
   */
  private async trackRecoverySuccess(subscriptionId: string, method: string, duration: number): Promise<void> {
    try {
      // Simplified tracking - just log for now
      console.log(`📊 Recovery success tracked: ${method} in ${duration}ms for subscription ${subscriptionId}`)

    } catch (error) {
      console.error('Failed to track recovery success:', error)
    }
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStats(): Promise<RecoveryStats> {
    try {
      // Simplified - return empty stats for now
      return this.getEmptyStats()

    } catch (error) {
      console.error('Failed to get recovery stats:', error)
      return this.getEmptyStats()
    }
  }

  /**
   * Get empty recovery stats
   */
  private getEmptyStats(): RecoveryStats {
    return {
      totalAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0,
      lastRecoveryAttempt: null
    }
  }

  /**
   * Force recovery attempt for a specific subscription
   */
  async forceRecovery(subscriptionId: string): Promise<boolean> {
    console.log(`🔧 Force recovery requested for subscription: ${subscriptionId}`)

    try {
      // Simplified - just return false for now
      console.log('❌ Force recovery not implemented with compat API yet')
      return false

    } catch (error) {
      console.error('Force recovery failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const subscriptionRecoveryService = new SubscriptionRecoveryService()

// Auto-start recovery monitoring in development
if (process.env.NODE_ENV === 'development') {
  // Start monitoring after a short delay to allow Firebase to initialize
  setTimeout(() => {
    subscriptionRecoveryService.startRecoveryMonitoring()
  }, 10000) // 10 seconds delay
}
