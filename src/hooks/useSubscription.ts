import { useContext } from 'react'
import { SubscriptionContext } from '../session/SubscriptionProvider'

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
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
