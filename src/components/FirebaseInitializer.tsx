import { useEffect, useState, type ReactNode } from 'react';
import { initializeFirebase } from '../lib/firebase';

interface FirebaseInitializerProps {
  children: ReactNode;
}

export function FirebaseInitializer({ children }: FirebaseInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase();
        setIsInitialized(true);
      } catch (err) {
        console.error('Firebase initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Firebase initialization failed');
      }
    };

    // Initialize Firebase after a short delay to ensure React is fully loaded
    const timer = setTimeout(init, 100);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Initialization Error
          </h1>
          <p className="text-gray-600 mb-4">
            Failed to initialize the application services.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="animate-spin text-blue-500 text-6xl mb-4">🔥</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Loading NeuraFit
          </h1>
          <p className="text-gray-600">
            Initializing application services...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
