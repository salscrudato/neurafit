import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';


import { cacheBustingManager } from './utils/cacheBusting';
import { showUpdateNotification } from './utils/updateNotification';



// Initialize cache busting in production
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Initializing cache busting system...');
  const deploymentInfo = cacheBustingManager.getDeploymentInfo();
  console.log('📦 Deployment ID:', deploymentInfo.id);
}

// Clear all caches on startup to ensure fresh content
if ('caches' in window) {
  caches
    .keys()
    .then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        console.log('Clearing cache:', cacheName);
        caches.delete(cacheName);
      });
    })
    .catch((error) => {
      console.error('Error clearing caches:', error);
    });
}

// In development, clear specific version-related localStorage keys
if (process.env.NODE_ENV === 'development') {
  const versionKeys = ['current-deployment-version', 'page-etag', 'page-last-modified', 'manifest-version'];
  versionKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      console.log('Clearing localStorage key:', key);
      localStorage.removeItem(key);
    }
  });
}

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('SW registered:', registration);
        }

        // Periodically check for updates in production
        let updateInterval: NodeJS.Timeout | undefined;
        if (process.env.NODE_ENV === 'production') {
          updateInterval = setInterval(() => {
            registration.update().catch((error) => {
              console.error('Error updating service worker:', error);
            });
          }, 600000); // 10 minutes

          // Cleanup interval on unload
          window.addEventListener('beforeunload', () => {
            if (updateInterval) {
              clearInterval(updateInterval);
            }
          });
        }

        // Listen for update found
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('New version available!');
                }
                showUpdateNotification();
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.error('SW registration failed:', registrationError);
      });
  });

  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      if (process.env.NODE_ENV === 'development') {
        console.log('Service worker updated, reloading page...');
      }
      window.location.reload();
    }
  });
}

