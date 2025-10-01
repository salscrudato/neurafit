/**
 * Simple Subscription Fix Integration
 * Integrates the final subscription fix with the React app
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react'
import { subscriptionFixManager } from '../lib/subscription-fix-final'
import { useSubscription } from '../hooks/useSubscription'

export function SubscriptionFixIntegration() {
  const { subscription, loading } = useSubscription()
  const [isFixing, setIsFixing] = useState(false)
  const [fixResult, setFixResult] = useState<string | null>(null)
  const [showFixer, setShowFixer] = useState(false)

  // Auto-detect issues
  useEffect(() => {
    if (loading) return

    // Show fixer if subscription is stuck or missing
    const shouldShow = !subscription || 
                      subscription.status === 'incomplete' ||
                      (!subscription.subscriptionId && subscription.status !== 'active')

    setShowFixer(shouldShow)
  }, [subscription, loading])

  const handleFix = async () => {
    setIsFixing(true)
    setFixResult(null)

    try {
      console.log('🔧 Starting subscription fix...')
      
      // Try to fix with known subscription ID
      const subscriptionId = subscription?.subscriptionId || 'sub_1SDJcZQjUU16Imh7tJfjZX9n'
      const result = await subscriptionFixManager.fixSubscription(subscriptionId)
      
      if (result.success) {
        setFixResult(`✅ Fixed via ${result.method}`)
        console.log('✅ Subscription fix successful:', result)
        
        // Reload page after short delay
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setFixResult(`❌ Fix failed: ${result.error}`)
        console.error('❌ Subscription fix failed:', result)
      }
    } catch (error) {
      setFixResult(`❌ Fix error: ${(error as Error).message}`)
      console.error('❌ Subscription fix error:', error)
    } finally {
      setIsFixing(false)
    }
  }

  const handleClearCache = () => {
    subscriptionFixManager.clearCache()
    setFixResult('🗑️ Cache cleared')
    setTimeout(() => window.location.reload(), 1000)
  }

  // Don't show if loading or if subscription is healthy
  if (loading || !showFixer) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl shadow-lg z-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-yellow-900 mb-1">
            Subscription Issue Detected
          </h3>
          
          <p className="text-xs text-yellow-700 mb-3">
            {!subscription 
              ? 'Subscription data is missing'
              : subscription.status === 'incomplete'
              ? 'Subscription is incomplete'
              : 'Subscription needs attention'
            }
          </p>

          {fixResult && (
            <div className="mb-3 p-2 bg-white bg-opacity-50 rounded text-xs">
              {fixResult}
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={handleFix}
              disabled={isFixing}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              {isFixing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Fix Now
                </>
              )}
            </button>
            
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 text-xs text-yellow-600 hover:text-yellow-800 underline"
            >
              Clear Cache
            </button>
            
            <button
              onClick={() => setShowFixer(false)}
              className="px-3 py-1.5 text-xs text-yellow-600 hover:text-yellow-800 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionFixIntegration
