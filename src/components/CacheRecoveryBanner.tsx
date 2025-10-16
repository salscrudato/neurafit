/**
 * Cache Recovery Banner Component
 * 
 * Displays a non-intrusive banner when cache issues are detected,
 * offering one-click cache clearing and app recovery.
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { clearAllCaches } from '@/lib/cache-manager';

interface CacheRecoveryBannerProps {
  className?: string;
}

export const CacheRecoveryBanner = React.memo(function CacheRecoveryBanner({
  className = '',
}: CacheRecoveryBannerProps) {
  const [show, setShow] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for cache errors via error events
    const handleError = (event: ErrorEvent) => {
      const message = event.message?.toLowerCase() || '';
      
      // Detect common cache-related errors
      if (
        message.includes('cache') ||
        message.includes('storage') ||
        message.includes('quota') ||
        message.includes('network') ||
        event.filename?.includes('sw.js')
      ) {
        setShow(true);
        setError(event.message);
      }
    };

    // Listen for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message?.toLowerCase() || '';
      if (
        message.includes('cache') ||
        message.includes('storage') ||
        message.includes('quota')
      ) {
        setShow(true);
        setError(event.reason?.message);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearAllCaches();
      setShow(false);
      setError(null);
      
      // Reload after a brief delay
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      setError(`Failed to clear cache: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsClearing(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9998] animate-slide-down ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-amber-50 border-b border-amber-200 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-start gap-3">
          {/* Icon */}
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-amber-900 mb-1">
              Cache Issue Detected
            </h3>
            <p className="text-sm text-amber-800 mb-2">
              We detected a potential cache issue. Clearing the cache can help resolve this.
            </p>
            {error && (
              <p className="text-xs text-amber-700 mb-2 font-mono bg-amber-100 px-2 py-1 rounded">
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-medium transition-colors"
              aria-label="Clear cache and reload"
            >
              <RefreshCw className={`w-4 h-4 ${isClearing ? 'animate-spin' : ''}`} />
              {isClearing ? 'Clearing...' : 'Clear Cache'}
            </button>
            <button
              onClick={() => setShow(false)}
              disabled={isClearing}
              className="inline-flex items-center justify-center w-8 h-8 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

