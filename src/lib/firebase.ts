// Simple Firebase configuration without immediate imports
const firebaseConfig = {
  apiKey: 'AIzaSyAKo_Bf8aPCWSPM9Nigcnga1t6_Psi70T8',
  authDomain: 'neurafit-ai-2025.firebaseapp.com',
  projectId: 'neurafit-ai-2025',
  storageBucket: 'neurafit-ai-2025.firebasestorage.app',
  messagingSenderId: '226392212811',
  appId: '1:226392212811:web:4e41b01723ca5ecec8d4ce',
  measurementId: 'G-5LHTKTWX0M',
};

// Lazy initialization
let firebaseApp: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let fnsInstance: any = null;
let analyticsInstance: any = null;

// Initialize Firebase app
const initApp = async () => {
  if (firebaseApp) return firebaseApp;
  const { initializeApp } = await import('firebase/app');
  firebaseApp = initializeApp(firebaseConfig);
  return firebaseApp;
};

// Initialize and export auth
const initAuth = async () => {
  if (authInstance) return authInstance;
  const app = await initApp();
  const { getAuth } = await import('firebase/auth');
  authInstance = getAuth(app);
  return authInstance;
};

// Initialize and export firestore
const initDb = async () => {
  if (dbInstance) return dbInstance;
  const app = await initApp();
  const { getFirestore } = await import('firebase/firestore');
  dbInstance = getFirestore(app);
  return dbInstance;
};

// Initialize and export functions
const initFns = async () => {
  if (fnsInstance) return fnsInstance;
  const app = await initApp();
  const { getFunctions } = await import('firebase/functions');
  fnsInstance = getFunctions(app);
  return fnsInstance;
};

// Initialize and export analytics
const initAnalytics = async () => {
  if (analyticsInstance !== null) return analyticsInstance;

  if (typeof window === 'undefined') {
    analyticsInstance = null;
    return null;
  }

  try {
    const app = await initApp();
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();

    if (supported) {
      analyticsInstance = getAnalytics(app);
      console.log('Firebase Analytics initialized');
    } else {
      analyticsInstance = null;
      console.warn('Firebase Analytics not supported');
    }
  } catch (error) {
    analyticsInstance = null;
    console.warn('Analytics initialization failed:', error);
  }

  return analyticsInstance;
};

// Export async getters
export const getAuthInstance = initAuth;
export const getFirestoreInstance = initDb;
export const getFunctionsInstance = initFns;
export const getAnalyticsInstance = initAnalytics;

// Synchronous exports for backward compatibility
export let auth: any;
export let db: any;
export let fns: any;
export let analytics: any = null;

// Initialize immediately but don't block
Promise.all([initAuth(), initDb(), initFns(), initAnalytics()]).then(([authRes, dbRes, fnsRes, analyticsRes]) => {
  auth = authRes;
  db = dbRes;
  fns = fnsRes;
  analytics = analyticsRes;
}).catch(error => {
  console.error('Firebase initialization failed:', error);
});