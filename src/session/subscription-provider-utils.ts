/**
 * Subscription Provider Utilities
 * Shared utilities and hooks for the subscription provider
 */

import { useContext } from 'react'
import { SubscriptionContext } from './SubscriptionProvider'
import type { UserSubscription } from '../types/subscription'

// Custom hook to use the subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

// Subscription utilities
export const subscriptionUtils = {
  isActive: (subscription?: UserSubscription): boolean => {
    return subscription?.status === 'active' || subscription?.status === 'trialing'
  },

  canGenerateWorkouts: (subscription?: UserSubscription): boolean => {
    if (!subscription) return false
    
    // Active subscription = unlimited workouts
    if (subscriptionUtils.isActive(subscription)) {
      return true
    }
    
    // Free tier - check usage
    const used = subscription.freeWorkoutsUsed || 0
    const limit = subscription.freeWorkoutLimit || 5
    return used < limit
  },

  getRemainingFreeWorkouts: (subscription?: UserSubscription): number => {
    if (!subscription) return 5
    if (subscriptionUtils.isActive(subscription)) return Infinity
    
    const used = subscription.freeWorkoutsUsed || 0
    const limit = subscription.freeWorkoutLimit || 5
    return Math.max(0, limit - used)
  },

  getStatusText: (subscription?: UserSubscription): string => {
    if (!subscription) return 'No subscription'
    
    switch (subscription.status) {
      case 'active':
        return 'Active'
      case 'trialing':
        return 'Trial'
      case 'canceled':
        return 'Canceled'
      case 'incomplete':
        return 'Incomplete'
      case 'past_due':
        return 'Past Due'
      case 'unpaid':
        return 'Unpaid'
      default:
        return 'Unknown'
    }
  },

  getStatusColor: (subscription?: UserSubscription): string => {
    if (!subscription) return 'gray'
    
    switch (subscription.status) {
      case 'active':
      case 'trialing':
        return 'green'
      case 'canceled':
      case 'incomplete':
      case 'past_due':
      case 'unpaid':
        return 'red'
      default:
        return 'gray'
    }
  },

  formatPeriodDates: (subscription?: UserSubscription): { start: string; end: string } | null => {
    if (!subscription?.currentPeriodStart || !subscription?.currentPeriodEnd) {
      return null
    }
    
    const start = new Date(subscription.currentPeriodStart).toLocaleDateString()
    const end = new Date(subscription.currentPeriodEnd).toLocaleDateString()
    
    return { start, end }
  },

  getDaysUntilRenewal: (subscription?: UserSubscription): number | null => {
    if (!subscription?.currentPeriodEnd) return null
    
    const now = Date.now()
    const end = subscription.currentPeriodEnd
    const diffMs = end - now
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    return diffDays > 0 ? diffDays : 0
  },

  shouldShowUpgradePrompt: (subscription?: UserSubscription): boolean => {
    if (!subscription) return true
    if (subscriptionUtils.isActive(subscription)) return false
    
    const remaining = subscriptionUtils.getRemainingFreeWorkouts(subscription)
    return remaining <= 1 // Show when 1 or fewer workouts remaining
  },

  getUpgradePromptMessage: (subscription?: UserSubscription): string => {
    const remaining = subscriptionUtils.getRemainingFreeWorkouts(subscription)
    
    if (remaining === 0) {
      return 'You\'ve used all your free workouts. Upgrade to continue!'
    }
    
    if (remaining === 1) {
      return 'You have 1 free workout remaining. Upgrade for unlimited access!'
    }
    
    return `You have ${remaining} free workouts remaining.`
  }
}

// Subscription validation utilities
export const subscriptionValidation = {
  isValidSubscription: (subscription: unknown): subscription is UserSubscription => {
    if (!subscription || typeof subscription !== 'object') return false
    
    const sub = subscription as Record<string, unknown>
    
    return (
      typeof sub.customerId === 'string' &&
      typeof sub.status === 'string' &&
      typeof sub.workoutCount === 'number' &&
      typeof sub.freeWorkoutsUsed === 'number' &&
      typeof sub.freeWorkoutLimit === 'number' &&
      typeof sub.createdAt === 'number' &&
      typeof sub.updatedAt === 'number'
    )
  },

  hasRequiredFields: (subscription?: UserSubscription): boolean => {
    if (!subscription) return false
    
    return !!(
      subscription.customerId &&
      subscription.status &&
      typeof subscription.workoutCount === 'number' &&
      typeof subscription.freeWorkoutsUsed === 'number' &&
      typeof subscription.freeWorkoutLimit === 'number'
    )
  },

  isExpired: (subscription?: UserSubscription): boolean => {
    if (!subscription?.currentPeriodEnd) return false
    return Date.now() > subscription.currentPeriodEnd
  },

  needsPaymentMethod: (subscription?: UserSubscription): boolean => {
    return subscription?.status === 'incomplete' || subscription?.status === 'past_due'
  }
}

// Subscription error handling
export const subscriptionErrors = {
  getErrorMessage: (error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    return 'An unknown subscription error occurred'
  },

  isRetryableError: (error: unknown): boolean => {
    const message = subscriptionErrors.getErrorMessage(error).toLowerCase()
    
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('temporary')
    )
  },

  shouldShowErrorToUser: (error: unknown): boolean => {
    const message = subscriptionErrors.getErrorMessage(error).toLowerCase()
    
    // Don't show technical errors to users
    return !(
      message.includes('firebase') ||
      message.includes('firestore') ||
      message.includes('internal') ||
      message.includes('debug')
    )
  }
}
