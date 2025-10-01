import { getFirestoreInstance } from './firebase';
import type { User } from 'firebase/auth';

/**
 * Ensures a user document exists in Firestore
 * Creates it with basic info if it doesn't exist
 */
export async function ensureUserDocument(user: User): Promise<void> {
  try {
    console.log('🔍 Ensuring user document for:', user.uid);

    // Wait a bit longer for Firebase to be ready
    let retries = 0;
    let db = null;

    while (!db && retries < 10) {
      db = await getFirestoreInstance();
      if (!db) {
        console.log(`⏳ Waiting for Firestore (attempt ${retries + 1}/10)...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }
    }

    if (!db) {
      throw new Error('Firestore not available after retries');
    }

    console.log('✅ Firestore instance ready, creating user document...');
    const userDocRef = db.collection('users').doc(user.uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      console.log('Creating user document for:', user.uid);
      await userDocRef.set(
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
      await userDocRef.set(
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
    const db = await getFirestoreInstance();
    if (!db) {
      throw new Error('Firestore not available');
    }

    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new Error('User document does not exist');
    }

    const userData = userDoc.data();
    if (!userData?.subscription) {
      await userDocRef.set(
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