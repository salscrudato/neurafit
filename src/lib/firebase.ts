import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyAKo_Bf8aPCWSPM9Nigcnga1t6_Psi70T8',
  authDomain: 'neurafit-ai-2025.firebaseapp.com',
  projectId: 'neurafit-ai-2025',
  storageBucket: 'neurafit-ai-2025.firebasestorage.app',
  messagingSenderId: '226392212811',
  appId: '1:226392212811:web:4e41b01723ca5ecec8d4ce',
  measurementId: 'G-5LHTKTWX0M',
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize core services immediately
export const auth = getAuth(app);
export const db = getFirestore(app);
export const fns = getFunctions(app);

// Initialize Analytics with proper error handling
let analytics: ReturnType<typeof getAnalytics> | null = null;
let analyticsInitialized = false;

// Function to get analytics instance safely
export const getAnalyticsInstance = async (): Promise<ReturnType<typeof getAnalytics> | null> => {
  if (analyticsInitialized) {
    return analytics;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(app);
      analyticsInitialized = true;
      console.log('Firebase Analytics initialized');
      return analytics;
    } else {
      console.warn('Firebase Analytics not supported in this environment');
      analyticsInitialized = true;
      return null;
    }
  } catch (error) {
    console.warn('Error initializing Firebase Analytics:', error);
    analyticsInitialized = true;
    return null;
  }
};

// Initialize analytics immediately if in browser
if (typeof window !== 'undefined') {
  getAnalyticsInstance().catch(console.warn);
}

// Export analytics for backward compatibility (may be null initially)
export { analytics };