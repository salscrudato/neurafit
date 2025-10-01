/**
 * Robust Subscription Manager
 * Comprehensive solution for subscription persistence and state management
 */

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, fns } from './firebase'
import type { UserSubscription } from '../types/subscription'
import { subscriptionErrorHandler } from './subscription-error-handler'

interface DebugSubscriptionResponse {
  success: boolean
  stripeData?: {
    id: string
    status: string
    current_period_start: number
    current_period_end: number
    cancel_at_period_end?: boolean
    error?: string
  }
}

interface SubscriptionCache {
  data: UserSubscription | null
  timestamp: number
  source: 'firestore' | 'stripe' | 'localStorage' | 'default'
  isValid: boolean
  retryCount: number
}

interface PersistenceConfig {
  cacheTimeout: number // 5 minutes
  maxRetries: number
  retryDelay: number
  enableLocalStorage: boolean
  enableAutoRecovery: boolean
  healthCheckInterval: number
}

interface SubscriptionListener {
  id: string
  callback: (_subscription: UserSubscription | null) => void
  cleanup: () => void
}

class RobustSubscriptionManager {
  private cache = new Map<string, SubscriptionCache>()
  private listeners = new Map<string, SubscriptionListener>()
  private firestoreListeners = new Map<string, () => void>()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private isInitialized = false

  private readonly config: PersistenceConfig = {
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    retryDelay: 1000,
    enableLocalStorage: true,
    enableAutoRecovery: true,
    healthCheckInterval: 60 * 1000 // 1 minute
  }

  private readonly STORAGE_KEY = 'neurafit_subscription_robust'
  private readonly HEALTH_KEY = 'neurafit_subscription_health'

  /**
   * Initialize the robust subscription manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🚀 Initializing Robust Subscription Manager...')

    // Set up authentication listener
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        await this.initializeUserSubscription(user.uid)
      } else {
        this.cleanup()
      }
    })

    // Start health monitoring
    this.startHealthMonitoring()

    this.isInitialized = true
    console.log('✅ Robust Subscription Manager initialized')
  }

  /**
   * Initialize subscription for a specific user
   */
  private async initializeUserSubscription(uid: string): Promise<void> {
    console.log(`🔄 Initializing subscription for user: ${uid}`)

    try {
      // Step 1: Try to get subscription from multiple sources
      const subscription = await this.getSubscriptionRobust(uid)
      
      // Step 2: Set up real-time listener
      this.setupFirestoreListener(uid)
      
      // Step 3: Notify all listeners
      this.notifyListeners(subscription)
      
      // Step 4: Perform health check
      await this.performHealthCheck(uid, subscription)
      
    } catch (error) {
      console.error('❌ Failed to initialize user subscription:', error)
      
      // Fallback: Use default subscription
      const defaultSubscription = this.createDefaultSubscription()
      this.setCacheEntry(uid, defaultSubscription, 'default')
      this.notifyListeners(defaultSubscription)
    }
  }

  /**
   * Get subscription with robust fallback mechanisms and comprehensive error handling
   */
  private async getSubscriptionRobust(uid: string, forceRefresh = false): Promise<UserSubscription | null> {
    console.log(`🔍 Getting robust subscription for user: ${uid}`)

    // Step 1: Check cache (unless forcing refresh)
    if (!forceRefresh) {
      const cached = this.getCacheEntry(uid)
      if (cached && cached.isValid) {
        console.log(`✅ Using cached subscription (${cached.source}):`, cached.data?.status)
        return cached.data
      }
    }

    // Step 2: Use error handler for comprehensive fallback logic
    try {
      const subscription = await subscriptionErrorHandler.getSubscriptionRobust(uid)

      if (subscription) {
        // Update cache and localStorage
        this.setCacheEntry(uid, subscription, 'firestore')
        this.saveToLocalStorage(uid, subscription)
        return subscription
      }
    } catch (error) {
      console.error('Error handler failed:', error)
    }

    // Step 3: Final fallback - default subscription
    console.log('⚠️ All robust methods failed, using default subscription')
    const defaultSubscription = this.createDefaultSubscription()
    this.setCacheEntry(uid, defaultSubscription, 'default')
    return defaultSubscription
  }

  /**
   * Set up real-time Firestore listener
   */
  private setupFirestoreListener(uid: string): void {
    // Clean up existing listener
    const existingListener = this.firestoreListeners.get(uid)
    if (existingListener) {
      existingListener()
    }

    const userDocRef = doc(db, 'users', uid)
    
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data()
          const subscription = userData.subscription as UserSubscription | undefined

          if (subscription) {
            console.log('📡 Firestore update received:', subscription.status)
            this.setCacheEntry(uid, subscription, 'firestore')
            this.saveToLocalStorage(uid, subscription)
            this.notifyListeners(subscription)
          }
        }
      },
      (error) => {
        console.error('❌ Firestore listener error:', error)
        
        // On error, try to recover using cached data
        const cached = this.getCacheEntry(uid)
        if (cached && cached.data) {
          console.log('🔄 Using cached data due to Firestore error')
          this.notifyListeners(cached.data)
        }
      }
    )

    this.firestoreListeners.set(uid, unsubscribe)
  }

  /**
   * Get subscription from Firestore
   */
  private async getFromFirestore(uid: string): Promise<UserSubscription | null> {
    const userDocRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userDocRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      return userData.subscription || null
    }
    
    return null
  }

  /**
   * Verify subscription with Stripe
   */
  private async verifyWithStripe(_uid: string): Promise<UserSubscription | null> {
    try {
      const debugFunction = httpsCallable(fns, 'debugAllSubscriptions')
      const result = await debugFunction()
      
      const responseData = result.data as DebugSubscriptionResponse
      if (responseData.success && responseData.stripeData && !responseData.stripeData.error) {
        const stripeData = responseData.stripeData
        
        // Convert Stripe data to UserSubscription format
        const subscription: UserSubscription = {
          subscriptionId: stripeData.id,
          customerId: '', // Will be filled by backend
          status: stripeData.status as 'active' | 'canceled' | 'incomplete' | 'past_due' | 'trialing' | 'unpaid',
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
        
        return subscription
      }
    } catch (error) {
      console.warn('Stripe verification failed:', error)
    }
    
    return null
  }

  /**
   * Update Firestore with subscription data
   */
  private async updateFirestore(uid: string, subscription: UserSubscription): Promise<void> {
    const userDocRef = doc(db, 'users', uid)
    
    await setDoc(userDocRef, {
      subscription: {
        ...subscription,
        updatedAt: Date.now()
      }
    }, { merge: true })
  }

  /**
   * Cache management
   */
  private getCacheEntry(uid: string): SubscriptionCache | null {
    const entry = this.cache.get(uid)
    if (!entry) return null

    // Check if cache is still valid
    const isExpired = Date.now() - entry.timestamp > this.config.cacheTimeout
    if (isExpired) {
      this.cache.delete(uid)
      return null
    }

    return entry
  }

  private setCacheEntry(uid: string, data: UserSubscription | null, source: SubscriptionCache['source']): void {
    this.cache.set(uid, {
      data,
      timestamp: Date.now(),
      source,
      isValid: true,
      retryCount: 0
    })
  }

  /**
   * localStorage management
   */
  private saveToLocalStorage(uid: string, subscription: UserSubscription): void {
    if (!this.config.enableLocalStorage) return

    try {
      const data = {
        uid,
        subscription,
        timestamp: Date.now()
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }

  private getFromLocalStorage(uid: string): UserSubscription | null {
    if (!this.config.enableLocalStorage) return null

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return null

      const data = JSON.parse(stored)
      
      // Check if data is for current user and not too old
      if (data.uid === uid && Date.now() - data.timestamp < this.config.cacheTimeout) {
        return data.subscription
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error)
    }

    return null
  }

  /**
   * Create default subscription for new users
   */
  private createDefaultSubscription(): UserSubscription {
    return {
      customerId: '',
      status: 'incomplete',
      workoutCount: 0,
      freeWorkoutsUsed: 0,
      freeWorkoutLimit: 5,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }

  /**
   * Listener management
   */
  addListener(callback: (_subscription: UserSubscription | null) => void): string {
    const id = Math.random().toString(36).substr(2, 9)
    
    const listener: SubscriptionListener = {
      id,
      callback,
      cleanup: () => this.listeners.delete(id)
    }
    
    this.listeners.set(id, listener)
    
    // Immediately call with current data if available
    const user = auth.currentUser
    if (user) {
      const cached = this.getCacheEntry(user.uid)
      if (cached) {
        callback(cached.data)
      }
    }
    
    return id
  }

  removeListener(id: string): void {
    const listener = this.listeners.get(id)
    if (listener) {
      listener.cleanup()
    }
  }

  private notifyListeners(subscription: UserSubscription | null): void {
    this.listeners.forEach(listener => {
      try {
        listener.callback(subscription)
      } catch (error) {
        console.error('Error in subscription listener:', error)
      }
    })
  }

  /**
   * Health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(() => {
      const user = auth.currentUser
      if (user) {
        this.performHealthCheck(user.uid)
      }
    }, this.config.healthCheckInterval)
  }

  private async performHealthCheck(uid: string, subscription?: UserSubscription | null): Promise<void> {
    try {
      const currentSubscription = subscription || (await this.getSubscriptionRobust(uid))
      
      // Check for stuck incomplete subscriptions
      if (currentSubscription?.status === 'incomplete' && currentSubscription.subscriptionId) {
        const timeSinceCreation = Date.now() - (currentSubscription.createdAt || 0)
        
        if (timeSinceCreation > 5 * 60 * 1000) { // 5 minutes
          console.log('🚨 Detected stuck incomplete subscription, attempting recovery...')
          await this.recoverStuckSubscription(uid, currentSubscription.subscriptionId)
        }
      }

      // Update health status
      this.updateHealthStatus(uid, true)
      
    } catch (error) {
      console.error('Health check failed:', error)
      this.updateHealthStatus(uid, false)
    }
  }

  private async recoverStuckSubscription(uid: string, subscriptionId: string): Promise<void> {
    try {
      const emergencyFixFunction = httpsCallable(fns, 'emergencySubscriptionFix')
      const result = await emergencyFixFunction({
        subscriptionId,
        forceActive: true
      })

      if ((result.data as { success?: boolean }).success) {
        console.log('✅ Successfully recovered stuck subscription')
        // Force refresh to get updated data
        await this.getSubscriptionRobust(uid, true)
      }
    } catch (error) {
      console.error('Failed to recover stuck subscription:', error)
    }
  }

  private updateHealthStatus(uid: string, isHealthy: boolean): void {
    try {
      const healthData = {
        uid,
        isHealthy,
        lastCheck: Date.now()
      }
      localStorage.setItem(this.HEALTH_KEY, JSON.stringify(healthData))
    } catch (error) {
      console.warn('Failed to update health status:', error)
    }
  }

  /**
   * Public API methods
   */
  async refreshSubscription(): Promise<UserSubscription | null> {
    const user = auth.currentUser
    if (!user) return null

    return await this.getSubscriptionRobust(user.uid, true)
  }

  async forceActivateSubscription(subscriptionId: string): Promise<boolean> {
    console.log(`🚀 Force activating subscription: ${subscriptionId}`)

    try {
      // Use error handler for comprehensive activation with fallbacks
      const success = await subscriptionErrorHandler.forceActivateSubscription(subscriptionId)

      if (success) {
        // Force refresh to get updated data
        const user = auth.currentUser
        if (user) {
          await this.getSubscriptionRobust(user.uid, true)
        }
        console.log('✅ Force activation successful')
        return true
      } else {
        console.log('❌ Force activation failed')
        return false
      }
    } catch (error) {
      console.error('Force activation error:', error)
      return false
    }
  }

  clearCache(): void {
    this.cache.clear()
    if (this.config.enableLocalStorage) {
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(this.HEALTH_KEY)
    }
  }

  /**
   * Cleanup
   */
  private cleanup(): void {
    // Clear cache
    this.cache.clear()
    
    // Clean up Firestore listeners
    this.firestoreListeners.forEach(unsubscribe => unsubscribe())
    this.firestoreListeners.clear()
    
    // Clean up health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  destroy(): void {
    this.cleanup()
    this.listeners.clear()
    this.isInitialized = false
  }
}

// Create singleton instance
export const robustSubscriptionManager = new RobustSubscriptionManager()

// Initialize on import
robustSubscriptionManager.initialize().catch(console.error)
