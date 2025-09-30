import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { User } from 'firebase/auth'

/**
 * Ensures a user document exists in Firestore
 * Creates it with basic info if it doesn't exist
 */
export async function ensureUserDocument(user: User): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userDocRef)
    
    if (!userDoc.exists()) {
      console.log('Creating user document for:', user.uid)
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        created_at: new Date(),
        updated_at: new Date()
      }, { merge: true })
      console.log('User document created successfully')
    }
  } catch (error) {
    console.error('Error ensuring user document:', error)
    throw error
  }
}

/**
 * Creates a default subscription for a user
 */
export async function createDefaultSubscription(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid)
    await setDoc(userDocRef, {
      subscription: {
        customerId: '',
        status: 'incomplete',
        workoutCount: 0,
        freeWorkoutsUsed: 0,
        freeWorkoutLimit: 5,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }, { merge: true })
    console.log('Default subscription created for user:', uid)
  } catch (error) {
    console.error('Error creating default subscription:', error)
    throw error
  }
}
