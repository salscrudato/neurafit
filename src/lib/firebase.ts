// Simplified Firebase configuration using standard Firebase v9+ modular SDK
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getFunctions, type Functions } from 'firebase/functions'
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics'
import { logger } from './logger'

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName]
)

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}\n` +
    'Please check your .env file and ensure all required variables are set.'
  )
}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
logger.firebase('Initializing Firebase...')
const app: FirebaseApp = initializeApp(firebaseConfig)

// Initialize services
export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)
export const fns: Functions = getFunctions(app)

logger.firebase('Firebase services initialized', {
  auth: '✓',
  firestore: '✓',
  functions: '✓',
})

// Initialize analytics conditionally
let analytics: Analytics | null = null
isSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
      logger.firebase('Firebase Analytics initialized')
    }
  })
  .catch((error) => {
    // Analytics initialization failed - log in development only
    logger.warn('Firebase Analytics initialization failed', { error })
  })

// Simplified service getters (now synchronous)
export const getAuthInstance = (): Auth => auth
export const getFirestoreInstance = (): Firestore => db
export const getFunctionsInstance = (): Functions => fns
export const getAnalyticsInstance = (): Analytics | null => analytics

