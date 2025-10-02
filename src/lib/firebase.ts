// Simplified Firebase configuration using standard Firebase v9+ modular SDK
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getFunctions, type Functions } from 'firebase/functions'
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics'

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAKo_Bf8aPCWSPM9Nigcnga1t6_Psi70T8',
  authDomain: 'neurafit-ai-2025.firebaseapp.com',
  projectId: 'neurafit-ai-2025',
  storageBucket: 'neurafit-ai-2025.firebasestorage.app',
  messagingSenderId: '226392212811',
  appId: '1:226392212811:web:4e41b01723ca5ecec8d4ce',
  measurementId: 'G-5LHTKTWX0M',
}

// Initialize Firebase
console.log('🔥 Initializing Firebase...')
const app: FirebaseApp = initializeApp(firebaseConfig)

// Initialize services
export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)
export const fns: Functions = getFunctions(app)

// Initialize analytics conditionally
let analytics: Analytics | null = null
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app)
    console.log('✅ Firebase Analytics initialized')
  }
}).catch((error) => {
  console.warn('⚠️ Analytics initialization failed:', error)
})

console.log('✅ Firebase initialization complete!')

// Simplified service getters (now synchronous)
export const getAuthInstance = (): Auth => auth
export const getFirestoreInstance = (): Firestore => db
export const getFunctionsInstance = (): Functions => fns
export const getAnalyticsInstance = (): Analytics | null => analytics

