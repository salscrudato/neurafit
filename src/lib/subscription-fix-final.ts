/**
 * Final Comprehensive Subscription Fix
 * A simplified, working solution for subscription persistence issues
 */

import { httpsCallable } from 'firebase/functions'
import { getAuthInstance, getFirestoreInstance, getFunctionsInstance } from './firebase'
import type { UserSubscription } from '../types/subscription'

interface FixResult {
  success: boolean
  method: string
  data?: UserSubscription
  error?: string
}

class SubscriptionFixManager {
  private cache = new Map<string, { data: UserSubscription | null; timestamp: number }>()
  private readonly CACHE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  /**
   * Main fix function - tries all methods to get/fix subscription
   */
  async fixSubscription(subscriptionId?: string): Promise<FixResult> {
    const auth = await getAuthInstance()
    const user = auth?.currentUser
    if (!user) {
      return { success: false, method: 'auth', error: 'User not authenticated' }
    }

    console.log('🔧 Starting comprehensive subscription fix...')

    // Method 1: Try Firestore first
    try {
      const firestoreResult = await this.getFromFirestore(user.uid)
      if (firestoreResult) {
        console.log('✅ Fixed via Firestore')
        this.updateCache(user.uid, firestoreResult)
        this.saveToLocalStorage(user.uid, firestoreResult)
        return { success: true, method: 'firestore', data: firestoreResult }
      }
    } catch (error) {
      console.warn('Firestore method failed:', error)
    }

    // Method 2: Try emergency fix function
    if (subscriptionId) {
      try {
        const emergencyResult = await this.emergencyFix(subscriptionId)
        if (emergencyResult.success && emergencyResult.data) {
          console.log('✅ Fixed via emergency function')
          this.updateCache(user.uid, emergencyResult.data)
          this.saveToLocalStorage(user.uid, emergencyResult.data)
          return emergencyResult
        }
      } catch (error) {
        console.warn('Emergency fix failed:', error)
      }
    }

    // Method 3: Try localStorage
    try {
      const localResult = this.getFromLocalStorage(user.uid)
      if (localResult) {
        console.log('✅ Fixed via localStorage')
        // Try to update Firestore with local data
        await this.updateFirestore(user.uid, localResult)
        return { success: true, method: 'localStorage', data: localResult }
      }
    } catch (error) {
      console.warn('localStorage method failed:', error)
    }

    // Method 4: Create default subscription
    try {
      const defaultSub = this.createDefaultSubscription()
      await this.updateFirestore(user.uid, defaultSub)
      console.log('✅ Fixed via default subscription')
      return { success: true, method: 'default', data: defaultSub }
    } catch (error) {
      console.warn('Default subscription creation failed:', error)
    }

    return { success: false, method: 'all', error: 'All fix methods failed' }
  }

  /**
   * Emergency fix using Cloud Function
   */
  private async emergencyFix(subscriptionId: string): Promise<FixResult> {
    try {
      const fns = await getFunctionsInstance()
      if (!fns) throw new Error('Functions not available')

      const emergencyFixFunction = httpsCallable(fns, 'emergencySubscriptionFix')
      const result = await emergencyFixFunction({
        subscriptionId,
        forceActive: true
      })

      const data = result.data as { success: boolean; subscriptionData?: UserSubscription }
      if (data.success && data.subscriptionData) {
        return {
          success: true,
          method: 'emergency',
          data: data.subscriptionData
        }
      }

      return { success: false, method: 'emergency', error: 'Emergency fix returned no data' }
    } catch (error) {
      return { success: false, method: 'emergency', error: (error as Error).message }
    }
  }

  /**
   * Get subscription from Firestore
   */
  private async getFromFirestore(uid: string): Promise<UserSubscription | null> {
    const db = await getFirestoreInstance()
    if (!db) return null

    const userDocRef = db.collection('users').doc(uid)
    const userDoc = await userDocRef.get()

    if (userDoc.exists) {
      const userData = userDoc.data()
      return userData.subscription || null
    }

    return null
  }

  /**
   * Update Firestore with subscription data
   */
  private async updateFirestore(uid: string, subscription: UserSubscription): Promise<void> {
    const db = await getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')

    const userDocRef = db.collection('users').doc(uid)
    await userDocRef.set({
      subscription: {
        ...subscription,
        updatedAt: Date.now()
      }
    }, { merge: true })
  }

  /**
   * Get subscription from localStorage
   */
  private getFromLocalStorage(uid: string): UserSubscription | null {
    try {
      const stored = localStorage.getItem('neurafit_subscription_robust')
      if (!stored) return null

      const data = JSON.parse(stored)
      
      // Check if data is for current user and not too old (1 hour)
      if (data.uid === uid && Date.now() - data.timestamp < 60 * 60 * 1000) {
        return data.subscription
      }
      
      return null
    } catch (error) {
      console.warn('localStorage read failed:', error)
      return null
    }
  }

  /**
   * Save subscription to localStorage
   */
  private saveToLocalStorage(uid: string, subscription: UserSubscription): void {
    try {
      const data = {
        uid,
        subscription,
        timestamp: Date.now()
      }
      localStorage.setItem('neurafit_subscription_robust', JSON.stringify(data))
    } catch (error) {
      console.warn('localStorage save failed:', error)
    }
  }

  /**
   * Update memory cache
   */
  private updateCache(uid: string, subscription: UserSubscription | null): void {
    this.cache.set(uid, {
      data: subscription,
      timestamp: Date.now()
    })
  }

  /**
   * Get from memory cache
   */
  private getFromCache(uid: string): UserSubscription | null {
    const cached = this.cache.get(uid)
    if (!cached) return null

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TIMEOUT) {
      this.cache.delete(uid)
      return null
    }

    return cached.data
  }

  /**
   * Create default subscription
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
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear()
    try {
      localStorage.removeItem('neurafit_subscription_robust')
      localStorage.removeItem('neurafit_subscription_state')
    } catch (error) {
      console.warn('Cache clear failed:', error)
    }
  }

  /**
   * Force activate a specific subscription
   */
  async forceActivate(subscriptionId: string): Promise<boolean> {
    try {
      const result = await this.emergencyFix(subscriptionId)
      return result.success
    } catch (error) {
      console.error('Force activation failed:', error)
      return false
    }
  }

  /**
   * Get current subscription with all fallbacks
   */
  async getCurrentSubscription(): Promise<UserSubscription | null> {
    const auth = await getAuthInstance()
    const user = auth?.currentUser
    if (!user) return null

    // Try cache first
    const cached = this.getFromCache(user.uid)
    if (cached) return cached

    // Try fix method
    const fixResult = await this.fixSubscription()
    return fixResult.data || null
  }
}

// Create singleton instance
export const subscriptionFixManager = new SubscriptionFixManager()

// Browser console helpers
if (typeof window !== 'undefined') {
  (window as { subscriptionFixManager?: typeof subscriptionFixManager }).subscriptionFixManager = subscriptionFixManager;

  // Quick fix function
  (window as { quickFixSubscription?: (_subscriptionId?: string) => Promise<unknown> }).quickFixSubscription = async (_subscriptionId = 'sub_1SDJcZQjUU16Imh7tJfjZX9n') => {
    console.log('🚀 Quick subscription fix...')
    const result = await subscriptionFixManager.fixSubscription(_subscriptionId)
    console.log('📊 Fix result:', result)
    
    if (result.success) {
      console.log('✅ Subscription fixed! Reloading page...')
      setTimeout(() => window.location.reload(), 1000)
    } else {
      console.log('❌ Fix failed:', result.error)
    }
    
    return result
  }
  
  // Status check function
  (window as { checkSubscriptionStatus?: () => Promise<unknown> }).checkSubscriptionStatus = async () => {
    console.log('📊 Checking subscription status...')
    const subscription = await subscriptionFixManager.getCurrentSubscription()
    console.log('📦 Current subscription:', subscription)
    
    // Check localStorage
    const stored = localStorage.getItem('neurafit_subscription_robust')
    if (stored) {
      const data = JSON.parse(stored)
      console.log('💾 Stored data:', data)
    } else {
      console.log('💾 No stored data')
    }
    
    return subscription
  }
}

export default subscriptionFixManager
