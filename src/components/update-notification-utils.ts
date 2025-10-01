/**
 * Update Notification Utilities
 * Shared utilities and hooks for update notifications
 */

import { useState, useEffect } from 'react'

// Hook for using update notifications
export function useUpdateNotification() {
  const [hasUpdate, setHasUpdate] = useState(false)
  const [updateDetails, setUpdateDetails] = useState<{ version?: string; type?: string; timestamp?: number } | null>(null)

  useEffect(() => {
    const handleUpdate = (event: CustomEvent) => {
      setHasUpdate(true)
      setUpdateDetails(event.detail)
    }

    const handleVersionUpdate = (_event: CustomEvent) => {
      setHasUpdate(true)
      setUpdateDetails({
        version: _event.detail.version,
        type: 'version',
        timestamp: Date.now()
      })
    }

    const handleCacheUpdate = (_event: CustomEvent) => {
      setHasUpdate(true)
      setUpdateDetails({
        type: 'cache',
        timestamp: Date.now()
      })
    }

    // Listen for update events
    window.addEventListener('versionUpdate', handleVersionUpdate as (_event: Event) => void)
    window.addEventListener('cacheUpdate', handleCacheUpdate as (_event: Event) => void)
    window.addEventListener('appUpdate', handleUpdate as (_event: Event) => void)

    return () => {
      window.removeEventListener('versionUpdate', handleVersionUpdate as (_event: Event) => void)
      window.removeEventListener('cacheUpdate', handleCacheUpdate as (_event: Event) => void)
      window.removeEventListener('appUpdate', handleUpdate as (_event: Event) => void)
    }
  }, [])

  const dismissUpdate = () => {
    setHasUpdate(false)
    setUpdateDetails(null)
  }

  return {
    hasUpdate,
    updateDetails,
    dismissUpdate
  }
}

// Update notification configuration
export const UPDATE_CONFIG = {
  AUTO_UPDATE_DELAY: 10000, // 10 seconds
  CHECK_INTERVAL: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
}

// Update notification types
export type UpdateType = 'version' | 'cache' | 'critical' | 'feature'

export interface UpdateInfo {
  version?: string
  type: UpdateType
  timestamp: number
  title?: string
  description?: string
  critical?: boolean
  features?: string[]
}

// Utility functions for update management
export const updateUtils = {
  formatUpdateMessage: (updateInfo: UpdateInfo): string => {
    switch (updateInfo.type) {
      case 'version':
        return `New version ${updateInfo.version || 'available'} is ready!`
      case 'cache':
        return 'App cache has been updated for better performance'
      case 'critical':
        return 'Critical update available - please refresh'
      case 'feature':
        return 'New features are available!'
      default:
        return 'App update available'
    }
  },

  shouldAutoUpdate: (updateInfo: UpdateInfo): boolean => {
    return updateInfo.critical === true
  },

  getUpdatePriority: (updateInfo: UpdateInfo): 'low' | 'medium' | 'high' | 'critical' => {
    if (updateInfo.critical) return 'critical'
    if (updateInfo.type === 'version') return 'high'
    if (updateInfo.type === 'feature') return 'medium'
    return 'low'
  },

  createUpdateEvent: (updateInfo: UpdateInfo): CustomEvent => {
    return new CustomEvent('appUpdate', {
      detail: updateInfo
    })
  }
}
