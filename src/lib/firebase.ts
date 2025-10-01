// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAKo_Bf8aPCWSPM9Nigcnga1t6_Psi70T8',
  authDomain: 'neurafit-ai-2025.firebaseapp.com',
  projectId: 'neurafit-ai-2025',
  storageBucket: 'neurafit-ai-2025.firebasestorage.app',
  messagingSenderId: '226392212811',
  appId: '1:226392212811:web:4e41b01723ca5ecec8d4ce',
  measurementId: 'G-5LHTKTWX0M',
};

// Global Firebase instances
let firebaseApp: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let fnsInstance: any = null;
let analyticsInstance: any = null;
let initializationPromise: Promise<void> | null = null;

// Initialize Firebase completely asynchronously
export const initializeFirebase = async (): Promise<void> => {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      console.log('🔥 Starting Firebase initialization...');

      // Load Firebase modules dynamically
      const [
        { initializeApp },
        { getAuth },
        { getFirestore },
        { getFunctions }
      ] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
        import('firebase/functions')
      ]);

      // Initialize Firebase app
      firebaseApp = initializeApp(firebaseConfig);
      console.log('✅ Firebase app initialized');

      // Initialize services
      authInstance = getAuth(firebaseApp);
      dbInstance = getFirestore(firebaseApp);
      fnsInstance = getFunctions(firebaseApp);
      console.log('✅ Firebase services initialized');

      // Initialize analytics separately (optional)
      if (typeof window !== 'undefined') {
        try {
          const { getAnalytics, isSupported } = await import('firebase/analytics');
          const supported = await isSupported();

          if (supported) {
            analyticsInstance = getAnalytics(firebaseApp);
            console.log('✅ Firebase Analytics initialized');
          } else {
            console.warn('⚠️ Firebase Analytics not supported');
          }
        } catch (error) {
          console.warn('⚠️ Analytics initialization failed:', error);
        }
      }

      console.log('🎉 Firebase initialization complete!');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  })();

  return initializationPromise;
};

// Async getters that ensure Firebase is initialized
export const getAuthInstance = async () => {
  await initializeFirebase();
  return authInstance;
};

export const getFirestoreInstance = async () => {
  await initializeFirebase();
  return dbInstance;
};

export const getFunctionsInstance = async () => {
  await initializeFirebase();
  return fnsInstance;
};

export const getAnalyticsInstance = async () => {
  await initializeFirebase();
  return analyticsInstance;
};

// Synchronous exports that throw helpful errors
export const auth = new Proxy({} as any, {
  get() {
    if (!authInstance) {
      throw new Error('Firebase not initialized. Use getAuthInstance() or call initializeFirebase() first.');
    }
    return authInstance;
  }
});

export const db = new Proxy({} as any, {
  get() {
    if (!dbInstance) {
      throw new Error('Firebase not initialized. Use getFirestoreInstance() or call initializeFirebase() first.');
    }
    return dbInstance;
  }
});

export const fns = new Proxy({} as any, {
  get() {
    if (!fnsInstance) {
      throw new Error('Firebase not initialized. Use getFunctionsInstance() or call initializeFirebase() first.');
    }
    return fnsInstance;
  }
});

export const analytics = new Proxy({} as any, {
  get() {
    if (!analyticsInstance) {
      throw new Error('Firebase Analytics not initialized. Use getAnalyticsInstance() or call initializeFirebase() first.');
    }
    return analyticsInstance;
  }
});