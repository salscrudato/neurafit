/**
 * Service Worker Update Toast Hook
 * 
 * Provides a user-friendly toast notification when a new version of the app is available.
 * Replaces automatic reload with user-controlled update flow.
 */

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface UpdateToastState {
  show: boolean;
  updateAvailable: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUpdateToast() {
  const [state, setState] = useState<UpdateToastState>({
    show: false,
    updateAvailable: false,
  });

  useEffect(() => {
    // Listen for SW update messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        setState({ show: true, updateAvailable: true });
      }
    };

    // Listen for BroadcastChannel updates (more reliable)
    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('sw-updates');
      channel.addEventListener('message', handleMessage);
    }

    // Also listen to traditional postMessage
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
      channel?.close();
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setState({ show: false, updateAvailable: false });
  };

  return {
    showToast: state.show,
    updateAvailable: state.updateAvailable,
    handleUpdate,
    handleDismiss,
  };
}

/**
 * Update Toast Component
 * 
 * Displays a toast notification when an app update is available.
 */
export function UpdateToast() {
  const { showToast, handleUpdate, handleDismiss } = useUpdateToast();

  if (!showToast) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 sm:max-w-[calc(100vw-2rem)] z-[9999] animate-slide-up"
      role="alert"
      aria-live="polite"
      style={{
        right: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Update Available
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            A new version of NeuraFit is ready. Refresh to get the latest features and improvements.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Later
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss update notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

