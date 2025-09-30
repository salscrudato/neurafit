import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { UserSubscription } from '../types/subscription'
import { 
  canGenerateWorkout, 
  getRemainingFreeWorkouts, 
  hasUnlimitedWorkouts,
  isInGracePeriod,
  getDaysRemaining
} from '../lib/subscription'

interface SubscriptionContextValue {
  subscription: UserSubscription | null
  loading: boolean
  canGenerateWorkout: boolean
  remainingFreeWorkouts: number
  hasUnlimitedWorkouts: boolean
  isInGracePeriod: boolean
  daysRemaining: number
  refreshSubscription: () => void
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  loading: true,
  canGenerateWorkout: true,
  remainingFreeWorkouts: 5,
  hasUnlimitedWorkouts: false,
  isInGracePeriod: false,
  daysRemaining: 0,
  refreshSubscription: () => {}
})

interface SubscriptionProviderProps {
  children: ReactNode
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setSubscription(null)
        setLoading(false)
        return
      }

      // Listen to subscription changes in real-time
      const userDocRef = doc(db, 'users', user.uid)
      const unsubscribeDoc = onSnapshot(userDocRef, (doc) => {
        const userData = doc.data()
        const subscriptionData = userData?.subscription

        if (subscriptionData) {
          setSubscription(subscriptionData as UserSubscription)
        } else {
          // Initialize default subscription data for new users
          const defaultSubscription: UserSubscription = {
            customerId: '',
            status: 'incomplete',
            workoutCount: 0,
            freeWorkoutsUsed: 0,
            freeWorkoutLimit: 5,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
          setSubscription(defaultSubscription)
        }
        setLoading(false)
      }, (error) => {
        console.error('Error listening to subscription changes:', error)
        setLoading(false)
      })

      return unsubscribeDoc
    })

    return unsubscribe
  }, [])

  const refreshSubscription = () => {
    // Force a refresh by triggering the listener
    // The onSnapshot listener will automatically update the subscription
    setLoading(true)
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
    refreshSubscription
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

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
      message: 'Get started with 5 free workouts'
    }
  }
  
  if (hasUnlimitedWorkouts && !isInGracePeriod) {
    return {
      status: 'Active',
      statusColor: 'green',
      message: 'Unlimited workouts'
    }
  }
  
  if (isInGracePeriod) {
    return {
      status: 'Canceled',
      statusColor: 'yellow',
      message: `Access until ${new Date(subscription.currentPeriodEnd!).toLocaleDateString()}`
    }
  }
  
  if (subscription.status === 'past_due') {
    return {
      status: 'Past Due',
      statusColor: 'red',
      message: 'Please update your payment method'
    }
  }
  
  return {
    status: 'Free',
    statusColor: 'blue',
    message: `${subscription.freeWorkoutLimit - subscription.freeWorkoutsUsed} free workouts remaining`
  }
}
