import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

/**
 * Ensures a user document exists in Firestore
 * Creates it with basic info if it doesn't exist
 */
export async function ensureUserDocument(user: User): Promise<void> {
  try {
    console.log('🔍 Ensuring user document for:', user.uid);

    // Firestore is now available synchronously

    console.log('✅ Firestore instance ready, creating user document...');
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.log('Creating user document for:', user.uid);
      await setDoc(userDocRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log('User document created successfully');
    } else {
      // Optional: Update updated_at if document exists
      await setDoc(userDocRef,
        {
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('Error ensuring user document:', error);
    throw new Error('Failed to ensure user document exists');
  }
}

/**
 * Creates a default subscription for a user if it doesn't exist
 */
export async function createDefaultSubscription(uid: string): Promise<void> {
  try {

    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error('User document does not exist');
    }

    const userData = userDoc.data();
    if (!userData?.subscription) {
      await setDoc(userDocRef,
        {
          subscription: {
            customerId: '',
            status: 'incomplete',
            workoutCount: 0,
            freeWorkoutsUsed: 0,
            freeWorkoutLimit: 5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        { merge: true }
      );
      console.log('Default subscription created for user:', uid);
    }
  } catch (error) {
    console.error('Error creating default subscription:', error);
    throw new Error('Failed to create default subscription');
  }
}