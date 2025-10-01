/**
 * Webhook Health Monitoring System
 * Monitors webhook delivery and provides fallback mechanisms
 */

import { httpsCallable } from 'firebase/functions'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { fns, auth, db } from './firebase'

export interface WebhookHealthStatus {
  isHealthy: boolean
  lastSuccessfulWebhook: number | null
  failedWebhookCount: number
  lastFailureReason: string | null
  averageDeliveryTime: number
  recommendedAction: 'none' | 'monitor' | 'fallback' | 'manual_intervention'
}

export interface WebhookEvent {
  id: string
  type: string
  created: number
  delivered: boolean
  deliveryTime?: number
  error?: string
}

/**
 * Webhook Health Monitor
 * Tracks webhook delivery health and provides fallback mechanisms
 */
export class WebhookHealthMonitor {
  private healthCheckInterval: NodeJS.Timeout | null = null
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
  private readonly MAX_FAILED_WEBHOOKS = 3
  private readonly WEBHOOK_TIMEOUT_MS = 30000 // 30 seconds

  /**
   * Start monitoring webhook health
   */
  startMonitoring(): void {
    if (this.healthCheckInterval) {
      return // Already monitoring
    }

    console.log('🔍 Starting webhook health monitoring...')

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error('Webhook health check failed:', error)
      }
    }, this.HEALTH_CHECK_INTERVAL)

    // Perform initial health check
    this.performHealthCheck()
  }

  /**
   * Stop monitoring webhook health
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      console.log('🛑 Stopped webhook health monitoring')
    }
  }

  /**
   * Perform a health check
   */
  async performHealthCheck(): Promise<WebhookHealthStatus> {
    try {
      const user = auth.currentUser
      if (!user) {
        return this.createUnhealthyStatus('No authenticated user')
      }

      // Get recent webhook events
      const recentEvents = await this.getRecentWebhookEvents()
      
      // Analyze webhook health
      const healthStatus = this.analyzeWebhookHealth(recentEvents)

      // Store health status
      await this.storeHealthStatus(user.uid, healthStatus)

      // Take action if needed
      if (healthStatus.recommendedAction !== 'none') {
        await this.handleUnhealthyWebhooks(healthStatus)
      }

      return healthStatus

    } catch (error) {
      console.error('Health check failed:', error)
      return this.createUnhealthyStatus(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Get recent webhook events
   */
  private async getRecentWebhookEvents(): Promise<WebhookEvent[]> {
    try {
      const checkWebhooksFn = httpsCallable(fns, 'checkWebhookDelivery')
      const result = await checkWebhooksFn({
        hours: 1 // Check last hour
      })

      const data = result.data as { success?: boolean; events?: Array<{ id: string; type: string; created: number; error?: string; delivery_time?: number }> }
      if (data.success && data.events) {
        return data.events.map((event) => ({
          id: event.id,
          type: event.type,
          created: event.created,
          delivered: !event.error,
          deliveryTime: event.delivery_time,
          error: event.error
        }))
      }

      return []
    } catch (error) {
      console.error('Failed to get webhook events:', error)
      return []
    }
  }

  /**
   * Analyze webhook health from recent events
   */
  private analyzeWebhookHealth(events: WebhookEvent[]): WebhookHealthStatus {
    if (events.length === 0) {
      return {
        isHealthy: false,
        lastSuccessfulWebhook: null,
        failedWebhookCount: 0,
        lastFailureReason: 'No recent webhook events found',
        averageDeliveryTime: 0,
        recommendedAction: 'monitor'
      }
    }

    const successfulEvents = events.filter(e => e.delivered)
    const failedEvents = events.filter(e => !e.delivered)
    
    const lastSuccessfulWebhook = successfulEvents.length > 0 
      ? Math.max(...successfulEvents.map(e => e.created))
      : null

    const averageDeliveryTime = successfulEvents.length > 0
      ? successfulEvents.reduce((sum, e) => sum + (e.deliveryTime || 0), 0) / successfulEvents.length
      : 0

    const failedWebhookCount = failedEvents.length
    const lastFailureReason = failedEvents.length > 0 
      ? failedEvents[failedEvents.length - 1].error || 'Unknown failure'
      : null

    // Determine health status
    const isHealthy = failedWebhookCount === 0 && successfulEvents.length > 0
    
    let recommendedAction: WebhookHealthStatus['recommendedAction'] = 'none'
    
    if (failedWebhookCount >= this.MAX_FAILED_WEBHOOKS) {
      recommendedAction = 'manual_intervention'
    } else if (failedWebhookCount > 0) {
      recommendedAction = 'fallback'
    } else if (averageDeliveryTime > this.WEBHOOK_TIMEOUT_MS) {
      recommendedAction = 'monitor'
    }

    return {
      isHealthy,
      lastSuccessfulWebhook,
      failedWebhookCount,
      lastFailureReason,
      averageDeliveryTime,
      recommendedAction
    }
  }

  /**
   * Handle unhealthy webhook situations
   */
  private async handleUnhealthyWebhooks(healthStatus: WebhookHealthStatus): Promise<void> {
    console.log(`⚠️ Webhook health issue detected: ${healthStatus.recommendedAction}`)

    switch (healthStatus.recommendedAction) {
      case 'fallback':
        await this.enableFallbackMode()
        break
      case 'manual_intervention':
        await this.requestManualIntervention(healthStatus)
        break
      case 'monitor':
        console.log('📊 Monitoring webhook performance...')
        break
    }
  }

  /**
   * Enable fallback mode for subscription processing
   */
  private async enableFallbackMode(): Promise<void> {
    console.log('🔄 Enabling webhook fallback mode...')
    
    const user = auth.currentUser
    if (!user) return

    try {
      // Store fallback mode status
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, {
        'webhookHealth.fallbackMode': true,
        'webhookHealth.fallbackEnabledAt': Date.now()
      })

      // Check for any stuck subscriptions and process them
      await this.processStuckSubscriptions()

    } catch (error) {
      console.error('Failed to enable fallback mode:', error)
    }
  }

  /**
   * Process any stuck subscriptions using fallback methods
   */
  private async processStuckSubscriptions(): Promise<void> {
    try {
      const user = auth.currentUser
      if (!user) return

      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) return

      const userData = userDoc.data()
      const subscription = userData.subscription

      // Check if subscription is stuck in incomplete status
      if (subscription?.status === 'incomplete' && subscription.subscriptionId) {
        const timeSinceUpdate = Date.now() - (subscription.updatedAt || 0)
        
        // If subscription has been incomplete for more than 2 minutes, try to fix it
        if (timeSinceUpdate > 120000) {
          console.log(`🔧 Processing stuck subscription: ${subscription.subscriptionId}`)
          
          const { subscriptionFixManager } = await import('./subscription-fix-final')
          await subscriptionFixManager.fixSubscription(subscription.subscriptionId)
        }
      }

    } catch (error) {
      console.error('Failed to process stuck subscriptions:', error)
    }
  }

  /**
   * Request manual intervention for webhook issues
   */
  private async requestManualIntervention(healthStatus: WebhookHealthStatus): Promise<void> {
    console.error('🚨 Manual intervention required for webhook issues')
    console.error('Health status:', healthStatus)

    // In a production app, this would:
    // 1. Send alert to monitoring system
    // 2. Create support ticket
    // 3. Notify administrators
    // 4. Enable emergency fallback mode

    // For now, just log the issue and enable fallback mode
    await this.enableFallbackMode()
  }

  /**
   * Store health status in Firestore
   */
  private async storeHealthStatus(userId: string, healthStatus: WebhookHealthStatus): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', userId)
      await updateDoc(userDocRef, {
        'webhookHealth.status': healthStatus,
        'webhookHealth.lastChecked': Date.now()
      })
    } catch (error) {
      console.error('Failed to store health status:', error)
    }
  }

  /**
   * Create unhealthy status object
   */
  private createUnhealthyStatus(reason: string): WebhookHealthStatus {
    return {
      isHealthy: false,
      lastSuccessfulWebhook: null,
      failedWebhookCount: 0,
      lastFailureReason: reason,
      averageDeliveryTime: 0,
      recommendedAction: 'manual_intervention'
    }
  }

  /**
   * Get current health status
   */
  async getCurrentHealthStatus(): Promise<WebhookHealthStatus | null> {
    try {
      const user = auth.currentUser
      if (!user) return null

      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) return null

      const userData = userDoc.data()
      return userData.webhookHealth?.status || null

    } catch (error) {
      console.error('Failed to get health status:', error)
      return null
    }
  }
}

// Export singleton instance
export const webhookHealthMonitor = new WebhookHealthMonitor()

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  // Start monitoring after a short delay to allow Firebase to initialize
  setTimeout(() => {
    webhookHealthMonitor.startMonitoring()
  }, 5000)
}
