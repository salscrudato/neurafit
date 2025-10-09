/**
 * Subscription hook - Free app version
 * Always returns unlimited access since the app is completely free
 */

export function useSubscription() {
  return {
    subscription: null,
    loading: false,
    canGenerateWorkout: true,
    remainingFreeWorkouts: Infinity,
    hasUnlimitedWorkouts: true,
    isInGracePeriod: false,
    daysRemaining: Infinity,
    refreshSubscription: () => {
      // No-op for free app
    },
    // Legacy compatibility properties
    isHealthy: true,
    lastHealthCheck: Date.now(),
    recoveryInProgress: false,
    forceRecovery: async () => false,
    verifyPayment: async () => ({ isHealthy: true, needsAttention: false })
  }
}

// Hook for subscription status display
export function useSubscriptionStatus() {
  return {
    status: 'Free',
    statusColor: 'green',
    description: 'Unlimited workouts - completely free!'
  }
}

