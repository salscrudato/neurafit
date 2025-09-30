import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { SessionProvider } from './session/SessionProvider'
import { suppressDevWarnings } from './utils/devUtils'

// Suppress common development warnings
suppressDevWarnings()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SessionProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </SessionProvider>
)

// Clear all caches on startup to ensure fresh content
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      if (cacheName.includes('neurafit')) {
        console.log('Clearing cache:', cacheName)
        caches.delete(cacheName)
      }
    })
  })
}

// Register service worker for PWA functionality and instant updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('SW registered: ', registration)
        }

        // Check for updates every 30 seconds
        setInterval(() => {
          registration.update()
        }, 30000)

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
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
        console.log('SW registration failed: ', registrationError)
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

// Show update notification to user
function showUpdateNotification() {
  // Create a subtle notification
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
      <button onclick="applyUpdate()" style="
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
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
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

  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (document.getElementById('update-notification')) {
      notification.style.animation = 'slideIn 0.3s ease-out reverse'
      setTimeout(() => notification.remove(), 300)
    }
  }, 10000)
}

// Apply update function
window.applyUpdate = function() {
  const notification = document.getElementById('update-notification')
  if (notification) notification.remove()

  // Tell service worker to skip waiting and activate
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
  }

  // Reload the page
  setTimeout(() => window.location.reload(), 100)
}