/**
 * Subscription Persistence Guard
 * Automatically detects and fixes subscription persistence issues
 */

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, RefreshCw, Zap } from 'lucide-react'
import { useSubscription } from '../hooks/useSubscription'
import { fixStuckSubscription, clearSubscriptionCache } from '../lib/subscription-persistence-fix'

interface PersistenceIssue {
  type: 'stuck_incomplete' | 'missing_data' | 'cache_stale' | 'sync_failed'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  autoFixable: boolean
}

export function SubscriptionPersistenceGuard() {
  const { subscription, loading, refreshSubscription } = useSubscription()
  const [issues, setIssues] = useState<PersistenceIssue[]>([])
  const [fixing, setFixing] = useState(false)
  const [lastCheck, setLastCheck] = useState<number>(0)
  const [autoFixEnabled, setAutoFixEnabled] = useState(true)

  // Check for persistence issues
  const checkForIssues = useCallback(() => {
    const detectedIssues: PersistenceIssue[] = []
    const now = Date.now()

    // Issue 1: Subscription stuck in incomplete state
    if (subscription?.status === 'incomplete' && subscription.subscriptionId) {
      const timeSinceCreation = now - (subscription.createdAt || 0)
      if (timeSinceCreation > 5 * 60 * 1000) { // 5 minutes
        detectedIssues.push({
          type: 'stuck_incomplete',
          severity: 'high',
          description: 'Subscription has been incomplete for more than 5 minutes',
          autoFixable: true
        })
      }
    }

    // Issue 2: Missing subscription data
    if (!subscription && !loading) {
      detectedIssues.push({
        type: 'missing_data',
        severity: 'medium',
        description: 'Subscription data is missing',
        autoFixable: true
      })
    }

    // Issue 3: Stale cache detection
    if (subscription?.updatedAt) {
      const timeSinceUpdate = now - subscription.updatedAt
      if (timeSinceUpdate > 30 * 60 * 1000) { // 30 minutes
        detectedIssues.push({
          type: 'cache_stale',
          severity: 'low',
          description: 'Subscription data may be stale',
          autoFixable: true
        })
      }
    }

    // Issue 4: Check for localStorage inconsistency
    try {
      const stored = localStorage.getItem('neurafit_subscription_state')
      if (stored) {
        const parsedStored = JSON.parse(stored)
        if (parsedStored.subscription?.status !== subscription?.status) {
          detectedIssues.push({
            type: 'sync_failed',
            severity: 'medium',
            description: 'Local storage and context are out of sync',
            autoFixable: true
          })
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    setIssues(detectedIssues)
    setLastCheck(now)

    return detectedIssues
  }, [subscription, loading])

  // Auto-fix issues
  const autoFixIssues = useCallback(async (detectedIssues: PersistenceIssue[]) => {
    if (!autoFixEnabled || fixing) return

    const criticalIssues = detectedIssues.filter(issue => 
      issue.severity === 'critical' || issue.severity === 'high'
    )

    if (criticalIssues.length === 0) return

    console.log('🔧 Auto-fixing subscription persistence issues...')
    setFixing(true)

    try {
      for (const issue of criticalIssues) {
        if (!issue.autoFixable) continue

        switch (issue.type) {
          case 'stuck_incomplete':
            if (subscription?.subscriptionId) {
              console.log('🚀 Auto-fixing stuck subscription...')
              await fixStuckSubscription(subscription.subscriptionId)
            }
            break

          case 'missing_data':
            console.log('🔄 Auto-refreshing missing subscription data...')
            await refreshSubscription()
            break

          case 'cache_stale':
            console.log('🗑️ Auto-clearing stale cache...')
            clearSubscriptionCache()
            await refreshSubscription()
            break

          case 'sync_failed':
            console.log('🔄 Auto-fixing sync issues...')
            clearSubscriptionCache()
            await refreshSubscription()
            break
        }
      }

      // Re-check after fixes
      setTimeout(() => {
        checkForIssues()
      }, 2000)

    } catch (error) {
      console.error('❌ Auto-fix failed:', error)
    } finally {
      setFixing(false)
    }
  }, [autoFixEnabled, fixing, checkForIssues, refreshSubscription, subscription?.subscriptionId])

  // Manual fix function
  const manualFix = useCallback(async () => {
    setFixing(true)
    try {
      console.log('🔧 Manual subscription fix initiated...')

      // Clear all caches
      clearSubscriptionCache()

      // Try to fix stuck subscription if we have an ID
      if (subscription?.subscriptionId) {
        await fixStuckSubscription(subscription.subscriptionId)
      }

      // Force refresh
      await refreshSubscription()

      // Re-check issues
      setTimeout(() => {
        checkForIssues()
      }, 2000)

    } catch (error) {
      console.error('❌ Manual fix failed:', error)
    } finally {
      setFixing(false)
    }
  }, [subscription?.subscriptionId, refreshSubscription, checkForIssues])

  // Check for issues on mount and subscription changes
  useEffect(() => {
    if (!loading) {
      const detectedIssues = checkForIssues()
      
      // Auto-fix if enabled
      if (autoFixEnabled && detectedIssues.length > 0) {
        setTimeout(() => {
          autoFixIssues(detectedIssues)
        }, 1000) // Small delay to avoid race conditions
      }
    }
  }, [subscription, loading, autoFixEnabled, autoFixIssues, checkForIssues])

  // Periodic health checks
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !fixing) {
        checkForIssues()
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [loading, fixing, checkForIssues])

  // Don't render if no issues
  if (issues.length === 0 || loading) {
    return null
  }

  const criticalIssues = issues.filter(issue => issue.severity === 'critical' || issue.severity === 'high')
  const hasCriticalIssues = criticalIssues.length > 0

  return (
    <div className={`fixed top-4 right-4 max-w-sm p-4 rounded-xl shadow-lg z-50 ${
      hasCriticalIssues ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {hasCriticalIssues ? (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-sm ${
            hasCriticalIssues ? 'text-red-900' : 'text-yellow-900'
          }`}>
            Subscription Sync Issue
          </h3>
          
          <div className="mt-1 space-y-1">
            {issues.slice(0, 2).map((issue, index) => (
              <p key={index} className={`text-xs ${
                hasCriticalIssues ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {issue.description}
              </p>
            ))}
            {issues.length > 2 && (
              <p className={`text-xs ${
                hasCriticalIssues ? 'text-red-700' : 'text-yellow-700'
              }`}>
                +{issues.length - 2} more issues
              </p>
            )}
          </div>
          
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={manualFix}
              disabled={fixing}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                hasCriticalIssues
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              } disabled:opacity-50 transition-colors`}
            >
              {fixing ? (
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
              onClick={() => setAutoFixEnabled(!autoFixEnabled)}
              className={`text-xs ${
                hasCriticalIssues ? 'text-red-600' : 'text-yellow-600'
              } hover:underline`}
            >
              Auto-fix: {autoFixEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          
          {lastCheck > 0 && (
            <p className={`mt-2 text-xs ${
              hasCriticalIssues ? 'text-red-500' : 'text-yellow-500'
            }`}>
              Last checked: {new Date(lastCheck).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubscriptionPersistenceGuard
