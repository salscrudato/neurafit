/**
 * Subscription types for NeuraFit Stripe integration
 */

export type SubscriptionStatus = 
  | 'active'
  | 'canceled' 
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid'

export type SubscriptionPlan = {
  id: string
  name: string
  description: string
  price: number // in cents
  currency: string
  interval: 'month' | 'year'
  features: string[]
  stripePriceId: string
  popular?: boolean
}

export type UserSubscription = {
  // Stripe identifiers
  customerId: string
  subscriptionId?: string
  priceId?: string
  
  // Subscription status
  status: SubscriptionStatus
  currentPeriodStart?: number // Unix timestamp
  currentPeriodEnd?: number // Unix timestamp
  cancelAtPeriodEnd?: boolean
  canceledAt?: number // Unix timestamp
  
  // Plan details
  plan?: SubscriptionPlan
  
  // Usage tracking
  workoutCount: number
  freeWorkoutsUsed: number
  freeWorkoutLimit: number
  
  // Timestamps
  createdAt: number // Unix timestamp
  updatedAt: number // Unix timestamp
}

export type PaymentMethod = {
  id: string
  type: 'card'
  card: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  isDefault: boolean
}

export type BillingHistory = {
  id: string
  amount: number
  currency: string
  status: 'succeeded' | 'pending' | 'failed'
  description: string
  created: number // Unix timestamp
  invoiceUrl?: string
}

// Subscription plans configuration
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly Pro',
    description: 'Unlimited AI-powered workouts',
    price: 999, // $9.99
    currency: 'usd',
    interval: 'month',
    stripePriceId: 'price_monthly_pro', // Replace with actual Stripe price ID
    features: [
      'Unlimited workout generation',
      'Advanced personalization',
      'Progress tracking',
      'Weight history',
      'Priority support'
    ]
  },
  {
    id: 'yearly',
    name: 'Yearly Pro',
    description: 'Unlimited AI-powered workouts (2 months free)',
    price: 9999, // $99.99 (equivalent to ~$8.33/month)
    currency: 'usd',
    interval: 'year',
    stripePriceId: 'price_yearly_pro', // Replace with actual Stripe price ID
    popular: true,
    features: [
      'Unlimited workout generation',
      'Advanced personalization',
      'Progress tracking',
      'Weight history',
      'Priority support',
      '2 months free'
    ]
  }
]

export const FREE_WORKOUT_LIMIT = 5

// Helper functions
export function isSubscriptionActive(subscription?: UserSubscription): boolean {
  if (!subscription) return false
  return subscription.status === 'active' || subscription.status === 'trialing'
}

export function canGenerateWorkout(subscription?: UserSubscription): boolean {
  if (!subscription) return false
  
  // If user has active subscription, they can generate unlimited workouts
  if (isSubscriptionActive(subscription)) {
    return true
  }
  
  // If no active subscription, check free workout limit
  return subscription.freeWorkoutsUsed < subscription.freeWorkoutLimit
}

export function getRemainingFreeWorkouts(subscription?: UserSubscription): number {
  if (!subscription) return FREE_WORKOUT_LIMIT
  if (isSubscriptionActive(subscription)) return Infinity
  return Math.max(0, subscription.freeWorkoutLimit - subscription.freeWorkoutsUsed)
}

export function formatPrice(priceInCents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100)
}

export function getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === planId)
}
