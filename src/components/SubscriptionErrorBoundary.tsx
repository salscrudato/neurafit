/**
 * Subscription Error Boundary
 * Catches and handles subscription-related errors gracefully
 */

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react'
import { subscriptionErrorHandler } from '../lib/subscription-error-handler'
import { robustSubscriptionManager } from '../lib/robust-subscription-manager'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: { componentStack?: string; errorBoundary?: string } | null
  isRecovering: boolean
  recoveryAttempts: number
  showDetails: boolean
}

class SubscriptionErrorBoundary extends Component<Props, State> {
  private maxRecoveryAttempts = 3
  private recoveryTimeout: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0,
      showDetails: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string; errorBoundary?: string }) {
    console.error('🚨 Subscription Error Boundary caught error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Log error for debugging
    this.logError(error, errorInfo)

    // Attempt automatic recovery for subscription-related errors
    if (this.isSubscriptionError(error)) {
      this.attemptRecovery()
    }
  }

  private isSubscriptionError(error: Error): boolean {
    const subscriptionKeywords = [
      'subscription',
      'firestore',
      'stripe',
      'payment',
      'billing',
      'customer',
      'incomplete',
      'auth'
    ]

    const errorMessage = error.message.toLowerCase()
    const errorStack = error.stack?.toLowerCase() || ''

    return subscriptionKeywords.some(keyword => 
      errorMessage.includes(keyword) || errorStack.includes(keyword)
    )
  }

  private logError(error: Error, errorInfo: { componentStack?: string; errorBoundary?: string }) {
    try {
      const errorLog = {
        timestamp: Date.now(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        errorInfo,
        url: window.location.href,
        userAgent: navigator.userAgent
      }

      // Store in localStorage for debugging
      const existingLogs = JSON.parse(localStorage.getItem('subscription_error_logs') || '[]')
      existingLogs.push(errorLog)
      
      // Keep only last 10 errors
      if (existingLogs.length > 10) {
        existingLogs.splice(0, existingLogs.length - 10)
      }
      
      localStorage.setItem('subscription_error_logs', JSON.stringify(existingLogs))
    } catch (logError) {
      console.warn('Failed to log error:', logError)
    }
  }

  private attemptRecovery = async () => {
    if (this.state.isRecovering || this.state.recoveryAttempts >= this.maxRecoveryAttempts) {
      return
    }

    this.setState({ 
      isRecovering: true, 
      recoveryAttempts: this.state.recoveryAttempts + 1 
    })

    console.log(`🔧 Attempting automatic recovery (attempt ${this.state.recoveryAttempts + 1})...`)

    try {
      // Clear caches
      robustSubscriptionManager.clearCache()
      
      // Try to refresh subscription
      await robustSubscriptionManager.refreshSubscription()
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Reset error state if recovery seems successful
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false
      })
      
      console.log('✅ Automatic recovery successful')
      
    } catch (recoveryError) {
      console.error('❌ Automatic recovery failed:', recoveryError)
      
      this.setState({ isRecovering: false })
      
      // Try again after a delay if we haven't exceeded max attempts
      if (this.state.recoveryAttempts < this.maxRecoveryAttempts) {
        this.recoveryTimeout = setTimeout(() => {
          this.attemptRecovery()
        }, 5000 * this.state.recoveryAttempts) // Increasing delay
      }
    }
  }

  private handleManualRecovery = async () => {
    this.setState({ isRecovering: true })

    try {
      console.log('🔧 Manual recovery initiated...')
      
      // Clear all caches and storage
      robustSubscriptionManager.clearCache()
      localStorage.removeItem('neurafit_subscription_robust')
      localStorage.removeItem('neurafit_subscription_state')
      
      // Force refresh
      await robustSubscriptionManager.refreshSubscription()
      
      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
        recoveryAttempts: 0
      })
      
      console.log('✅ Manual recovery completed')
      
    } catch (error) {
      console.error('❌ Manual recovery failed:', error)
      this.setState({ isRecovering: false })
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private getErrorStats = () => {
    return subscriptionErrorHandler.getErrorStats()
  }

  componentWillUnmount() {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout)
    }
  }

  render() {
    if (this.state.hasError) {
      const { error, isRecovering, recoveryAttempts, showDetails } = this.state
      const errorStats = this.getErrorStats()
      
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Subscription Error
              </h1>
              
              <p className="text-gray-600 mb-6">
                We encountered an issue with your subscription. 
                {recoveryAttempts > 0 && (
                  <span className="block mt-1 text-sm">
                    Recovery attempts: {recoveryAttempts}/{this.maxRecoveryAttempts}
                  </span>
                )}
              </p>

              {/* Recovery Actions */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={this.handleManualRecovery}
                  disabled={isRecovering}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRecovering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Recovering...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Try Recovery
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={this.handleReload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload Page
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </button>
                </div>
              </div>

              {/* Error Details Toggle */}
              <button
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="text-sm text-gray-500 hover:text-gray-700 underline mb-4"
              >
                {showDetails ? 'Hide' : 'Show'} Error Details
              </button>

              {showDetails && (
                <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="text-xs space-y-2">
                    <div>
                      <strong>Error:</strong> {error?.message}
                    </div>
                    <div>
                      <strong>Type:</strong> {error?.name}
                    </div>
                    <div>
                      <strong>Recent Errors:</strong> {errorStats.recentErrors.length}
                    </div>
                    <div>
                      <strong>Resolved:</strong> {errorStats.resolvedErrors}/{errorStats.totalErrors}
                    </div>
                    {error?.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-gray-600">Stack Trace</summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Support Contact */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">
                  If the problem persists, please contact support
                </p>
                <button
                  onClick={() => {
                    const errorInfo = {
                      error: error?.message,
                      timestamp: new Date().toISOString(),
                      url: window.location.href,
                      recoveryAttempts
                    }
                    console.log('Error info for support:', errorInfo)
                    // In a real app, this would open a support chat or email
                  }}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <MessageCircle className="w-3 h-3" />
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default SubscriptionErrorBoundary
