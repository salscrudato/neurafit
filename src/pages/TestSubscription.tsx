import { useState, useEffect } from 'react'
import { useSubscription } from '../hooks/useSubscription'
import { testSubscriptionStatus } from '../lib/test-subscription'
import AppHeader from '../components/AppHeader'

export default function TestSubscription() {
  const { 
    subscription, 
    loading, 
    canGenerateWorkout, 
    remainingFreeWorkouts, 
    hasUnlimitedWorkouts 
  } = useSubscription()
  
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)

  const runTest = async () => {
    setTestLoading(true)
    try {
      const result = await testSubscriptionStatus()
      setTestResult(result)
    } catch (error) {
      console.error('Test failed:', error)
      setTestResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setTestLoading(false)
    }
  }

  useEffect(() => {
    // Auto-run test on component mount
    runTest()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">Loading subscription data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">Subscription Test Dashboard</h1>
          
          {/* Current Subscription Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Subscription Status</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Status:</strong> {subscription?.status || 'No subscription'}
                </div>
                <div>
                  <strong>Can Generate Workout:</strong> {canGenerateWorkout ? '✅ Yes' : '❌ No'}
                </div>
                <div>
                  <strong>Has Unlimited:</strong> {hasUnlimitedWorkouts ? '✅ Yes' : '❌ No'}
                </div>
                <div>
                  <strong>Free Workouts Remaining:</strong> {remainingFreeWorkouts === Infinity ? '∞' : remainingFreeWorkouts}
                </div>
                <div>
                  <strong>Free Workouts Used:</strong> {subscription?.freeWorkoutsUsed || 0}
                </div>
                <div>
                  <strong>Customer ID:</strong> {subscription?.customerId || 'None'}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          {subscription && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Subscription Details</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(subscription, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Test Results */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Backend Test Results</h2>
              <button
                onClick={runTest}
                disabled={testLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {testLoading ? 'Testing...' : 'Run Test'}
              </button>
            </div>
            
            {testResult && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <a
              href="/subscription"
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Go to Subscription Page
            </a>
            <a
              href="/generate"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Test Workout Generation
            </a>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold mb-2">Test Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Check current subscription status above</li>
              <li>If not subscribed, go to Subscription Page and complete payment with test card: <code>4242 4242 4242 4242</code></li>
              <li>After payment, return here and click "Run Test" to verify backend status</li>
              <li>Go to "Test Workout Generation" to verify unlimited workouts work</li>
              <li>Check that workout generation no longer shows limits</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
