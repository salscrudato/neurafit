/**
 * Stripe configuration for NeuraFit
 */

import { loadStripe } from '@stripe/stripe-js'

// Stripe publishable key from environment variables
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

// Validate required environment variables
if (!STRIPE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing required Stripe environment variable: VITE_STRIPE_PUBLISHABLE_KEY\n' +
    'Please copy .env.example to .env and fill in your Stripe configuration.'
  )
}

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

// Subscription plans with actual Stripe price IDs from environment variables
const STRIPE_PRICE_ID_SIMPLE = import.meta.env.VITE_STRIPE_PRICE_ID_SIMPLE

if (!STRIPE_PRICE_ID_SIMPLE) {
  throw new Error(
    'Missing required Stripe environment variable: VITE_STRIPE_PRICE_ID_SIMPLE\n' +
    'Please copy .env.example to .env and fill in your Stripe price IDs.'
  )
}

export const STRIPE_PRICE_IDS = {
  simple: STRIPE_PRICE_ID_SIMPLE
}

// Simple subscription plan - single $10/month option (exactly 30 days)
export const SUBSCRIPTION_PLANS = [
  {
    id: 'simple',
    name: 'NeuraFit Pro',
    description: 'Unlimited AI-powered workouts',
    price: 1000, // $10.00
    currency: 'usd',
    interval: 'month' as const, // Exactly 30 days as configured in Stripe
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

// Subscription duration constants
export const SUBSCRIPTION_DURATION = {
  DAYS: 30,
  MILLISECONDS: 30 * 24 * 60 * 60 * 1000
} as const

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

// Subscription duration validation
export function validateSubscriptionDuration(startDate: number, endDate: number): boolean {
  const durationMs = endDate - startDate
  const expectedDurationMs = SUBSCRIPTION_DURATION.MILLISECONDS

  // Allow for small variations (up to 1 hour) to account for timezone differences
  const tolerance = 60 * 60 * 1000 // 1 hour in milliseconds
  const difference = Math.abs(durationMs - expectedDurationMs)

  return difference <= tolerance
}

export function calculateSubscriptionEndDate(startDate: number): number {
  return startDate + SUBSCRIPTION_DURATION.MILLISECONDS
}
