/**
 * Safe service worker messaging utilities
 * Prevents sending invalid messages that cause console warnings
 */

export interface ServiceWorkerMessage {
  type: string
  payload?: Record<string, unknown>
}

/**
 * Safely send a message to the service worker with validation
 */
export function sendServiceWorkerMessage(message: ServiceWorkerMessage): boolean {
  // Validate message structure
  if (!message || typeof message !== 'object') {
    console.warn('Invalid message object provided to sendServiceWorkerMessage:', message)
    return false
  }

  // Validate message type
  if (!message.type || typeof message.type !== 'string' || message.type.trim() === '') {
    console.warn('Invalid or missing message type:', message.type)
    return false
  }

  // Check if service worker is available
  if (!('serviceWorker' in navigator)) {
    console.debug('Service worker not supported')
    return false
  }

  if (!navigator.serviceWorker.controller) {
    console.debug('No active service worker controller')
    return false
  }

  try {
    navigator.serviceWorker.controller.postMessage(message)
    return true
  } catch (error) {
    console.error('Failed to send message to service worker:', error)
    return false
  }
}

/**
 * Send a subscription update message to the service worker
 */
export function notifyServiceWorkerSubscriptionUpdate(status: string, subscription?: Record<string, unknown>): boolean {
  return sendServiceWorkerMessage({
    type: 'SUBSCRIPTION_UPDATED',
    payload: { status, subscription }
  })
}

/**
 * Send a skip waiting message to the service worker
 */
export function sendSkipWaitingMessage(): boolean {
  return sendServiceWorkerMessage({
    type: 'SKIP_WAITING'
  })
}

/**
 * Send a check update message to the service worker
 */
export function sendCheckUpdateMessage(): boolean {
  return sendServiceWorkerMessage({
    type: 'CHECK_UPDATE'
  })
}

/**
 * Send a clear cache message to the service worker
 */
export function sendClearCacheMessage(): boolean {
  return sendServiceWorkerMessage({
    type: 'CLEAR_CACHE'
  })
}

/**
 * Get service worker version information
 */
export function getServiceWorkerVersion(): Promise<{ version: string; environment: string } | null> {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      resolve(null)
      return
    }

    const channel = new MessageChannel()
    
    channel.port1.onmessage = (event) => {
      if (event.data?.type === 'VERSION_RESPONSE') {
        resolve({
          version: event.data.version,
          environment: event.data.environment
        })
      } else {
        resolve(null)
      }
    }

    try {
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [channel.port2]
      )
    } catch (error) {
      console.error('Failed to get service worker version:', error)
      resolve(null)
    }

    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000)
  })
}

/**
 * Listen for service worker messages with type filtering
 */
export function listenForServiceWorkerMessages(
  messageTypes: string[],
  callback: (_message: ServiceWorkerMessage) => void
): () => void {
  if (!('serviceWorker' in navigator)) {
    return () => {} // No-op cleanup
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data && 
        typeof event.data === 'object' && 
        event.data.type && 
        messageTypes.includes(event.data.type)) {
      callback(event.data)
    }
  }

  navigator.serviceWorker.addEventListener('message', handleMessage)

  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage)
  }
}

/**
 * Check if service worker is active and ready
 */
export function isServiceWorkerReady(): boolean {
  return 'serviceWorker' in navigator && 
         navigator.serviceWorker.controller !== null
}

/**
 * Wait for service worker to be ready
 */
export function waitForServiceWorkerReady(timeout: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isServiceWorkerReady()) {
      resolve(true)
      return
    }

    if (!('serviceWorker' in navigator)) {
      resolve(false)
      return
    }

    const checkReady = () => {
      if (navigator.serviceWorker.controller) {
        resolve(true)
        return true
      }
      return false
    }

    // Check periodically
    const interval = setInterval(() => {
      if (checkReady()) {
        clearInterval(interval)
      }
    }, 100)

    // Timeout
    setTimeout(() => {
      clearInterval(interval)
      resolve(false)
    }, timeout)

    // Also listen for controllerchange event
    const handleControllerChange = () => {
      if (checkReady()) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
        clearInterval(interval)
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
  })
}

/**
 * Debug function to log service worker state
 */
export function debugServiceWorkerState(): void {
  if (!('serviceWorker' in navigator)) {
    console.log('🔧 Service Worker: Not supported')
    return
  }

  console.log('🔧 Service Worker Debug Info:')
  console.log('  - Controller:', navigator.serviceWorker.controller ? 'Active' : 'None')
  console.log('  - Ready:', navigator.serviceWorker.ready)
  
  navigator.serviceWorker.getRegistration().then(registration => {
    if (registration) {
      console.log('  - Registration:', registration)
      console.log('  - Active:', registration.active ? 'Yes' : 'No')
      console.log('  - Installing:', registration.installing ? 'Yes' : 'No')
      console.log('  - Waiting:', registration.waiting ? 'Yes' : 'No')
    } else {
      console.log('  - Registration: None')
    }
  }).catch(error => {
    console.log('  - Registration Error:', error)
  })
}

// Export a default object with all functions for convenience
export default {
  sendMessage: sendServiceWorkerMessage,
  notifySubscriptionUpdate: notifyServiceWorkerSubscriptionUpdate,
  sendSkipWaiting: sendSkipWaitingMessage,
  sendCheckUpdate: sendCheckUpdateMessage,
  sendClearCache: sendClearCacheMessage,
  getVersion: getServiceWorkerVersion,
  listen: listenForServiceWorkerMessages,
  isReady: isServiceWorkerReady,
  waitForReady: waitForServiceWorkerReady,
  debug: debugServiceWorkerState
}
