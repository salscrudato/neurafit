import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import './index.css'

import { suppressDevWarnings } from './utils/devUtils'
import { cacheBustingManager } from './utils/cacheBusting'

// Suppress common development warnings
suppressDevWarnings()

// Initialize cache busting in production
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Initializing cache busting system...')
  const deploymentInfo = cacheBustingManager.getDeploymentInfo()
  console.log('📦 Deployment ID:', deploymentInfo.id)
}

// Clear all caches on startup to ensure fresh content
if ('caches' in window) {
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      console.log('Clearing cache:', cacheName)
      caches.delete(cacheName)
    })
  }).catch((error) => {
    console.error('Error clearing caches:', error)
  })
}

// In development, clear specific version-related localStorage keys
if (process.env.NODE_ENV === 'development') {
  const versionKeys = ['current-deployment-version', 'page-etag', 'page-last-modified', 'manifest-version']
  versionKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      console.log('Clearing localStorage key:', key)
      localStorage.removeItem(key)
    }
  })
}

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('SW registered:', registration)
        }

        // Periodically check for updates in production
        if (process.env.NODE_ENV === 'production') {
          const updateInterval = setInterval(() => {
            registration.update().catch((error) => {
              console.error('Error updating service worker:', error)
            })
          }, 600000) // 10 minutes

          // Cleanup interval on unload
          window.addEventListener('beforeunload', () => {
            clearInterval(updateInterval)
          })
        }

        // Listen for update found
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('New version available!')
                }
                showUpdateNotification()
              }
            })
          }
        })
      })
      .catch((registrationError) => {
        console.error('SW registration failed:', registrationError)
      })
  })

  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      if (process.env.NODE_ENV === 'development') {
        console.log('Service worker updated, reloading page...')
      }
      window.location.reload()
    }
  })
}

// Function to show update notification
function showUpdateNotification() {
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

// Function to apply update
function applyUpdate() {
  const notification = document.getElementById('update-notification')
  if (notification) notification.remove()

  // Tell service worker to skip waiting
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
  }

  // Reload after a short delay
  setTimeout(() => window.location.reload(), 100)
}

// Expose applyUpdate globally if needed
window.applyUpdate = applyUpdate