/**
 * Subscription service for NeuraFit Stripe integration
 */

import { httpsCallable } from 'firebase/functions'
import { fns } from './firebase'
import type {
  UserSubscription,
  SubscriptionPlan,
  BillingHistory
} from '../types/subscription'

// Firebase Cloud Functions
const createPaymentIntentFn = httpsCallable(fns, 'createPaymentIntent')
const cancelUserSubscriptionFn = httpsCallable(fns, 'cancelUserSubscription')
const reactivateUserSubscriptionFn = httpsCallable(fns, 'reactivateUserSubscription')
const getCustomerPortalUrlFn = httpsCallable(fns, 'getCustomerPortalUrl')
const getSubscriptionDetailsFn = httpsCallable(fns, 'getSubscriptionDetails')
const getBillingHistoryFn = httpsCallable(fns, 'getBillingHistory')


export interface CreatePaymentIntentResult {
  subscriptionId: string
  clientSecret: string
  customerId: string
}

export interface CancelSubscriptionResult {
  success: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: number
}

export interface ReactivateSubscriptionResult {
  success: boolean
  cancelAtPeriodEnd: boolean
  status: string
}

export interface CustomerPortalResult {
  url: string
}

export interface SubscriptionDetailsResult {
  id: string
  status: string
  currentPeriodStart: number
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  canceledAt: number | null
  priceId: string
  amount: number
  currency: string
  interval: string
}

export interface BillingHistoryResult {
  invoices: BillingHistory[]
}

/**
 * Create a payment intent for subscription
 */
export async function createPaymentIntent(priceId: string): Promise<CreatePaymentIntentResult> {
  try {
    console.log('📡 Calling createPaymentIntent function with priceId:', priceId)
    const result = await createPaymentIntentFn({ priceId })
    console.log('📡 Function response:', result)

    if (!result.data) {
      console.error('❌ No data in function response:', result)
      throw new Error('No data returned from payment intent function')
    }

    const data = result.data as CreatePaymentIntentResult
    console.log('✅ Payment intent data:', data)

    if (!data.clientSecret) {
      console.error('❌ No client secret in response:', data)
      throw new Error('No client secret returned')
    }

    return data
  } catch (error) {
    console.error('❌ Error creating payment intent:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to create payment intent')
  }
}

/**
 * Cancel user subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<CancelSubscriptionResult> {
  try {
    const result = await cancelUserSubscriptionFn({ subscriptionId })
    return result.data as CancelSubscriptionResult
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw new Error('Failed to cancel subscription')
  }
}

/**
 * Reactivate user subscription
 */
export async function reactivateSubscription(subscriptionId: string): Promise<ReactivateSubscriptionResult> {
  try {
    const result = await reactivateUserSubscriptionFn({ subscriptionId })
    return result.data as ReactivateSubscriptionResult
  } catch (error) {
    console.error('Error reactivating subscription:', error)
    throw new Error('Failed to reactivate subscription')
  }
}

/**
 * Get customer portal URL for subscription management
 */
export async function getCustomerPortalUrl(customerId: string, returnUrl?: string): Promise<CustomerPortalResult> {
  try {
    const result = await getCustomerPortalUrlFn({ customerId, returnUrl })
    return result.data as CustomerPortalResult
  } catch (error) {
    console.error('Error getting customer portal URL:', error)
    throw new Error('Failed to get customer portal URL')
  }
}

/**
 * Get subscription details
 */
export async function getSubscriptionDetails(subscriptionId: string): Promise<SubscriptionDetailsResult> {
  try {
    const result = await getSubscriptionDetailsFn({ subscriptionId })
    return result.data as SubscriptionDetailsResult
  } catch (error) {
    console.error('Error getting subscription details:', error)
    throw new Error('Failed to get subscription details')
  }
}

/**
 * Get billing history
 */
export async function getBillingHistory(customerId: string, limit = 10): Promise<BillingHistoryResult> {
  try {
    const result = await getBillingHistoryFn({ customerId, limit })
    return result.data as BillingHistoryResult
  } catch (error) {
    console.error('Error getting billing history:', error)
    throw new Error('Failed to get billing history')
  }
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'trialing':
      return 'Trial'
    case 'canceled':
      return 'Canceled'
    case 'past_due':
      return 'Past Due'
    case 'incomplete':
      return 'Incomplete'
    case 'incomplete_expired':
      return 'Expired'
    case 'unpaid':
      return 'Unpaid'
    default:
      return 'Unknown'
  }
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

/**
 * Check if subscription allows unlimited workouts
 */
export function hasUnlimitedWorkouts(subscription?: UserSubscription): boolean {
  if (!subscription) return false
  return subscription.status === 'active' || subscription.status === 'trialing'
}

/**
 * Get remaining free workouts
 */
export function getRemainingFreeWorkouts(subscription?: UserSubscription): number {
  if (!subscription) return 5 // Default free limit
  if (hasUnlimitedWorkouts(subscription)) return Infinity
  return Math.max(0, subscription.freeWorkoutLimit - subscription.freeWorkoutsUsed)
}

/**
 * Check if user can generate a workout
 */
export function canGenerateWorkout(subscription?: UserSubscription): boolean {
  if (!subscription) return true // Allow first workout for new users
  if (hasUnlimitedWorkouts(subscription)) return true
  return getRemainingFreeWorkouts(subscription) > 0
}

/**
 * Get subscription plan by price ID
 */
export function getSubscriptionPlanByPriceId(_priceId: string): SubscriptionPlan | undefined {
  // This would need to be imported from subscription types
  // For now, return undefined - will be implemented when SUBSCRIPTION_PLANS is available
  return undefined
}

/**
 * Check if subscription is in a grace period (canceled but still active)
 */
export function isInGracePeriod(subscription?: UserSubscription): boolean {
  if (!subscription) return false
  return subscription.cancelAtPeriodEnd === true &&
         subscription.status === 'active' &&
         Boolean(subscription.currentPeriodEnd) &&
         (subscription.currentPeriodEnd || 0) > Date.now()
}

/**
 * Get days remaining in current period
 */
export function getDaysRemaining(subscription?: UserSubscription): number {
  if (!subscription?.currentPeriodEnd) return 0
  const now = Date.now()
  const end = subscription.currentPeriodEnd
  if (end <= now) return 0
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
}


