// Firebase service instances - will be populated from external loader
interface FirebaseServices {
  app: any;
  auth: any;
  firestore: any;
  functions: any;
  analytics: any;
}

let firebaseServices: FirebaseServices | null = null;
let initializationPromise: Promise<FirebaseServices> | null = null;

// Declare global Firebase loader interface
declare global {
  interface Window {
    NeuraFitFirebase?: {
      initialized: boolean;
      services: any;
      init: () => Promise<any>;
      getServices: () => Promise<any>;
    };
  }
}

// Initialize Firebase using external loader (completely outside main bundle)
export const initializeFirebase = async (): Promise<FirebaseServices> => {
  if (initializationPromise) return initializationPromise;

  initializationPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('🔥 Starting Firebase initialization via external loader...');

      // Wait for external Firebase loader to be available
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait

      while (!window.NeuraFitFirebase && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.NeuraFitFirebase) {
        throw new Error('Firebase loader not available after 5 seconds');
      }

      console.log('✅ Firebase loader found, initializing services...');

      // Initialize Firebase via external loader
      const services = await window.NeuraFitFirebase.getServices();

      if (!services || !services.auth || !services.firestore || !services.functions) {
        throw new Error('Firebase services not properly initialized');
      }

      // Map services to our interface
      firebaseServices = {
        app: services.app,
        auth: services.auth,
        firestore: services.firestore,
        functions: services.functions,
        analytics: services.analytics
      };

      console.log('🎉 Firebase initialization complete via external loader!');
      resolve(firebaseServices);

    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
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
  return services.firestore;
};

export const getFunctionsInstance = async () => {
  const services = await initializeFirebase();
  return services.functions;
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
    if (!firebaseServices?.firestore) {
      throw new Error('Firebase not initialized. Use getFirestoreInstance() or call initializeFirebase() first.');
    }
    return firebaseServices.firestore;
  }
});

export const fns = new Proxy({} as any, {
  get() {
    if (!firebaseServices?.functions) {
      throw new Error('Firebase not initialized. Use getFunctionsInstance() or call initializeFirebase() first.');
    }
    return firebaseServices.functions;
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