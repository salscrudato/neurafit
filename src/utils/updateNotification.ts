/**
 * Update Notification Utilities
 * Handles showing update notifications when new versions are available
 */

import { sendSkipWaitingMessage } from './service-worker-messaging'

/**
 * Shows an update notification to the user
 */
export function showUpdateNotification(): void {
  // Check if notification already exists
  if (document.getElementById('update-notification')) return

  const notification = document.createElement('div')
  notification.id = 'update-notification'
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Update Available!</div>
          <div style="opacity: 0.9; font-size: 13px;">New features and improvements are ready.</div>
        </div>
      </div>
      <button id="update-button" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 12px;
        width: 100%;
        transition: background 0.2s;
      ">
        Update Now
      </button>
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    </style>
  `

  document.body.appendChild(notification)

  // Add event listener to button
  const updateButton = document.getElementById('update-button')
  if (updateButton) {
    updateButton.addEventListener('mouseover', () => {
      updateButton.style.background = 'rgba(255,255,255,0.3)'
    })
    updateButton.addEventListener('mouseout', () => {
      updateButton.style.background = 'rgba(255,255,255,0.2)'
    })
    updateButton.addEventListener('click', applyUpdate)
  }

  // Auto-hide after 10 seconds
  setTimeout(() => {
    const currentNotification = document.getElementById('update-notification')
    if (currentNotification) {
      currentNotification.style.animation = 'slideIn 0.3s ease-out reverse'
      setTimeout(() => currentNotification.remove(), 300)
    }
  }, 10000)
}

/**
 * Applies the update by telling the service worker to skip waiting and reloading
 */
export function applyUpdate(): void {
  const notification = document.getElementById('update-notification')
  if (notification) notification.remove()

  // Tell service worker to skip waiting
  sendSkipWaitingMessage()

  // Reload after a short delay
  setTimeout(() => window.location.reload(), 100)
}

// Expose applyUpdate globally for compatibility
declare global {
  interface Window {
    applyUpdate?: typeof applyUpdate
  }
}

if (typeof window !== 'undefined') {
  window.applyUpdate = applyUpdate
}
