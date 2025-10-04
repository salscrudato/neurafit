import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { SubscriptionManager } from '../components/SubscriptionManager'
import { PaymentForm } from '../components/PaymentForm'
import { SubscriptionSuccess } from '../components/SubscriptionSuccess'
import { useSubscription } from '../hooks/useSubscription'
import { SubscriptionStatusSkeleton } from '../components/Loading'
import { logger } from '../lib/logger'

import { getSubscriptionPlanByPriceId, formatPrice } from '../lib/stripe-config'

type ViewState = 'plans' | 'payment' | 'success' | 'manage'

export default function Subscription() {
  const navigate = useNavigate()
  const { hasUnlimitedWorkouts, loading } = useSubscription()

  const [currentView, setCurrentView] = useState<ViewState>('plans')
  const [selectedPriceId, setSelectedPriceId] = useState<string>('')

  // Update view based on subscription status once loaded
  useEffect(() => {
    if (!loading) {
      setCurrentView(hasUnlimitedWorkouts ? 'manage' : 'plans')
    }
  }, [hasUnlimitedWorkouts, loading])

  const handlePaymentSuccess = () => {
    setCurrentView('success')
    logger.info('Payment successful, refreshing subscription')
    // The PaymentForm component now handles subscription synchronization
    // We'll refresh the page after a longer delay to ensure everything is synced
    setTimeout(() => {
      window.location.reload()
    }, 5000)
  }

  const handlePaymentError = (error: string) => {
    logger.error('Payment error', new Error(error))
    // Stay on payment form to allow retry
  }

  const handleBackToPlans = () => {
    setCurrentView('plans')
    setSelectedPriceId('')
  }

  const selectedPlan = getSubscriptionPlanByPriceId(selectedPriceId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      <main className="relative mx-auto max-w-4xl px-4 sm:px-6 pb-16 pt-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">
            {currentView === 'plans' && 'Choose Your Plan'}
            {currentView === 'payment' && 'Complete Your Subscription'}
            {currentView === 'success' && 'Welcome to NeuraFit Pro!'}
            {currentView === 'manage' && 'Manage Subscription'}
          </h1>
          
          {currentView === 'payment' && selectedPlan && (
            <p className="mt-2 text-gray-600">
              You're subscribing to {selectedPlan.name}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-6 md:p-8">
          {loading ? (
            <SubscriptionStatusSkeleton />
          ) : (
            <>
              {currentView === 'plans' && (
                <SubscriptionManager
                  mode="plans"
                  onClose={() => navigate('/dashboard')}
                  onSuccess={() => setCurrentView('success')}
                />
              )}

              {currentView === 'payment' && (
                <div className="max-w-md mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Complete Your Subscription
                    </h2>
                    {selectedPlan && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="font-medium text-blue-900">{selectedPlan.name}</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                          {formatPrice(selectedPlan.price)}/{selectedPlan.interval}
                        </p>
                      </div>
                    )}
                  </div>

                  <PaymentForm
                    priceId={selectedPriceId}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    onCancel={handleBackToPlans}
                  />
                </div>
              )}

              {currentView === 'success' && (
                <SubscriptionSuccess onContinue={() => navigate('/dashboard')} />
              )}

              {currentView === 'manage' && (
                <SubscriptionManager
                  mode="management"
                  onClose={() => navigate('/dashboard')}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}