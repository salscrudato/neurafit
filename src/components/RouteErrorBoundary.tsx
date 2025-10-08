import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { logger } from '../lib/logger'

interface Props {
  children: ReactNode
  routeName?: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Route-level error boundary for graceful error handling
 * Prevents entire app crashes by isolating errors to specific routes
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const routeName = this.props.routeName || 'Unknown Route'

    // Log error with context
    logger.error(`Route Error: ${routeName}`, error, {
      componentStack: errorInfo.componentStack,
      routeName,
    })

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="flex flex-col items-center text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>

              {/* Error Description */}
              <p className="text-gray-600 mb-6">
                {this.props.routeName 
                  ? `We encountered an error on the ${this.props.routeName} page.`
                  : 'We encountered an unexpected error.'
                }
              </p>

              {/* Error Details (Development Only) */}
              {import.meta.env.MODE === 'development' && this.state.error && (
                <div className="w-full mb-6 p-4 bg-gray-50 rounded-lg text-left">
                  <p className="text-xs font-mono text-gray-700 break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>

              {/* Help Text */}
              <p className="text-sm text-gray-500 mt-6">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component to wrap routes with error boundary
 */
export function withRouteErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  routeName?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <RouteErrorBoundary routeName={routeName}>
        <Component {...props} />
      </RouteErrorBoundary>
    )
  }
}

