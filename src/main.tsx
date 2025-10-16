import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';
import { isDevelopment, isProduction } from './lib/env';
import { initSentry } from './lib/sentry';
import { initCacheManager } from './lib/cache-manager';

// Initialize Sentry for error tracking
initSentry();

// Initialize robust cache management
initCacheManager();

// In development, clear specific version-related localStorage keys
if (isDevelopment) {
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

// Register service worker for PWA functionality with enhanced update flow
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (isDevelopment) {
          console.log('✅ Service worker registered:', registration);
        }

        // Periodically check for updates in production
        let updateInterval: NodeJS.Timeout | undefined;
        if (isProduction) {
          // Check for updates more frequently (every 2 minutes)
          updateInterval = setInterval(() => {
            registration.update().catch((error) => {
              console.error('Error updating service worker:', error);
            });
          }, 120000); // 2 minutes

          // Also check on visibility change (when user returns to tab)
          const handleVisibilityChange = () => {
            if (!document.hidden) {
              registration.update().catch((error) => {
                console.error('Error updating service worker on visibility change:', error);
              });
            }
          };
          document.addEventListener('visibilitychange', handleVisibilityChange);

          // Cleanup interval on unload
          window.addEventListener('beforeunload', () => {
            if (updateInterval) {
              clearInterval(updateInterval);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
          });
        }

        // Listen for update found
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (isDevelopment) {
                  console.log('🔄 New service worker version available!');
                }
                // Show update notification to user (optional)
                // You can implement a toast/banner here
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.error('❌ Service worker registration failed:', registrationError);
      });
  });

  // Note: SW update handling is now done via UpdateToast component in App.tsx
  // This provides a better UX by asking the user to refresh instead of auto-reloading
}

