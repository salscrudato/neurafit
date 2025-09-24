import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getFunctions } from "firebase/functions"

const firebaseConfig = {
  apiKey: "AIzaSyAKo_Bf8aPCWSPM9Nigcnga1t6_Psi70T8",
  authDomain: "neurafit-ai-2025.firebaseapp.com",
  projectId: "neurafit-ai-2025",
  storageBucket: "neurafit-ai-2025.firebasestorage.app",
  messagingSenderId: "226392212811",
  appId: "1:226392212811:web:4e41b01723ca5ecec8d4ce",
  measurementId: "G-5LHTKTWX0M"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const fns = getFunctions(app)