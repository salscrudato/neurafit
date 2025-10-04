import { useAppStore } from '../store'
import type { UserSubscription } from '../types/subscription'
import {
  canGenerateWorkout,
  getRemainingFreeWorkouts,
  getDaysRemaining,
  hasUnlimitedWorkouts,
  isInGracePeriod
} from '../lib/subscriptionService'

export function useSubscription() {
  const { subscription, subscriptionLoading } = useAppStore()

  // Calculate derived values
  const canGenerate = canGenerateWorkout(subscription ?? undefined)
  const remainingFree = getRemainingFreeWorkouts(subscription ?? undefined)
  const hasUnlimited = hasUnlimitedWorkouts(subscription ?? undefined)
  const inGracePeriod = isInGracePeriod(subscription ?? undefined)
  const daysLeft = getDaysRemaining(subscription ?? undefined)

  return {
    subscription,
    loading: subscriptionLoading,
    canGenerateWorkout: canGenerate,
    remainingFreeWorkouts: remainingFree,
    hasUnlimitedWorkouts: hasUnlimited,
    isInGracePeriod: inGracePeriod,
    daysRemaining: daysLeft,
    refreshSubscription: () => {
      // The AppProvider handles subscription refresh automatically
      // This is kept for API compatibility
    },
    // Legacy compatibility properties
    isHealthy: true,
    lastHealthCheck: Date.now(),
    recoveryInProgress: false,
    forceRecovery: async () => false,
    verifyPayment: async () => ({ isHealthy: true, needsAttention: false })
  }
}

// Hook for checking if user needs to upgrade
export function useUpgradePrompt() {
  const { canGenerateWorkout, remainingFreeWorkouts, hasUnlimitedWorkouts } = useSubscription()

  const shouldShowUpgrade = !canGenerateWorkout && !hasUnlimitedWorkouts
  const isNearLimit = remainingFreeWorkouts <= 1 && !hasUnlimitedWorkouts

  return {
    shouldShowUpgrade,
    isNearLimit,
    remainingFreeWorkouts
  }
}

// Hook for subscription status display
export function useSubscriptionStatus() {
  const { subscription, hasUnlimitedWorkouts, isInGracePeriod } = useSubscription()

  if (!subscription) {
    return {
      status: 'No subscription',
      statusColor: 'gray',
      description: 'Free plan with limited workouts'
    }
  }

  if (hasUnlimitedWorkouts) {
    return {
      status: 'Active',
      statusColor: 'green',
      description: 'Unlimited workouts'
    }
  }

  if (isInGracePeriod) {
    return {
      status: 'Grace Period',
      statusColor: 'yellow',
      description: 'Subscription expired, limited access'
    }
  }

  return {
    status: subscription.status,
    statusColor: subscription.status === 'active' ? 'green' : 'red',
    description: `Status: ${subscription.status}`
  }
}

// Consolidated subscription utilities - now using simplified service
export const subscriptionUtils = {
  isActive: (subscription?: UserSubscription): boolean => {
    return subscription?.status === 'active' || subscription?.status === 'trialing'
  },

  canGenerateWorkouts: canGenerateWorkout,
  getRemainingFreeWorkouts: getRemainingFreeWorkouts,

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

  getDaysUntilRenewal: getDaysRemaining,

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
