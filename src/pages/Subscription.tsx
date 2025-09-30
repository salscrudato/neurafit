import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { SubscriptionPlans } from '../components/SubscriptionPlans'
import { PaymentForm } from '../components/PaymentForm'
import { SubscriptionManagement } from '../components/SubscriptionManagement'
import { useSubscription } from '../session/SubscriptionProvider'
import { getSubscriptionPlanByPriceId } from '../lib/stripe-config'

type ViewState = 'plans' | 'payment' | 'success' | 'manage'

export default function Subscription() {
  const navigate = useNavigate()
  const { hasUnlimitedWorkouts } = useSubscription()
  const [currentView, setCurrentView] = useState<ViewState>(
    hasUnlimitedWorkouts ? 'manage' : 'plans'
  )
  const [selectedPriceId, setSelectedPriceId] = useState<string>('')
  const [loading] = useState(false)

  const handleSelectPlan = (priceId: string) => {
    setSelectedPriceId(priceId)
    setCurrentView('payment')
  }

  const handlePaymentSuccess = () => {
    setCurrentView('success')
    // Refresh the page after a delay to show updated subscription status
    setTimeout(() => {
      window.location.reload()
    }, 3000)
  }

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error)
    // Stay on payment form to allow retry
  }

  const handleBackToPlans = () => {
    setCurrentView('plans')
    setSelectedPriceId('')
  }

  const handleUpgrade = () => {
    setCurrentView('plans')
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
          {currentView === 'plans' && (
            <SubscriptionPlans
              onSelectPlan={handleSelectPlan}
              loading={loading}
              selectedPriceId={selectedPriceId}
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
                    <p className="text-blue-700">{selectedPlan.description}</p>
                    <p className="text-2xl font-bold text-blue-900 mt-2">
                      ${selectedPlan.price / 100}/{selectedPlan.interval}
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
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Subscription Activated!
              </h2>
              
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Welcome to NeuraFit Pro! You now have unlimited access to AI-powered workouts 
                tailored to your goals and preferences.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/generate')}
                  className="w-full sm:w-auto bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                >
                  Generate Your First Pro Workout
                </button>
                
                <button
                  onClick={() => setCurrentView('manage')}
                  className="w-full sm:w-auto block mx-auto text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Manage Subscription
                </button>
              </div>
            </div>
          )}

          {currentView === 'manage' && (
            <SubscriptionManagement onUpgrade={handleUpgrade} />
          )}
        </div>

        {/* Features Highlight */}
        {(currentView === 'plans' || currentView === 'payment') && (
          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              What you get with NeuraFit Pro
            </h3>
            
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">∞</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Unlimited Workouts</h4>
                <p className="text-sm text-gray-600">
                  Generate as many AI-powered workouts as you want
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">🧠</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Smart Personalization</h4>
                <p className="text-sm text-gray-600">
                  Workouts adapt based on your feedback and progress
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold">📊</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Progress Tracking</h4>
                <p className="text-sm text-gray-600">
                  Track your weights, sets, and workout history
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
