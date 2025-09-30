/**
 * Stripe configuration for NeuraFit
 */

import { loadStripe } from '@stripe/stripe-js'

// Stripe publishable key (test key provided by user)
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RlpPwQjUU16Imh7NtysYpU3jWIYJI2tl13IGJlLunXASqRSIvawsKbzM090PHQ7IbdHGYxbcH5l31a7fIArCKz700uq9hyVBp'

// Initialize Stripe
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3b82f6',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px'
    }
  },
  clientSecret: undefined as string | undefined
}

// Subscription plans with actual Stripe price IDs
// Simple $10/month plan
export const STRIPE_PRICE_IDS = {
  simple: 'price_1SCzf7QjUU16Imh7y9nLUIvP' // Simple Pro - $10.00/month (Updated)
}

// Simple subscription plan - single $10/month option
export const SUBSCRIPTION_PLANS = [
  {
    id: 'simple',
    name: 'NeuraFit Pro',
    description: 'Unlimited AI-powered workouts',
    price: 1000, // $10.00
    currency: 'usd',
    interval: 'month' as const,
    stripePriceId: STRIPE_PRICE_IDS.simple,
    popular: true,
    features: [
      'Unlimited workout generation',
      'Advanced personalization',
      'Progress tracking',
      'Weight history',
      'Priority support'
    ]
  }
] as const

export type SubscriptionPlanId = typeof SUBSCRIPTION_PLANS[number]['id']

// Helper functions
export function formatPrice(priceInCents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100)
}

export function getSubscriptionPlan(planId: SubscriptionPlanId) {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === planId)
}

export function getSubscriptionPlanByPriceId(priceId: string) {
  return SUBSCRIPTION_PLANS.find(plan => plan.stripePriceId === priceId)
}
