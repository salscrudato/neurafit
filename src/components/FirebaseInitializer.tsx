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
        console.log('🚀 Starting Firebase initialization from React component...');
        const services = await initializeFirebase();

        // Verify services are available
        if (services.auth && services.firestore && services.functions) {
          console.log('✅ All Firebase services ready');
          setIsInitialized(true);
        } else {
          throw new Error('Firebase services not properly initialized');
        }
      } catch (err) {
        console.error('❌ Firebase initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Firebase initialization failed');
      }
    };

    // Initialize Firebase after React is fully loaded
    const timer = setTimeout(init, 200);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-30 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="text-center p-8 relative z-10">
          {/* Futuristic loading animation */}
          <div className="relative mb-8">
            {/* Outer rotating ring */}
            <div className="w-24 h-24 mx-auto relative">
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-400 border-r-purple-400 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-transparent border-b-cyan-400 border-l-pink-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>

              {/* Inner pulsing core */}
              <div className="absolute inset-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse">
                <div className="w-full h-full bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full animate-ping opacity-75"></div>
              </div>

              {/* Neural network nodes */}
              <div className="absolute -inset-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                    style={{
                      transform: `rotate(${i * 45}deg) translateY(-40px)`,
                      transformOrigin: '50% 40px',
                      animationDelay: `${i * 0.2}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Scanning line effect */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30 animate-pulse transform -skew-x-12"></div>
            </div>
          </div>

          {/* Text with futuristic styling */}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            NeuraFit AI
          </h1>
          <p className="text-blue-200 text-lg mb-2">
            Initializing Neural Networks...
          </p>

          {/* Progress bar */}
          <div className="w-64 h-1 bg-gray-700 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse transform origin-left">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full animate-ping opacity-75"></div>
            </div>
          </div>

          {/* Status text */}
          <p className="text-gray-400 text-sm mt-4 animate-pulse">
            Connecting to AI services...
          </p>
        </div>

        {/* Ambient glow effect */}
        <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-transparent to-transparent animate-pulse"></div>
      </div>
    );
  }

  return <>{children}</>;
}
