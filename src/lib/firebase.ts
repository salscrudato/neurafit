// Firebase configuration stored as a constant
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAKo_Bf8aPCWSPM9Nigcnga1t6_Psi70T8',
  authDomain: 'neurafit-ai-2025.firebaseapp.com',
  projectId: 'neurafit-ai-2025',
  storageBucket: 'neurafit-ai-2025.firebasestorage.app',
  messagingSenderId: '226392212811',
  appId: '1:226392212811:web:4e41b01723ca5ecec8d4ce',
  measurementId: 'G-5LHTKTWX0M',
} as const;

// Firebase service instances - will be populated after initialization
interface FirebaseServices {
  app: any;
  auth: any;
  db: any;
  fns: any;
  analytics: any;
}

let firebaseServices: FirebaseServices | null = null;
let initializationPromise: Promise<FirebaseServices> | null = null;

// Initialize Firebase with complete isolation from main bundle
export const initializeFirebase = async (): Promise<FirebaseServices> => {
  if (initializationPromise) return initializationPromise;

  initializationPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('🔥 Starting Firebase initialization...');

      // Use setTimeout to ensure this runs after all synchronous code
      setTimeout(async () => {
        try {
          // Load Firebase modules with a delay to prevent bundling issues
          const firebaseApp = await import('firebase/app');
          await new Promise(resolve => setTimeout(resolve, 50)); // Small delay

          const firebaseAuth = await import('firebase/auth');
          await new Promise(resolve => setTimeout(resolve, 50));

          const firebaseFirestore = await import('firebase/firestore');
          await new Promise(resolve => setTimeout(resolve, 50));

          const firebaseFunctions = await import('firebase/functions');
          await new Promise(resolve => setTimeout(resolve, 50));

          // Initialize Firebase app
          const app = firebaseApp.initializeApp(FIREBASE_CONFIG);
          console.log('✅ Firebase app initialized');

          // Initialize services
          const auth = firebaseAuth.getAuth(app);
          const db = firebaseFirestore.getFirestore(app);
          const fns = firebaseFunctions.getFunctions(app);
          console.log('✅ Firebase services initialized');

          // Initialize analytics separately and safely
          let analytics = null;
          if (typeof window !== 'undefined') {
            try {
              const firebaseAnalytics = await import('firebase/analytics');
              const supported = await firebaseAnalytics.isSupported();

              if (supported) {
                analytics = firebaseAnalytics.getAnalytics(app);
                console.log('✅ Firebase Analytics initialized');
              } else {
                console.warn('⚠️ Firebase Analytics not supported');
              }
            } catch (error) {
              console.warn('⚠️ Analytics initialization failed:', error);
            }
          }

          // Store services
          firebaseServices = { app, auth, db, fns, analytics };
          console.log('🎉 Firebase initialization complete!');

          resolve(firebaseServices);
        } catch (error) {
          console.error('❌ Firebase initialization failed:', error);
          reject(error);
        }
      }, 100); // Delay initialization to ensure React is fully loaded

    } catch (error) {
      console.error('❌ Firebase initialization setup failed:', error);
      reject(error);
    }
  });

  return initializationPromise;
};

// Async getters that ensure Firebase is initialized
export const getAuthInstance = async () => {
  const services = await initializeFirebase();
  return services.auth;
};

export const getFirestoreInstance = async () => {
  const services = await initializeFirebase();
  return services.db;
};

export const getFunctionsInstance = async () => {
  const services = await initializeFirebase();
  return services.fns;
};

export const getAnalyticsInstance = async () => {
  const services = await initializeFirebase();
  return services.analytics;
};

// Synchronous exports that throw helpful errors
export const auth = new Proxy({} as any, {
  get() {
    if (!firebaseServices?.auth) {
      throw new Error('Firebase not initialized. Use getAuthInstance() or call initializeFirebase() first.');
    }
    return firebaseServices.auth;
  }
});

export const db = new Proxy({} as any, {
  get() {
    if (!firebaseServices?.db) {
      throw new Error('Firebase not initialized. Use getFirestoreInstance() or call initializeFirebase() first.');
    }
    return firebaseServices.db;
  }
});

export const fns = new Proxy({} as any, {
  get() {
    if (!firebaseServices?.fns) {
      throw new Error('Firebase not initialized. Use getFunctionsInstance() or call initializeFirebase() first.');
    }
    return firebaseServices.fns;
  }
});

export const analytics = new Proxy({} as any, {
  get() {
    if (!firebaseServices?.analytics) {
      throw new Error('Firebase Analytics not initialized. Use getAnalyticsInstance() or call initializeFirebase() first.');
    }
    return firebaseServices.analytics;
  }
});