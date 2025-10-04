
import { CheckCircle, Zap, Target, TrendingUp, Shield } from 'lucide-react'

interface SubscriptionSuccessProps {
  onContinue: () => void
  planName?: string
}

export function SubscriptionSuccess({ onContinue, planName = 'NeuraFit Pro' }: SubscriptionSuccessProps) {
  return (
    <div className="text-center py-8">
      {/* Success Icon */}
      <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome to {planName}!
      </h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Your subscription is now active. You have unlimited access to AI-powered workouts and all premium features.
      </p>

      {/* Features List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-sm text-gray-700">Unlimited workouts</span>
        </div>
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-sm text-gray-700">Advanced personalization</span>
        </div>
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <span className="text-sm text-gray-700">Progress tracking</span>
        </div>
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <Shield className="w-4 h-4 text-orange-600" />
          </div>
          <span className="text-sm text-gray-700">Priority support</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onContinue}
        className="w-full sm:w-auto bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
      >
        Generate Your First Pro Workout
      </button>

      {/* Additional Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Next billing:</strong> Your subscription will automatically renew in 30 days. 
          You can cancel anytime from your profile settings.
        </p>
      </div>
    </div>
  )
}

export default SubscriptionSuccess
