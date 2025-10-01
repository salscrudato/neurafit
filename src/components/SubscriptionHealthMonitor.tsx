/**
 * Subscription Health Monitor
 * Automatically detects and fixes subscription issues in the background
 */

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, RefreshCw, Zap, X } from 'lucide-react'
import { useSubscription } from '../hooks/useSubscription'
import { robustSubscriptionManager } from '../lib/robust-subscription-manager'

interface HealthIssue {
  id: string
  type: 'stuck_incomplete' | 'missing_data' | 'sync_failed' | 'cache_stale' | 'firestore_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  autoFixable: boolean
  lastDetected: number
}

interface HealthStatus {
  isHealthy: boolean
  issues: HealthIssue[]
  lastCheck: number
  autoFixEnabled: boolean
}

export function SubscriptionHealthMonitor() {
  const { subscription, loading } = useSubscription()
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    isHealthy: true,
    issues: [],
    lastCheck: 0,
    autoFixEnabled: true
  })
  const [isFixing, setIsFixing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Health check function
  const performHealthCheck = useCallback((): HealthIssue[] => {
    const issues: HealthIssue[] = []
    const now = Date.now()

    if (loading) return issues

    // Issue 1: Stuck incomplete subscription
    if (subscription?.status === 'incomplete' && subscription.subscriptionId) {
      const timeSinceCreation = now - (subscription.createdAt || 0)
      if (timeSinceCreation > 5 * 60 * 1000) { // 5 minutes
        issues.push({
          id: 'stuck_incomplete',
          type: 'stuck_incomplete',
          severity: 'critical',
          title: 'Subscription Stuck',
          description: 'Your subscription has been incomplete for more than 5 minutes',
          autoFixable: true,
          lastDetected: now
        })
      }
    }

    // Issue 2: Missing subscription data
    if (!subscription && !loading) {
      issues.push({
        id: 'missing_data',
        type: 'missing_data',
        severity: 'medium',
        title: 'Missing Subscription Data',
        description: 'Subscription information could not be loaded',
        autoFixable: true,
        lastDetected: now
      })
    }

    // Issue 3: Stale subscription data
    if (subscription?.updatedAt) {
      const timeSinceUpdate = now - subscription.updatedAt
      if (timeSinceUpdate > 30 * 60 * 1000) { // 30 minutes
        issues.push({
          id: 'cache_stale',
          type: 'cache_stale',
          severity: 'low',
          title: 'Stale Data',
          description: 'Subscription data may be outdated',
          autoFixable: true,
          lastDetected: now
        })
      }
    }

    // Issue 4: Check localStorage consistency
    try {
      const stored = localStorage.getItem('neurafit_subscription_robust')
      if (stored) {
        const data = JSON.parse(stored)
        if (data.subscription?.status !== subscription?.status) {
          issues.push({
            id: 'sync_failed',
            type: 'sync_failed',
            severity: 'medium',
            title: 'Sync Issue',
            description: 'Local and server data are out of sync',
            autoFixable: true,
            lastDetected: now
          })
        }
      }
    } catch {
      issues.push({
        id: 'cache_error',
        type: 'cache_stale',
        severity: 'low',
        title: 'Cache Error',
        description: 'Local storage data is corrupted',
        autoFixable: true,
        lastDetected: now
      })
    }

    return issues
  }, [loading, subscription])

  // Auto-fix function
  const autoFixIssues = useCallback(async (issues: HealthIssue[]) => {
    if (!healthStatus.autoFixEnabled || isFixing) return

    const criticalIssues = issues.filter(issue => 
      issue.severity === 'critical' || issue.severity === 'high'
    )

    if (criticalIssues.length === 0) return

    console.log('🔧 Auto-fixing subscription health issues...')
    setIsFixing(true)

    try {
      for (const issue of criticalIssues) {
        if (!issue.autoFixable) continue

        console.log(`🚀 Auto-fixing issue: ${issue.type}`)

        switch (issue.type) {
          case 'stuck_incomplete':
            if (subscription?.subscriptionId) {
              await robustSubscriptionManager.forceActivateSubscription(subscription.subscriptionId)
            }
            break

          case 'missing_data':
          case 'cache_stale':
          case 'sync_failed':
            await robustSubscriptionManager.refreshSubscription()
            break
        }
      }

      // Re-check health after fixes
      setTimeout(() => {
        const newIssues = performHealthCheck()
        setHealthStatus(prev => ({
          ...prev,
          issues: newIssues,
          isHealthy: newIssues.length === 0,
          lastCheck: Date.now()
        }))
      }, 2000)

    } catch (error) {
      console.error('❌ Auto-fix failed:', error)
    } finally {
      setIsFixing(false)
    }
  }, [healthStatus.autoFixEnabled, isFixing, performHealthCheck, subscription?.subscriptionId])

  // Manual fix function
  const manualFix = useCallback(async () => {
    setIsFixing(true)
    try {
      console.log('🔧 Manual subscription health fix...')

      // Clear cache and refresh
      robustSubscriptionManager.clearCache()
      await robustSubscriptionManager.refreshSubscription()

      // Force activate if we have a subscription ID
      if (subscription?.subscriptionId) {
        await robustSubscriptionManager.forceActivateSubscription(subscription.subscriptionId)
      }

      // Re-check health
      setTimeout(() => {
        const newIssues = performHealthCheck()
        setHealthStatus(prev => ({
          ...prev,
          issues: newIssues,
          isHealthy: newIssues.length === 0,
          lastCheck: Date.now()
        }))
      }, 2000)

    } catch (error) {
      console.error('❌ Manual fix failed:', error)
    } finally {
      setIsFixing(false)
    }
  }, [subscription, performHealthCheck])

  // Periodic health checks
  useEffect(() => {
    const checkHealth = () => {
      if (loading || isFixing) return

      const issues = performHealthCheck()
      const isHealthy = issues.length === 0

      setHealthStatus(prev => ({
        ...prev,
        issues,
        isHealthy,
        lastCheck: Date.now()
      }))

      // Auto-fix if enabled
      if (healthStatus.autoFixEnabled && issues.length > 0) {
        setTimeout(() => autoFixIssues(issues), 1000)
      }
    }

    // Initial check
    checkHealth()

    // Periodic checks every 30 seconds
    const interval = setInterval(checkHealth, 30000)

    return () => clearInterval(interval)
  }, [subscription, loading, healthStatus.autoFixEnabled, autoFixIssues, isFixing, performHealthCheck])

  // Don't render if healthy or dismissed
  if (healthStatus.isHealthy || dismissed || loading) {
    return null
  }

  const criticalIssues = healthStatus.issues.filter(issue => 
    issue.severity === 'critical' || issue.severity === 'high'
  )
  const hasCriticalIssues = criticalIssues.length > 0

  return (
    <div className={`fixed top-4 right-4 max-w-sm p-4 rounded-xl shadow-lg z-50 transition-all duration-300 ${
      hasCriticalIssues 
        ? 'bg-red-50 border-2 border-red-200' 
        : 'bg-yellow-50 border-2 border-yellow-200'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            {hasCriticalIssues ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm ${
              hasCriticalIssues ? 'text-red-900' : 'text-yellow-900'
            }`}>
              Subscription Health Issue
            </h3>
            
            <div className="mt-1">
              {healthStatus.issues.slice(0, 2).map((issue) => (
                <p key={issue.id} className={`text-xs ${
                  hasCriticalIssues ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {issue.title}: {issue.description}
                </p>
              ))}
              {healthStatus.issues.length > 2 && (
                <p className={`text-xs ${
                  hasCriticalIssues ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  +{healthStatus.issues.length - 2} more issues
                </p>
              )}
            </div>
            
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={manualFix}
                disabled={isFixing}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  hasCriticalIssues
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                } disabled:opacity-50`}
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3" />
                    Fix Now
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`text-xs ${
                  hasCriticalIssues ? 'text-red-600 hover:text-red-800' : 'text-yellow-600 hover:text-yellow-800'
                } underline`}
              >
                {showDetails ? 'Hide' : 'Details'}
              </button>
              
              <button
                onClick={() => setHealthStatus(prev => ({ ...prev, autoFixEnabled: !prev.autoFixEnabled }))}
                className={`text-xs ${
                  hasCriticalIssues ? 'text-red-600' : 'text-yellow-600'
                } hover:underline`}
              >
                Auto-fix: {healthStatus.autoFixEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {showDetails && (
              <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs">
                <div className="space-y-1">
                  {healthStatus.issues.map((issue) => (
                    <div key={issue.id} className="flex justify-between">
                      <span className="font-medium">{issue.type}</span>
                      <span className={`px-1 rounded text-xs ${
                        issue.severity === 'critical' ? 'bg-red-200 text-red-800' :
                        issue.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                        issue.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {issue.severity}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-gray-600">
                  Last check: {new Date(healthStatus.lastCheck).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className={`flex-shrink-0 p-1 rounded-full hover:bg-white hover:bg-opacity-50 ${
            hasCriticalIssues ? 'text-red-600' : 'text-yellow-600'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default SubscriptionHealthMonitor
