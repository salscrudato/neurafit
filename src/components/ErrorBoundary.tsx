import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (_error: Error, _errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' | 'critical'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private readonly maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props
    
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Update state with error info
    this.setState({ errorInfo })
    
    // Report error to monitoring service
    this.reportError(error, errorInfo, level)
    
    // Call custom error handler
    onError?.(error, errorInfo)
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, level: string) => {
    // In production, send to error monitoring service (e.g., Sentry)
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId
    }

    // For now, just log to console
    console.error('Error Report:', errorReport)
    
    // In production, you would send this to your error tracking service:
    // errorTrackingService.captureException(error, { extra: errorReport })
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      })
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  private renderErrorUI() {
    const { level = 'component' } = this.props
    const { error, errorId } = this.state
    const canRetry = this.retryCount < this.maxRetries

    // Critical errors get full-page treatment
    if (level === 'critical') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              We encountered a critical error. Please try refreshing the page or contact support if the problem persists.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
            
            {errorId && (
              <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">
                  Error ID: <code className="font-mono">{errorId}</code>
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Component-level errors get inline treatment
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 m-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Bug className="w-5 h-5 text-red-600 mt-0.5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800 mb-1">
              Component Error
            </h3>
            
            <p className="text-sm text-red-700 mb-3">
              {error?.message || 'An unexpected error occurred in this component.'}
            </p>
            
            <div className="flex gap-2">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry ({this.maxRetries - this.retryCount} left)
                </button>
              )}
              
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh Page
              </button>
            </div>
            
            {errorId && (
              <p className="text-xs text-red-600 mt-2 font-mono">
                ID: {errorId}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      return this.renderErrorUI()
    }

    return this.props.children
  }
}



// Specialized error boundary components
export const CriticalErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary level="critical">
    {children}
  </ErrorBoundary>
)

export const PageErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary level="page">
    {children}
  </ErrorBoundary>
)

export const ComponentErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary level="component">
    {children}
  </ErrorBoundary>
)



export default ErrorBoundary
