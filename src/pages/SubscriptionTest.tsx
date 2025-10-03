/**
 * Subscription Test Page
 * Development tool for testing the subscription workflow
 */

import React, { useState } from 'react'
import { ArrowLeft, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { runCompleteWorkflowTest, logTestResults, type WorkflowTestResults } from '../utils/subscriptionTestUtils'

export default function SubscriptionTest() {
  const navigate = useNavigate()
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<WorkflowTestResults | null>(null)

  const runTests = async () => {
    setTesting(true)
    setResults(null)
    
    try {
      const testResults = await runCompleteWorkflowTest()
      setResults(testResults)
      logTestResults(testResults)
    } catch (error) {
      console.error('Test execution failed:', error)
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    )
  }

  const getStatusColor = (passed: boolean) => {
    return passed ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
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
            Subscription Workflow Test
          </h1>
          <p className="mt-2 text-gray-600">
            Development tool to validate the subscription system
          </p>
        </div>

        {/* Test Runner */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-6 md:p-8 mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Run Complete Workflow Test
            </h2>
            <p className="text-gray-600 mb-6">
              This will test all aspects of the subscription system including free trial, 
              subscription duration, cancellation flow, error handling, and UI consistency.
            </p>
            
            <button
              onClick={runTests}
              disabled={testing}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Run Tests
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {results && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Test Results</h2>
            
            {/* Overall Status */}
            <div className={`p-4 rounded-lg mb-6 ${results.overall.passed ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                {results.overall.passed ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <h3 className={`font-semibold ${results.overall.passed ? 'text-green-900' : 'text-red-900'}`}>
                    {results.overall.passed ? 'All Tests Passed' : 'Some Tests Failed'}
                  </h3>
                  <p className={`text-sm ${results.overall.passed ? 'text-green-700' : 'text-red-700'}`}>
                    {results.overall.passedCount} of {results.overall.totalCount} tests passed
                  </p>
                </div>
              </div>
            </div>

            {/* Individual Test Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(results.freeTrialTest.passed)}
                  <div>
                    <h4 className="font-medium text-gray-900">Free Trial (10 workouts)</h4>
                    <p className="text-sm text-gray-600">{results.freeTrialTest.message}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(results.freeTrialTest.passed)}`}>
                  {results.freeTrialTest.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(results.subscriptionDurationTest.passed)}
                  <div>
                    <h4 className="font-medium text-gray-900">Subscription Duration (30 days)</h4>
                    <p className="text-sm text-gray-600">{results.subscriptionDurationTest.message}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(results.subscriptionDurationTest.passed)}`}>
                  {results.subscriptionDurationTest.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(results.cancellationTest.passed)}
                  <div>
                    <h4 className="font-medium text-gray-900">Cancellation Flow</h4>
                    <p className="text-sm text-gray-600">{results.cancellationTest.message}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(results.cancellationTest.passed)}`}>
                  {results.cancellationTest.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(results.errorHandlingTest.passed)}
                  <div>
                    <h4 className="font-medium text-gray-900">Error Handling</h4>
                    <p className="text-sm text-gray-600">{results.errorHandlingTest.message}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(results.errorHandlingTest.passed)}`}>
                  {results.errorHandlingTest.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(results.uiConsistencyTest.passed)}
                  <div>
                    <h4 className="font-medium text-gray-900">UI Consistency</h4>
                    <p className="text-sm text-gray-600">{results.uiConsistencyTest.message}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(results.uiConsistencyTest.passed)}`}>
                  {results.uiConsistencyTest.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>

            {/* Issues */}
            {results.overall.issues.length > 0 && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h4 className="font-medium text-amber-900">Issues to Address</h4>
                </div>
                <ul className="space-y-1">
                  {results.overall.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-amber-800">
                      • {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Development Note */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This test page is for development purposes only. 
            Check the browser console for detailed test logs and results.
          </p>
        </div>
      </main>
    </div>
  )
}
